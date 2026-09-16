import { Router } from "express";
import fs from "fs";
import { createWorker } from "tesseract.js";
import { Role } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyRole } from "../../middleware/propertyAccess";
import { upload } from "../../utils/upload";

export const ocrRouter = Router();
ocrRouter.use(requireAuth);

// Looks for the largest plausible currency amount in the OCR text — receipts
// usually print several numbers (date, item prices, subtotal, total); the
// total is almost always the largest distinct value near the bottom.
function guessAmount(text: string): number | null {
  const matches = text.match(/\d{1,3}(?:[,\.]\d{3})*(?:\.\d{1,2})?/g);
  if (!matches) return null;
  const numbers = matches.map((m) => Number(m.replace(/,/g, ""))).filter((n) => n > 0 && n < 1_000_000);
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

function guessDate(text: string): string | null {
  const match = text.match(/(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (!match) return null;
  const d = new Date(match[0].replace(/-/g, "/"));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// POST /api/properties/:propertyId/ocr-receipt  (multipart: image)
// Runs free, self-hosted OCR (no external API, no cost) and returns a best-
// effort guess the person reviews and corrects before saving — never
// auto-submits a transaction on its own.
ocrRouter.post(
  "/:propertyId/ocr-receipt",
  requirePropertyRole(Role.ACCOUNTANT),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.badRequest("صورة الفاتورة مطلوبة.");

    const worker = await createWorker(["ara", "eng"]);
    try {
      const {
        data: { text },
      } = await worker.recognize(req.file.path);
      res.json({
        rawText: text,
        suggestedAmount: guessAmount(text),
        suggestedDate: guessDate(text),
      });
    } finally {
      await worker.terminate();
      fs.unlink(req.file.path, () => {}); // temp scan copy — the real evidence upload happens separately
    }
  })
);
