import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// GET /api/dashboard — portfolio-wide overview across every property the
// caller is a partner on. This powers the app's landing screen.
dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const memberships = await prisma.propertyMember.findMany({
      where: { userId },
      include: { property: true },
    });
    const propertyIds = memberships.map((m) => m.propertyId);

    const [ownershipRecords, openDisputes, pendingDecisions, unreadNotifications] = await Promise.all([
      prisma.ownershipRecord.findMany({ where: { propertyId: { in: propertyIds }, userId, effectiveTo: null } }),
      prisma.dispute.count({ where: { propertyId: { in: propertyIds }, status: { not: "RESOLVED" } } }),
      prisma.decision.count({ where: { propertyId: { in: propertyIds }, status: "VOTING" } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const shareByProperty = new Map<string, number>(ownershipRecords.map((o) => [o.propertyId, o.sharePercent]));

    let portfolioValue = 0;
    const properties = memberships.map((m) => {
      const sharePercent = shareByProperty.get(m.propertyId) ?? 0;
      const shareValue = m.property.estimatedValue ? (m.property.estimatedValue * sharePercent) / 100 : 0;
      portfolioValue += shareValue;
      return {
        id: m.property.id,
        name: m.property.name,
        myRole: m.role,
        sharePercent,
        shareValue: Math.round(shareValue * 100) / 100,
      };
    });

    res.json({
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      propertiesCount: properties.length,
      openDisputes,
      pendingDecisions,
      unreadNotifications,
      properties,
    });
  })
);
