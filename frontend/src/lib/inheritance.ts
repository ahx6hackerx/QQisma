// A deliberately SIMPLIFIED Islamic inheritance (فرائض) calculator covering
// the most common heir combinations: spouse, children, and parents. It does
// NOT model every fiqh edge case (عول/رد adjustments, siblings' effect on
// the mother's share, grandparents, multiple wives, kalala rules, etc.).
// This is an estimation/planning tool only — any real division must be
// confirmed with a qualified Sharia authority or court.

export interface InheritanceInput {
  deceasedGender: "male" | "female";
  spouseAlive: boolean;
  sonsCount: number;
  daughtersCount: number;
  fatherAlive: boolean;
  motherAlive: boolean;
}

export interface InheritanceResult {
  shares: {
    label: string;
    fraction: number; // 0..1
    count: number;
  }[];
  unallocatedFraction: number;
  needsProfessionalReview: boolean;
  notes: string[];
}

export function calculateInheritance(input: InheritanceInput): InheritanceResult {
  const { deceasedGender, spouseAlive, sonsCount, daughtersCount, fatherAlive, motherAlive } = input;
  const hasChildren = sonsCount > 0 || daughtersCount > 0;
  const notes: string[] = [];

  let spouseFraction = 0;
  let spouseLabel = "";
  if (spouseAlive) {
    if (deceasedGender === "male") {
      spouseFraction = hasChildren ? 1 / 8 : 1 / 4;
      spouseLabel = "الزوجة";
    } else {
      spouseFraction = hasChildren ? 1 / 4 : 1 / 2;
      spouseLabel = "الزوج";
    }
  }

  let motherFraction = motherAlive ? (hasChildren ? 1 / 6 : 1 / 3) : 0;
  let fatherFraction = fatherAlive && hasChildren ? 1 / 6 : 0;

  let usedSoFar = spouseFraction + motherFraction + fatherFraction;
  let remaining = Math.max(0, 1 - usedSoFar);

  const shares: InheritanceResult["shares"] = [];
  if (spouseAlive) shares.push({ label: spouseLabel, fraction: spouseFraction, count: 1 });
  if (motherAlive) shares.push({ label: "الأم", fraction: motherFraction, count: 1 });

  let unallocated = 0;
  let needsReview = false;

  if (hasChildren) {
    if (sonsCount > 0) {
      // Sons make daughters residuary heirs too — split remaining 2:1.
      const units = sonsCount * 2 + daughtersCount;
      const perUnit = remaining / units;
      shares.push({ label: "الابن", fraction: perUnit * 2, count: sonsCount });
      if (daughtersCount > 0) shares.push({ label: "الابنة", fraction: perUnit, count: daughtersCount });
      if (fatherAlive) shares.push({ label: "الأب", fraction: fatherFraction, count: 1 });
    } else {
      // Daughters only: fixed fard shares (1/2 for one, 2/3 for two or more).
      const daughtersFraction = daughtersCount === 1 ? 1 / 2 : 2 / 3;
      shares.push({ label: "الابنة", fraction: daughtersFraction, count: daughtersCount });
      let leftover = remaining - daughtersFraction;
      if (fatherAlive) {
        // Father takes his fixed 1/6 plus whatever residuary remains.
        const fatherTotal = fatherFraction + Math.max(0, leftover);
        shares.push({ label: "الأب", fraction: fatherTotal, count: 1 });
        leftover = 0;
      }
      if (leftover > 0.0001) {
        unallocated = leftover;
        needsReview = true;
        notes.push("يوجد باقٍ من التركة يحتاج لتوزيع حسب قواعد الرَّد أو العصبة — يرجى مراجعة جهة شرعية مختصة.");
      }
    }
  } else {
    // No children at all.
    if (fatherAlive) {
      shares.push({ label: "الأب", fraction: fatherFraction + remaining, count: 1 });
    } else if (remaining > 0.0001) {
      unallocated = remaining;
      needsReview = true;
      notes.push("لا يوجد أبناء أو أب على قيد الحياة في هذا السيناريو — الباقي يذهب لورثة آخرين (إخوة، أجداد...) لم تُدرَج هنا.");
    }
  }

  return { shares: shares.filter((s) => s.fraction > 0), unallocatedFraction: unallocated, needsProfessionalReview: needsReview, notes };
}
