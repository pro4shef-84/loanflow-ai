export interface BorrowerInfo {
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  ssn_last4?: string;
  dob?: string;
  marital_status?: "married" | "separated" | "unmarried";
  dependents?: number;
  citizenship?: "us_citizen" | "permanent_resident" | "non_permanent_resident";
}

export interface AddressInfo {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  years_at_address?: number;
  housing_status?: "own" | "rent" | "living_with_family";
  monthly_housing_expense?: number;
}

export interface EmploymentInfo {
  employer_name: string;
  position?: string;
  start_date?: string;
  is_self_employed?: boolean;
  years_employed?: number;
  monthly_base_income?: number;
  monthly_overtime?: number;
  monthly_bonus?: number;
  monthly_other_income?: number;
}

export interface AssetInfo {
  type: "checking" | "savings" | "retirement" | "stocks" | "gift" | "other";
  institution?: string;
  account_last4?: string;
  balance: number;
}

export interface LiabilityInfo {
  type: "mortgage" | "installment" | "revolving" | "student_loan" | "other";
  creditor?: string;
  monthly_payment: number;
  balance?: number;
  months_remaining?: number;
}

export interface Declarations {
  outstanding_judgments?: boolean;
  bankruptcy?: boolean;
  foreclosure?: boolean;
  lawsuit?: boolean;
  federal_debt?: boolean;
  alimony?: boolean;
  down_payment_borrowed?: boolean;
  owner_occupancy?: boolean;
  primary_residence?: boolean;
}

export interface CoBorrower {
  info: BorrowerInfo;
  address: AddressInfo;
  employment: EmploymentInfo;
  declarations: Declarations;
}

export interface LoanApplication {
  id?: string;
  loan_file_id: string;
  step_completed: number; // 1-6

  // Step 1: Borrower
  borrower: BorrowerInfo;

  // Step 2: Address
  current_address: AddressInfo;
  former_address?: AddressInfo;

  // Step 3: Employment & Income
  employment: EmploymentInfo;
  former_employment?: EmploymentInfo;

  // Step 4: Assets
  assets: AssetInfo[];

  // Step 5: Liabilities
  liabilities: LiabilityInfo[];

  // Step 6: Declarations
  declarations: Declarations;

  // Co-borrower
  has_coborrower?: boolean;
  coborrower?: CoBorrower;

  created_at?: string;
  updated_at?: string;
}

export const EMPTY_APPLICATION: Omit<LoanApplication, "loan_file_id"> = {
  step_completed: 0,
  borrower: { first_name: "", last_name: "" },
  current_address: { street: "", city: "", state: "", zip: "" },
  employment: { employer_name: "" },
  assets: [],
  liabilities: [],
  declarations: {},
};
