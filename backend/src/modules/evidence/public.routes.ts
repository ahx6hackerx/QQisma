import { Router } from "express";
import { z } from "zod";
import { ConfirmationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody } from "../../middleware/validate";
import { notifyPropertyMembers } from "../../utils/notify";
import { logActivity } from "../../utils/audit";

// Unauthenticated routes for the respondent side of a confirmation (e.g. a
// tenant with no قِسمة account confirming a reported rent payment). The
// confirmation's cuid acts as the unguessable link token.
export const publicRouter = Router();

// GET /api/public/confirmations/:id — what the respondent sees on the link
publicRouter.get(
  "/confirmations/:id",
  asyncHandler(async (req, res) => {
    const confirmation = await prisma.confirmation.findUnique({
      where: { id: req.params.id },
      include: { transaction: { include: { property: { select: { name: true } } } } },
    });
    if (!confirmation) throw AppError.notFound("رابط التأكيد غير صالح.");
    res.json({
      property: confirmation.transaction.property.name,
      category: confirmation.transaction.category,
      date: confirmation.transaction.date,
      reportedAmount: confirmation.transaction.amount,
      status: confirmation.status,
    });
  })
);

const respondSchema = z.object({
  confirmed: z.boolean(),
  actualAmount: z.number().positive().optional(),
});

// POST /api/public/confirmations/:id/respond
publicRouter.post(
  "/confirmations/:id/respond",
  validateBody(respondSchema),
  asyncHandler(async (req, res) => {
    const confirmation = await prisma.confirmation.findUnique({
      where: { id: req.params.id },
      include: { transaction: true },
    });
    if (!confirmation) throw AppError.notFound("رابط التأكيد غير صالح.");

    const { confirmed, actualAmount } = req.body;
    const status = confirmed ? ConfirmationStatus.CONFIRMED : ConfirmationStatus.AMOUNT_DIFFERENT;
    const confirmedAmount = confirmed ? confirmation.transaction.amount : actualAmount ?? null;

    const updated = await prisma.confirmation.update({
      where: { id: req.params.id },
      data: { status, confirmedAmount },
    });

    const propertyId = confirmation.transaction.propertyId;
    await logActivity(
      propertyId,
      null,
      "CONFIRMATION_RECEIVED",
      confirmed
        ? "أكّد الطرف الآخر صحة المبلغ المسجل."
        : `أشار الطرف الآخر إلى مبلغ مختلف: ${actualAmount} JD.`
    );
    await notifyPropertyMembers(
      propertyId,
      "CONFIRMATION_RECEIVED",
      confirmed ? "تم التأكيد" : "فرق في التأكيد",
      confirmed
        ? "تم تأكيد المبلغ المسجل من الطرف الآخر."
        : `أشار الطرف الآخر إلى مبلغ مختلف (${actualAmount} JD)، راجع الفروقات.`
    );

    res.json({ confirmation: updated });
  })
);
