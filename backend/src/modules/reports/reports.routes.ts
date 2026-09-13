import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { Role } from "@prisma/client";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

// GET /api/properties/:propertyId/reports/monthly?year=2026&month=9
// The full monthly report: closing summary + category breakdown + open items.
reportsRouter.get(
  "/:propertyId/reports/monthly",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) throw AppError.badRequest("السنة والشهر مطلوبان.");

    const [closing, transactions, disputes, decisions] = await Promise.all([
      prisma.monthlyClosing.findUnique({
        where: { propertyId_periodYear_periodMonth: { propertyId, periodYear: year, periodMonth: month } },
        include: { distribution: { include: { items: { include: { user: { select: { fullName: true } } } } } } },
      }),
      prisma.transaction.findMany({
        where: { propertyId, date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
        orderBy: { date: "asc" },
      }),
      prisma.dispute.count({
        where: { propertyId, transaction: { date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } } },
      }),
      prisma.decision.count({
        where: { propertyId, createdAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
      }),
    ]);

    const byCategory = new Map<string, { type: string; total: number; verified: number }>();
    for (const t of transactions) {
      const entry = byCategory.get(t.category) ?? { type: t.type, total: 0, verified: 0 };
      entry.total += t.amount;
      if (t.status === "VERIFIED") entry.verified += t.amount;
      byCategory.set(t.category, entry);
    }

    res.json({
      period: { year, month },
      closing,
      transactionsCount: transactions.length,
      disputesCount: disputes,
      decisionsCount: decisions,
      breakdown: Array.from(byCategory.entries()).map(([category, v]) => ({ category, ...v })),
    });
  })
);

// GET /api/properties/:propertyId/reports/partner/:userId
// Owners/managers can view any partner's report; a partner can always view their own.
reportsRouter.get(
  "/:propertyId/reports/partner/:userId",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { propertyId, userId } = req.params;
    if (userId !== req.user!.id && req.propertyRole !== Role.OWNER && req.propertyRole !== Role.MANAGER) {
      throw AppError.forbidden("لا يمكنك عرض تقرير شريك آخر.");
    }

    const [ownership, items] = await Promise.all([
      prisma.ownershipRecord.findFirst({ where: { propertyId, userId, effectiveTo: null } }),
      prisma.distributionItem.findMany({
        where: { userId, distribution: { propertyId } },
        include: { distribution: { include: { monthlyClosing: true } } },
        orderBy: { distribution: { createdAt: "desc" } },
      }),
    ]);

    res.json({
      userId,
      sharePercent: ownership?.sharePercent ?? 0,
      totalReceived: items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0),
      totalPending: items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0),
      distributions: items.map((i) => ({
        period: `${i.distribution.monthlyClosing.periodMonth}/${i.distribution.monthlyClosing.periodYear}`,
        amount: i.amount,
        paid: i.paid,
      })),
    });
  })
);

// GET /api/properties/:propertyId/activity — human-readable feed
reportsRouter.get(
  "/:propertyId/activity",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const activity = await prisma.activityLog.findMany({
      where: { propertyId: req.params.propertyId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    // Resolve actor names in one batched query (actorId can be null for system/public events).
    const actorIds = Array.from(new Set(activity.map((a) => a.actorId).filter(Boolean))) as string[];
    const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } });
    const actorMap = new Map(actors.map((a) => [a.id, a.fullName]));

    res.json({
      activity: activity.map((a) => ({ ...a, actorName: a.actorId ? actorMap.get(a.actorId) ?? "مستخدم" : "النظام" })),
    });
  })
);

// GET /api/properties/:propertyId/audit-log — Manager/Owner only, immutable trail
reportsRouter.get(
  "/:propertyId/audit-log",
  requirePropertyRole(Role.MANAGER),
  asyncHandler(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      where: { propertyId: req.params.propertyId },
      include: { actor: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    res.json({ logs });
  })
);
