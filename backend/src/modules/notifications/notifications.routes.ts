import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// GET /api/notifications?unreadOnly=true
notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { unreadOnly } = req.query as Record<string, string | undefined>;
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id, ...(unreadOnly === "true" ? { isRead: false } : {}) },
      include: { property: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });
    res.json({ notifications, unreadCount });
  })
);

// POST /api/notifications/:id/read
notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.status(204).send();
  })
);

// POST /api/notifications/read-all
notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
    res.status(204).send();
  })
);
