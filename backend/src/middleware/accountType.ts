import { NextFunction, Request, Response } from "express";
import { AccountType } from "@prisma/client";
import { AppError } from "../lib/errors";

// Gates the broker workspace routes to accounts registered as BROKER.
// accountType is loaded once in requireAuth (see middleware/auth.ts), so
// this is a plain in-memory check — no extra DB round trip.
export function requireAccountType(type: AccountType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.accountType !== type) {
      return next(AppError.forbidden("هذه الميزة متاحة فقط لحسابات الوسطاء العقاريين."));
    }
    next();
  };
}
