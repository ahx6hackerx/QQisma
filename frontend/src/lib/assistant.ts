// A deliberately RULE-BASED quick-answer engine, not a conversational LLM
// (which would need a paid API). It recognizes a fixed set of common
// questions and answers them from real data via the existing API — zero
// external cost, always accurate to what's actually in the ledger.

import { distributionsApi, propertiesApi, evidenceApi } from "../api/client";
import { formatMoney } from "./format";

interface Intent {
  keywords: string[];
  handler: (propertyId: string) => Promise<string>;
}

function buildIntents(language: "ar" | "en"): Intent[] {
  return [
    {
      keywords: ["بقي", "متبقي", "مستحق", "left", "pending", "owed"],
      handler: async (propertyId) => {
        const data = await distributionsApi.myShare(propertyId);
        return language === "ar"
          ? `المبلغ المتبقي المستحق لك حاليًا هو ${formatMoney(data.pendingTotal)}.`
          : `Your current pending amount is ${formatMoney(data.pendingTotal)}.`;
      },
    },
    {
      keywords: ["استلمت", "قبضت", "received", "collected"],
      handler: async (propertyId) => {
        const data = await distributionsApi.myShare(propertyId);
        return language === "ar"
          ? `إجمالي ما استلمته حتى الآن ${formatMoney(data.receivedTotal)}.`
          : `You've received a total of ${formatMoney(data.receivedTotal)} so far.`;
      },
    },
    {
      keywords: ["نسبة ملكيتي", "حصتي", "my share", "my ownership", "percentage"],
      handler: async (propertyId) => {
        const data = await distributionsApi.myShare(propertyId);
        return language === "ar"
          ? `نسبة ملكيتك في هذا العقار هي ${data.sharePercent}%، بقيمة تقديرية ${formatMoney(data.shareValue ?? 0)}.`
          : `Your ownership share in this property is ${data.sharePercent}%, worth an estimated ${formatMoney(data.shareValue ?? 0)}.`;
      },
    },
    {
      keywords: ["اعتراض", "dispute"],
      handler: async (propertyId) => {
        const data = await propertiesApi.get(propertyId);
        const n = data.stats.openDisputes;
        return language === "ar"
          ? n === 0
            ? "لا توجد اعتراضات مفتوحة حاليًا."
            : `يوجد ${n} اعتراض مفتوح حاليًا — راجع تبويب الاعتراضات.`
          : n === 0
          ? "There are no open disputes right now."
          : `There ${n === 1 ? "is" : "are"} ${n} open dispute${n === 1 ? "" : "s"} right now — check the Disputes tab.`;
      },
    },
    {
      keywords: ["فرق", "فروقات", "discrepan"],
      handler: async (propertyId) => {
        const rows = await evidenceApi.discrepancies(propertyId);
        const n = rows.filter((r: any) => r.result === "DISCREPANCY").length;
        return language === "ar"
          ? n === 0
            ? "لا توجد فروقات غير محلولة حاليًا."
            : `يوجد ${n} فرق غير متطابق يحتاج مراجعة — تبويب الإثباتات.`
          : n === 0
          ? "No unresolved discrepancies right now."
          : `There ${n === 1 ? "is" : "are"} ${n} unresolved discrepanc${n === 1 ? "y" : "ies"} — check the Evidence tab.`;
      },
    },
    {
      keywords: ["قرار", "تصويت", "decision", "vote"],
      handler: async (propertyId) => {
        const data = await propertiesApi.get(propertyId);
        const n = data.stats.pendingDecisions;
        return language === "ar"
          ? n === 0
            ? "لا توجد قرارات تنتظر تصويتك حاليًا."
            : `يوجد ${n} قرار ينتظر التصويت — تبويب القرارات.`
          : n === 0
          ? "No decisions awaiting your vote right now."
          : `There ${n === 1 ? "is" : "are"} ${n} decision${n === 1 ? "" : "s"} awaiting a vote — check the Decisions tab.`;
      },
    },
  ];
}

export async function answerQuestion(propertyId: string, question: string, language: "ar" | "en"): Promise<string> {
  const normalized = question.trim().toLowerCase();
  const intents = buildIntents(language);
  for (const intent of intents) {
    if (intent.keywords.some((kw) => normalized.includes(kw))) {
      try {
        return await intent.handler(propertyId);
      } catch {
        return language === "ar" ? "تعذّر جلب الإجابة الآن، حاول مرة أخرى." : "Couldn't fetch the answer right now, try again.";
      }
    }
  }
  return language === "ar"
    ? 'لم أفهم سؤالك بعد — جرّب: "كم بقي لي؟"، "كم استلمت؟"، "نسبة ملكيتي؟"، "اعتراضات مفتوحة؟"، "فروقات؟"، أو "قرارات؟"'
    : 'Not sure yet — try: "how much is left?", "how much did I receive?", "my ownership share?", "open disputes?", "discrepancies?", or "pending decisions?"';
}
