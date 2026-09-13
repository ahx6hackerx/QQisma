import { Router } from "express";
import { z } from "zod";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { writeAuditLog, logActivity } from "../../utils/audit";
import { notifyPropertyMembers } from "../../utils/notify";

export const disputesRouter = Router();
disputesRouter.use(requireAuth);

// GET /api/properties/:propertyId/disputes?status=OPEN
disputesRouter.get(
  "/:propertyId/disputes",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { status } = req.query as Record<string, string | undefined>;
    const disputes = await prisma.dispute.findMany({
      where: { propertyId: req.params.propertyId, ...(status ? { status: status as never } : {}) },
      include: {
        transaction: true,
        raisedBy: { select: { id: true, fullName: true } },
        comments: { include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ disputes });
  })
);

const createDisputeSchema = z.object({
  transactionId: z.string().min(1, "العملية المعنية مطلوبة."),
  reason: z.string().min(5, "يرجى توضيح سبب الاعتراض."),
});

// POST /api/properties/:propertyId/disputes — any partner can open a
// dispute on a transaction; the transaction is flagged DISPUTED so it
// can never be silently counted as VERIFIED while unresolved.
disputesRouter.post(
  "/:propertyId/disputes",
  requirePropertyMember,
  validateBody(createDisputeSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { transactionId, reason } = req.body;

    const transaction = await prisma.transaction.findFirst({ where: { id: transactionId, propertyId } });
    if (!transaction) throw AppError.notFound("العملية غير موجودة.");

    const [dispute] = await prisma.$transaction([
      prisma.dispute.create({ data: { propertyId, transactionId, raisedById: req.user!.id, reason } }),
      prisma.transaction.update({ where: { id: transactionId }, data: { status: VerificationStatus.DISPUTED } }),
    ]);

    await logActivity(propertyId, req.user!.id, "DISPUTE_OPENED", reason);
    await notifyPropertyMembers(propertyId, "DISPUTE_OPENED", "اعتراض جديد", reason, req.user!.id);

    res.status(201).json({ dispute });
  })
);

const addCommentSchema = z.object({ message: z.string().min(1, "الرسالة مطلوبة.") });

// POST /api/properties/:propertyId/disputes/:id/comments
disputesRouter.post(
  "/:propertyId/disputes/:id/comments",
  requirePropertyMember,
  validateBody(addCommentSchema),
  asyncHandler(async (req, res) => {
    const comment = await prisma.disputeComment.create({
      data: { disputeId: req.params.id, authorId: req.user!.id, message: req.body.message },
      include: { author: { select: { id: true, fullName: true } } },
    });
    await prisma.dispute.update({ where: { id: req.params.id }, data: { status: "UNDER_REVIEW" } });
    res.status(201).json({ comment });
  })
);

const resolveDisputeSchema = z.object({
  resolutionNote: z.string().min(3, "يرجى توضيح كيف تم حل الاعتراض."),
  correctedAmount: z.number().positive().optional(),
});

// POST /api/properties/:propertyId/disputes/:id/resolve — Manager/Owner only.
// Optionally corrects the transaction amount as part of the resolution;
// the correction is audited, and the transaction returns to review (not
// straight to VERIFIED) so it still needs a fresh evidence check.
disputesRouter.post(
  "/:propertyId/disputes/:id/resolve",
  requirePropertyRole(Role.MANAGER),
  validateBody(resolveDisputeSchema),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    const { resolutionNote, correctedAmount } = req.body;

    const dispute = await prisma.dispute.findFirst({ where: { id, propertyId }, include: { transaction: true } });
    if (!dispute) throw AppError.notFound("الاعتراض غير موجود.");

    const updated = await prisma.dispute.update({
      where: { id },
      data: { status: "RESOLVED", resolutionNote },
    });

    if (correctedAmount && correctedAmount !== dispute.transaction.amount) {
      await prisma.transaction.update({
        where: { id: dispute.transactionId },
        data: { amount: correctedAmount, status: VerificationStatus.UNDER_REVIEW },
      });
      await writeAuditLog({
        propertyId,
        actorId: req.user!.id,
        entityType: "TRANSACTION",
        entityId: dispute.transactionId,
        action: "DISPUTE_ADJUSTMENT",
        before: { amount: dispute.transaction.amount },
        after: { amount: correctedAmount },
        reason: resolutionNote,
      });
    } else {
      await prisma.transaction.update({
        where: { id: dispute.transactionId },
        data: { status: VerificationStatus.UNDER_REVIEW },
      });
    }

    await logActivity(propertyId, req.user!.id, "DISPUTE_RESOLVED", resolutionNote);
    await notifyPropertyMembers(propertyId, "DISPUTE_RESOLVED", "تم حل الاعتراض", resolutionNote, req.user!.id);

    res.json({ dispute: updated });
  })
);
