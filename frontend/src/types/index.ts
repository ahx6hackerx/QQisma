export type Role = "OWNER" | "MANAGER" | "ACCOUNTANT" | "VIEWER";

export type TransactionType = "INCOME" | "EXPENSE";

export type VerificationStatus = "REPORTED" | "EVIDENCE_SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "DISPUTED";

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED";

export type EvidenceRequestStatus = "PENDING" | "UPLOADED" | "REVIEWED" | "COMPLETED";

export type ConfirmationStatus = "PENDING" | "CONFIRMED" | "AMOUNT_DIFFERENT";

export type ClosingStatus = "OPEN" | "CLOSED";

export type DistributionStatus = "PENDING" | "APPROVED" | "PAID";

export type DecisionStatus = "VOTING" | "APPROVED" | "REJECTED" | "EXECUTED";

export type VoteChoice = "APPROVE" | "REJECT";

export type ApprovalRuleType = "NONE" | "MANAGER_APPROVAL" | "MAJORITY_VOTE" | "TWO_THIRDS_VOTE" | "UNANIMOUS_VOTE";

export type DocumentCategory = "OWNERSHIP" | "CONTRACT" | "INVOICE" | "RECEIPT" | "BANK_STATEMENT" | "DECISION" | "OTHER";

export type AccountType = "OWNER" | "BROKER";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  accountType: AccountType;
}

export interface Organization {
  id: string;
  name: string;
  role: Role;
  propertiesCount: number;
}

export interface Property {
  id: string;
  name: string;
  address?: string | null;
  estimatedValue?: number | null;
  approvalRuleType: ApprovalRuleType;
  noApprovalBelowAmount: number;
  managerApprovalBelowAmount: number;
  organizationId: string;
}

export interface PropertySummary {
  id: string;
  name: string;
  address?: string | null;
  estimatedValue?: number | null;
  myRole: Role;
  partnersCount: number;
  openDisputes: number;
}

export interface OwnershipRecord {
  id: string;
  userId: string;
  sharePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  note?: string | null;
  user: { id: string; fullName: string; email: string };
}

export interface PropertyMember {
  id: string;
  propertyId: string;
  userId: string;
  role: Role;
  user: { id: string; fullName: string; email: string; phone?: string | null };
}

export interface Document {
  id: string;
  category: DocumentCategory;
  fileName: string;
  fileUrl: string;
  createdAt: string;
  uploadedBy: { id: string; fullName: string };
}

export interface Evidence {
  id: string;
  note?: string | null;
  createdAt: string;
  document: Document;
  uploadedBy: { id: string; fullName: string };
}

export interface Confirmation {
  id: string;
  status: ConfirmationStatus;
  confirmedAmount?: number | null;
  respondentName?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string | null;
  date: string;
  status: VerificationStatus;
  createdBy: { id: string; fullName: string };
  evidence: Evidence[];
  confirmation?: Confirmation | null;
  disputes?: Dispute[];
  monthlyClosingId?: string | null;
}

export interface DisputeComment {
  id: string;
  message: string;
  createdAt: string;
  author: { id: string; fullName: string };
}

export interface Dispute {
  id: string;
  reason: string;
  status: DisputeStatus;
  resolutionNote?: string | null;
  createdAt: string;
  raisedBy: { id: string; fullName: string };
  transaction: Transaction;
  comments: DisputeComment[];
}

export interface EvidenceRequest {
  id: string;
  message: string;
  status: EvidenceRequestStatus;
  createdAt: string;
  requestedBy: { id: string; fullName: string };
  assignedTo?: { id: string; fullName: string } | null;
  transaction?: Transaction | null;
}

export interface MonthlyClosing {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: ClosingStatus;
  reportedIncome: number;
  verifiedIncome: number;
  unverifiedIncome: number;
  reportedExpenses: number;
  verifiedExpenses: number;
  unverifiedExpenses: number;
  netVerifiedIncome: number;
  openDisputes: number;
  closedAt?: string | null;
  distribution?: Distribution | null;
}

export interface DistributionItem {
  id: string;
  sharePercent: number;
  amount: number;
  paid: boolean;
  paidAt?: string | null;
  user: { id: string; fullName: string };
}

export interface Distribution {
  id: string;
  netIncome: number;
  status: DistributionStatus;
  createdAt: string;
  monthlyClosing?: MonthlyClosing;
  items: DistributionItem[];
}

export interface DecisionVote {
  id: string;
  choice: VoteChoice;
  user: { id: string; fullName: string };
}

export interface Decision {
  id: string;
  title: string;
  description?: string | null;
  amount?: number | null;
  ruleType: ApprovalRuleType;
  status: DecisionStatus;
  resultPercent?: number | null;
  executedAt?: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string };
  votes: DecisionVote[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  property?: { id: string; name: string } | null;
}

export interface ActivityItem {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  actorName: string;
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeValue?: string | null;
  afterValue?: string | null;
  reason?: string | null;
  createdAt: string;
  actor: { id: string; fullName: string };
}

export interface ApiError {
  error: { message: string; code: string };
}

// ---------------------------------------------------------------------------
// Broker workspace
// ---------------------------------------------------------------------------

export type ListingType = "SALE" | "RENT";
export type ListingStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "RENTED" | "WITHDRAWN";
export type LeadStatus = "NEW" | "CONTACTED" | "VIEWING_SCHEDULED" | "NEGOTIATING" | "WON" | "LOST";

export interface Listing {
  id: string;
  title: string;
  propertyType: string;
  listingType: ListingType;
  price: number;
  city?: string | null;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  description?: string | null;
  status: ListingStatus;
  createdAt: string;
  _count?: { leads: number };
  leads?: Lead[];
}

export interface Lead {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: string | null;
  status: LeadStatus;
  createdAt: string;
  listingId?: string | null;
  listing?: { id: string; title: string } | null;
}

