import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { getCurrentOwnership } from "../../utils/ownership";
import { logActivity } from "../../utils/audit";
import { notifyUser } from "../../utils/notify";

export const distributionsRouter = Router();
distributionsRouter.use(requireAuth);

// GET /api/properties/:propertyId/distributions
distributionsRouter.get(
  "/:propertyId/distributions",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const distributions = await prisma.distribution.findMany({
      where: { propertyId: req.params.propertyId },
      include: {
        monthlyClosing: true,
        items: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ distributions });
  })
);

const createDistributionSchema = z.object({ monthlyClosingId: z.string().min(1) });

// POST /api/properties/:propertyId/distributions — turns a closed month's
// net verified income into a per-partner payout, using the ownership
// structure that is current as of distribution time.
distributionsRouter.post(
  "/:propertyId/distributions",
  requirePropertyRole(Role.MANAGER),
  validateBody(createDistributionSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { monthlyClosingId } = req.body;

    const closing = await prisma.monthlyClosing.findFirst({
      where: { id: monthlyClosingId, propertyId },
      include: { distribution: true },
    });
    if (!closing) throw AppError.notFound("الإقفال غير موجود.");
    if (closing.status !== "CLOSED") throw AppError.badRequest("لا يمكن التوزيع قبل إقفال الشهر.");
    if (closing.distribution) throw AppError.conflict("تم إنشاء توزيع لهذا الشهر مسبقًا.");
    if (closing.netVerifiedIncome <= 0) {
      throw AppError.badRequest("صافي الدخل الموثق صفر أو أقل — لا يوجد ما يُوزّع.");
    }

    const ownership = await getCurrentOwnership(propertyId);
    if (ownership.length === 0) throw AppError.badRequest("لا يوجد هيكل ملكية معرّف لهذا العقار.");

    const distribution = await prisma.distribution.create({
      data: {
        propertyId,
        monthlyClosingId,
        netIncome: closing.netVerifiedIncome,
        items: {
          create: ownership.map((o) => ({
            userId: o.userId,
            sharePercent: o.sharePercent,
            amount: Math.round(((closing.netVerifiedIncome * o.sharePercent) / 100) * 100) / 100,
          })),
        },
      },
      include: { items: { include: { user: { select: { id: true, fullName: true } } } } },
    });

    for (const item of distribution.items) {
      await notifyUser({
        userId: item.userId,
        propertyId,
        type: "DISTRIBUTION_READY",
        title: "توزيع جديد",
        message: `حصتك من توزيع ${closing.periodMonth}/${closing.periodYear} هي ${item.amount} JD.`,
      });
    }
    await logActivity(
      propertyId,
      req.user!.id,
      "DISTRIBUTION_CREATED",
      `تم توزيع صافي دخل ${closing.periodMonth}/${closing.periodYear} (${closing.netVerifiedIncome} JD).`
    );

    res.status(201).json({ distribution });
  })
);

// POST /api/properties/:propertyId/distributions/:id/approve — OWNER sign-off
distributionsRouter.post(
  "/:propertyId/distributions/:id/approve",
  requirePropertyRole(Role.OWNER),
  asyncHandler(async (req, res) => {
    const distribution = await prisma.distribution.update({
      where: { id: req.params.id },
      data: { status: "APPROVED" },
    });
    res.json({ distribution });
  })
);

// POST /api/properties/:propertyId/distributions/:id/items/:itemId/pay
distributionsRouter.post(
  "/:propertyId/distributions/:id/items/:itemId/pay",
  requirePropertyRole(Role.MANAGER),
  asyncHandler(async (req, res) => {
    const item = await prisma.distributionItem.update({
      where: { id: req.params.itemId },
      data: { paid: true, paidAt: new Date() },
    });

    const remaining = await prisma.distributionItem.count({
      where: { distributionId: req.params.id, paid: false },
    });
    if (remaining === 0) {
      await prisma.distribution.update({ where: { id: req.params.id }, data: { status: "PAID" } });
    }

    res.json({ item });
  })
);

// GET /api/properties/:propertyId/my-share — the "حصتي" screen
distributionsRouter.get(
  "/:propertyId/my-share",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const userId = req.user!.id;

    const [property, ownership, items, thisYearItems] = await Promise.all([
      prisma.property.findUniqueOrThrow({ where: { id: propertyId } }),
      prisma.ownershipRecord.findFirst({ where: { propertyId, userId, effectiveTo: null } }),
      prisma.distributionItem.findMany({
        where: { userId, distribution: { propertyId } },
        include: { distribution: { include: { monthlyClosing: true } } },
        orderBy: { distribution: { createdAt: "desc" } },
      }),
      prisma.distributionItem.findMany({
        where: {
          userId,
          distribution: { propertyId, monthlyClosing: { periodYear: new Date().getFullYear() } },
        },
      }),
    ]);

    const sharePercent = ownership?.sharePercent ?? 0;
    const shareValue = property.estimatedValue ? Math.round(((property.estimatedValue * sharePercent) / 100) * 100) / 100 : null;
    const received = items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    const pending = items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
    const yearTotal = thisYearItems.reduce((s, i) => s + i.amount, 0);

    res.json({
      sharePercent,
      shareValue,
      receivedTotal: Math.round(received * 100) / 100,
      pendingTotal: Math.round(pending * 100) / 100,
      yearTotal: Math.round(yearTotal * 100) / 100,
      distributions: items.map((i) => ({
        id: i.id,
        amount: i.amount,
        paid: i.paid,
        paidAt: i.paidAt,
        period: `${i.distribution.monthlyClosing.periodMonth}/${i.distribution.monthlyClosing.periodYear}`,
      })),
    });
  })
);
