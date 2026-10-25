import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
  "text/csv": ".csv",
  "application/vnd.ms-excel": ".csv",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] ?? path.extname(file.originalname).slice(0, 10);
    cb(null, `${unique}${ext}`);
  },
});

function fileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_MIME_TO_EXT[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error("نوع الملف غير مدعوم. المسموح: صور (JPG/PNG/WEBP)، PDF، أو CSV."));
  }
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

export function publicUploadUrl(filename: string) {
  return `/uploads/${filename}`;
}
