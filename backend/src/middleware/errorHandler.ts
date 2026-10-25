import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../lib/errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code } });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "حجم الملف أكبر من الحد المسموح (15 ميجابايت)."
      : err.message;
    return res.status(400).json({ error: { message, code: `UPLOAD_${err.code}` } });
  }
  if (err instanceof Error && /نوع الملف غير مدعوم/.test(err.message)) {
    return res.status(400).json({ error: { message: err.message, code: "UNSUPPORTED_FILE_TYPE" } });
  }
  console.error("[unhandled]", err);
  return res.status(500).json({
    error: { message: "حدث خطأ غير متوقع في الخادم.", code: "INTERNAL_ERROR" },
  });
}
