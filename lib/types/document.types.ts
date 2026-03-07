import type { DocumentType, DocumentStatus } from "./loan.types";

export interface ExtractedW2 {
  employer_name?: string;
  employee_name?: string;
  tax_year?: number;
  wages?: number;
  federal_tax_withheld?: number;
  state_wages?: number;
}

export interface ExtractedPayStub {
  employer_name?: string;
  employee_name?: string;
  pay_period_start?: string;
  pay_period_end?: string;
  gross_pay_ytd?: number;
  gross_pay_period?: number;
  net_pay?: number;
  pay_frequency?: "weekly" | "biweekly" | "semimonthly" | "monthly";
}

export interface ExtractedBankStatement {
  institution_name?: string;
  account_holder?: string;
  account_type?: string;
  statement_period?: string;
  beginning_balance?: number;
  ending_balance?: number;
  total_deposits?: number;
  total_withdrawals?: number;
}

export type ExtractedData = ExtractedW2 | ExtractedPayStub | ExtractedBankStatement | Record<string, unknown>;

export interface DocumentWithExtraction {
  id: string;
  loan_file_id: string;
  type: DocumentType;
  status: DocumentStatus;
  file_path: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  extracted_data: ExtractedData | null;
  extraction_confidence: number | null;
  verification_flags: VerificationFlag[] | null;
  required: boolean | null;
  notes: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationFlag {
  type: "warning" | "error" | "info";
  field: string;
  message: string;
}
