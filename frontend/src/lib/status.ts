import type {
  ApprovalRuleType,
  ConfirmationStatus,
  DecisionStatus,
  DisputeStatus,
  DistributionStatus,
  EvidenceRequestStatus,
  Role,
  VerificationStatus,
} from "../types";

// Central place mapping every backend status/enum to an Arabic label and a
// semantic tone. Keeping this in one file means adding a new status never
// requires hunting through components for hard-coded Arabic strings.
export type Tone = "neutral" | "brass" | "sage" | "clay" | "ink";

export const verificationStatus: Record<VerificationStatus, { label: string; tone: Tone }> = {
  REPORTED: { label: "مُدخل", tone: "neutral" },
  EVIDENCE_SUBMITTED: { label: "إثبات مرفق", tone: "brass" },
  UNDER_REVIEW: { label: "قيد المراجعة", tone: "brass" },
  VERIFIED: { label: "موثّق", tone: "sage" },
  DISPUTED: { label: "محل اعتراض", tone: "clay" },
};

export const disputeStatus: Record<DisputeStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "مفتوح", tone: "clay" },
  UNDER_REVIEW: { label: "قيد المراجعة", tone: "brass" },
  RESOLVED: { label: "تم الحل", tone: "sage" },
};

export const evidenceRequestStatus: Record<EvidenceRequestStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "بانتظار الرفع", tone: "neutral" },
  UPLOADED: { label: "تم الرفع", tone: "brass" },
  REVIEWED: { label: "تمت المراجعة", tone: "brass" },
  COMPLETED: { label: "مكتمل", tone: "sage" },
};

export const confirmationStatus: Record<ConfirmationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "بانتظار الرد", tone: "neutral" },
  CONFIRMED: { label: "مؤكَّد", tone: "sage" },
  AMOUNT_DIFFERENT: { label: "مبلغ مختلف", tone: "clay" },
};

export const closingStatusLabel: Record<"OPEN" | "CLOSED", { label: string; tone: Tone }> = {
  OPEN: { label: "مفتوح", tone: "neutral" },
  CLOSED: { label: "مُقفل", tone: "ink" },
};

export const distributionStatus: Record<DistributionStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "قيد الإعداد", tone: "neutral" },
  APPROVED: { label: "معتمد", tone: "brass" },
  PAID: { label: "مدفوع", tone: "sage" },
};

export const decisionStatus: Record<DecisionStatus, { label: string; tone: Tone }> = {
  VOTING: { label: "قيد التصويت", tone: "brass" },
  APPROVED: { label: "تمت الموافقة", tone: "sage" },
  REJECTED: { label: "مرفوض", tone: "clay" },
  EXECUTED: { label: "تم التنفيذ", tone: "ink" },
};

export const roleLabel: Record<Role, string> = {
  OWNER: "مالك/شريك",
  MANAGER: "مدير العقار",
  ACCOUNTANT: "محاسب",
  VIEWER: "مشاهدة فقط",
};

export const approvalRuleLabel: Record<ApprovalRuleType, string> = {
  NONE: "لا يحتاج موافقة",
  MANAGER_APPROVAL: "موافقة المدير فقط",
  MAJORITY_VOTE: "أغلبية بسيطة",
  TWO_THIRDS_VOTE: "ثلثا الملكية",
  UNANIMOUS_VOTE: "إجماع الشركاء",
};

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-600",
  brass: "bg-brass-100 text-brass-700",
  sage: "bg-sage-100 text-sage-600",
  clay: "bg-clay-100 text-clay-600",
  ink: "bg-ink-800 text-parchment-50",
};
