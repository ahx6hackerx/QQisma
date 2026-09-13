import { Router } from "express";
import { z } from "zod";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { logActivity, writeAuditLog } from "../../utils/audit";
import { notifyPropertyMembers } from "../../utils/notify";

export const closingRouter = Router();
closingRouter.use(requireAuth);

async function summarizePeriod(propertyId: string, year: number, month: number) {
  const transactions = await prisma.transaction.findMany({
    where: { propertyId, date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
  });

  const sum = (predicate: (t: (typeof transactions)[number]) => boolean) =>
    transactions.filter(predicate).reduce((s, t) => s + t.amount, 0);

  const reportedIncome = sum((t) => t.type === "INCOME");
  const verifiedIncome = sum((t) => t.type === "INCOME" && t.status === "VERIFIED");
  const reportedExpenses = sum((t) => t.type === "EXPENSE");
  const verifiedExpenses = sum((t) => t.type === "EXPENSE" && t.status === "VERIFIED");

  const openDisputes = await prisma.dispute.count({
    where: {
      propertyId,
      status: { not: "RESOLVED" },
      transaction: { date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
    },
  });

  return {
    reportedIncome,
    verifiedIncome,
    unverifiedIncome: Math.round((reportedIncome - verifiedIncome) * 100) / 100,
    reportedExpenses,
    verifiedExpenses,
    unverifiedExpenses: Math.round((reportedExpenses - verifiedExpenses) * 100) / 100,
    netVerifiedIncome: Math.round((verifiedIncome - verifiedExpenses) * 100) / 100,
    openDisputes,
    transactionIds: transactions.map((t) => t.id),
  };
}

// GET /api/properties/:propertyId/closings — history, newest first
closingRouter.get(
  "/:propertyId/closings",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const closings = await prisma.monthlyClosing.findMany({
      where: { propertyId: req.params.propertyId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      include: { distribution: true },
    });
    res.json({ closings });
  })
);

// GET /api/properties/:propertyId/closings/preview?year=2026&month=9
// Live numbers for an open period — this is what a manager reviews before
// deciding to close the month.
closingRouter.get(
  "/:propertyId/closings/preview",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) throw AppError.badRequest("السنة والشهر مطلوبان.");

    const existing = await prisma.monthlyClosing.findUnique({
      where: { propertyId_periodYear_periodMonth: { propertyId: req.params.propertyId, periodYear: year, periodMonth: month } },
    });
    if (existing?.status === "CLOSED") {
      return res.json({ closing: existing, alreadyClosed: true });
    }

    const summary = await summarizePeriod(req.params.propertyId, year, month);
    res.json({ preview: { periodYear: year, periodMonth: month, ...summary }, alreadyClosed: false });
  })
);

const closeMonthSchema = z.object({
  year: z.number().int().min(2000),
  month: z.number().int().min(1).max(12),
  force: z.boolean().optional(),
});

// POST /api/properties/:propertyId/closings — lock the month (Manager/Owner).
// Locked transactions can no longer be edited directly (see finance.routes.ts).
closingRouter.post(
  "/:propertyId/closings",
  requirePropertyRole(Role.MANAGER),
  validateBody(closeMonthSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { year, month, force } = req.body;

    const existing = await prisma.monthlyClosing.findUnique({
      where: { propertyId_periodYear_periodMonth: { propertyId, periodYear: year, periodMonth: month } },
    });
    if (existing?.status === "CLOSED") throw AppError.conflict("هذا الشهر مُقفل مسبقًا.");

    const summary = await summarizePeriod(propertyId, year, month);
    if (summary.openDisputes > 0 && !force) {
      throw AppError.badRequest(
        `يوجد ${summary.openDisputes} اعتراض مفتوح على عمليات هذا الشهر. حل الاعتراضات أولاً أو أعد الإرسال مع تجاوز صريح.`,
        "OPEN_DISPUTES"
      );
    }

    const closing = await prisma.$transaction(async (tx) => {
      const record = existing
        ? await tx.monthlyClosing.update({
            where: { id: existing.id },
            data: {
              reportedIncome: summary.reportedIncome,
              verifiedIncome: summary.verifiedIncome,
              unverifiedIncome: summary.unverifiedIncome,
              reportedExpenses: summary.reportedExpenses,
              verifiedExpenses: summary.verifiedExpenses,
              unverifiedExpenses: summary.unverifiedExpenses,
              netVerifiedIncome: summary.netVerifiedIncome,
              openDisputes: summary.openDisputes,
              status: "CLOSED",
              closedAt: new Date(),
              closedById: req.user!.id,
            },
          })
        : await tx.monthlyClosing.create({
            data: {
              propertyId,
              periodYear: year,
              periodMonth: month,
              status: "CLOSED",
              closedAt: new Date(),
              closedById: req.user!.id,
              reportedIncome: summary.reportedIncome,
              verifiedIncome: summary.verifiedIncome,
              unverifiedIncome: summary.unverifiedIncome,
              reportedExpenses: summary.reportedExpenses,
              verifiedExpenses: summary.verifiedExpenses,
              unverifiedExpenses: summary.unverifiedExpenses,
              netVerifiedIncome: summary.netVerifiedIncome,
              openDisputes: summary.openDisputes,
            },
          });

      await tx.transaction.updateMany({
        where: { id: { in: summary.transactionIds } },
        data: { monthlyClosingId: record.id },
      });

      return record;
    });

    await writeAuditLog({
      propertyId,
      actorId: req.user!.id,
      entityType: "MONTHLY_CLOSING",
      entityId: closing.id,
      action: "MONTH_CLOSED",
      after: summary,
      reason: force ? "أُغلق الشهر رغم وجود اعتراضات مفتوحة." : undefined,
    });
    await logActivity(propertyId, req.user!.id, "MONTH_CLOSED", `تم إقفال شهر ${month}/${year}.`);
    await notifyPropertyMembers(
      propertyId,
      "MONTH_CLOSED",
      "تم إقفال الشهر",
      `تم إقفال حسابات ${month}/${year}. صافي الدخل الموثق: ${summary.netVerifiedIncome} JD.`,
      req.user!.id
    );

    res.status(201).json({ closing });
  })
);
