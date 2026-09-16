import { Router } from "express";
import { DocumentCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember } from "../../middleware/propertyAccess";
import { upload, publicUploadUrl } from "../../utils/upload";
import { logActivity } from "../../utils/audit";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

// GET /api/properties/:propertyId/documents?category=CONTRACT
documentsRouter.get(
  "/:propertyId/documents",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { category } = req.query as Record<string, string | undefined>;
    const documents = await prisma.document.findMany({
      where: { propertyId: req.params.propertyId, ...(category ? { category: category as never } : {}) },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
        _count: { select: { evidenceLinks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ documents });
  })
);

// POST /api/properties/:propertyId/documents  (multipart: file, category)
// General document-vault upload, independent of any single transaction —
// ownership deeds, contracts, statements, etc.
documentsRouter.post(
  "/:propertyId/documents",
  requirePropertyMember,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    if (!req.file) throw AppError.badRequest("الملف مطلوب.");
    const category = (req.body.category as DocumentCategory) ?? DocumentCategory.OTHER;

    const document = await prisma.document.create({
      data: {
        propertyId,
        category,
        fileName: req.file.originalname,
        fileUrl: publicUploadUrl(req.file.filename),
        uploadedById: req.user!.id,
      },
    });

    await logActivity(propertyId, req.user!.id, "DOCUMENT_UPLOADED", `تم رفع مستند: ${req.file.originalname}`);
    res.status(201).json({ document });
  })
);

// DELETE /api/properties/:propertyId/documents/:id
documentsRouter.delete(
  "/:propertyId/documents/:id",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const linked = await prisma.evidence.count({ where: { documentId: req.params.id } });
    if (linked > 0) {
      throw AppError.forbidden("لا يمكن حذف مستند مستخدم كإثبات على عملية مالية.");
    }
    await prisma.document.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
