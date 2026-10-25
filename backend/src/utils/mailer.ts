import nodemailer from "nodemailer";
import { env } from "../config/env";

export const mailConfigured = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const transporter = mailConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    console.log(`[mail:not-configured] would send to ${to} — ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html });
    return true;
  } catch (err) {
    console.error("[mail] send failed", err);
    return false;
  }
}

export function passwordResetEmailHtml(fullName: string, link: string, isActivation: boolean) {
  const heading = isActivation ? "تفعيل حسابك في قِسمة" : "إعادة تعيين كلمة المرور";
  const intro = isActivation
    ? `أهلًا ${fullName}، تمت إضافتك إلى عقار مشترك على قِسمة. اضغط الزر أدناه لتعيين كلمة مرورك وتفعيل حسابك.`
    : `أهلًا ${fullName}، تلقّينا طلبًا لإعادة تعيين كلمة المرور. اضغط الزر أدناه لاختيار كلمة مرور جديدة.`;
  return `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#FAF7F0;color:#16202B">
    <h2 style="margin:0 0 12px">${heading}</h2>
    <p style="line-height:1.7">${intro}</p>
    <p style="margin:24px 0"><a href="${link}" style="background:#B8863B;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">تعيين كلمة المرور</a></p>
    <p style="font-size:12px;color:#5F717A">الرابط صالح لمدة ساعة واحدة. إذا لم تطلب هذا، تجاهل الرسالة.</p>
  </div>`;
}
