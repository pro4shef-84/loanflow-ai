import type { DocumentType, LoanType } from "@/lib/types/loan.types";

interface ChecklistItem {
  type: DocumentType;
  label: string;
  description: string;
  whyNeeded: string;
  quantity?: number;
  required: boolean;
}

const BASE_IDENTITY: ChecklistItem[] = [
  {
    type: "drivers_license",
    label: "Government-Issued ID",
    description: "A clear photo of your driver's license or passport (front and back).",
    whyNeeded: "Required to verify your identity for the loan application.",
    required: true,
  },
];

const BASE_INCOME: ChecklistItem[] = [
  {
    type: "w2",
    label: "W-2 Forms (Last 2 Years)",
    description: "Your W-2 tax forms from your employer for the past two years.",
    whyNeeded: "Verifies your employment history and annual income.",
    quantity: 2,
    required: true,
  },
  {
    type: "pay_stub",
    label: "Recent Pay Stubs (Last 2)",
    description: "Your two most recent pay stubs from your employer.",
    whyNeeded: "Shows your current earnings and year-to-date income.",
    quantity: 2,
    required: true,
  },
];

const BASE_ASSETS: ChecklistItem[] = [
  {
    type: "bank_statement",
    label: "Bank Statements (Last 2 Months)",
    description: "Complete statements from all bank accounts for the past 2 months.",
    whyNeeded: "Verifies you have sufficient funds for down payment and closing costs.",
    quantity: 2,
    required: true,
  },
];

export const LOAN_CHECKLISTS: Record<LoanType, ChecklistItem[]> = {
  purchase: [
    ...BASE_IDENTITY,
    ...BASE_INCOME,
    ...BASE_ASSETS,
    {
      type: "purchase_contract",
      label: "Signed Purchase Contract",
      description: "The fully executed sales contract for the home you are buying.",
      whyNeeded: "Shows the agreed purchase price and terms of the transaction.",
      required: true,
    },
  ],
  refinance: [
    ...BASE_IDENTITY,
    ...BASE_INCOME,
    ...BASE_ASSETS,
    {
      type: "mortgage_statement",
      label: "Current Mortgage Statement",
      description: "Your most recent mortgage statement showing your current balance and payment.",
      whyNeeded: "Needed to verify your existing loan details and payoff amount.",
      required: true,
    },
  ],
  heloc: [
    ...BASE_IDENTITY,
    {
      type: "w2",
      label: "W-2 Form (Most Recent Year)",
      description: "Your W-2 from last year.",
      whyNeeded: "Verifies your income for the credit line.",
      required: true,
    },
    {
      type: "pay_stub",
      label: "Recent Pay Stub",
      description: "Your most recent pay stub.",
      whyNeeded: "Confirms current employment and income.",
      required: true,
    },
    {
      type: "bank_statement",
      label: "Bank Statement (Last Month)",
      description: "Your most recent monthly bank statement.",
      whyNeeded: "Confirms assets and financial stability.",
      required: true,
    },
    {
      type: "mortgage_statement",
      label: "Current Mortgage Statement",
      description: "Your current mortgage statement.",
      whyNeeded: "Shows your home's current equity position.",
      required: true,
    },
  ],
  non_qm: [
    ...BASE_IDENTITY,
    {
      type: "bank_statement",
      label: "Bank Statements (Last 12 Months)",
      description: "12 months of complete bank statements from all accounts.",
      whyNeeded: "Used as an alternative to tax returns to verify income for bank statement loans.",
      quantity: 12,
      required: true,
    },
  ],
  va: [
    ...BASE_IDENTITY,
    ...BASE_INCOME,
    ...BASE_ASSETS,
    {
      type: "purchase_contract",
      label: "Signed Purchase Contract",
      description: "The fully executed sales contract.",
      whyNeeded: "Required for all purchase transactions.",
      required: true,
    },
  ],
  fha: [
    ...BASE_IDENTITY,
    ...BASE_INCOME,
    ...BASE_ASSETS,
    {
      type: "purchase_contract",
      label: "Signed Purchase Contract",
      description: "The fully executed sales contract.",
      whyNeeded: "Required for all purchase transactions.",
      required: true,
    },
  ],
  usda: [
    ...BASE_IDENTITY,
    ...BASE_INCOME,
    ...BASE_ASSETS,
    {
      type: "purchase_contract",
      label: "Signed Purchase Contract",
      description: "The fully executed sales contract.",
      whyNeeded: "Required for all purchase transactions.",
      required: true,
    },
  ],
};

export function getChecklistForLoan(loanType: LoanType): ChecklistItem[] {
  return LOAN_CHECKLISTS[loanType] ?? [];
}

export function getRequiredDocTypes(loanType: LoanType): DocumentType[] {
  return getChecklistForLoan(loanType)
    .filter((item) => item.required)
    .map((item) => item.type);
}
