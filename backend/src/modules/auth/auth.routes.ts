import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AccountType } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { upload, publicUploadUrl } from "../../utils/upload";

export const authRouter = Router();

const registerSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب."),
  email: z.string().email("البريد الإلكتروني غير صحيح."),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل."),
  phone: z.string().optional(),
  // Chosen once at registration: OWNER gets the shared-property ledger,
  // BROKER gets the listings/leads workspace. Defaults to OWNER so the
  // field stays optional for any older client.
  accountType: z.nativeEnum(AccountType).default(AccountType.OWNER),
});

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

function publicUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  accountType: AccountType;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    accountType: user.accountType,
  };
}

// POST /api/auth/register
authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { fullName, email, password, phone, accountType } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict("هذا البريد الإلكتروني مستخدم مسبقًا.");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { fullName, email, passwordHash, phone, accountType } });

    const token = signToken(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "كلمة المرور مطلوبة."),
});

// POST /api/auth/login
authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw AppError.badRequest("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "INVALID_CREDENTIALS");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw AppError.badRequest("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "INVALID_CREDENTIALS");

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  })
);

// GET /api/auth/me
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({ user: publicUser(user) });
  })
);

// PATCH /api/auth/me  (multipart: fullName?, phone?, avatar file?)
// Profile settings: change display name / phone and upload a profile photo.
authRouter.patch(
  "/me",
  requireAuth,
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    const data: { fullName?: string; phone?: string; avatarUrl?: string } = {};
    if (typeof req.body.fullName === "string" && req.body.fullName.trim()) {
      data.fullName = req.body.fullName.trim();
    }
    if (typeof req.body.phone === "string") {
      data.phone = req.body.phone.trim() || undefined;
    }
    if (req.file) {
      data.avatarUrl = publicUploadUrl(req.file.filename);
    }

    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ user: publicUser(user) });
  })
);
