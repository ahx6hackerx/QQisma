import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";

export const vendorsRouter = Router();
vendorsRouter.use(requireAuth);

// GET /api/properties/:propertyId/vendors
vendorsRouter.get(
  "/:propertyId/vendors",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const vendors = await prisma.vendor.findMany({
      where: { propertyId: req.params.propertyId },
      include: { _count: { select: { requests: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ vendors });
  })
);

const createVendorSchema = z.object({
  name: z.string().min(2, "اسم المزوّد مطلوب."),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/properties/:propertyId/vendors
vendorsRouter.post(
  "/:propertyId/vendors",
  requirePropertyRole(Role.MANAGER),
  validateBody(createVendorSchema),
  asyncHandler(async (req, res) => {
    const vendor = await prisma.vendor.create({ data: { propertyId: req.params.propertyId, ...req.body } });
    res.status(201).json({ vendor });
  })
);

// PATCH /api/properties/:propertyId/vendors/:id
vendorsRouter.patch(
  "/:propertyId/vendors/:id",
  requirePropertyRole(Role.MANAGER),
  validateBody(createVendorSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.vendor.findFirst({ where: { id: req.params.id, propertyId: req.params.propertyId } });
    if (!existing) throw AppError.notFound("المزوّد غير موجود.");
    const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data: req.body });
    res.json({ vendor });
  })
);

// DELETE /api/properties/:propertyId/vendors/:id
vendorsRouter.delete(
  "/:propertyId/vendors/:id",
  requirePropertyRole(Role.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.vendor.findFirst({ where: { id: req.params.id, propertyId: req.params.propertyId } });
    if (!existing) throw AppError.notFound("المزوّد غير موجود.");
    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
