import { Router } from "express";
import { z } from "zod";
import { AccountType, LeadStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requireAccountType } from "../../middleware/accountType";
import { validateBody } from "../../middleware/validate";

export const leadsRouter = Router();
leadsRouter.use(requireAuth, requireAccountType(AccountType.BROKER));

// GET /api/broker/leads?status=&listingId=
leadsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, listingId } = req.query as Record<string, string | undefined>;
    const leads = await prisma.lead.findMany({
      where: {
        brokerId: req.user!.id,
        ...(status ? { status: status as LeadStatus } : {}),
        ...(listingId ? { listingId } : {}),
      },
      include: { listing: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ leads });
  })
);

const createLeadSchema = z.object({
  fullName: z.string().min(2, "اسم العميل المحتمل مطلوب."),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  listingId: z.string().optional(),
});

// POST /api/broker/leads
leadsRouter.post(
  "/",
  validateBody(createLeadSchema),
  asyncHandler(async (req, res) => {
    const { listingId, ...rest } = req.body;
    if (listingId) {
      const listing = await prisma.listing.findFirst({ where: { id: listingId, brokerId: req.user!.id } });
      if (!listing) throw AppError.badRequest("الإعلان المرتبط غير موجود.");
    }
    const lead = await prisma.lead.create({ data: { brokerId: req.user!.id, listingId: listingId || undefined, ...rest } });
    res.status(201).json({ lead });
  })
);

const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.nativeEnum(LeadStatus).optional(),
});

// PATCH /api/broker/leads/:id
leadsRouter.patch(
  "/:id",
  validateBody(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, brokerId: req.user!.id } });
    if (!existing) throw AppError.notFound("العميل المحتمل غير موجود.");
    const { listingId, ...rest } = req.body;
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { ...rest, ...(listingId !== undefined ? { listingId: listingId || null } : {}) },
    });
    res.json({ lead });
  })
);

// DELETE /api/broker/leads/:id
leadsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, brokerId: req.user!.id } });
    if (!existing) throw AppError.notFound("العميل المحتمل غير موجود.");
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
