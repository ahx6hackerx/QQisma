import { Router } from "express";
import { AccountType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requireAccountType } from "../../middleware/accountType";

export const brokerDashboardRouter = Router();
brokerDashboardRouter.use(requireAuth, requireAccountType(AccountType.BROKER));

// GET /api/broker/dashboard — quick counts for the broker's landing screen
brokerDashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const brokerId = req.user!.id;

    const [totalListings, availableListings, totalLeads, activeLeads, recentLeads] = await Promise.all([
      prisma.listing.count({ where: { brokerId } }),
      prisma.listing.count({ where: { brokerId, status: "AVAILABLE" } }),
      prisma.lead.count({ where: { brokerId } }),
      prisma.lead.count({ where: { brokerId, status: { in: ["NEW", "CONTACTED", "VIEWING_SCHEDULED", "NEGOTIATING"] } } }),
      prisma.lead.findMany({
        where: { brokerId },
        include: { listing: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    res.json({ totalListings, availableListings, totalLeads, activeLeads, recentLeads });
  })
);
