import { Router } from "express";
import { z } from "zod";
import { ApprovalRuleType, DecisionStatus, Role, VoteChoice } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePropertyMember, requirePropertyRole } from "../../middleware/propertyAccess";
import { validateBody } from "../../middleware/validate";
import { getCurrentOwnership } from "../../utils/ownership";
import { evaluateDecisionVotes } from "../../utils/decisionRules";
import { logActivity, writeAuditLog } from "../../utils/audit";
import { notifyPropertyMembers } from "../../utils/notify";

export const decisionsRouter = Router();
decisionsRouter.use(requireAuth);

// GET /api/properties/:propertyId/decisions?status=VOTING
decisionsRouter.get(
  "/:propertyId/decisions",
  requirePropertyMember,
  asyncHandler(async (req, res) => {
    const { status } = req.query as Record<string, string | undefined>;
    const decisions = await prisma.decision.findMany({
      where: { propertyId: req.params.propertyId, ...(status ? { status: status as never } : {}) },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        votes: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ decisions });
  })
);

const createDecisionSchema = z.object({
  title: z.string().min(3, "عنوان القرار مطلوب."),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
});

// Resolves which approval rule applies: an explicit amount is checked
// against the property's thresholds; the property's default rule is the
// fallback for decisions with no attached amount.
async function resolveRule(propertyId: string, amount?: number): Promise<ApprovalRuleType> {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (amount === undefined) return property.approvalRuleType;
  if (amount < property.noApprovalBelowAmount) return ApprovalRuleType.NONE;
  if (amount < property.managerApprovalBelowAmount) return ApprovalRuleType.MANAGER_APPROVAL;
  return property.approvalRuleType === ApprovalRuleType.MANAGER_APPROVAL
    ? ApprovalRuleType.MAJORITY_VOTE // an amount this large always needs the partners, never manager-alone
    : property.approvalRuleType;
}

// POST /api/properties/:propertyId/decisions
decisionsRouter.post(
  "/:propertyId/decisions",
  requirePropertyMember,
  validateBody(createDecisionSchema),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const ruleType = await resolveRule(propertyId, req.body.amount);
    const initialStatus = ruleType === ApprovalRuleType.NONE ? DecisionStatus.APPROVED : DecisionStatus.VOTING;

    const decision = await prisma.decision.create({
      data: {
        propertyId,
        title: req.body.title,
        description: req.body.description,
        amount: req.body.amount,
        ruleType,
        status: initialStatus,
        createdById: req.user!.id,
        resultPercent: ruleType === ApprovalRuleType.NONE ? 100 : null,
      },
    });

    await logActivity(propertyId, req.user!.id, "DECISION_CREATED", `تم إنشاء قرار: ${req.body.title}`);
    await notifyPropertyMembers(
      propertyId,
      "DECISION_CREATED",
      "قرار جديد",
      ruleType === ApprovalRuleType.NONE
        ? `تم اعتماد "${req.body.title}" تلقائيًا (لا يحتاج موافقة).`
        : `يحتاج القرار "${req.body.title}" إلى مراجعتك.`,
      req.user!.id
    );

    res.status(201).json({ decision });
  })
);

const voteSchema = z.object({ choice: z.nativeEnum(VoteChoice) });

// POST /api/properties/:propertyId/decisions/:id/vote — ownership-weighted
// voting for MAJORITY / TWO_THIRDS / UNANIMOUS rules.
decisionsRouter.post(
  "/:propertyId/decisions/:id/vote",
  requirePropertyMember,
  validateBody(voteSchema),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    const decision = await prisma.decision.findFirst({ where: { id, propertyId } });
    if (!decision) throw AppError.notFound("القرار غير موجود.");
    if (decision.status !== DecisionStatus.VOTING) {
      throw AppError.badRequest("لا يمكن التصويت على قرار غير مطروح للتصويت حاليًا.");
    }
    const votingRules: ApprovalRuleType[] = [ApprovalRuleType.MAJORITY_VOTE, ApprovalRuleType.TWO_THIRDS_VOTE, ApprovalRuleType.UNANIMOUS_VOTE];
    if (!votingRules.includes(decision.ruleType)) {
      throw AppError.badRequest("هذا القرار لا يعتمد التصويت — يحتاج موافقة المدير فقط.");
    }

    await prisma.decisionVote.upsert({
      where: { decisionId_userId: { decisionId: id, userId: req.user!.id } },
      update: { choice: req.body.choice },
      create: { decisionId: id, userId: req.user!.id, choice: req.body.choice },
    });

    const [ownership, votes] = await Promise.all([
      getCurrentOwnership(propertyId),
      prisma.decisionVote.findMany({ where: { decisionId: id } }),
    ]);
    const outcome = evaluateDecisionVotes(decision.ruleType, ownership, votes);

    let status: DecisionStatus = DecisionStatus.VOTING;
    if (outcome.isFinal) status = outcome.passed ? DecisionStatus.APPROVED : DecisionStatus.REJECTED;

    const updated = await prisma.decision.update({
      where: { id },
      data: { resultPercent: outcome.resultPercent, status },
      include: { votes: { include: { user: { select: { id: true, fullName: true } } } } },
    });

    if (status !== DecisionStatus.VOTING) {
      await logActivity(
        propertyId,
        null,
        "DECISION_RESOLVED",
        `القرار "${decision.title}" ${status === DecisionStatus.APPROVED ? "تمت الموافقة عليه" : "رُفض"} (${outcome.resultPercent}%).`
      );
      await notifyPropertyMembers(
        propertyId,
        "DECISION_RESOLVED",
        status === DecisionStatus.APPROVED ? "تمت الموافقة على القرار" : "تم رفض القرار",
        `"${decision.title}" — نسبة الموافقة: ${outcome.resultPercent}%`
      );
    }

    res.json({ decision: updated, outcome });
  })
);

const approveRejectSchema = z.object({ note: z.string().optional() });

// POST /api/properties/:propertyId/decisions/:id/approve — MANAGER_APPROVAL rule
decisionsRouter.post(
  "/:propertyId/decisions/:id/approve",
  requirePropertyRole(Role.MANAGER),
  validateBody(approveRejectSchema),
  asyncHandler(async (req, res) => {
    const decision = await prisma.decision.update({
      where: { id: req.params.id },
      data: { status: DecisionStatus.APPROVED, resultPercent: 100 },
    });
    await logActivity(req.params.propertyId, req.user!.id, "DECISION_RESOLVED", `تمت الموافقة على "${decision.title}".`);
    res.json({ decision });
  })
);

// POST /api/properties/:propertyId/decisions/:id/reject — MANAGER_APPROVAL rule
decisionsRouter.post(
  "/:propertyId/decisions/:id/reject",
  requirePropertyRole(Role.MANAGER),
  validateBody(approveRejectSchema),
  asyncHandler(async (req, res) => {
    const decision = await prisma.decision.update({
      where: { id: req.params.id },
      data: { status: DecisionStatus.REJECTED, resultPercent: 0 },
    });
    await logActivity(req.params.propertyId, req.user!.id, "DECISION_RESOLVED", `تم رفض "${decision.title}".`);
    res.json({ decision });
  })
);

const executeSchema = z.object({
  signedByName: z.string().min(2, "الاسم الكامل مطلوب للتوقيع."),
  signatureDataUrl: z.string().min(50, "التوقيع مطلوب."),
});

// POST /api/properties/:propertyId/decisions/:id/execute
// Requires a lightweight in-house signature (drawn signature + typed legal
// name) as a recorded proof of authorization. This is an internal audit
// record, not a certified legal e-signature service.
decisionsRouter.post(
  "/:propertyId/decisions/:id/execute",
  requirePropertyRole(Role.MANAGER),
  validateBody(executeSchema),
  asyncHandler(async (req, res) => {
    const { propertyId, id } = req.params;
    const decision = await prisma.decision.findFirst({ where: { id, propertyId } });
    if (!decision) throw AppError.notFound("القرار غير موجود.");
    if (decision.status !== DecisionStatus.APPROVED) {
      throw AppError.badRequest("لا يمكن تنفيذ قرار لم تتم الموافقة عليه بعد.");
    }

    const updated = await prisma.decision.update({
      where: { id },
      data: {
        status: DecisionStatus.EXECUTED,
        executedAt: new Date(),
        signedByName: req.body.signedByName,
        signatureDataUrl: req.body.signatureDataUrl,
        signedAt: new Date(),
      },
    });

    await writeAuditLog({
      propertyId,
      actorId: req.user!.id,
      entityType: "DECISION",
      entityId: id,
      action: "DECISION_EXECUTED",
      after: { executedAt: updated.executedAt, signedByName: req.body.signedByName },
    });
    await logActivity(propertyId, req.user!.id, "DECISION_EXECUTED", `تم تنفيذ "${decision.title}" وتوقيعه من ${req.body.signedByName}.`);

    res.json({ decision: updated });
  })
);
