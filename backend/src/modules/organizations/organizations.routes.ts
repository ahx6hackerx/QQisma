import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { Role } from "@prisma/client";

export const organizationsRouter = Router();
organizationsRouter.use(requireAuth);

// GET /api/organizations — organizations the caller belongs to
organizationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user!.id },
      include: { organization: { include: { _count: { select: { properties: true } } } } },
    });
    res.json({
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
        propertiesCount: m.organization._count.properties,
      })),
    });
  })
);

const createOrgSchema = z.object({ name: z.string().min(2, "اسم المجموعة مطلوب.") });

// POST /api/organizations — create a family/investor group, caller becomes OWNER
organizationsRouter.post(
  "/",
  validateBody(createOrgSchema),
  asyncHandler(async (req, res) => {
    const organization = await prisma.organization.create({
      data: {
        name: req.body.name,
        members: { create: { userId: req.user!.id, role: Role.OWNER } },
      },
    });
    res.status(201).json({ organization });
  })
);
