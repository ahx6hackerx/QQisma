import { Router } from "express";
import { z } from "zod";
import { Role, TransactionType, VerificationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { writeAuditLog, logActivity } from "../../utils/audit";
import { notifyPropertyMembers } from "../../utils/notify";

export const financeRouter = Router();
financeRouter.use(requireAuth);

// GET /api/properties/:propertyId/transactions?type=INCOME&status=VERIFIED&month=9&year=2026
financeRouter.get(
  "/:propertyId/transactions",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { type, status, month, year, category } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = { propertyId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;
    if (month && year) {
      const y = Number(year);
      const m = Number(month);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        evidence: { include: { document: true } },
        confirmation: true,
        disputes: { where: { status: { not: "RESOLVED" } } },
      },
      orderBy: { date: "desc" },
    });

    const summary = transactions.reduce(
      (acc, t) => {
        const bucket = t.type === "INCOME" ? acc.income : acc.expense;
        bucket.reported += t.amount;
        if (t.status === "VERIFIED") bucket.verified += t.amount;
        return acc;
      },
      { income: { reported: 0, verified: 0 }, expense: { reported: 0, verified: 0 } }
    );

    res.json({ transactions, summary });
  })
);

const createTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  category: z.string().min(1, "التصنيف مطلوب."),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر."),
  description: z.string().optional(),
  date: z.coerce.date(),
});

// POST /api/properties/:propertyId/transactions — report an income/expense line.
// Starts life as REPORTED; becomes VERIFIED only once reviewed with evidence
// (see evidence.routes.ts review endpoint) — قِسمة never treats a manually
// entered number as final just because someone typed it in.
financeRouter.post(
  "/:propertyId/transactions",
  requirePropertyRole(Role.ACCOUNTANT),
  validateBody(createTransactionSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const transaction = await prisma.transaction.create({
      data: { propertyId, createdById: req.user!.id, ...req.body },
    });

    const label = req.body.type === "INCOME" ? "إيراد" : "مصروف";
    await logActivity(
      propertyId,
      req.user!.id,
      "TRANSACTION_REPORTED",
      `تم تسجيل ${label} بقيمة ${req.body.amount} JD (${req.body.category}).`
    );
    await notifyPropertyMembers(
      propertyId,
      "TRANSACTION_REPORTED",
      `${label} جديد`,
      `تم تسجيل ${label} بقيمة ${req.body.amount} JD.`,
      req.user!.id
    );

    res.status(201).json({ transaction });
  })
);

const updateTransactionSchema = z.object({
  category: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  reason: z.string().min(3, "يجب توضيح سبب التعديل.").optional(),
});

// PATCH /api/properties/:propertyId/transactions/:id — edits are always
// audited with a before/after snapshot; the ledger doesn't silently mutate.
financeRouter.patch(
  "/:propertyId/transactions/:id",
  requirePropertyRole(Role.ACCOUNTANT),
  validateBody(updateTransactionSchema),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    const existing = await prisma.transaction.findFirst({ where: { id, propertyId } });
    if (!existing) throw AppError.notFound("العملية غير موجودة.");
    if (existing.monthlyClosingId) {
      throw AppError.forbidden("لا يمكن تعديل عملية ضمن شهر تم إقفاله.");
    }

    const { reason, ...changes } = req.body;
    const updated = await prisma.transaction.update({
      where: { id },
      data: { ...changes, status: VerificationStatus.UNDER_REVIEW },
    });

    await writeAuditLog({
      propertyId,
      actorId: req.user!.id,
      entityType: "TRANSACTION",
      entityId: id,
      action: "TRANSACTION_EDITED",
      before: existing,
      after: updated,
      reason,
    });

    res.json({ transaction: updated });
  })
);

// POST /api/properties/:propertyId/transactions/:id/review — Manager/Owner
// marks a transaction VERIFIED once its evidence has been checked.
financeRouter.post(
  "/:propertyId/transactions/:id/review",
  requirePropertyRole(Role.MANAGER),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    const existing = await prisma.transaction.findFirst({
      where: { id, propertyId },
      include: { evidence: true },
    });
    if (!existing) throw AppError.notFound("العملية غير موجودة.");
    if (existing.evidence.length === 0) {
      throw AppError.badRequest("لا يمكن توثيق عملية بدون إثبات مرفق.");
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { status: VerificationStatus.VERIFIED },
    });
    await logActivity(propertyId, req.user!.id, "TRANSACTION_VERIFIED", `تم توثيق عملية بقيمة ${existing.amount} JD.`);
    res.json({ transaction: updated });
  })
);

// GET /api/properties/:propertyId/where-did-the-money-go?month=9&year=2026
// The "أين ذهبت الأموال؟" screen: income/expenses broken down by category,
// each figure traceable down to its transactions and evidence.
financeRouter.get(
  "/:propertyId/where-did-the-money-go",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { month, year } = req.query as Record<string, string | undefined>;
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month ? Number(month) : now.getMonth() + 1;

    const transactions = await prisma.transaction.findMany({
      where: { propertyId, date: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } },
      orderBy: { date: "asc" },
    });

    const byCategory = new Map<string, { type: TransactionType; total: number; verified: number; count: number }>();
    for (const t of transactions) {
      const key = `${t.type}:${t.category}`;
      const entry = byCategory.get(key) ?? { type: t.type, total: 0, verified: 0, count: 0 };
      entry.total += t.amount;
      if (t.status === "VERIFIED") entry.verified += t.amount;
      entry.count += 1;
      byCategory.set(key, entry);
    }

    const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

    res.json({
      period: { year: y, month: m },
      income,
      expense,
      net: income - expense,
      breakdown: Array.from(byCategory.entries()).map(([key, v]) => ({ category: key.split(":")[1], ...v })),
    });
  })
);
