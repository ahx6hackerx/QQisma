import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember } from "../../middleware/propertyAccess";

export const anomaliesRouter = Router();
anomaliesRouter.use(requireAuth);

// GET /api/properties/:propertyId/anomalies
// Pure statistics, no external AI service: for each expense category,
// compares this month's amount against the trailing 6-month average for
// that same category and flags anything unusually high. Zero cost, runs
// entirely in the database query + a bit of math.
anomaliesRouter.get(
  "/:propertyId/anomalies",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await prisma.transaction.findMany({
      where: { propertyId, type: "EXPENSE", date: { gte: sixMonthsAgo } },
    });

    const byCategory = new Map<string, number[]>();
    for (const t of transactions) {
      if (t.date < monthStart) {
        const arr = byCategory.get(t.category) ?? [];
        arr.push(t.amount);
        byCategory.set(t.category, arr);
      }
    }

    const thisMonth = transactions.filter((t) => t.date >= monthStart);
    const anomalies: { transactionId: string; category: string; amount: number; average: number; percentAbove: number }[] = [];

    for (const t of thisMonth) {
      const history = byCategory.get(t.category);
      if (!history || history.length < 2) continue; // not enough history to judge
      const avg = history.reduce((s, v) => s + v, 0) / history.length;
      if (avg <= 0) continue;
      const percentAbove = Math.round(((t.amount - avg) / avg) * 100);
      if (percentAbove >= 40) {
        anomalies.push({ transactionId: t.id, category: t.category, amount: t.amount, average: Math.round(avg * 100) / 100, percentAbove });
      }
    }

    res.json({ anomalies: anomalies.sort((a, b) => b.percentAbove - a.percentAbove) });
  })
);
