import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { logActivity } from "../../utils/audit";

export const tenantsRouter = Router();
tenantsRouter.use(requireAuth);

// GET /api/properties/:propertyId/tenants
tenantsRouter.get(
  "/:propertyId/tenants",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const tenants = await prisma.tenant.findMany({
      where: { propertyId: req.params.propertyId },
      include: { _count: { select: { transactions: true, maintenanceRequests: true } } },
      orderBy: { unitLabel: "asc" },
    });
    res.json({
      tenants: tenants.map((t) => ({ ...t, portalPath: `/tenant/${t.accessToken}` })),
    });
  })
);

const createTenantSchema = z.object({
  unitLabel: z.string().min(1, "رقم/اسم الوحدة مطلوب."),
  fullName: z.string().min(2, "اسم المستأجر مطلوب."),
  phone: z.string().optional(),
});

// POST /api/properties/:propertyId/tenants
tenantsRouter.post(
  "/:propertyId/tenants",
  requirePropertyRole(Role.MANAGER),
  validateBody(createTenantSchema),
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.create({ data: { propertyId: req.params.propertyId, ...req.body } });
    await logActivity(req.params.propertyId, req.user!.id, "TENANT_ADDED", `تمت إضافة مستأجر: ${tenant.fullName} (${tenant.unitLabel}).`);
    res.status(201).json({ tenant: { ...tenant, portalPath: `/tenant/${tenant.accessToken}` } });
  })
);

const updateTenantSchema = createTenantSchema.partial();

// PATCH /api/properties/:propertyId/tenants/:id
tenantsRouter.patch(
  "/:propertyId/tenants/:id",
  requirePropertyRole(Role.MANAGER),
  validateBody(updateTenantSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.tenant.findFirst({ where: { id: req.params.id, propertyId: req.params.propertyId } });
    if (!existing) throw AppError.notFound("المستأجر غير موجود.");
    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: req.body });
    res.json({ tenant: { ...tenant, portalPath: `/tenant/${tenant.accessToken}` } });
  })
);

// DELETE /api/properties/:propertyId/tenants/:id
tenantsRouter.delete(
  "/:propertyId/tenants/:id",
  requirePropertyRole(Role.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.tenant.findFirst({ where: { id: req.params.id, propertyId: req.params.propertyId } });
    if (!existing) throw AppError.notFound("المستأجر غير موجود.");
    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
