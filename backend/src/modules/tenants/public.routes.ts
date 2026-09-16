import { Router } from "express";
import { z } from "zod";
import { ConfirmationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody } from "../../middleware/validate";
import { notifyPropertyMembers } from "../../utils/notify";
import { logActivity } from "../../utils/audit";

// Every route here is deliberately unauthenticated — the tenant has no
// قِسمة account. The unguessable `accessToken` in the URL is the only
// credential, the same pattern already used for confirmation links.
export const tenantPortalRouter = Router();

async function loadTenant(token: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { accessToken: token },
    include: { property: { select: { id: true, name: true, address: true } } },
  });
  if (!tenant) throw AppError.notFound("رابط غير صالح.");
  return tenant;
}

// GET /api/public/tenant/:token
tenantPortalRouter.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const tenant = await loadTenant(req.params.token);
    const transactions = await prisma.transaction.findMany({
      where: { tenantId: tenant.id },
      include: { confirmation: true },
      orderBy: { date: "desc" },
      take: 24,
    });
    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      tenant: { id: tenant.id, fullName: tenant.fullName, unitLabel: tenant.unitLabel, property: tenant.property },
      transactions,
      maintenanceRequests,
    });
  })
);

const respondSchema = z.object({ confirmed: z.boolean(), actualAmount: z.number().positive().optional() });

// POST /api/public/tenant/:token/transactions/:transactionId/respond
tenantPortalRouter.post(
  "/:token/transactions/:transactionId/respond",
  validateBody(respondSchema),
  asyncHandler(async (req, res) => {
    const tenant = await loadTenant(req.params.token);
    const transaction = await prisma.transaction.findFirst({ where: { id: req.params.transactionId, tenantId: tenant.id } });
    if (!transaction) throw AppError.notFound("العملية غير موجودة.");

    const { confirmed, actualAmount } = req.body;
    const status = confirmed ? ConfirmationStatus.CONFIRMED : ConfirmationStatus.AMOUNT_DIFFERENT;
    const confirmedAmount = confirmed ? transaction.amount : actualAmount ?? null;

    const confirmation = await prisma.confirmation.upsert({
      where: { transactionId: transaction.id },
      update: { status, confirmedAmount, respondentName: tenant.fullName },
      create: { transactionId: transaction.id, status, confirmedAmount, respondentName: tenant.fullName },
    });

    await logActivity(
      tenant.propertyId,
      null,
      "CONFIRMATION_RECEIVED",
      confirmed
        ? `أكّد المستأجر ${tenant.fullName} صحة المبلغ المسجل.`
        : `أشار المستأجر ${tenant.fullName} إلى مبلغ مختلف: ${actualAmount} JOD.`
    );
    await notifyPropertyMembers(
      tenant.propertyId,
      "CONFIRMATION_RECEIVED",
      confirmed ? "تم التأكيد من المستأجر" : "فرق في تأكيد المستأجر",
      confirmed
        ? `أكّد ${tenant.fullName} (${tenant.unitLabel}) صحة المبلغ.`
        : `أشار ${tenant.fullName} (${tenant.unitLabel}) إلى مبلغ مختلف (${actualAmount} JOD).`
    );

    res.json({ confirmation });
  })
);

const maintenanceSchema = z.object({
  title: z.string().min(2, "عنوان المشكلة مطلوب."),
  description: z.string().optional(),
  urgency: z.enum(["LOW", "NORMAL", "URGENT"]).default("NORMAL"),
});

// POST /api/public/tenant/:token/maintenance
tenantPortalRouter.post(
  "/:token/maintenance",
  validateBody(maintenanceSchema),
  asyncHandler(async (req, res) => {
    const tenant = await loadTenant(req.params.token);
    const request = await prisma.maintenanceRequest.create({
      data: { propertyId: tenant.propertyId, tenantId: tenant.id, ...req.body },
    });
    await notifyPropertyMembers(
      tenant.propertyId,
      "MAINTENANCE_REQUESTED",
      "بلاغ صيانة جديد",
      `${tenant.fullName} (${tenant.unitLabel}): ${req.body.title}`
    );
    res.status(201).json({ request });
  })
);
