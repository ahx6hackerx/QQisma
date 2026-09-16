import { Router } from "express";
import fs from "fs";
import { z } from "zod";
import { parse as parseCsv } from "csv-parse/sync";
// pdf-parse has no ESM/typed default export shape — require() keeps this simple.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");
import { Role, TransactionType, VerificationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { upload } from "../../utils/upload";
import { logActivity } from "../../utils/audit";

export const bankImportRouter = Router();
bankImportRouter.use(requireAuth);

interface ParsedRow {
  date: string; // ISO date
  description: string;
  amount: number; // positive = money in, negative = money out
}

// Very deliberately simple date matcher: dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy.
const DATE_RE = /(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
const AMOUNT_RE = /-?\d{1,3}(?:[,\.]\d{3})*(?:\.\d{1,2})?/g;

function normalizeDate(raw: string): string | null {
  const d = new Date(raw.replace(/-/g, "/"));
  if (!isNaN(d.getTime())) return d.toISOString();
  // dd/mm/yyyy fallback
  const parts = raw.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const year = c.length === 2 ? `20${c}` : c;
    const guess = new Date(`${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
    if (!isNaN(guess.getTime())) return guess.toISOString();
  }
  return null;
}

function parseCsvStatement(buffer: Buffer): ParsedRow[] {
  const records: Record<string, string>[] = parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true });
  const rows: ParsedRow[] = [];
  for (const rec of records) {
    const dateKey = Object.keys(rec).find((k) => /date|تاريخ/i.test(k));
    const amountKey = Object.keys(rec).find((k) => /amount|debit|credit|مبلغ/i.test(k));
    const descKey = Object.keys(rec).find((k) => /desc|narration|details|بيان|وصف/i.test(k));
    if (!dateKey || !amountKey) continue;
    const iso = normalizeDate(rec[dateKey]);
    const amount = Number(String(rec[amountKey]).replace(/[,\s]/g, ""));
    if (!iso || isNaN(amount) || amount === 0) continue;
    rows.push({ date: iso, description: descKey ? rec[descKey] : "", amount });
  }
  return rows;
}

async function parsePdfStatement(buffer: Buffer): Promise<ParsedRow[]> {
  const data = await pdfParse(buffer);
  const rows: ParsedRow[] = [];
  for (const line of (data.text as string).split("\n")) {
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    const iso = normalizeDate(dateMatch[0]);
    if (!iso) continue;
    const amounts = line.match(AMOUNT_RE);
    if (!amounts || amounts.length === 0) continue;
    const amount = Number(amounts[amounts.length - 1].replace(/,/g, ""));
    if (isNaN(amount) || amount === 0) continue;
    rows.push({ date: iso, description: line.replace(dateMatch[0], "").trim().slice(0, 80), amount });
  }
  return rows;
}

// POST /api/properties/:propertyId/bank-import/preview  (multipart: file — .csv or .pdf)
// Parses the statement and matches each row against the existing ledger
// (same amount, within 3 days) so the manager only has to review what's
// actually new instead of retyping every line by hand.
bankImportRouter.post(
  "/:propertyId/bank-import/preview",
  requirePropertyRole(Role.ACCOUNTANT),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    if (!req.file) throw AppError.badRequest("الملف مطلوب (CSV أو PDF).");

    const isPdf = req.file.mimetype === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf");
    const fileBuffer = fs.readFileSync(req.file.path);
    const rows = isPdf ? await parsePdfStatement(fileBuffer) : parseCsvStatement(fileBuffer);

    if (rows.length === 0) {
      throw AppError.badRequest(
        "لم يتم العثور على أي حركات في الملف. تأكد أن ملف CSV يحتوي أعمدة Date/Amount، أو أن ملف الـPDF نصي وليس صورة ممسوحة."
      );
    }

    const existing = await prisma.transaction.findMany({
      where: { propertyId, date: { gte: new Date(Math.min(...rows.map((r) => new Date(r.date).getTime())) - 3 * 86400000) } },
    });

    const results = rows.map((row) => {
      const absAmount = Math.abs(row.amount);
      const match = existing.find(
        (t) => Math.abs(t.amount - absAmount) < 0.01 && Math.abs(new Date(t.date).getTime() - new Date(row.date).getTime()) <= 3 * 86400000
      );
      return {
        ...row,
        amount: absAmount,
        suggestedType: row.amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
        matched: !!match,
        matchedTransactionId: match?.id ?? null,
      };
    });

    res.json({ rows: results, matchedCount: results.filter((r) => r.matched).length, unmatchedCount: results.filter((r) => !r.matched).length });
  })
);

const confirmSchema = z.object({
  rows: z
    .array(
      z.object({
        date: z.coerce.date(),
        description: z.string().optional(),
        amount: z.number().positive(),
        suggestedType: z.nativeEnum(TransactionType),
        category: z.string().optional(),
      })
    )
    .min(1),
});

// POST /api/properties/:propertyId/bank-import/confirm — bulk-create the
// rows the manager chose to import as new ledger transactions (status
// EVIDENCE_SUBMITTED since the statement itself stands in as evidence).
bankImportRouter.post(
  "/:propertyId/bank-import/confirm",
  requirePropertyRole(Role.ACCOUNTANT),
  validateBody(confirmSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const created = await prisma.$transaction(
      req.body.rows.map((row: any) =>
        prisma.transaction.create({
          data: {
            propertyId,
            type: row.suggestedType,
            category: row.category || (row.description ? row.description.slice(0, 40) : "مستورد من كشف حساب"),
            amount: row.amount,
            description: row.description || "مستورد تلقائيًا من كشف حساب بنكي",
            date: row.date,
            status: VerificationStatus.EVIDENCE_SUBMITTED,
            createdById: req.user!.id,
          },
        })
      )
    );
    await logActivity(propertyId, req.user!.id, "BANK_IMPORT", `تم استيراد ${created.length} حركة من كشف حساب بنكي.`);
    res.status(201).json({ created: created.length });
  })
);
