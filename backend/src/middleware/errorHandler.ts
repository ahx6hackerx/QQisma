import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

// Central error handler: every route funnels errors here via asyncHandler
// or next(err). Keeps a consistent { error: { message, code } } shape for
// the frontend to render.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code } });
  }
  console.error("[unhandled]", err);
  return res.status(500).json({
    error: { message: "حدث خطأ غير متوقع في الخادم.", code: "INTERNAL_ERROR" },
  });
}
