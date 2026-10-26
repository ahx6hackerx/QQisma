import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AccountType, UserStatus } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody } from "../../middleware/validate";
import { requireAuth, isAdminEmail } from "../../middleware/auth";
import { getPlatformSettings } from "../../lib/platform";
import { featureLabel } from "../../lib/features";
import { authLimiter } from "../../middleware/rateLimit";
import { upload, publicUploadUrl } from "../../utils/upload";
import { issuePasswordReset, hashToken } from "../../utils/passwordReset";

export const authRouter = Router();

const registerSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب."),
  email: z.string().email("البريد الإلكتروني غير صحيح."),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل."),
  phone: z.string().optional(),
  accountType: z.nativeEnum(AccountType).default(AccountType.OWNER),
});

// `tv` ties the token to the user's tokenVersion, so the admin can force a
// logout (or a password change can invalidate old sessions) by bumping it.
function signToken(userId: string, tokenVersion = 0) {
  return jwt.sign({ sub: userId, tv: tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

type UserRow = {
  id: string; fullName: string; email: string; phone: string | null; avatarUrl: string | null;
  accountType: AccountType;
};

// Public shape of a user, including admin flag and the features the admin
// has switched off for them (so the UI can explain why something is blocked).
async function userPayload(user: UserRow) {
  const restrictions = await prisma.userFeatureRestriction.findMany({ where: { userId: user.id } });
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    accountType: user.accountType,
    isAdmin: isAdminEmail(user.email),
    restrictedFeatures: restrictions.map((r) => ({ feature: r.feature, label: featureLabel(r.feature), reason: r.reason })),
  };
}

// POST /api/auth/register
authRouter.post("/register", authLimiter, validateBody(registerSchema), asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, accountType } = req.body;
  const settings = await getPlatformSettings();
  if (!settings.registrationOpen && !isAdminEmail(email)) {
    throw new AppError(403, "التسجيل في المنصة مغلق حاليًا.", "REGISTRATION_CLOSED");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.conflict("هذا البريد الإلكتروني مستخدم مسبقًا.");
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { fullName, email, passwordHash, phone, accountType } });
  res.status(201).json({ token: signToken(user.id, user.tokenVersion), user: await userPayload(user) });
}));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "كلمة المرور مطلوبة."),
});

// POST /api/auth/login
authRouter.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw AppError.badRequest("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "INVALID_CREDENTIALS");
  // Accounts created via partner-invite have passwordHash === "" — bcrypt.compare
  // against an empty hash is technically valid but semantically wrong; short-circuit.
  if (!user.passwordHash) {
    throw AppError.badRequest(
      "هذا الحساب لم يُفعَّل بعد. استخدم \"نسيت كلمة المرور؟\" لتعيين كلمة مرور.",
      "ACCOUNT_NOT_ACTIVATED"
    );
  }
  if (user.status === UserStatus.REMOVED) {
    throw AppError.badRequest("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "INVALID_CREDENTIALS");
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(429, `تم قفل الحساب مؤقتًا بسبب محاولات دخول فاشلة. حاول بعد ${mins} دقيقة.`, "ACCOUNT_LOCKED");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : user.lockedUntil,
      },
    });
    throw AppError.badRequest("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "INVALID_CREDENTIALS");
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(
      403,
      `تم حظر حسابك من قبل إدارة المنصة.${user.statusReason ? ` السبب: ${user.statusReason}` : ""}`,
      "ACCOUNT_SUSPENDED"
    );
  }
  const settings = await getPlatformSettings();
  if (settings.maintenanceMode && !isAdminEmail(user.email)) {
    throw new AppError(503, settings.maintenanceMessage, "MAINTENANCE");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: req.ip },
  });
  res.json({ token: signToken(user.id, user.tokenVersion), user: await userPayload(user) });
}));

const forgotSchema = z.object({ email: z.string().email() });

// POST /api/auth/forgot-password — always returns same message to prevent user enumeration.
authRouter.post("/forgot-password", authLimiter, validateBody(forgotSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (user && user.status === UserStatus.ACTIVE) {
    await issuePasswordReset(user.id, !user.passwordHash);
  }
  res.json({ message: "إذا كان البريد الإلكتروني مسجّلاً لدينا، ستصلك رسالة خلال دقائق." });
}));

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل."),
});

// POST /api/auth/reset-password
authRouter.post("/reset-password", authLimiter, validateBody(resetSchema), asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.body.token);
  const user = await prisma.user.findFirst({
    where: { passwordResetTokenHash: tokenHash, passwordResetExpires: { gt: new Date() } },
  });
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw AppError.badRequest("الرابط غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا.", "INVALID_RESET_TOKEN");
  }
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    // Bumping tokenVersion signs the user out of every other session.
    data: { passwordHash, passwordResetTokenHash: null, passwordResetExpires: null, failedLogins: 0, lockedUntil: null, tokenVersion: { increment: 1 } },
  });
  res.json({ token: signToken(updated.id, updated.tokenVersion), user: await userPayload(updated) });
}));

// GET /api/auth/me
authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json({ user: await userPayload(user) });
}));

// PATCH /api/auth/me
authRouter.patch("/me", requireAuth, upload.single("avatar"), asyncHandler(async (req, res) => {
  const data: { fullName?: string; phone?: string; avatarUrl?: string } = {};
  if (typeof req.body.fullName === "string" && req.body.fullName.trim()) data.fullName = req.body.fullName.trim();
  if (typeof req.body.phone === "string") data.phone = req.body.phone.trim() || undefined;
  if (req.file) data.avatarUrl = publicUploadUrl(req.file.filename);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ user: await userPayload(user) });
}));
