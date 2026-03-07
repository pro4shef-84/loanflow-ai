export type LoanProgramKey =
  | "30yr_fixed"
  | "20yr_fixed"
  | "15yr_fixed"
  | "10yr_fixed"
  | "7_1_arm"
  | "5_1_arm";

export interface PricingInputs {
  loanAmount: number;
  propertyValue: number;
  creditScore: number;
  loanType: "conventional" | "fha" | "va" | "usda" | "non_qm" | "heloc";
  loanPurpose: "primary_residence" | "second_home" | "investment";
  state: string;
  // Fee worksheet inputs
  originationPoints: number; // 0-3
  appraisalFee: number;
  titleInsuranceFee: number;
  titleSearchFee: number;
  settlementFee: number;
  recordingFees: number;
  monthlyInsurance: number;
  monthlyPropertyTax: number;
}

export interface RateScenario {
  program: LoanProgramKey;
  label: string;
  termYears: number;
  isArm: boolean;
  rate: number;
  apr: number;
  monthlyPayment: number;
  totalInterest: number;
  points: number;
}

export interface FeeWorksheetItem {
  category: "origination" | "appraisal_title" | "prepaids" | "government";
  label: string;
  amount: number;
}

export interface PricingResult {
  ltv: number;
  scenarios: RateScenario[];
  feeWorksheet: FeeWorksheetItem[];
  totalClosingCosts: number;
  cashToClose: number;
  downPayment: number;
  miMonthly: number; // mortgage insurance
}

const BASE_RATES: Record<LoanProgramKey, number> = {
  "30yr_fixed": 7.0,
  "20yr_fixed": 6.75,
  "15yr_fixed": 6.35,
  "10yr_fixed": 6.1,
  "7_1_arm": 6.75,
  "5_1_arm": 6.5,
};

const PROGRAM_LABELS: Record<LoanProgramKey, string> = {
  "30yr_fixed": "30-Year Fixed",
  "20yr_fixed": "20-Year Fixed",
  "15yr_fixed": "15-Year Fixed",
  "10yr_fixed": "10-Year Fixed",
  "7_1_arm": "7/1 ARM",
  "5_1_arm": "5/1 ARM",
};

const PROGRAM_TERMS: Record<LoanProgramKey, number> = {
  "30yr_fixed": 30,
  "20yr_fixed": 20,
  "15yr_fixed": 15,
  "10yr_fixed": 10,
  "7_1_arm": 30,
  "5_1_arm": 30,
};

function creditScoreAdj(score: number): number {
  if (score >= 760) return -0.25;
  if (score >= 740) return -0.125;
  if (score >= 720) return 0;
  if (score >= 700) return 0.125;
  if (score >= 680) return 0.25;
  if (score >= 660) return 0.5;
  if (score >= 640) return 0.75;
  if (score >= 620) return 1.0;
  return 1.5;
}

function ltvAdj(ltv: number): number {
  if (ltv > 95) return 0.75;
  if (ltv > 90) return 0.5;
  if (ltv > 85) return 0.25;
  if (ltv > 80) return 0;
  if (ltv > 75) return -0.125;
  return -0.25;
}

function loanTypeAdj(type: PricingInputs["loanType"]): number {
  switch (type) {
    case "fha": return 0.25;
    case "va": return -0.25;
    case "usda": return 0.25;
    case "non_qm": return 0.75;
    case "heloc": return 0.5;
    default: return 0;
  }
}

function purposeAdj(purpose: PricingInputs["loanPurpose"]): number {
  if (purpose === "investment") return 0.5;
  if (purpose === "second_home") return 0.25;
  return 0;
}

function jumboadj(amount: number): number {
  return amount > 766550 ? 0.25 : 0;
}

function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calculatePricing(inputs: PricingInputs): PricingResult {
  const ltv = Math.round((inputs.loanAmount / inputs.propertyValue) * 1000) / 10;
  const downPayment = inputs.propertyValue - inputs.loanAmount;

  const adj =
    creditScoreAdj(inputs.creditScore) +
    ltvAdj(ltv) +
    loanTypeAdj(inputs.loanType) +
    purposeAdj(inputs.loanPurpose) +
    jumboadj(inputs.loanAmount);

  const programs: LoanProgramKey[] = inputs.loanType === "heloc"
    ? ["5_1_arm", "7_1_arm"]
    : ["30yr_fixed", "20yr_fixed", "15yr_fixed", "10yr_fixed", "7_1_arm", "5_1_arm"];

  const scenarios: RateScenario[] = programs.map((program) => {
    const baseRate = BASE_RATES[program];
    const rate = Math.round((baseRate + adj) * 1000) / 1000;
    const term = PROGRAM_TERMS[program];
    const payment = monthlyPayment(inputs.loanAmount, rate, term);
    const totalPaid = payment * term * 12;
    const totalInterest = totalPaid - inputs.loanAmount;
    // APR includes origination points cost
    const origCost = (inputs.originationPoints / 100) * inputs.loanAmount;
    const aprAdjustment = (origCost / inputs.loanAmount) * (1 / (term * 12)) * 12 * 100;
    return {
      program,
      label: PROGRAM_LABELS[program],
      termYears: term,
      isArm: program.includes("arm"),
      rate: Math.max(rate, 2.5),
      apr: Math.round((Math.max(rate, 2.5) + aprAdjustment) * 1000) / 1000,
      monthlyPayment: Math.round(payment),
      totalInterest: Math.round(totalInterest),
      points: inputs.originationPoints,
    };
  });

  // Mortgage insurance
  let miMonthly = 0;
  if (inputs.loanType === "fha") {
    miMonthly = Math.round((inputs.loanAmount * 0.0055) / 12);
  } else if (inputs.loanType !== "va" && ltv > 80) {
    miMonthly = Math.round((inputs.loanAmount * 0.007) / 12);
  }

  // Fee worksheet
  const originationAmt = Math.round((inputs.originationPoints / 100) * inputs.loanAmount);
  const primaryRate = scenarios[0].rate;
  const prepaidInterest = Math.round((inputs.loanAmount * (primaryRate / 100)) / 365 * 15);
  const insuranceEscrow = inputs.monthlyInsurance * 2;
  const taxEscrow = inputs.monthlyPropertyTax * 2;
  const miUpfront = inputs.loanType === "fha" ? Math.round(inputs.loanAmount * 0.0175) : 0;

  const feeWorksheet: FeeWorksheetItem[] = ([
    ...(originationAmt > 0 ? [{ category: "origination" as const, label: `Origination Fee (${inputs.originationPoints}%)`, amount: originationAmt }] : []),
    { category: "appraisal_title" as const, label: "Appraisal Fee", amount: inputs.appraisalFee },
    { category: "appraisal_title" as const, label: "Lender's Title Insurance", amount: inputs.titleInsuranceFee },
    { category: "appraisal_title" as const, label: "Title Search & Exam", amount: inputs.titleSearchFee },
    { category: "appraisal_title" as const, label: "Settlement / Closing Fee", amount: inputs.settlementFee },
    { category: "government" as const, label: "Recording Fees", amount: inputs.recordingFees },
    { category: "prepaids" as const, label: "Prepaid Interest (15 days)", amount: prepaidInterest },
    { category: "prepaids" as const, label: "Homeowner's Insurance (2 mo)", amount: insuranceEscrow },
    { category: "prepaids" as const, label: "Property Tax Escrow (2 mo)", amount: taxEscrow },
    ...(miUpfront > 0 ? [{ category: "government" as const, label: "FHA Upfront MIP (1.75%)", amount: miUpfront }] : []),
    ...(miMonthly > 0 ? [{ category: "prepaids" as const, label: "Mortgage Insurance (2 mo)", amount: miMonthly * 2 }] : []),
  ] as FeeWorksheetItem[]).filter((f) => f.amount > 0);

  const totalClosingCosts = feeWorksheet.reduce((sum, f) => sum + f.amount, 0);
  const cashToClose = downPayment + totalClosingCosts;

  return { ltv, scenarios, feeWorksheet, totalClosingCosts, cashToClose, downPayment, miMonthly };
}
