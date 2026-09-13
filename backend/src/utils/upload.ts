import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

// 15MB per file is enough for scanned receipts/invoices/statements.
export const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

export function publicUploadUrl(filename: string) {
  return `/uploads/${filename}`;
}
