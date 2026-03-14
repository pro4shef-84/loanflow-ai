// ============================================================
// DETERMINISTIC DOCUMENT VALIDATION RULES
// AI is NOT involved here — pure rule-based checks on extracted fields
// Ported from mortgage-ai, expanded for all loanflow-ai doc types
// ============================================================

import type { RequiredDocType } from "../enums";
import type { DocumentValidationResult } from "../entities";

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Fields extracted by AI from a document. */
export interface ExtractedFields {
  employee_name?: string;
  employer_name?: string;
  pay_period?: string;
  ytd_income?: string;
  tax_year?: string;
  wages?: string;
  account_holder_name?: string;
  statement_date?: string;
  all_pages?: string;
  page_count?: string;
  full_name?: string;
  id_type?: string;
  document_type?: string;
  date?: string;
  image_quality?: string;
  agi?: string;
  net_profit?: string;
  signed?: string;
  account_number?: string;
  policy_active?: string;
  coverage_amount?: string;
  [key: string]: string | undefined;
}

function isDateOlderThan(dateStr: string | undefined, maxAgeMs: number): boolean {
  if (!dateStr) return true;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return true;
  return Date.now() - parsed.getTime() > maxAgeMs;
}

function isImageQualityLow(quality: string | undefined): boolean {
  if (!quality) return false;
  return ["low", "poor", "blurry", "unreadable"].includes(quality.toLowerCase());
}

// ── Pay Stub ────────────────────────────────────────────────

function validatePayStub(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!fields.employee_name) missing.push("employee_name");
  if (!fields.employer_name) {
    missing.push("employer_name");
    issues.push("Employer name is missing from the pay stub.");
  }
  if (!fields.pay_period) missing.push("pay_period");

  if (!fields.ytd_income) {
    missing.push("ytd_income");
    issues.push("Missing year-to-date income — required for all pay stubs.");
  }

  if (isDateOlderThan(fields.pay_period, SIXTY_DAYS_MS)) {
    issues.push("Pay stub is older than 60 days and cannot be accepted.");
  }

  if (isImageQualityLow(fields.image_quality)) {
    issues.push("Image quality is too low to read required fields clearly.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── W-2 ─────────────────────────────────────────────────────

function validateW2(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  const currentYear = new Date().getFullYear();
  const expectedYear = currentYear - 1;

  if (!fields.employee_name) missing.push("employee_name");

  if (!fields.tax_year) {
    missing.push("tax_year");
    issues.push("Tax year is missing from the W-2.");
  } else {
    const docYear = parseInt(fields.tax_year, 10);
    if (docYear !== expectedYear) {
      issues.push(`W-2 is for tax year ${docYear}, but we need the ${expectedYear} W-2.`);
    }
  }

  if (!fields.wages) {
    missing.push("wages");
    issues.push("Wage amount (Box 1) is missing from the W-2.");
  }

  if (isImageQualityLow(fields.image_quality)) {
    issues.push("Partial screenshot detected — please provide the complete W-2 document.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Bank Statement ──────────────────────────────────────────

function validateBankStatement(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!fields.account_holder_name) missing.push("account_holder_name");

  if (!fields.statement_date) {
    missing.push("statement_date");
    issues.push("Statement date is missing.");
  } else if (isDateOlderThan(fields.statement_date, NINETY_DAYS_MS)) {
    issues.push("Bank statement is older than 90 days and cannot be accepted.");
  }

  const pageCount = parseInt(fields.page_count ?? "0", 10);
  if (fields.all_pages !== "true" || pageCount < 2) {
    issues.push(
      "All pages of the bank statement are required. It appears only page 1 was uploaded, or this is a screenshot."
    );
  }

  if (isImageQualityLow(fields.image_quality)) {
    issues.push("Image quality too low — please upload the original PDF from your bank.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Government ID ───────────────────────────────────────────

function validateGovernmentId(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!fields.full_name) missing.push("full_name");

  if (!fields.id_type) {
    missing.push("id_type");
    issues.push("Could not identify the type of ID (driver's license, passport, etc.).");
  }

  if (isImageQualityLow(fields.image_quality)) {
    issues.push("ID image is not legible. Please take a clearer photo in good lighting.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Purchase Contract ───────────────────────────────────────

function validatePurchaseContract(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (
    !fields.document_type ||
    !["purchase_agreement", "purchase_contract", "sales_contract"].includes(
      fields.document_type.toLowerCase()
    )
  ) {
    issues.push("Document could not be identified as a purchase agreement or sales contract.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Tax Return 1040 ─────────────────────────────────────────

function validateTaxReturn1040(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  const currentYear = new Date().getFullYear();
  const expectedYear = currentYear - 1;

  if (!fields.tax_year) {
    missing.push("tax_year");
    issues.push("Tax year is missing from the 1040.");
  } else {
    const docYear = parseInt(fields.tax_year, 10);
    if (docYear !== expectedYear) {
      issues.push(`Tax return is for ${docYear}, but we need the ${expectedYear} return.`);
    }
  }

  if (!fields.agi) {
    missing.push("agi");
    issues.push("Adjusted Gross Income (AGI) is missing from the return.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Schedule C ──────────────────────────────────────────────

function validateScheduleC(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  const currentYear = new Date().getFullYear();
  const expectedYear = currentYear - 1;

  if (!fields.tax_year) {
    missing.push("tax_year");
  } else {
    const docYear = parseInt(fields.tax_year, 10);
    if (docYear !== expectedYear) {
      issues.push(`Schedule C is for ${docYear}, but must match the ${expectedYear} tax year.`);
    }
  }

  if (!fields.net_profit) {
    missing.push("net_profit");
    issues.push("Net profit/loss is missing from the Schedule C.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Profit & Loss Statement ─────────────────────────────────

function validateProfitLossStatement(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (isDateOlderThan(fields.date, NINETY_DAYS_MS)) {
    issues.push("Profit & loss statement is older than 90 days.");
  }

  if (fields.signed === "false" || fields.signed === undefined) {
    warnings.push("P&L statement may need to be signed by a CPA or tax preparer.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Mortgage Statement ──────────────────────────────────────

function validateMortgageStatement(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (isDateOlderThan(fields.date, NINETY_DAYS_MS)) {
    issues.push("Mortgage statement is not current (older than 90 days).");
  }

  if (!fields.account_number) {
    missing.push("account_number");
    issues.push("Account number is missing from the mortgage statement.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Homeowners Insurance ────────────────────────────────────

function validateHomeownersInsurance(fields: ExtractedFields): DocumentValidationResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (fields.policy_active === "false") {
    issues.push("Homeowners insurance policy does not appear to be active.");
  }

  if (!fields.coverage_amount) {
    warnings.push("Coverage amount could not be determined — officer should verify adequate coverage.");
  }

  return { valid: issues.length === 0 && missing.length === 0, issues, missing_fields: missing, warnings };
}

// ── Document Expiration Configuration ───────────────────────

/**
 * Expiration configuration for each document type.
 * `expirationDays` is null for docs that do not expire.
 * `warningThresholdDays` is how many days before expiration to warn.
 */
interface ExpirationConfig {
  expirationDays: number | null;
  warningThresholdDays: number;
}

const EXPIRATION_CONFIG: Record<RequiredDocType, ExpirationConfig> = {
  pay_stub: { expirationDays: 60, warningThresholdDays: 14 },
  bank_statement: { expirationDays: 90, warningThresholdDays: 14 },
  government_id: { expirationDays: null, warningThresholdDays: 14 },
  purchase_contract: { expirationDays: null, warningThresholdDays: 14 },
  w2: { expirationDays: 365, warningThresholdDays: 14 },
  tax_return_1040: { expirationDays: 365, warningThresholdDays: 14 },
  schedule_c: { expirationDays: 365, warningThresholdDays: 14 },
  profit_loss_statement: { expirationDays: 90, warningThresholdDays: 14 },
  mortgage_statement: { expirationDays: 90, warningThresholdDays: 14 },
  homeowners_insurance: { expirationDays: 365, warningThresholdDays: 14 },
  dd214: { expirationDays: null, warningThresholdDays: 14 },
  va_coe: { expirationDays: null, warningThresholdDays: 14 },
  fha_case_number: { expirationDays: null, warningThresholdDays: 14 },
  unknown_document: { expirationDays: null, warningThresholdDays: 14 },
};

export interface ExpirationCheckResult {
  expired: boolean;
  daysRemaining: number;
  warningThreshold: number;
}

/**
 * Check if a document has expired or is nearing expiration based on its type
 * and upload date.
 *
 * @param docType - The document type
 * @param uploadedAt - ISO date string of when the document was uploaded
 * @returns Expiration status, or null if the doc type does not expire
 */
export function checkExpiration(
  docType: RequiredDocType,
  uploadedAt: string
): ExpirationCheckResult | null {
  const config = EXPIRATION_CONFIG[docType];
  if (config.expirationDays === null) return null;

  const uploadDate = new Date(uploadedAt);
  if (isNaN(uploadDate.getTime())) return null;

  const expirationDate = new Date(uploadDate.getTime() + config.expirationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msRemaining = expirationDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

  return {
    expired: daysRemaining <= 0,
    daysRemaining: Math.max(daysRemaining, 0),
    warningThreshold: config.warningThresholdDays,
  };
}

/**
 * Get the expiration configuration for a document type.
 */
export function getExpirationConfig(docType: RequiredDocType): ExpirationConfig {
  return EXPIRATION_CONFIG[docType];
}

// ── Main validator dispatch ─────────────────────────────────

export function validateDocument(
  docType: RequiredDocType,
  extractedFields: ExtractedFields
): DocumentValidationResult {
  switch (docType) {
    case "pay_stub":
      return validatePayStub(extractedFields);
    case "w2":
      return validateW2(extractedFields);
    case "bank_statement":
      return validateBankStatement(extractedFields);
    case "government_id":
      return validateGovernmentId(extractedFields);
    case "purchase_contract":
      return validatePurchaseContract(extractedFields);
    case "tax_return_1040":
      return validateTaxReturn1040(extractedFields);
    case "schedule_c":
      return validateScheduleC(extractedFields);
    case "profit_loss_statement":
      return validateProfitLossStatement(extractedFields);
    case "mortgage_statement":
      return validateMortgageStatement(extractedFields);
    case "homeowners_insurance":
      return validateHomeownersInsurance(extractedFields);
    case "unknown_document":
      return {
        valid: false,
        issues: ["Document type could not be determined. Please upload the correct document."],
        missing_fields: [],
        warnings: [],
      };
    default:
      return {
        valid: true,
        issues: [],
        missing_fields: [],
        warnings: [`No specific validation rules for document type "${docType}".`],
      };
  }
}
