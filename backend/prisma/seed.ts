import { PrismaClient, Role, TransactionType, VerificationStatus, DocumentCategory, ApprovalRuleType, DecisionStatus, VoteChoice, ConfirmationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding قِسمة — Qisma demo data...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const [mohammad, ahmad, khaled, sara] = await Promise.all([
    prisma.user.upsert({
      where: { email: "mohammad@qisma.test" },
      update: {},
      create: { fullName: "محمد الشريف", email: "mohammad@qisma.test", passwordHash, phone: "0790000001" },
    }),
    prisma.user.upsert({
      where: { email: "ahmad@qisma.test" },
      update: {},
      create: { fullName: "أحمد الشريف", email: "ahmad@qisma.test", passwordHash, phone: "0790000002" },
    }),
    prisma.user.upsert({
      where: { email: "khaled@qisma.test" },
      update: {},
      create: { fullName: "خالد الشريف", email: "khaled@qisma.test", passwordHash, phone: "0790000003" },
    }),
    prisma.user.upsert({
      where: { email: "sara@qisma.test" },
      update: {},
      create: { fullName: "سارة الشريف", email: "sara@qisma.test", passwordHash, phone: "0790000004" },
    }),
  ]);

  const organization = await prisma.organization.upsert({
    where: { id: "seed-org-alsharif" },
    update: {},
    create: {
      id: "seed-org-alsharif",
      name: "عائلة الشريف",
      members: {
        create: [
          { userId: mohammad.id, role: Role.OWNER },
          { userId: ahmad.id, role: Role.OWNER },
          { userId: khaled.id, role: Role.OWNER },
          { userId: sara.id, role: Role.VIEWER },
        ],
      },
    },
  });

  const existingProperty = await prisma.property.findFirst({ where: { name: "عمارة النور", organizationId: organization.id } });
  if (existingProperty) {
    console.log("Property already seeded — skipping (run `prisma migrate reset` to reseed from scratch).");
    return;
  }

  const property = await prisma.property.create({
    data: {
      organizationId: organization.id,
      name: "عمارة النور",
      address: "جبل عمّان، الدوار الثالث، عمّان",
      estimatedValue: 850000,
      approvalRuleType: ApprovalRuleType.MAJORITY_VOTE,
      noApprovalBelowAmount: 500,
      managerApprovalBelowAmount: 2000,
      members: {
        create: [
          { userId: mohammad.id, role: Role.OWNER },
          { userId: ahmad.id, role: Role.OWNER },
          { userId: khaled.id, role: Role.OWNER },
          { userId: sara.id, role: Role.VIEWER },
        ],
      },
      ownershipRecords: {
        create: [
          { userId: mohammad.id, sharePercent: 40 },
          { userId: ahmad.id, sharePercent: 30 },
          { userId: khaled.id, sharePercent: 20 },
          { userId: sara.id, sharePercent: 10 },
        ],
      },
    },
  });

  const deed = await prisma.document.create({
    data: {
      propertyId: property.id,
      category: DocumentCategory.OWNERSHIP,
      fileName: "سند-ملكية-عمارة-النور.pdf",
      fileUrl: "/uploads/seed-ownership-deed.pdf",
      uploadedById: mohammad.id,
    },
  });
  await prisma.ownershipRecord.updateMany({ where: { propertyId: property.id }, data: { documentId: deed.id } });

  // ---- August 2026: a fully closed & distributed month --------------------
  const augIncomeReceipts = await prisma.document.create({
    data: {
      propertyId: property.id,
      category: DocumentCategory.BANK_STATEMENT,
      fileName: "كشف-حساب-اغسطس-2026.pdf",
      fileUrl: "/uploads/seed-aug-statement.pdf",
      uploadedById: mohammad.id,
    },
  });

  const augTx = await Promise.all(
    [
      { category: "إيجار - وحدة 101", amount: 700, type: TransactionType.INCOME, day: 1 },
      { category: "إيجار - وحدة 102", amount: 650, type: TransactionType.INCOME, day: 3 },
      { category: "إيجار - وحدة 103", amount: 800, type: TransactionType.INCOME, day: 3 },
      { category: "إيجار - وحدة 104", amount: 750, type: TransactionType.INCOME, day: 5 },
      { category: "صيانة المصعد", amount: 1200, type: TransactionType.EXPENSE, day: 8 },
      { category: "كهرباء المشترك", amount: 500, type: TransactionType.EXPENSE, day: 10 },
      { category: "تنظيف", amount: 300, type: TransactionType.EXPENSE, day: 12 },
    ].map((t) =>
      prisma.transaction.create({
        data: {
          propertyId: property.id,
          type: t.type,
          category: t.category,
          amount: t.amount,
          date: new Date(2026, 7, t.day),
          status: VerificationStatus.VERIFIED,
          createdById: mohammad.id,
          evidence: { create: { documentId: augIncomeReceipts.id, uploadedById: mohammad.id } },
        },
      })
    )
  );

  const augClosing = await prisma.monthlyClosing.create({
    data: {
      propertyId: property.id,
      periodYear: 2026,
      periodMonth: 8,
      status: "CLOSED",
      reportedIncome: 2900,
      verifiedIncome: 2900,
      unverifiedIncome: 0,
      reportedExpenses: 2000,
      verifiedExpenses: 2000,
      unverifiedExpenses: 0,
      netVerifiedIncome: 900,
      openDisputes: 0,
      closedAt: new Date(2026, 7, 31),
      closedById: mohammad.id,
    },
  });
  await prisma.transaction.updateMany({ where: { id: { in: augTx.map((t) => t.id) } }, data: { monthlyClosingId: augClosing.id } });

  const augDistribution = await prisma.distribution.create({
    data: {
      propertyId: property.id,
      monthlyClosingId: augClosing.id,
      netIncome: 900,
      status: "PAID",
      items: {
        create: [
          { userId: mohammad.id, sharePercent: 40, amount: 360, paid: true, paidAt: new Date(2026, 8, 2) },
          { userId: ahmad.id, sharePercent: 30, amount: 270, paid: true, paidAt: new Date(2026, 8, 2) },
          { userId: khaled.id, sharePercent: 20, amount: 180, paid: true, paidAt: new Date(2026, 8, 2) },
          { userId: sara.id, sharePercent: 10, amount: 90, paid: true, paidAt: new Date(2026, 8, 2) },
        ],
      },
    },
  });

  // ---- September 2026: the current, still-open month -----------------------
  const sepReceipt = await prisma.document.create({
    data: {
      propertyId: property.id,
      category: DocumentCategory.RECEIPT,
      fileName: "ايصال-ايجار-وحدة-101-سبتمبر.pdf",
      fileUrl: "/uploads/seed-sep-receipt-101.pdf",
      uploadedById: mohammad.id,
    },
  });

  const rent101 = await prisma.transaction.create({
    data: {
      propertyId: property.id,
      type: TransactionType.INCOME,
      category: "إيجار - وحدة 101",
      amount: 700,
      date: new Date(2026, 8, 1),
      status: VerificationStatus.VERIFIED,
      createdById: mohammad.id,
      evidence: { create: { documentId: sepReceipt.id, uploadedById: mohammad.id } },
    },
  });
  await prisma.confirmation.create({
    data: { transactionId: rent101.id, status: ConfirmationStatus.CONFIRMED, confirmedAmount: 700, respondentName: "مستأجر وحدة 101" },
  });

  // A discrepancy: manager reported 700, tenant confirmed only 600.
  const rent102 = await prisma.transaction.create({
    data: {
      propertyId: property.id,
      type: TransactionType.INCOME,
      category: "إيجار - وحدة 102",
      amount: 700,
      date: new Date(2026, 8, 3),
      status: VerificationStatus.EVIDENCE_SUBMITTED,
      createdById: mohammad.id,
    },
  });
  await prisma.confirmation.create({
    data: { transactionId: rent102.id, status: ConfirmationStatus.AMOUNT_DIFFERENT, confirmedAmount: 600, respondentName: "مستأجر وحدة 102" },
  });

  // An unverified expense with no evidence yet.
  await prisma.transaction.create({
    data: {
      propertyId: property.id,
      type: TransactionType.EXPENSE,
      category: "إصلاح تسرب مياه",
      amount: 350,
      date: new Date(2026, 8, 6),
      status: VerificationStatus.REPORTED,
      createdById: khaled.id,
    },
  });

  // A disputed expense.
  const elevatorInvoice = await prisma.document.create({
    data: {
      propertyId: property.id,
      category: DocumentCategory.INVOICE,
      fileName: "فاتورة-صيانة-مصعد-سبتمبر.pdf",
      fileUrl: "/uploads/seed-sep-elevator-invoice.pdf",
      uploadedById: mohammad.id,
    },
  });
  const disputedTx = await prisma.transaction.create({
    data: {
      propertyId: property.id,
      type: TransactionType.EXPENSE,
      category: "صيانة المصعد",
      amount: 1500,
      date: new Date(2026, 8, 9),
      status: VerificationStatus.DISPUTED,
      createdById: mohammad.id,
      evidence: { create: { documentId: elevatorInvoice.id, uploadedById: mohammad.id } },
    },
  });
  const dispute = await prisma.dispute.create({
    data: {
      propertyId: property.id,
      transactionId: disputedTx.id,
      raisedById: sara.id,
      reason: "الفاتورة السابقة لنفس الصيانة كانت 1200 دينار فقط — ما سبب الزيادة؟",
      status: "OPEN",
    },
  });
  await prisma.disputeComment.create({
    data: { disputeId: dispute.id, authorId: mohammad.id, message: "الزيادة بسبب استبدال كبل إضافي، سأرفق الفاتورة التفصيلية." },
  });

  // A pending evidence request.
  await prisma.evidenceRequest.create({
    data: {
      propertyId: property.id,
      requestedById: sara.id,
      assignedToId: mohammad.id,
      message: "الرجاء إرفاق كشف حساب شهر سبتمبر الكامل.",
      status: "PENDING",
    },
  });

  // An active decision under ownership-weighted voting.
  const decision = await prisma.decision.create({
    data: {
      propertyId: property.id,
      title: "استبدال المصعد بالكامل",
      description: "المصعد الحالي يحتاج صيانة متكررة، عرض شركة الصيانة لاستبداله بالكامل بقيمة 5000 دينار.",
      amount: 5000,
      ruleType: ApprovalRuleType.MAJORITY_VOTE,
      status: DecisionStatus.VOTING,
      createdById: mohammad.id,
    },
  });
  await prisma.decisionVote.createMany({
    data: [
      { decisionId: decision.id, userId: mohammad.id, choice: VoteChoice.APPROVE },
      { decisionId: decision.id, userId: ahmad.id, choice: VoteChoice.APPROVE },
      { decisionId: decision.id, userId: khaled.id, choice: VoteChoice.REJECT },
    ],
  });
  await prisma.decision.update({ where: { id: decision.id }, data: { resultPercent: 70 } }); // Mohammad 40 + Ahmad 30

  await prisma.activityLog.createMany({
    data: [
      { propertyId: property.id, actorId: mohammad.id, action: "TRANSACTION_REPORTED", details: "تم تسجيل إيجار وحدة 101 بقيمة 700 JD." },
      { propertyId: property.id, actorId: mohammad.id, action: "EVIDENCE_UPLOADED", details: "تم إرفاق إيصال لعملية بقيمة 700 JD." },
      { propertyId: property.id, actorId: null, action: "CONFIRMATION_RECEIVED", details: "أكّد مستأجر وحدة 101 صحة المبلغ المسجل." },
      { propertyId: property.id, actorId: sara.id, action: "DISPUTE_OPENED", details: "اعتراض على فاتورة صيانة المصعد." },
      { propertyId: property.id, actorId: mohammad.id, action: "DECISION_CREATED", details: "تم إنشاء قرار: استبدال المصعد بالكامل" },
    ],
  });

  console.log("✅ Seed complete.");
  console.log("   Login with any of:");
  console.log("   mohammad@qisma.test / ahmad@qisma.test / khaled@qisma.test / sara@qisma.test");
  console.log("   password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
