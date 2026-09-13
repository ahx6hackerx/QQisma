import { Router } from "express";
import { z } from "zod";
import { AccountType, ListingStatus, ListingType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requireAccountType } from "../../middleware/accountType";
import { validateBody } from "../../middleware/validate";

export const listingsRouter = Router();
listingsRouter.use(requireAuth, requireAccountType(AccountType.BROKER));

// GET /api/broker/listings?status=&listingType=
listingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, listingType } = req.query as Record<string, string | undefined>;
    const listings = await prisma.listing.findMany({
      where: {
        brokerId: req.user!.id,
        ...(status ? { status: status as ListingStatus } : {}),
        ...(listingType ? { listingType: listingType as ListingType } : {}),
      },
      include: { _count: { select: { leads: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ listings });
  })
);

const createListingSchema = z.object({
  title: z.string().min(2, "عنوان الإعلان مطلوب."),
  propertyType: z.string().min(1, "نوع العقار مطلوب."),
  listingType: z.nativeEnum(ListingType),
  price: z.number().positive("السعر يجب أن يكون أكبر من صفر."),
  city: z.string().optional(),
  address: z.string().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  areaSqm: z.number().positive().optional(),
  description: z.string().optional(),
});

// POST /api/broker/listings
listingsRouter.post(
  "/",
  validateBody(createListingSchema),
  asyncHandler(async (req, res) => {
    const listing = await prisma.listing.create({ data: { brokerId: req.user!.id, ...req.body } });
    res.status(201).json({ listing });
  })
);

// GET /api/broker/listings/:id
listingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const listing = await prisma.listing.findFirst({
      where: { id: req.params.id, brokerId: req.user!.id },
      include: { leads: { orderBy: { createdAt: "desc" } } },
    });
    if (!listing) throw AppError.notFound("الإعلان غير موجود.");
    res.json({ listing });
  })
);

const updateListingSchema = createListingSchema.partial().extend({
  status: z.nativeEnum(ListingStatus).optional(),
});

// PATCH /api/broker/listings/:id
listingsRouter.patch(
  "/:id",
  validateBody(updateListingSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.listing.findFirst({ where: { id: req.params.id, brokerId: req.user!.id } });
    if (!existing) throw AppError.notFound("الإعلان غير موجود.");
    const listing = await prisma.listing.update({ where: { id: req.params.id }, data: req.body });
    res.json({ listing });
  })
);

// DELETE /api/broker/listings/:id
listingsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.listing.findFirst({ where: { id: req.params.id, brokerId: req.user!.id } });
    if (!existing) throw AppError.notFound("الإعلان غير موجود.");
    await prisma.listing.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
