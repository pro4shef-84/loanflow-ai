/**
 * Zod schemas for all API route request bodies.
 * Import the relevant schema in each route and call .safeParse(body) before
 * processing — never trust raw JSON from the client.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth / Users
// ---------------------------------------------------------------------------
export const signupSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Name is required").max(100),
});

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------
export const createLoanSchema = z.object({
  loan_type: z.enum(["purchase", "refinance", "heloc", "non_qm", "va", "fha", "usda"]),
  loan_purpose: z.enum(["primary_residence", "second_home", "investment"]).optional(),
  loan_amount: z.number().positive().optional(),
  property_address: z.string().max(200).optional(),
  property_city: z.string().max(100).optional(),
  property_state: z.string().length(2).optional(),
  property_zip: z.string().max(10).optional(),
  estimated_value: z.number().positive().optional(),
  borrower_id: z.string().uuid().optional(),
  closing_date: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateLoanSchema = createLoanSchema.partial().extend({
  status: z.enum([
    "intake", "verification", "submitted", "in_underwriting",
    "conditional_approval", "clear_to_close", "closed", "withdrawn",
  ]).optional(),
  rate_lock_date: z.string().optional(),
  rate_lock_expires_at: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Loan Applications (1003)
// ---------------------------------------------------------------------------
export const saveApplicationSchema = z.object({
  borrower_first_name: z.string().max(100).optional(),
  borrower_last_name: z.string().max(100).optional(),
  borrower_ssn_last4: z.string().max(4).regex(/^\d{0,4}$/).optional(),
  borrower_dob: z.string().optional(),
  borrower_email: z.email().optional().or(z.literal("")),
  borrower_phone: z.string().max(20).optional(),
  borrower_marital_status: z.enum(["married", "separated", "unmarried"]).optional(),
  borrower_dependents: z.number().int().min(0).max(20).optional(),
  borrower_citizenship: z.enum(["us_citizen", "permanent_resident", "non_permanent_resident"]).optional(),
  current_address: z.string().max(200).optional(),
  current_city: z.string().max(100).optional(),
  current_state: z.string().max(2).optional(),
  current_zip: z.string().max(10).optional(),
  current_housing: z.enum(["own", "rent", "living_rent_free"]).optional(),
  years_at_address: z.number().int().min(0).optional(),
  employer_name: z.string().max(200).optional(),
  employer_address: z.string().max(200).optional(),
  employer_phone: z.string().max(20).optional(),
  employment_start_date: z.string().optional(),
  years_employed: z.number().min(0).optional(),
  job_title: z.string().max(100).optional(),
  self_employed: z.boolean().optional(),
  base_income: z.number().min(0).optional(),
  overtime_income: z.number().min(0).optional(),
  bonus_income: z.number().min(0).optional(),
  commission_income: z.number().min(0).optional(),
  other_income: z.number().min(0).optional(),
  checking_balance: z.number().min(0).optional(),
  savings_balance: z.number().min(0).optional(),
  retirement_balance: z.number().min(0).optional(),
  other_assets: z.array(z.object({ label: z.string(), amount: z.number() })).optional(),
  liabilities: z.array(z.object({
    creditor: z.string(),
    type: z.string(),
    balance: z.number(),
    monthly_payment: z.number(),
  })).optional(),
  outstanding_judgments: z.boolean().optional(),
  declared_bankruptcy: z.boolean().optional(),
  property_foreclosed: z.boolean().optional(),
  party_to_lawsuit: z.boolean().optional(),
  loan_obligations: z.boolean().optional(),
  delinquent_federal_debt: z.boolean().optional(),
  co_maker_note: z.boolean().optional(),
  intend_to_occupy: z.boolean().optional(),
  ownership_interest: z.boolean().optional(),
  co_borrower: z.record(z.string(), z.unknown()).optional(),
  completed_sections: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// AUS Simulation
// ---------------------------------------------------------------------------
export const ausSimulationSchema = z.object({
  loanFileId: z.string().uuid(),
  creditScore: z.number().int().min(300).max(850),
  monthlyIncome: z.number().min(0),
  monthlyDebts: z.number().min(0),
  reserveMonths: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Pre-Approval
// ---------------------------------------------------------------------------
export const generatePreapprovalSchema = z.object({
  loanFileId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Lender Submission
// ---------------------------------------------------------------------------
export const createSubmissionSchema = z.object({
  lenderId: z.string().uuid(),
  submissionType: z.enum(["initial", "conditions", "resubmission"]).default("initial"),
  documentsIncluded: z.array(z.string().uuid()).default([]),
  notes: z.string().max(5000).optional(),
});

export const updateSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(["preparing", "submitted", "acknowledged", "conditions_issued", "cleared"]),
  lenderLoanNumber: z.string().max(100).optional(),
});

// ---------------------------------------------------------------------------
// Disclosures
// ---------------------------------------------------------------------------
export const createDisclosureSchema = z.object({
  disclosure_type: z.enum([
    "loan_estimate", "closing_disclosure", "intent_to_proceed",
    "right_to_cancel", "anti_steering", "affiliated_business",
    "servicing", "arm_disclosure", "initial_escrow", "homeowners_insurance",
  ]),
  stage: z.enum(["initial", "revised", "final"]).default("initial"),
  status: z.enum(["pending", "sent", "viewed", "signed", "waived"]).default("pending"),
  due_date: z.string().optional(),
  method: z.enum(["email", "in_person", "mail", "electronic"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateDisclosureSchema = z.object({
  disclosureId: z.string().uuid(),
  status: z.enum(["pending", "sent", "viewed", "signed", "waived"]),
  notes: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// File Completion Engine
// ---------------------------------------------------------------------------
export const resolveEscalationSchema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  resolution: z.string().optional(),
});

export const submitReviewSchema = z.object({
  decision: z.enum(["review_ready", "needs_correction", "archived"]),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper: parse or return 400
// ---------------------------------------------------------------------------
export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { success: false, error: messages };
  }
  return { success: true, data: result.data };
}
