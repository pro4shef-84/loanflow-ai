// ============================================================
// CONDITION ↔ DOCUMENT REQUIREMENT MATCHER
// Matches lender condition text to document requirements using
// keyword-based heuristics. No AI involved — pure deterministic.
// ============================================================

import type { RequiredDocType } from "@/lib/domain/enums";

export interface DocumentRequirementRef {
  id: string;
  doc_type: string;
}

export interface ConditionMatchResult {
  requirementId: string;
  docType: RequiredDocType;
  confidence: number;
}

/**
 * Keyword patterns mapped to doc types, ordered by specificity.
 * Each entry: [docType, keywords[], confidence boost for exact phrase match]
 */
const KEYWORD_MAP: Array<{
  docType: RequiredDocType;
  keywords: string[];
  phrases: string[];
}> = [
  {
    docType: "pay_stub",
    keywords: ["pay stub", "paystub", "pay stubs", "paystubs", "recent pay"],
    phrases: ["most recent pay stub", "30 days of pay stubs", "current pay stub"],
  },
  {
    docType: "w2",
    keywords: ["w-2", "w2", "w 2"],
    phrases: ["w-2 form", "most recent w-2", "prior year w-2"],
  },
  {
    docType: "bank_statement",
    keywords: ["bank statement", "bank statements", "checking account", "savings account", "asset statement"],
    phrases: ["two months bank statements", "60 days bank statements", "most recent bank statement"],
  },
  {
    docType: "government_id",
    keywords: ["driver's license", "drivers license", "government id", "photo id", "identification", "passport"],
    phrases: ["valid government-issued id", "copy of driver's license"],
  },
  {
    docType: "purchase_contract",
    keywords: ["purchase contract", "purchase agreement", "sales contract", "signed contract"],
    phrases: ["fully executed purchase contract", "signed purchase agreement"],
  },
  {
    docType: "tax_return_1040",
    keywords: ["tax return", "1040", "tax returns", "federal tax"],
    phrases: ["two years tax returns", "most recent tax return", "federal tax return"],
  },
  {
    docType: "schedule_c",
    keywords: ["schedule c", "schedule-c"],
    phrases: ["schedule c from tax return"],
  },
  {
    docType: "profit_loss_statement",
    keywords: ["profit and loss", "profit & loss", "p&l", "p & l", "profit loss"],
    phrases: ["year-to-date profit and loss", "current p&l statement"],
  },
  {
    docType: "mortgage_statement",
    keywords: ["mortgage statement", "mortgage payoff", "loan statement"],
    phrases: ["current mortgage statement", "most recent mortgage statement"],
  },
  {
    docType: "homeowners_insurance",
    keywords: ["homeowners insurance", "homeowner's insurance", "hazard insurance", "insurance policy", "insurance binder"],
    phrases: ["proof of homeowners insurance", "insurance declaration page"],
  },
  {
    docType: "dd214",
    keywords: ["dd-214", "dd214", "dd 214", "military discharge"],
    phrases: ["copy of dd-214"],
  },
  {
    docType: "va_coe",
    keywords: ["certificate of eligibility", "coe", "va eligibility"],
    phrases: ["va certificate of eligibility"],
  },
  {
    docType: "fha_case_number",
    keywords: ["fha case", "case number assignment"],
    phrases: ["fha case number"],
  },
];

/**
 * Match a lender condition text to a document requirement.
 *
 * @param conditionText - The raw lender condition text
 * @param requirements - List of document requirements for the loan
 * @returns The best match with confidence, or null if no match found
 */
export function matchConditionToRequirement(
  conditionText: string,
  requirements: DocumentRequirementRef[]
): ConditionMatchResult | null {
  if (!conditionText || requirements.length === 0) return null;

  const normalizedText = conditionText.toLowerCase();

  let bestMatch: { docType: RequiredDocType; confidence: number } | null = null;

  for (const entry of KEYWORD_MAP) {
    // Check for exact phrase matches first (higher confidence)
    const phraseMatch = entry.phrases.some((phrase) => normalizedText.includes(phrase));
    if (phraseMatch) {
      const confidence = 0.95;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { docType: entry.docType, confidence };
      }
      continue;
    }

    // Check for keyword matches
    const matchedKeywords = entry.keywords.filter((kw) => normalizedText.includes(kw));
    if (matchedKeywords.length > 0) {
      // More keyword matches = higher confidence
      const baseConfidence = 0.7;
      const boost = Math.min(matchedKeywords.length - 1, 2) * 0.1;
      const confidence = Math.min(baseConfidence + boost, 0.9);

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { docType: entry.docType, confidence };
      }
    }
  }

  if (!bestMatch) return null;

  // Find the matching requirement
  const matchingRequirement = requirements.find(
    (r) => r.doc_type === bestMatch.docType
  );

  if (!matchingRequirement) return null;

  return {
    requirementId: matchingRequirement.id,
    docType: bestMatch.docType,
    confidence: bestMatch.confidence,
  };
}
