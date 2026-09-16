import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { getCurrentOwnership, totalSharePercent } from "../../utils/ownership";
import { writeAuditLog, logActivity } from "../../utils/audit";
import { notifyPropertyMembers } from "../../utils/notify";

export const ownershipRouter = Router();
ownershipRouter.use(requireAuth);

// GET /api/properties/:propertyId/ownership — current shares
ownershipRouter.get(
  "/:propertyId/ownership",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const records = await getCurrentOwnership(req.params.propertyId);
    res.json({ ownership: records, totalPercent: totalSharePercent(records) });
  })
);

// GET /api/properties/:propertyId/ownership/history — every record ever, newest first
ownershipRouter.get(
  "/:propertyId/ownership/history",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const records = await prisma.ownershipRecord.findMany({
      where: { propertyId: req.params.propertyId },
      include: { user: { select: { id: true, fullName: true, email: true } }, document: true },
      orderBy: [{ effectiveFrom: "desc" }],
    });
    res.json({ history: records });
  })
);

const transferSchema = z.object({
  shares: z
    .array(z.object({ userId: z.string(), sharePercent: z.number().positive().max(100) }))
    .min(1),
  note: z.string().optional(),
  documentId: z.string().optional(),
});

// POST /api/properties/:propertyId/ownership/transfer
// Records a full new ownership snapshot: closes every currently-open
// record (effectiveTo = now) and inserts the new shares as of now.
// This is how a will settlement, a share sale, or a correction is
// captured — the old shares are never deleted, only superseded.
ownershipRouter.post(
  "/:propertyId/ownership/transfer",
  requirePropertyRole(Role.OWNER),
  validateBody(transferSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { shares, note, documentId } = req.body;

    const total = Math.round(shares.reduce((s: number, o: { sharePercent: number }) => s + o.sharePercent, 0) * 100) / 100;
    if (total !== 100) {
      throw AppError.badRequest(`مجموع نسب الملكية الجديدة يجب أن يساوي 100%. المجموع الحالي: ${total}%`);
    }

    const before = await getCurrentOwnership(propertyId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await tx.ownershipRecord.updateMany({
        where: { propertyId, effectiveTo: null },
        data: { effectiveTo: now },
      });

      const created = await Promise.all(
        shares.map((s: { userId: string; sharePercent: number }) =>
          tx.ownershipRecord.create({
            data: {
              propertyId,
              userId: s.userId,
              sharePercent: s.sharePercent,
              effectiveFrom: now,
              note,
              documentId,
            },
          })
        )
      );

      // Make sure every new owner also has at least VIEWER-level partner access.
      for (const s of shares) {
        await tx.propertyMember.upsert({
          where: { propertyId_userId: { propertyId, userId: s.userId } },
          update: {},
          create: { propertyId, userId: s.userId, role: Role.OWNER },
        });
      }

      return created;
    });

    await writeAuditLog({
      propertyId,
      actorId: req.user!.id,
      entityType: "OWNERSHIP",
      entityId: propertyId,
      action: "OWNERSHIP_TRANSFER",
      before: before.map((b) => ({ userId: b.userId, sharePercent: b.sharePercent })),
      after: shares,
      reason: note,
    });
    await logActivity(propertyId, req.user!.id, "OWNERSHIP_CHANGED", note ?? "تم تحديث هيكل الملكية.");
    await notifyPropertyMembers(
      propertyId,
      "OWNERSHIP_CHANGED",
      "تحديث في الملكية",
      "تم تحديث نسب الملكية لهذا العقار.",
      req.user!.id
    );

    res.status(201).json({ ownership: result });
  })
);
