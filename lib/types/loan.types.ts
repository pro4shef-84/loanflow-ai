export type LoanType = "purchase" | "refinance" | "heloc" | "non_qm" | "va" | "fha" | "usda";
export type LoanPurpose = "primary_residence" | "second_home" | "investment";
export type LoanStatus =
  | "intake"
  | "verification"
  | "submitted"
  | "in_underwriting"
  | "conditional_approval"
  | "clear_to_close"
  | "closed"
  | "withdrawn";

export type DocumentType =
  | "w2"
  | "pay_stub"
  | "bank_statement"
  | "tax_return_1040"
  | "schedule_c"
  | "schedule_e"
  | "purchase_contract"
  | "mortgage_statement"
  | "drivers_license"
  | "social_security"
  | "gift_letter"
  | "voe"
  | "appraisal"
  | "title_report"
  | "homeowners_insurance"
  | "hoa_statement"
  | "rental_agreement"
  | "conditional_approval"
  | "other";

export type DocumentStatus =
  | "pending"
  | "uploaded"
  | "processing"
  | "verified"
  | "needs_attention"
  | "rejected"
  | "expired";

export interface ReadinessIssue {
  field: string;
  message: string;
  severity: "blocker" | "warning";
}

export interface ReadinessBreakdown {
  documents: { score: number; max: 30; issues: ReadinessIssue[] };
  income: { score: number; max: 30; issues: ReadinessIssue[] };
  assets: { score: number; max: 20; issues: ReadinessIssue[] };
  application: { score: number; max: 20; issues: ReadinessIssue[] };
}

export interface ReadinessScore {
  score: number;
  grade: "A" | "B" | "C" | "F";
  breakdown: ReadinessBreakdown;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  ready_to_submit: boolean;
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  intake: "Intake",
  verification: "Verification",
  submitted: "Submitted",
  in_underwriting: "In Underwriting",
  conditional_approval: "Conditional Approval",
  clear_to_close: "Clear to Close",
  closed: "Closed",
  withdrawn: "Withdrawn",
};

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
  heloc: "HELOC",
  non_qm: "Non-QM",
  va: "VA Loan",
  fha: "FHA Loan",
  usda: "USDA Loan",
};

export const LOAN_STATUS_ORDER: LoanStatus[] = [
  "intake",
  "verification",
  "submitted",
  "in_underwriting",
  "conditional_approval",
  "clear_to_close",
  "closed",
];
