import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AccountType, UserStatus } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { featureForRequest } from "../lib/features";
import { getPlatformSettings } from "../lib/platform";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  accountType: AccountType;
  isAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  tv?: number;
}

export function isAdminEmail(email: string) {
  return env.adminEmails.includes(email.trim().toLowerCase());
}

// Verifies the bearer token and attaches the authenticated user to the
// request. Every route under /api (except /api/auth/*) goes through this.
//
// On top of identity it enforces the admin's controls:
//  - suspended / removed accounts are rejected (with the admin's reason)
//  - tokens issued before a forced logout / password change are rejected
//  - platform maintenance mode (admins are exempt)
//  - features switched off for this user or for the whole platform
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw AppError.unauthorized();
    const token = header.slice("Bearer ".length);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    } catch {
      throw AppError.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { featureRestrictions: true },
    });
    if (!user) throw AppError.unauthorized();
    if ((payload.tv ?? 0) !== user.tokenVersion) throw AppError.unauthorized();

    if (user.status === UserStatus.REMOVED) throw AppError.unauthorized();
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        403,
        `تم حظر حسابك من قبل إدارة المنصة.${user.statusReason ? ` السبب: ${user.statusReason}` : ""}`,
        "ACCOUNT_SUSPENDED"
      );
    }

    const isAdmin = isAdminEmail(user.email);
    req.user = { id: user.id, fullName: user.fullName, email: user.email, accountType: user.accountType, isAdmin };

    if (!isAdmin) {
      const path = req.originalUrl.split("?")[0];
      const settings = await getPlatformSettings();

      if (settings.maintenanceMode && path !== "/api/auth/me") {
        throw new AppError(503, settings.maintenanceMessage, "MAINTENANCE");
      }

      const feature = featureForRequest(req.method, path);
      if (feature) {
        const globalReason = settings.disabledFeatures[feature.key];
        if (globalReason !== undefined) {
          throw new AppError(
            403,
            `ميزة «${feature.label}» معطّلة حاليًا على المنصة.${globalReason ? ` السبب: ${globalReason}` : ""}`,
            "FEATURE_DISABLED"
          );
        }
        const own = user.featureRestrictions.find((r) => r.feature === feature.key);
        if (own) {
          throw new AppError(
            403,
            `ميزة «${feature.label}» غير متاحة لحسابك.${own.reason ? ` السبب: ${own.reason}` : ""}`,
            "FEATURE_DISABLED"
          );
        }
      }
    }

    next();
  } catch (err) {
    next(err instanceof AppError ? err : AppError.unauthorized());
  }
}

// Must run after requireAuth.
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return next(AppError.forbidden());
  next();
}
