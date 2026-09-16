import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      propertyRole?: Role;
    }
  }
}

// Role hierarchy used when a route accepts "at least" a given role.
const RANK: Record<Role, number> = {
  VIEWER: 0,
  ACCOUNTANT: 1,
  MANAGER: 2,
  OWNER: 3,
};

function propertyIdFromRequest(req: Request): string | undefined {
  return (req.params.propertyId as string | undefined) ?? (req.body?.propertyId as string | undefined);
}

/**
 * Loads the caller's membership on the property referenced by
 * :propertyId (route param) or body.propertyId, and rejects the request
 * unless their role meets `minRole` in the OWNER > MANAGER > ACCOUNTANT >
 * VIEWER hierarchy. Attaches the resolved role to req.propertyRole.
 */
export function requirePropertyRole(minRole: Role) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const propertyId = propertyIdFromRequest(req);
      if (!propertyId) throw AppError.badRequest("رقم العقار مطلوب.");

      const membership = await prisma.propertyMember.findUnique({
        where: { propertyId_userId: { propertyId, userId: req.user.id } },
      });
      if (!membership) {
        throw AppError.forbidden("لست شريكًا مسجلاً في هذا العقار.");
      }
      if (RANK[membership.role] < RANK[minRole]) {
        throw AppError.forbidden("لا تملك الصلاحية الكافية لهذا الإجراء.");
      }
      req.propertyRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Just verifies the caller belongs to the property at all (any role,
// including VIEWER) — used for read endpoints.
export const requirePropertyMember = requirePropertyRole(Role.VIEWER);
