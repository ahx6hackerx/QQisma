import { Router } from "express";
import { z } from "zod";
import { Role, VerificationStatus, DocumentCategory, ConfirmationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { upload, publicUploadUrl } from "../../utils/upload";
import { logActivity } from "../../utils/audit";
import { notifyPropertyMembers, notifyUser } from "../../utils/notify";

export const evidenceRouter = Router();
evidenceRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// Evidence attached directly to a transaction
// ---------------------------------------------------------------------------

// POST /api/properties/:propertyId/transactions/:id/evidence  (multipart: file, note, category)
evidenceRouter.post(
  "/:propertyId/transactions/:id/evidence",
  requirePropertyRole(Role.ACCOUNTANT),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    if (!req.file) throw AppError.badRequest("الملف مطلوب.");

    const transaction = await prisma.transaction.findFirst({ where: { id, propertyId } });
    if (!transaction) throw AppError.notFound("العملية غير موجودة.");

    const category = (req.body.category as DocumentCategory) ?? DocumentCategory.RECEIPT;

    const [document] = await prisma.$transaction([
      prisma.document.create({
        data: {
          propertyId,
          category,
          fileName: req.file.originalname,
          fileUrl: publicUploadUrl(req.file.filename),
          uploadedById: req.user!.id,
        },
      }),
    ]);

    const evidence = await prisma.evidence.create({
      data: { transactionId: id, documentId: document.id, uploadedById: req.user!.id, note: req.body.note },
      include: { document: true },
    });

    if (transaction.status === "REPORTED") {
      await prisma.transaction.update({ where: { id }, data: { status: VerificationStatus.EVIDENCE_SUBMITTED } });
    }

    await logActivity(propertyId, req.user!.id, "EVIDENCE_UPLOADED", `تم إرفاق إثبات لعملية بقيمة ${transaction.amount} JD.`);
    res.status(201).json({ evidence });
  })
);

// GET /api/properties/:propertyId/transactions/:id/evidence
evidenceRouter.get(
  "/:propertyId/transactions/:id/evidence",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const evidence = await prisma.evidence.findMany({
      where: { transactionId: req.params.id },
      include: { document: true, uploadedBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ evidence });
  })
);

// ---------------------------------------------------------------------------
// Evidence requests — "أرفق إثبات ..." sent to whoever manages the money
// ---------------------------------------------------------------------------

const createRequestSchema = z.object({
  transactionId: z.string().optional(),
  assignedToId: z.string().optional(),
  message: z.string().min(3, "وصف الطلب مطلوب."),
});

// POST /api/properties/:propertyId/evidence-requests
evidenceRouter.post(
  "/:propertyId/evidence-requests",
  requirePropertyMember,
  validateBody(createRequestSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const request = await prisma.evidenceRequest.create({
      data: { propertyId, requestedById: req.user!.id, ...req.body },
    });

    if (req.body.assignedToId) {
      await notifyUser({
        userId: req.body.assignedToId,
        propertyId,
        type: "EVIDENCE_REQUESTED",
        title: "طلب إثبات",
        message: req.body.message,
      });
    } else {
      await notifyPropertyMembers(propertyId, "EVIDENCE_REQUESTED", "طلب إثبات", req.body.message, req.user!.id);
    }
    await logActivity(propertyId, req.user!.id, "EVIDENCE_REQUESTED", req.body.message);

    res.status(201).json({ request });
  })
);

// GET /api/properties/:propertyId/evidence-requests?status=PENDING
evidenceRouter.get(
  "/:propertyId/evidence-requests",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { status } = req.query as Record<string, string | undefined>;
    const requests = await prisma.evidenceRequest.findMany({
      where: { propertyId: req.params.propertyId, ...(status ? { status: status as never } : {}) },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        assignedTo: { select: { id: true, fullName: true } },
        transaction: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  })
);

// POST /api/properties/:propertyId/evidence-requests/:id/upload (multipart: file)
evidenceRouter.post(
  "/:propertyId/evidence-requests/:id/upload",
  requirePropertyMember,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    const request = await prisma.evidenceRequest.findFirst({ where: { id, propertyId } });
    if (!request) throw AppError.notFound("الطلب غير موجود.");
    if (!req.file) throw AppError.badRequest("الملف مطلوب.");

    const document = await prisma.document.create({
      data: {
        propertyId,
        category: DocumentCategory.OTHER,
        fileName: req.file.originalname,
        fileUrl: publicUploadUrl(req.file.filename),
        uploadedById: req.user!.id,
      },
    });

    if (request.transactionId) {
      await prisma.evidence.create({
        data: { transactionId: request.transactionId, documentId: document.id, uploadedById: req.user!.id },
      });
    }

    const updated = await prisma.evidenceRequest.update({ where: { id }, data: { status: "UPLOADED" } });
    await notifyUser({
      userId: request.requestedById,
      propertyId,
      type: "EVIDENCE_UPLOADED",
      title: "تم رفع الإثبات",
      message: "تم رفع الإثبات المطلوب، بانتظار المراجعة.",
    });
    res.json({ request: updated, document });
  })
);

// POST /api/properties/:propertyId/evidence-requests/:id/complete
evidenceRouter.post(
  "/:propertyId/evidence-requests/:id/complete",
  requirePropertyRole(Role.MANAGER),
  asyncHandler(async (req, res) => {
    const request = await prisma.evidenceRequest.update({
      where: { id: req.params.id },
      data: { status: "COMPLETED" },
    });
    res.json({ request });
  })
);

// ---------------------------------------------------------------------------
// Third-party confirmations (e.g. tenant confirming a rent payment)
// A confirmation exposes an unauthenticated public link — see
// modules/evidence/public.routes.ts — since the respondent has no قِسمة account.
// ---------------------------------------------------------------------------

const createConfirmationSchema = z.object({
  respondentName: z.string().min(2, "اسم الطرف الآخر مطلوب."),
  respondentContact: z.string().optional(),
});

// POST /api/properties/:propertyId/transactions/:id/confirmation-request
evidenceRouter.post(
  "/:propertyId/transactions/:id/confirmation-request",
  requirePropertyRole(Role.MANAGER),
  validateBody(createConfirmationSchema),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    const transaction = await prisma.transaction.findFirst({ where: { id, propertyId } });
    if (!transaction) throw AppError.notFound("العملية غير موجودة.");

    const confirmation = await prisma.confirmation.upsert({
      where: { transactionId: id },
      update: { status: ConfirmationStatus.PENDING, ...req.body },
      create: { transactionId: id, ...req.body },
    });

    res.status(201).json({
      confirmation,
      // Share this link with the tenant/respondent — no قِسمة login required.
      publicLink: `/confirm/${confirmation.id}`,
    });
  })
);

// GET /api/properties/:propertyId/discrepancies
// Compares the manager-reported amount against the tenant confirmation for
// every transaction that has one, surfacing MATCHED vs DISCREPANCY.
evidenceRouter.get(
  "/:propertyId/discrepancies",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
      where: { propertyId: req.params.propertyId, confirmation: { isNot: null } },
      include: { confirmation: true },
      orderBy: { date: "desc" },
    });

    const results = transactions.map((t) => {
      const confirmed = t.confirmation?.confirmedAmount;
      const matched = t.confirmation?.status === "CONFIRMED" && confirmed === t.amount;
      return {
        transactionId: t.id,
        category: t.category,
        date: t.date,
        reportedAmount: t.amount,
        confirmedAmount: confirmed ?? null,
        confirmationStatus: t.confirmation?.status ?? "PENDING",
        result: t.confirmation?.status === "PENDING" ? "PENDING" : matched ? "MATCHED" : "DISCREPANCY",
        difference: confirmed != null ? Math.round((t.amount - confirmed) * 100) / 100 : null,
      };
    });

    res.json({ discrepancies: results });
  })
);
