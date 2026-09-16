import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AccountType } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  accountType: AccountType;
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
}

// Verifies the bearer token and attaches the authenticated user to the
// request. Every route under /api (except /api/auth/*) goes through this.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw AppError.unauthorized();
    }
    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw AppError.unauthorized();

    req.user = { id: user.id, fullName: user.fullName, email: user.email, accountType: user.accountType };
    next();
  } catch (err) {
    next(AppError.unauthorized());
  }
}
