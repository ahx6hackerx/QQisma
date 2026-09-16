import { ApprovalRuleType, VoteChoice } from "@prisma/client";

interface OwnershipShare {
  userId: string;
  sharePercent: number;
}

interface Vote {
  userId: string;
  choice: VoteChoice;
}

export interface DecisionOutcome {
  resultPercent: number; // % of ownership that voted APPROVE
  participatedPercent: number; // % of ownership that has voted at all
  isFinal: boolean; // true once enough of the ownership has voted to be conclusive
  passed: boolean;
}

const THRESHOLD_BY_RULE: Record<ApprovalRuleType, number> = {
  NONE: 0,
  MANAGER_APPROVAL: 0, // handled outside voting — manager action is enough
  MAJORITY_VOTE: 50,
  TWO_THIRDS_VOTE: 66.67,
  UNANIMOUS_VOTE: 100,
};

/**
 * Evaluates a decision's votes against the ownership structure and the
 * property's approval rule. Ownership-weighted, not head-count-weighted:
 * a 40% owner's vote counts for 40 points, matching how قِسمة frames
 * governance around ownership share rather than "one partner one vote".
 */
export function evaluateDecisionVotes(
  ruleType: ApprovalRuleType,
  ownership: OwnershipShare[],
  votes: Vote[]
): DecisionOutcome {
  const shareByUser = new Map(ownership.map((o) => [o.userId, o.sharePercent]));
  const threshold = THRESHOLD_BY_RULE[ruleType];

  let approvePercent = 0;
  let rejectPercent = 0;
  for (const vote of votes) {
    const share = shareByUser.get(vote.userId) ?? 0;
    if (vote.choice === "APPROVE") approvePercent += share;
    else rejectPercent += share;
  }
  approvePercent = Math.round(approvePercent * 100) / 100;
  rejectPercent = Math.round(rejectPercent * 100) / 100;
  const participatedPercent = Math.round((approvePercent + rejectPercent) * 100) / 100;

  // Final the moment the outcome can no longer flip, i.e. approve side has
  // already cleared the threshold, or the remaining un-voted share could
  // not possibly get the reject side (or approve side) past it.
  const remaining = Math.round((100 - participatedPercent) * 100) / 100;
  const approvedAlready = approvePercent >= threshold && threshold > 0;
  const cannotReachThreshold = approvePercent + remaining < threshold;

  const isFinal = approvedAlready || cannotReachThreshold || remaining <= 0;
  const passed = approvePercent >= threshold;

  return { resultPercent: approvePercent, participatedPercent, isFinal, passed };
}
