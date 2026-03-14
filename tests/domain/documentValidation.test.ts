import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateDocument,
  checkExpiration,
  getExpirationConfig,
} from "@/lib/domain/rules/documentValidationRules";
import type { ExtractedFields } from "@/lib/domain/rules/documentValidationRules";

// Helper to get a date string N days ago
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// Helper to get a date string N days in the future
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

const currentYear = new Date().getFullYear();
const expectedTaxYear = String(currentYear - 1);

// ── Pay Stub ─────────────────────────────────────────────────

describe("validateDocument — pay_stub", () => {
  it("valid with all required fields", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      employer_name: "Acme Corp",
      pay_period: daysAgo(10),
      ytd_income: "45000",
      image_quality: "high",
    };
    const result = validateDocument("pay_stub", fields);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.missing_fields).toHaveLength(0);
  });

  it("missing ytd_income produces issue", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      employer_name: "Acme Corp",
      pay_period: daysAgo(10),
    };
    const result = validateDocument("pay_stub", fields);
    expect(result.valid).toBe(false);
    expect(result.missing_fields).toContain("ytd_income");
    expect(result.issues.some((i) => i.toLowerCase().includes("year-to-date"))).toBe(true);
  });

  it("missing employer_name produces issue", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      pay_period: daysAgo(10),
      ytd_income: "45000",
    };
    const result = validateDocument("pay_stub", fields);
    expect(result.valid).toBe(false);
    expect(result.missing_fields).toContain("employer_name");
    expect(result.issues.some((i) => i.toLowerCase().includes("employer"))).toBe(true);
  });

  it("pay period older than 60 days produces issue", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      employer_name: "Acme Corp",
      pay_period: daysAgo(65),
      ytd_income: "45000",
    };
    const result = validateDocument("pay_stub", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("60 days"))).toBe(true);
  });

  it("low image quality produces issue", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      employer_name: "Acme Corp",
      pay_period: daysAgo(10),
      ytd_income: "45000",
      image_quality: "low",
    };
    const result = validateDocument("pay_stub", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("quality"))).toBe(true);
  });
});

// ── W-2 ──────────────────────────────────────────────────────

describe("validateDocument — w2", () => {
  it("valid with correct tax year", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      tax_year: expectedTaxYear,
      wages: "85000",
    };
    const result = validateDocument("w2", fields);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("wrong tax year produces issue", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      tax_year: "2020",
      wages: "85000",
    };
    const result = validateDocument("w2", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("2020"))).toBe(true);
  });

  it("missing wages produces issue", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      tax_year: expectedTaxYear,
    };
    const result = validateDocument("w2", fields);
    expect(result.valid).toBe(false);
    expect(result.missing_fields).toContain("wages");
    expect(result.issues.some((i) => i.toLowerCase().includes("wage"))).toBe(true);
  });

  it("low image quality produces partial screenshot issue", () => {
    const fields: ExtractedFields = {
      employee_name: "John Doe",
      tax_year: expectedTaxYear,
      wages: "85000",
      image_quality: "poor",
    };
    const result = validateDocument("w2", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("screenshot") || i.toLowerCase().includes("complete"))).toBe(true);
  });
});

// ── Bank Statement ──────────────────────────────────────────

describe("validateDocument — bank_statement", () => {
  it("valid with all fields", () => {
    const fields: ExtractedFields = {
      account_holder_name: "John Doe",
      statement_date: daysAgo(15),
      all_pages: "true",
      page_count: "4",
    };
    const result = validateDocument("bank_statement", fields);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("older than 90 days produces issue", () => {
    const fields: ExtractedFields = {
      account_holder_name: "John Doe",
      statement_date: daysAgo(95),
      all_pages: "true",
      page_count: "4",
    };
    const result = validateDocument("bank_statement", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("90 days"))).toBe(true);
  });

  it("missing all_pages / low page_count produces incomplete issue", () => {
    const fields: ExtractedFields = {
      account_holder_name: "John Doe",
      statement_date: daysAgo(15),
      all_pages: "false",
      page_count: "1",
    };
    const result = validateDocument("bank_statement", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("all pages") || i.toLowerCase().includes("page 1"))).toBe(true);
  });

  it("missing account_holder_name adds to missing fields", () => {
    const fields: ExtractedFields = {
      statement_date: daysAgo(15),
      all_pages: "true",
      page_count: "4",
    };
    const result = validateDocument("bank_statement", fields);
    expect(result.missing_fields).toContain("account_holder_name");
  });
});

// ── Government ID ───────────────────────────────────────────

describe("validateDocument — government_id", () => {
  it("valid with all fields", () => {
    const fields: ExtractedFields = {
      full_name: "John Doe",
      id_type: "drivers_license",
    };
    const result = validateDocument("government_id", fields);
    expect(result.valid).toBe(true);
  });

  it("missing full_name produces missing field", () => {
    const fields: ExtractedFields = {
      id_type: "passport",
    };
    const result = validateDocument("government_id", fields);
    expect(result.missing_fields).toContain("full_name");
  });

  it("low image quality produces legibility issue", () => {
    const fields: ExtractedFields = {
      full_name: "John Doe",
      id_type: "drivers_license",
      image_quality: "blurry",
    };
    const result = validateDocument("government_id", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("legib") || i.toLowerCase().includes("clear"))).toBe(true);
  });
});

// ── Purchase Contract ───────────────────────────────────────

describe("validateDocument — purchase_contract", () => {
  it("valid document_type produces valid result", () => {
    const fields: ExtractedFields = {
      document_type: "purchase_agreement",
    };
    const result = validateDocument("purchase_contract", fields);
    expect(result.valid).toBe(true);
  });

  it("missing document_type produces issue", () => {
    const fields: ExtractedFields = {};
    const result = validateDocument("purchase_contract", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("wrong document_type produces issue", () => {
    const fields: ExtractedFields = {
      document_type: "tax_form",
    };
    const result = validateDocument("purchase_contract", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("purchase"))).toBe(true);
  });
});

// ── Tax Return 1040 ─────────────────────────────────────────

describe("validateDocument — tax_return_1040", () => {
  it("correct year with agi is valid", () => {
    const fields: ExtractedFields = {
      tax_year: expectedTaxYear,
      agi: "120000",
    };
    const result = validateDocument("tax_return_1040", fields);
    expect(result.valid).toBe(true);
  });

  it("wrong year produces issue", () => {
    const fields: ExtractedFields = {
      tax_year: "2019",
      agi: "120000",
    };
    const result = validateDocument("tax_return_1040", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("2019"))).toBe(true);
  });

  it("missing agi produces issue", () => {
    const fields: ExtractedFields = {
      tax_year: expectedTaxYear,
    };
    const result = validateDocument("tax_return_1040", fields);
    expect(result.valid).toBe(false);
    expect(result.missing_fields).toContain("agi");
    expect(result.issues.some((i) => i.toLowerCase().includes("agi") || i.toLowerCase().includes("adjusted gross"))).toBe(true);
  });
});

// ── Schedule C ──────────────────────────────────────────────

describe("validateDocument — schedule_c", () => {
  it("correct year with net_profit is valid", () => {
    const fields: ExtractedFields = {
      tax_year: expectedTaxYear,
      net_profit: "55000",
    };
    const result = validateDocument("schedule_c", fields);
    expect(result.valid).toBe(true);
  });

  it("wrong year produces issue", () => {
    const fields: ExtractedFields = {
      tax_year: "2018",
      net_profit: "55000",
    };
    const result = validateDocument("schedule_c", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("2018"))).toBe(true);
  });

  it("missing net_profit produces issue", () => {
    const fields: ExtractedFields = {
      tax_year: expectedTaxYear,
    };
    const result = validateDocument("schedule_c", fields);
    expect(result.valid).toBe(false);
    expect(result.missing_fields).toContain("net_profit");
    expect(result.issues.some((i) => i.toLowerCase().includes("net profit"))).toBe(true);
  });
});

// ── Profit & Loss Statement ─────────────────────────────────

describe("validateDocument — profit_loss_statement", () => {
  it("recent date and signed is valid", () => {
    const fields: ExtractedFields = {
      date: daysAgo(30),
      signed: "true",
    };
    const result = validateDocument("profit_loss_statement", fields);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("old date produces issue", () => {
    const fields: ExtractedFields = {
      date: daysAgo(100),
      signed: "true",
    };
    const result = validateDocument("profit_loss_statement", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("90 days") || i.toLowerCase().includes("older"))).toBe(true);
  });

  it("unsigned produces warning (not issue)", () => {
    const fields: ExtractedFields = {
      date: daysAgo(30),
      signed: "false",
    };
    const result = validateDocument("profit_loss_statement", fields);
    // valid is true because only warnings, no issues or missing
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.toLowerCase().includes("sign"))).toBe(true);
  });
});

// ── Mortgage Statement ──────────────────────────────────────

describe("validateDocument — mortgage_statement", () => {
  it("recent with account_number is valid", () => {
    const fields: ExtractedFields = {
      date: daysAgo(30),
      account_number: "123456789",
    };
    const result = validateDocument("mortgage_statement", fields);
    expect(result.valid).toBe(true);
  });

  it("old date produces issue", () => {
    const fields: ExtractedFields = {
      date: daysAgo(100),
      account_number: "123456789",
    };
    const result = validateDocument("mortgage_statement", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("90 days") || i.toLowerCase().includes("current"))).toBe(true);
  });

  it("missing account_number produces issue", () => {
    const fields: ExtractedFields = {
      date: daysAgo(30),
    };
    const result = validateDocument("mortgage_statement", fields);
    expect(result.valid).toBe(false);
    expect(result.missing_fields).toContain("account_number");
    expect(result.issues.some((i) => i.toLowerCase().includes("account number"))).toBe(true);
  });
});

// ── Homeowners Insurance ────────────────────────────────────

describe("validateDocument — homeowners_insurance", () => {
  it("active policy is valid", () => {
    const fields: ExtractedFields = {
      policy_active: "true",
      coverage_amount: "350000",
    };
    const result = validateDocument("homeowners_insurance", fields);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("inactive policy produces issue", () => {
    const fields: ExtractedFields = {
      policy_active: "false",
      coverage_amount: "350000",
    };
    const result = validateDocument("homeowners_insurance", fields);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes("active"))).toBe(true);
  });

  it("missing coverage_amount produces warning (not issue)", () => {
    const fields: ExtractedFields = {
      policy_active: "true",
    };
    const result = validateDocument("homeowners_insurance", fields);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.toLowerCase().includes("coverage"))).toBe(true);
  });
});

// ── Unknown Document ────────────────────────────────────────

describe("validateDocument — unknown_document", () => {
  it("always returns valid: false with issue message", () => {
    const result = validateDocument("unknown_document", {});
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.toLowerCase().includes("could not be determined"))).toBe(true);
  });
});

// ── Document Expiration ─────────────────────────────────────

describe("checkExpiration", () => {
  it("pay_stub uploaded recently is not expired", () => {
    const result = checkExpiration("pay_stub", daysAgo(10));
    expect(result).not.toBeNull();
    expect(result!.expired).toBe(false);
    expect(result!.daysRemaining).toBeGreaterThan(0);
  });

  it("pay_stub uploaded 90 days ago is expired (60-day limit)", () => {
    const result = checkExpiration("pay_stub", daysAgo(90));
    expect(result).not.toBeNull();
    expect(result!.expired).toBe(true);
  });

  it("government_id returns null (no expiration)", () => {
    const result = checkExpiration("government_id", daysAgo(500));
    expect(result).toBeNull();
  });

  it("bank_statement uploaded 80 days ago is not expired (90-day limit)", () => {
    const result = checkExpiration("bank_statement", daysAgo(80));
    expect(result).not.toBeNull();
    expect(result!.expired).toBe(false);
    // ~10 days remaining
    expect(result!.daysRemaining).toBeGreaterThanOrEqual(9);
    expect(result!.daysRemaining).toBeLessThanOrEqual(11);
    expect(result!.warningThreshold).toBe(14);
  });

  it("purchase_contract returns null (no expiration)", () => {
    const result = checkExpiration("purchase_contract", daysAgo(200));
    expect(result).toBeNull();
  });

  it("dd214 returns null (no expiration)", () => {
    const result = checkExpiration("dd214", daysAgo(1000));
    expect(result).toBeNull();
  });
});

describe("getExpirationConfig", () => {
  it("returns correct config for pay_stub", () => {
    const config = getExpirationConfig("pay_stub");
    expect(config.expirationDays).toBe(60);
    expect(config.warningThresholdDays).toBe(14);
  });

  it("returns null expirationDays for government_id", () => {
    const config = getExpirationConfig("government_id");
    expect(config.expirationDays).toBeNull();
  });

  it("returns 90 expirationDays for bank_statement", () => {
    const config = getExpirationConfig("bank_statement");
    expect(config.expirationDays).toBe(90);
  });

  it("returns 365 expirationDays for w2", () => {
    const config = getExpirationConfig("w2");
    expect(config.expirationDays).toBe(365);
  });

  it("returns null expirationDays for unknown_document", () => {
    const config = getExpirationConfig("unknown_document");
    expect(config.expirationDays).toBeNull();
  });
});
