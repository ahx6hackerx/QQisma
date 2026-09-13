import { prisma } from "../lib/prisma";

interface NotifyOneParams {
  userId: string;
  propertyId?: string;
  type: string;
  title: string;
  message: string;
}

export async function notifyUser(params: NotifyOneParams) {
  await prisma.notification.create({ data: params });
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
    select: { userId: true },
  });
  if (members.length === 0) return;
  await prisma.notification.createMany({
    data: members.map((m) => ({ userId: m.userId, propertyId, type, title, message })),
  });
}
