import { Request, Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { FEATURES, FEATURE_KEYS, featureLabel } from "../../lib/features";
import { getPlatformSettings, savePlatformSettings } from "../../lib/platform";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody } from "../../middleware/validate";
import { requireAuth, requireAdmin, isAdminEmail } from "../../middleware/auth";
import { adminLimiter } from "../../middleware/rateLimit";

// Everything under /api/admin: only accounts whose email is listed in the
// ADMIN_EMAILS environment variable can get past requireAdmin.
export const adminRouter = Router();
adminRouter.use(adminLimiter, requireAuth, requireAdmin);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function audit(req: Request, action: string, target?: { id: string; label: string } | null, details?: string) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action,
      targetId: target?.id,
      targetLabel: target?.label,
      details,
      ip: req.ip,
    },
  });
}

async function loadTarget(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound("الحساب غير موجود.");
  return user;
}

// Admins are managed through configuration only — never through this API.
function assertManageable(req: Request, target: { id: string; email: string }) {
  if (target.id === req.user!.id) throw AppError.badRequest("لا يمكنك تنفيذ هذا الإجراء على حسابك الخاص.");
  if (isAdminEmail(target.email)) throw AppError.forbidden("لا يمكن تنفيذ هذا الإجراء على حساب أدمن آخر.");
}

const label = (u: { fullName: string; email: string }) => `${u.fullName} <${u.email}>`;

function randomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.randomBytes(14);
  for (let i = 0; i < 14; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function toListUser(u: any) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    accountType: u.accountType,
    status: u.status,
    statusReason: u.statusReason,
    isAdmin: isAdminEmail(u.email),
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    lastLoginIp: u.lastLoginIp,
    locked: !!(u.lockedUntil && u.lockedUntil > new Date()),
    propertiesCount: u._count?.propertyMemberships ?? 0,
    restrictionsCount: u._count?.featureRestrictions ?? 0,
  };
}

// ---------------------------------------------------------------------------
// overview
// ---------------------------------------------------------------------------

adminRouter.get("/stats", asyncHandler(async (_req, res) => {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const notRemoved = { status: { not: UserStatus.REMOVED } };

  const [total, active, suspended, removed, owners, brokers, new7, new30, active7, locked, restrictedGroups, properties, recent, settings] =
    await Promise.all([
      prisma.user.count({ where: notRemoved }),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      prisma.user.count({ where: { status: UserStatus.REMOVED } }),
      prisma.user.count({ where: { ...notRemoved, accountType: "OWNER" } }),
      prisma.user.count({ where: { ...notRemoved, accountType: "BROKER" } }),
      prisma.user.count({ where: { ...notRemoved, createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { ...notRemoved, createdAt: { gte: d30 } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: d7 } } }),
      prisma.user.count({ where: { lockedUntil: { gt: now } } }),
      prisma.userFeatureRestriction.groupBy({ by: ["userId"] }),
      prisma.property.count(),
      prisma.user.findMany({ where: notRemoved, orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { propertyMemberships: true, featureRestrictions: true } } } }),
      getPlatformSettings(),
    ]);

  res.json({
    stats: {
      total, active, suspended, removed, owners, brokers,
      newLast7Days: new7, newLast30Days: new30, activeLast7Days: active7,
      lockedNow: locked, usersWithRestrictions: restrictedGroups.length, properties,
    },
    recentUsers: recent.map(toListUser),
    platform: settings,
  });
}));

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

adminRouter.get("/users", asyncHandler(async (req, res) => {
  const { search, status, accountType, locked } = req.query as Record<string, string | undefined>;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  const where: Prisma.UserWhereInput = {};
  if (status === "ACTIVE" || status === "SUSPENDED" || status === "REMOVED") where.status = status as UserStatus;
  else if (status !== "ALL") where.status = { not: UserStatus.REMOVED };
  if (accountType === "OWNER" || accountType === "BROKER") where.accountType = accountType;
  if (locked === "true") where.lockedUntil = { gt: new Date() };
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { propertyMemberships: true, featureRestrictions: true } } },
    }),
  ]);
  res.json({ users: users.map(toListUser), total, page, pageSize });
}));

adminRouter.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      featureRestrictions: { orderBy: { createdAt: "desc" } },
      propertyMemberships: { include: { property: { select: { id: true, name: true } } } },
      _count: { select: { propertyMemberships: true, featureRestrictions: true, transactionsCreated: true, documentsUploaded: true } },
    },
  });
  if (!user) throw AppError.notFound("الحساب غير موجود.");
  res.json({
    user: {
      ...toListUser(user),
      statusChangedAt: user.statusChangedAt,
      failedLogins: user.failedLogins,
      lockedUntil: user.lockedUntil,
      transactionsCount: user._count.transactionsCreated,
      documentsCount: user._count.documentsUploaded,
      properties: user.propertyMemberships.map((m) => ({ id: m.property.id, name: m.property.name, role: m.role })),
      restrictions: user.featureRestrictions.map((r) => ({
        feature: r.feature, label: featureLabel(r.feature), reason: r.reason, createdAt: r.createdAt,
      })),
    },
  });
}));

const reasonSchema = z.object({ reason: z.string().trim().min(3, "اكتب السبب (3 أحرف على الأقل).").max(300) });

// Ban (suspend) — user is signed out immediately and sees the reason at login.
adminRouter.post("/users/:id/ban", validateBody(reasonSchema), asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);
  assertManageable(req, target);
  if (target.status === UserStatus.REMOVED) throw AppError.badRequest("الحساب محذوف مسبقًا.");
  await prisma.user.update({
    where: { id: target.id },
    data: { status: UserStatus.SUSPENDED, statusReason: req.body.reason, statusChangedAt: new Date(), tokenVersion: { increment: 1 } },
  });
  await audit(req, "USER_BAN", { id: target.id, label: label(target) }, req.body.reason);
  res.json({ ok: true });
}));

adminRouter.post("/users/:id/unban", asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);
  assertManageable(req, target);
  if (target.status !== UserStatus.SUSPENDED) throw AppError.badRequest("الحساب غير محظور.");
  await prisma.user.update({
    where: { id: target.id },
    data: { status: UserStatus.ACTIVE, statusReason: null, statusChangedAt: new Date() },
  });
  await audit(req, "USER_UNBAN", { id: target.id, label: label(target) });
  res.json({ ok: true });
}));

// Remove = deactivate + anonymize. Rows the account created (transactions,
// votes, ownership history...) must stay so shared property ledgers remain
// consistent for the other partners, so the account is wiped of personal
// data instead of being hard-deleted.
const removeSchema = z.object({ confirmEmail: z.string().trim().min(3) });
adminRouter.post("/users/:id/remove", validateBody(removeSchema), asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);
  assertManageable(req, target);
  if (target.status === UserStatus.REMOVED) throw AppError.badRequest("الحساب محذوف مسبقًا.");
  if (req.body.confirmEmail.toLowerCase() !== target.email.toLowerCase()) {
    throw AppError.badRequest("البريد المكتوب لا يطابق بريد الحساب.");
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: {
        status: UserStatus.REMOVED,
        statusReason: "تمت إزالة الحساب بواسطة الإدارة",
        statusChangedAt: new Date(),
        email: `removed-${target.id}@removed.invalid`,
        fullName: "حساب محذوف",
        phone: null,
        avatarUrl: null,
        passwordHash: "",
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.userFeatureRestriction.deleteMany({ where: { userId: target.id } }),
    prisma.notification.deleteMany({ where: { userId: target.id } }),
  ]);
  await audit(req, "USER_REMOVE", { id: target.id, label: label(target) });
  res.json({ ok: true });
}));

// Set a new password: either one the admin types, or a random temporary one
// that is returned exactly once. All existing sessions are signed out.
const passwordSchema = z.object({ password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل.").max(100).optional() });
adminRouter.post("/users/:id/reset-password", validateBody(passwordSchema), asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);
  assertManageable(req, target);
  if (target.status === UserStatus.REMOVED) throw AppError.badRequest("الحساب محذوف.");
  const generated = !req.body.password;
  const password: string = req.body.password ?? randomPassword();
  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetTokenHash: null,
      passwordResetExpires: null,
      failedLogins: 0,
      lockedUntil: null,
      tokenVersion: { increment: 1 },
    },
  });
  await audit(req, "USER_RESET_PASSWORD", { id: target.id, label: label(target) }, generated ? "كلمة مرور مؤقتة مولّدة" : "كلمة مرور محددة من الأدمن");
  res.json({ ok: true, generated, temporaryPassword: generated ? password : undefined });
}));

adminRouter.post("/users/:id/force-logout", asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);
  assertManageable(req, target);
  await prisma.user.update({ where: { id: target.id }, data: { tokenVersion: { increment: 1 } } });
  await audit(req, "USER_FORCE_LOGOUT", { id: target.id, label: label(target) });
  res.json({ ok: true });
}));

adminRouter.post("/users/:id/unlock", asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);
  await prisma.user.update({ where: { id: target.id }, data: { failedLogins: 0, lockedUntil: null } });
  await audit(req, "USER_UNLOCK", { id: target.id, label: label(target) });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// per-user feature switches
// ---------------------------------------------------------------------------

adminRouter.get("/features", (_req, res) => {
  res.json({ features: FEATURES.map((f) => ({ key: f.key, label: f.label, description: f.description })) });
});

// Disable a feature for one user. The reason is shown to that user.
adminRouter.put("/users/:id/features/:feature", validateBody(reasonSchema), asyncHandler(async (req, res) => {
  const { feature } = req.params;
  if (!FEATURE_KEYS.includes(feature)) throw AppError.badRequest("ميزة غير معروفة.");
  const target = await loadTarget(req.params.id);
  assertManageable(req, target);
  await prisma.userFeatureRestriction.upsert({
    where: { userId_feature: { userId: target.id, feature } },
    create: { userId: target.id, feature, reason: req.body.reason, createdById: req.user!.id },
    update: { reason: req.body.reason, createdById: req.user!.id },
  });
  await audit(req, "FEATURE_DISABLE", { id: target.id, label: label(target) }, `${featureLabel(feature)} — ${req.body.reason}`);
  res.json({ ok: true });
}));

// Re-enable a feature for one user.
adminRouter.delete("/users/:id/features/:feature", asyncHandler(async (req, res) => {
  const { feature } = req.params;
  const target = await loadTarget(req.params.id);
  await prisma.userFeatureRestriction.deleteMany({ where: { userId: target.id, feature } });
  await audit(req, "FEATURE_ENABLE", { id: target.id, label: label(target) }, featureLabel(feature));
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// platform-wide controls
// ---------------------------------------------------------------------------

adminRouter.get("/platform", asyncHandler(async (_req, res) => {
  res.json({ platform: await getPlatformSettings() });
}));

const platformSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().trim().min(3).max(300).optional(),
  registrationOpen: z.boolean().optional(),
  disabledFeatures: z.record(z.string().max(300)).optional(),
});
adminRouter.put("/platform", validateBody(platformSchema), asyncHandler(async (req, res) => {
  const patch = { ...req.body } as any;
  if (patch.disabledFeatures) {
    for (const key of Object.keys(patch.disabledFeatures)) {
      if (!FEATURE_KEYS.includes(key)) throw AppError.badRequest("ميزة غير معروفة.");
    }
  }
  const next = await savePlatformSettings(patch);
  await audit(req, "PLATFORM_UPDATE", null, JSON.stringify(patch));
  res.json({ platform: next });
}));

// Signs every user out (except the admin who triggered it).
adminRouter.post("/force-logout-all", asyncHandler(async (req, res) => {
  const result = await prisma.user.updateMany({
    where: { id: { not: req.user!.id }, status: { not: UserStatus.REMOVED } },
    data: { tokenVersion: { increment: 1 } },
  });
  await audit(req, "FORCE_LOGOUT_ALL", null, `${result.count} حساب`);
  res.json({ ok: true, count: result.count });
}));

// ---------------------------------------------------------------------------
// announcements (broadcast to every user's notification inbox)
// ---------------------------------------------------------------------------

const announcementSchema = z.object({
  title: z.string().trim().min(2, "العنوان مطلوب.").max(120),
  message: z.string().trim().min(2, "نص التعميم مطلوب.").max(1000),
  audience: z.enum(["ALL", "OWNER", "BROKER"]).default("ALL"),
});
adminRouter.post("/announcements", validateBody(announcementSchema), asyncHandler(async (req, res) => {
  const { title, message, audience } = req.body;
  const users = await prisma.user.findMany({
    where: { status: UserStatus.ACTIVE, ...(audience === "ALL" ? {} : { accountType: audience }) },
    select: { id: true },
  });

  const CHUNK = 1000;
  for (let i = 0; i < users.length; i += CHUNK) {
    await prisma.notification.createMany({
      data: users.slice(i, i + CHUNK).map((u) => ({ userId: u.id, type: "ANNOUNCEMENT", title, message })),
    });
  }
  const announcement = await prisma.announcement.create({
    data: { title, message, audience, recipientCount: users.length, createdById: req.user!.id },
  });
  await audit(req, "ANNOUNCEMENT_SEND", null, `${title} — ${users.length} مستلم (${audience})`);
  res.status(201).json({ announcement });
}));

adminRouter.get("/announcements", asyncHandler(async (_req, res) => {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ announcements });
}));

// ---------------------------------------------------------------------------
// admin audit log
// ---------------------------------------------------------------------------

adminRouter.get("/audit-log", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 30;
  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count(),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({ logs, total, page, pageSize });
}));
