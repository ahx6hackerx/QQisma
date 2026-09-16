import { Router } from "express";
import { z } from "zod";
import { MaintenanceStatus, MaintenanceUrgency, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { logActivity } from "../../utils/audit";

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth);

// GET /api/properties/:propertyId/maintenance?status=
maintenanceRouter.get(
  "/:propertyId/maintenance",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { status } = req.query as Record<string, string | undefined>;
    const requests = await prisma.maintenanceRequest.findMany({
      where: { propertyId: req.params.propertyId, ...(status ? { status: status as MaintenanceStatus } : {}) },
      include: { tenant: { select: { id: true, fullName: true, unitLabel: true } }, vendor: true },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    });
    res.json({ requests });
  })
);

const createSchema = z.object({
  title: z.string().min(2, "عنوان الطلب مطلوب."),
  description: z.string().optional(),
  urgency: z.nativeEnum(MaintenanceUrgency).default("NORMAL"),
});

// POST /api/properties/:propertyId/maintenance — a partner/manager can also
// log an issue directly (not just tenants via the public portal).
maintenanceRouter.post(
  "/:propertyId/maintenance",
  requirePropertyMember,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const request = await prisma.maintenanceRequest.create({ data: { propertyId: req.params.propertyId, ...req.body } });
    res.status(201).json({ request });
  })
);

const updateSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus).optional(),
  vendorId: z.string().nullable().optional(),
  quoteAmount: z.number().positive().nullable().optional(),
});

// PATCH /api/properties/:propertyId/maintenance/:id — assign a vendor, log a
// quote, or move through the status pipeline.
maintenanceRouter.patch(
  "/:propertyId/maintenance/:id",
  requirePropertyRole(Role.MANAGER),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.maintenanceRequest.findFirst({ where: { id: req.params.id, propertyId: req.params.propertyId } });
    if (!existing) throw AppError.notFound("طلب الصيانة غير موجود.");
    const request = await prisma.maintenanceRequest.update({ where: { id: req.params.id }, data: req.body });
    if (req.body.status === "DONE") {
      await logActivity(req.params.propertyId, req.user!.id, "MAINTENANCE_DONE", `تم إنجاز طلب الصيانة: ${existing.title}.`);
    }
    res.json({ request });
  })
);
