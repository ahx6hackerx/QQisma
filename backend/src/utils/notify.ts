import { prisma } from "../lib/prisma";
import { sendWhatsAppMessage, buildWhatsAppShareLink, whatsappConfigured } from "./whatsapp";

interface NotifyOneParams {
  userId: string;
  propertyId?: string;
  type: string;
  title: string;
  message: string;
}

export async function notifyUser(params: NotifyOneParams) {
  await prisma.notification.create({ data: params });

  if (whatsappConfigured) {
    const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { phone: true } });
    if (user?.phone) {
      await sendWhatsAppMessage(user.phone, `قِسمة — ${params.title}\n${params.message}`);
    }
  }
}

// Notifies every member of a property (optionally excluding the actor who
// triggered the event, e.g. don't notify yourself that you added an income row).
export async function notifyPropertyMembers(
  propertyId: string,
  type: string,
  title: string,
  message: string,
  excludeUserId?: string
) {
  const members = await prisma.propertyMember.findMany({
    where: { propertyId, ...(excludeUserId ? { userId: { not: excludeUserId } } : {}) },
    select: { userId: true, user: { select: { phone: true } } },
  });
  if (members.length === 0) return;

  await prisma.notification.createMany({
    data: members.map((m) => ({ userId: m.userId, propertyId, type, title, message })),
  });

  if (whatsappConfigured) {
    await Promise.all(
      members
        .filter((m) => m.user.phone)
        .map((m) => sendWhatsAppMessage(m.user.phone as string, `قِسمة — ${title}\n${message}`))
    );
  }
}

// Zero-setup WhatsApp "share" link for a single user — always works, no
// Meta signup required, just opens WhatsApp with the message pre-filled for
// the person to review and tap send themselves.
export async function whatsappShareLinkForUser(userId: string, message: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user?.phone) return null;
  return buildWhatsAppShareLink(user.phone, message);
}
