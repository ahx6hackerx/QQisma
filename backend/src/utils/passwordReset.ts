import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { sendEmail, passwordResetEmailHtml } from "./mailer";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordReset(userId: string, isActivation = false) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const link = `${env.frontendUrl}/reset-password?token=${token}`;
  await sendEmail(
    user.email,
    isActivation ? "تفعيل حسابك في قِسمة" : "إعادة تعيين كلمة المرور — قِسمة",
    passwordResetEmailHtml(user.fullName, link, isActivation)
  );
}
