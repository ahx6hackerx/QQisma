import { prisma } from "../lib/prisma";

// The *current* ownership structure for a property is the set of
// OwnershipRecord rows with effectiveTo = null (open-ended). History is
// preserved by closing (effectiveTo = now) the old record and inserting a
// new one whenever shares change — see ownership.routes.ts.
export async function getCurrentOwnership(propertyId: string) {
  return prisma.ownershipRecord.findMany({
    where: { propertyId, effectiveTo: null },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { sharePercent: "desc" },
  });
}

export function totalSharePercent(records: { sharePercent: number }[]) {
  return Math.round(records.reduce((sum, r) => sum + r.sharePercent, 0) * 100) / 100;
}
