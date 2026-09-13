import { Router } from "express";
import { z } from "zod";
import { ApprovalRuleType, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { getCurrentOwnership } from "../../utils/ownership";
import { logActivity } from "../../utils/audit";
import { notifyPropertyMembers } from "../../utils/notify";

export const propertiesRouter = Router();
propertiesRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

// GET /api/properties — every property the caller is a partner/manager on
propertiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await prisma.propertyMember.findMany({
      where: { userId: req.user!.id },
      include: {
        property: {
          include: {
            _count: { select: { members: true, disputes: { where: { status: { not: "RESOLVED" } } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      properties: memberships.map((m) => ({
        id: m.property.id,
        name: m.property.name,
        address: m.property.address,
        estimatedValue: m.property.estimatedValue,
        myRole: m.role,
        partnersCount: m.property._count.members,
        openDisputes: m.property._count.disputes,
      })),
    });
  })
);

const createPropertySchema = z.object({
  organizationId: z.string().min(1, "المجموعة مطلوبة."),
  name: z.string().min(2, "اسم العقار مطلوب."),
  address: z.string().optional(),
  estimatedValue: z.number().positive().optional(),
  ownershipShares: z
    .array(
      z.object({
        email: z.string().email("بريد إلكتروني غير صحيح."),
        fullName: z.string().optional(),
        sharePercent: z.number().positive().max(100),
      })
    )
    .min(1, "أضف نسب الملكية للشركاء."),
});

// POST /api/properties — create a property + initial ownership structure.
// Partners are identified by email: an existing account is reused, or a
// placeholder account is created for them to claim later (same pattern as
// inviting a partner onto an existing property).
propertiesRouter.post(
  "/",
  validateBody(createPropertySchema),
  asyncHandler(async (req, res) => {
    const { organizationId, name, address, estimatedValue, ownershipShares } = req.body;

    const orgMembership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: req.user!.id } },
    });
    if (!orgMembership) throw AppError.forbidden("لست عضوًا في هذه المجموعة.");

    const totalShare = Math.round(ownershipShares.reduce((s: number, o: { sharePercent: number }) => s + o.sharePercent, 0) * 100) / 100;
    if (totalShare !== 100) {
      throw AppError.badRequest(`مجموع نسب الملكية يجب أن يساوي 100%. المجموع الحالي: ${totalShare}%`);
    }

    // Resolve each partner's email to a user account, creating a
    // placeholder one (claimable later via "forgot password") if needed.
    const resolvedShares: { userId: string; sharePercent: number }[] = [];
    for (const share of ownershipShares as { email: string; fullName?: string; sharePercent: number }[]) {
      let partner = await prisma.user.findUnique({ where: { email: share.email } });
      if (!partner) {
        if (share.email === req.user!.email) {
          partner = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
        } else {
          partner = await prisma.user.create({
            data: { email: share.email, fullName: share.fullName ?? share.email.split("@")[0], passwordHash: "" },
          });
        }
      }
      resolvedShares.push({ userId: partner.id, sharePercent: share.sharePercent });
    }

    const property = await prisma.property.create({
      data: {
        organizationId,
        name,
        address,
        estimatedValue,
        members: {
          create: resolvedShares.map((o) => ({ userId: o.userId, role: Role.OWNER })),
        },
        ownershipRecords: {
          create: resolvedShares.map((o) => ({ userId: o.userId, sharePercent: o.sharePercent })),
        },
      },
      include: { members: true, ownershipRecords: true },
    });

    await logActivity(property.id, req.user!.id, "PROPERTY_CREATED", `تم إنشاء العقار "${name}"`);
    res.status(201).json({ property });
  })
);

// GET /api/properties/:propertyId — overview (ownership + quick stats)
propertiesRouter.get(
  "/:propertyId",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
    const ownership = await getCurrentOwnership(propertyId);

    const [openDisputes, pendingDecisions, latestClosing, unverifiedCount] = await Promise.all([
      prisma.dispute.count({ where: { propertyId, status: { not: "RESOLVED" } } }),
      prisma.decision.count({ where: { propertyId, status: "VOTING" } }),
      prisma.monthlyClosing.findFirst({ where: { propertyId }, orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }] }),
      prisma.transaction.count({ where: { propertyId, status: { in: ["REPORTED", "EVIDENCE_SUBMITTED", "UNDER_REVIEW"] } } }),
    ]);

    res.json({
      property,
      myRole: req.propertyRole,
      ownership,
      stats: { openDisputes, pendingDecisions, unverifiedCount, latestClosing },
    });
  })
);

const updatePropertySchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  estimatedValue: z.number().positive().optional(),
  approvalRuleType: z.nativeEnum(ApprovalRuleType).optional(),
  noApprovalBelowAmount: z.number().nonnegative().optional(),
  managerApprovalBelowAmount: z.number().nonnegative().optional(),
});

// PATCH /api/properties/:propertyId — settings (OWNER only)
propertiesRouter.patch(
  "/:propertyId",
  requirePropertyRole(Role.OWNER),
  validateBody(updatePropertySchema),
  asyncHandler(async (req, res) => {
    const property = await prisma.property.update({
      where: { id: req.params.propertyId },
      data: req.body,
    });
    res.json({ property });
  })
);

// ---------------------------------------------------------------------------
// Partners (property members)
// ---------------------------------------------------------------------------

// GET /api/properties/:propertyId/partners
propertiesRouter.get(
  "/:propertyId/partners",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const members = await prisma.propertyMember.findMany({
      where: { propertyId: req.params.propertyId },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });
    res.json({ partners: members });
  })
);

const invitePartnerSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح."),
  fullName: z.string().min(2).optional(),
  role: z.nativeEnum(Role).default(Role.VIEWER),
});

// POST /api/properties/:propertyId/partners — invite/attach a partner.
// If the email doesn't exist yet, creates a placeholder account they can
// claim later (dev-simple stand-in for a real email invite flow).
propertiesRouter.post(
  "/:propertyId/partners",
  requirePropertyRole(Role.OWNER),
  validateBody(invitePartnerSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { email, fullName, role } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      if (!fullName) throw AppError.badRequest("الاسم الكامل مطلوب لإضافة شريك جديد.");
      user = await prisma.user.create({
        data: { email, fullName, passwordHash: "" }, // claims account via "forgot password" flow
      });
    }

    const membership = await prisma.propertyMember.upsert({
      where: { propertyId_userId: { propertyId, userId: user.id } },
      update: { role },
      create: { propertyId, userId: user.id, role },
    });

    await logActivity(propertyId, req.user!.id, "PARTNER_ADDED", `تمت إضافة ${user.fullName} كشريك (${role})`);
    await notifyPropertyMembers(
      propertyId,
      "PARTNER_ADDED",
      "شريك جديد",
      `تمت إضافة ${user.fullName} إلى العقار.`,
      req.user!.id
    );

    res.status(201).json({ membership, user: { id: user.id, fullName: user.fullName, email: user.email } });
  })
);

const updatePartnerRoleSchema = z.object({ role: z.nativeEnum(Role) });

// PATCH /api/properties/:propertyId/partners/:userId
propertiesRouter.patch(
  "/:propertyId/partners/:userId",
  requirePropertyRole(Role.OWNER),
  validateBody(updatePartnerRoleSchema),
  asyncHandler(async (req, res) => {
    const { propertyId, userId } = req.params;
    const membership = await prisma.propertyMember.update({
      where: { propertyId_userId: { propertyId, userId } },
      data: { role: req.body.role },
    });
    res.json({ membership });
  })
);
