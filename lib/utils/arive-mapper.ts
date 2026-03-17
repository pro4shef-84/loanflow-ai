// ============================================================
// ARIVE JSON EXPORT → LOANFLOW SCHEMA MAPPER
// Maps ARIVE's pipeline export format to LoanFlow's DB schema.
// ARIVE exports a JSON array of loan objects.
// ============================================================

import type { Database } from "@/lib/types/database.types";

type LoanInsert = Database["public"]["Tables"]["loan_files"]["Insert"];
type LoanAppInsert = Database["public"]["Tables"]["loan_applications"]["Insert"];
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];

export interface AriveLoan {
  // Loan identifiers
  id?: string;
  loanNumber?: string;
  fileNumber?: string;

  // Loan details
  loanAmount?: number | string;
  loanType?: string;
  loanPurpose?: string;
  interestRate?: number;
  loanTerm?: number;
  program?: string;

  // Property
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  propertyZipCode?: string;
  estimatedValue?: number | string;
  purchasePrice?: number | string;
  appraisedValue?: number | string;

  // Status
  status?: string;
  loanStatus?: string;
  stage?: string;
  closingDate?: string;
  estimatedClosingDate?: string;
  rateLockDate?: string;
  rateLockExpiration?: string;

  // Borrower (primary)
  borrowerFirstName?: string;
  borrowerLastName?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  borrowerSSN?: string;
  borrowerDOB?: string;
  borrowerMaritalStatus?: string;
  borrowerCitizenship?: string;

  // Borrower address
  borrowerAddress?: string;
  borrowerCity?: string;
  borrowerState?: string;
  borrowerZip?: string;
  borrowerHousing?: string;

  // Borrower employment
  employerName?: string;
  employerAddress?: string;
  employerPhone?: string;
  employmentStartDate?: string;
  jobTitle?: string;
  selfEmployed?: boolean;

  // Borrower income
  baseIncome?: number;
  overtimeIncome?: number;
  bonusIncome?: number;
  commissionIncome?: number;
  monthlyIncome?: number;

  // Borrower assets
  checkingBalance?: number;
  savingsBalance?: number;
  retirementBalance?: number;

  // Co-borrower (primary)
  coBorrowerFirstName?: string;
  coBorrowerLastName?: string;
  coBorrowerEmail?: string;
  coBorrowerPhone?: string;

  // Lender
  lenderName?: string;
  lenderId?: string;

  // Notes
  notes?: string;

  // Employment type
  employmentType?: string;
}

export interface MappedLoan {
  loan: LoanInsert;
  application: Omit<LoanAppInsert, "loan_file_id">;
  contact: Omit<ContactInsert, "user_id"> | null;
  originalId?: string;
}

export interface ImportError {
  index: number;
  originalId?: string;
  error: string;
}

export interface MapResult {
  mapped: MappedLoan[];
  errors: ImportError[];
}

// ── Loan type mapping ─────────────────────────────────────────

function mapLoanType(raw?: string): LoanInsert["loan_type"] {
  if (!raw) return "purchase";
  const v = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (v.includes("fha")) return "fha";
  if (v.includes("va")) return "va";
  if (v.includes("usda") || v.includes("rural")) return "usda";
  if (v.includes("heloc") || v.includes("lineofcredit")) return "heloc";
  if (v.includes("nonqm") || v.includes("nqm") || v.includes("jumbo")) return "non_qm";
  if (v.includes("refi") || v.includes("refinance")) return "refinance";
  return "purchase";
}

function mapLoanPurpose(raw?: string): LoanInsert["loan_purpose"] {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("invest")) return "investment";
  if (v.includes("second") || v.includes("vacation")) return "second_home";
  return "primary_residence";
}

function mapLoanStatus(raw?: string): LoanInsert["status"] {
  if (!raw) return "intake";
  const v = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (v.includes("closed") || v.includes("funded")) return "closed";
  if (v.includes("cleartoclos") || v.includes("ctc")) return "clear_to_close";
  if (v.includes("conditional") || v.includes("approved")) return "conditional_approval";
  if (v.includes("underwriting") || v.includes("uw")) return "in_underwriting";
  if (v.includes("submitted")) return "submitted";
  if (v.includes("withdrawn") || v.includes("denied") || v.includes("cancelled")) return "withdrawn";
  if (v.includes("verif") || v.includes("processing")) return "verification";
  return "intake";
}

function mapMaritalStatus(raw?: string): LoanAppInsert["borrower_marital_status"] {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("married")) return "married";
  if (v.includes("sep")) return "separated";
  return "unmarried";
}

function mapCitizenship(raw?: string): LoanAppInsert["borrower_citizenship"] {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("permanent")) return "permanent_resident";
  if (v.includes("non") || v.includes("visa")) return "non_permanent_resident";
  return "us_citizen";
}

function mapHousing(raw?: string): LoanAppInsert["current_housing"] {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("rent")) return "rent";
  if (v.includes("free") || v.includes("gift")) return "living_rent_free";
  return "own";
}

function toNumber(val?: number | string | null): number | null {
  if (val == null) return null;
  const n = typeof val === "string" ? parseFloat(val.replace(/[,$]/g, "")) : val;
  return isNaN(n) ? null : n;
}

function maskSSN(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-4) || null;
}

// ── Main mapper ───────────────────────────────────────────────

export function mapAriveLoans(data: unknown): MapResult {
  const loans: AriveLoan[] = Array.isArray(data) ? data : [data as AriveLoan];
  const mapped: MappedLoan[] = [];
  const errors: ImportError[] = [];

  for (let i = 0; i < loans.length; i++) {
    const raw = loans[i];
    if (!raw || typeof raw !== "object") {
      errors.push({ index: i, error: "Invalid loan object" });
      continue;
    }

    try {
      const propertyValue = toNumber(raw.appraisedValue ?? raw.estimatedValue ?? raw.purchasePrice);
      const loanAmount = toNumber(raw.loanAmount);

      const loan: LoanInsert = {
        loan_type: mapLoanType(raw.loanType ?? raw.program),
        loan_purpose: mapLoanPurpose(raw.loanPurpose),
        loan_amount: loanAmount,
        property_address: raw.propertyAddress ?? null,
        property_city: raw.propertyCity ?? null,
        property_state: raw.propertyState?.slice(0, 2).toUpperCase() ?? null,
        property_zip: raw.propertyZip ?? raw.propertyZipCode ?? null,
        estimated_value: propertyValue,
        status: mapLoanStatus(raw.status ?? raw.loanStatus ?? raw.stage),
        file_number: raw.fileNumber ?? raw.loanNumber ?? null,
        closing_date: raw.closingDate ?? raw.estimatedClosingDate ?? null,
        rate_lock_date: raw.rateLockDate ?? null,
        rate_lock_expires_at: raw.rateLockExpiration ?? null,
        notes: raw.notes ?? null,
        employment_type: raw.employmentType ?? null,
        user_id: "", // Will be set by the API route
      };

      const application: Omit<LoanAppInsert, "loan_file_id"> = {
        borrower_first_name: raw.borrowerFirstName ?? null,
        borrower_last_name: raw.borrowerLastName ?? null,
        borrower_ssn_last4: maskSSN(raw.borrowerSSN),
        borrower_dob: raw.borrowerDOB ?? null,
        borrower_email: raw.borrowerEmail ?? null,
        borrower_phone: raw.borrowerPhone ?? null,
        borrower_marital_status: mapMaritalStatus(raw.borrowerMaritalStatus),
        borrower_citizenship: mapCitizenship(raw.borrowerCitizenship),
        current_address: raw.borrowerAddress ?? null,
        current_city: raw.borrowerCity ?? null,
        current_state: raw.borrowerState?.slice(0, 2).toUpperCase() ?? null,
        current_zip: raw.borrowerZip ?? null,
        current_housing: mapHousing(raw.borrowerHousing),
        employer_name: raw.employerName ?? null,
        employer_address: raw.employerAddress ?? null,
        employer_phone: raw.employerPhone ?? null,
        employment_start_date: raw.employmentStartDate ?? null,
        job_title: raw.jobTitle ?? null,
        self_employed: raw.selfEmployed ?? null,
        base_income: toNumber(raw.baseIncome ?? raw.monthlyIncome),
        overtime_income: toNumber(raw.overtimeIncome),
        bonus_income: toNumber(raw.bonusIncome),
        commission_income: toNumber(raw.commissionIncome),
        checking_balance: toNumber(raw.checkingBalance),
        savings_balance: toNumber(raw.savingsBalance),
        retirement_balance: toNumber(raw.retirementBalance),
        co_borrower: (raw.coBorrowerFirstName || raw.coBorrowerLastName)
          ? {
              first_name: raw.coBorrowerFirstName ?? null,
              last_name: raw.coBorrowerLastName ?? null,
              email: raw.coBorrowerEmail ?? null,
              phone: raw.coBorrowerPhone ?? null,
            }
          : null,
      };

      // Create a contact record for the borrower if we have enough info
      let contact: Omit<ContactInsert, "user_id"> | null = null;
      if (raw.borrowerFirstName && raw.borrowerLastName) {
        contact = {
          type: "borrower",
          first_name: raw.borrowerFirstName,
          last_name: raw.borrowerLastName,
          email: raw.borrowerEmail ?? null,
          phone: raw.borrowerPhone ?? null,
          property_value: propertyValue,
        };
      }

      mapped.push({
        loan,
        application,
        contact,
        originalId: raw.id ?? raw.loanNumber,
      });
    } catch (err) {
      errors.push({
        index: i,
        originalId: (raw as AriveLoan).id ?? (raw as AriveLoan).loanNumber,
        error: err instanceof Error ? err.message : "Mapping error",
      });
    }
  }

  return { mapped, errors };
}
