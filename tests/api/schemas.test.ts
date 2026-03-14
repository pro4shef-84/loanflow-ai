// ============================================================
// ZOD API SCHEMA TESTS
// Tests all Zod validation schemas from api-schemas.ts
// ============================================================

import { describe, it, expect } from "vitest";
import {
  resolveEscalationSchema,
  submitReviewSchema,
  createLoanSchema,
  signupSchema,
  saveApplicationSchema,
  createDisclosureSchema,
  ausSimulationSchema,
  parseBody,
} from "@/lib/validation/api-schemas";

describe("API Schemas", () => {
  // ── resolveEscalationSchema ───────────────────────────────

  describe("resolveEscalationSchema", () => {
    it("should accept valid 'resolve' action with resolution", () => {
      const result = resolveEscalationSchema.safeParse({
        action: "resolve",
        resolution: "Document verified manually",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid 'dismiss' action", () => {
      const result = resolveEscalationSchema.safeParse({
        action: "dismiss",
      });
      expect(result.success).toBe(true);
    });

    it("should accept 'resolve' without resolution (resolution is optional)", () => {
      const result = resolveEscalationSchema.safeParse({
        action: "resolve",
      });
      expect(result.success).toBe(true);
    });

    it("should reject without action", () => {
      const result = resolveEscalationSchema.safeParse({
        resolution: "Some notes",
      });
      expect(result.success).toBe(false);
    });

    it("should reject with invalid action", () => {
      const result = resolveEscalationSchema.safeParse({
        action: "ignore",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── submitReviewSchema ────────────────────────────────────

  describe("submitReviewSchema", () => {
    it("should accept 'review_ready' decision", () => {
      const result = submitReviewSchema.safeParse({
        decision: "review_ready",
        notes: "All documents look good",
      });
      expect(result.success).toBe(true);
    });

    it("should accept 'needs_correction' decision", () => {
      const result = submitReviewSchema.safeParse({
        decision: "needs_correction",
        notes: "W2 is for wrong year",
      });
      expect(result.success).toBe(true);
    });

    it("should accept 'archived' decision", () => {
      const result = submitReviewSchema.safeParse({
        decision: "archived",
      });
      expect(result.success).toBe(true);
    });

    it("should reject with unknown decision", () => {
      const result = submitReviewSchema.safeParse({
        decision: "approved",
      });
      expect(result.success).toBe(false);
    });

    it("should reject without decision", () => {
      const result = submitReviewSchema.safeParse({
        notes: "Some notes",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── createLoanSchema ──────────────────────────────────────

  describe("createLoanSchema", () => {
    it("should accept valid purchase loan data", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "purchase",
        loan_purpose: "primary_residence",
        loan_amount: 350000,
        property_address: "123 Main St",
        property_city: "Springfield",
        property_state: "IL",
        property_zip: "62701",
      });
      expect(result.success).toBe(true);
    });

    it("should accept minimal valid data (just loan_type)", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "refinance",
      });
      expect(result.success).toBe(true);
    });

    it("should accept all valid loan types", () => {
      const validTypes = ["purchase", "refinance", "heloc", "non_qm", "va", "fha", "usda"];
      for (const loanType of validTypes) {
        const result = createLoanSchema.safeParse({ loan_type: loanType });
        expect(result.success).toBe(true);
      }
    });

    it("should reject missing required loan_type", () => {
      const result = createLoanSchema.safeParse({
        loan_amount: 250000,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid loan_type", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "jumbo",
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative loan_amount", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "purchase",
        loan_amount: -100000,
      });
      expect(result.success).toBe(false);
    });

    it("should reject zero loan_amount", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "purchase",
        loan_amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject property_state that is not exactly 2 characters", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "purchase",
        property_state: "Illinois",
      });
      expect(result.success).toBe(false);
    });

    it("should accept borrower_id as a valid UUID", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "purchase",
        borrower_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject borrower_id that is not a UUID", () => {
      const result = createLoanSchema.safeParse({
        loan_type: "purchase",
        borrower_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── signupSchema ──────────────────────────────────────────

  describe("signupSchema", () => {
    it("should accept valid signup data", () => {
      const result = signupSchema.safeParse({
        email: "officer@example.com",
        password: "securepass123",
        fullName: "Jane Smith",
      });
      expect(result.success).toBe(true);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = signupSchema.safeParse({
        email: "officer@example.com",
        password: "short",
        fullName: "Jane Smith",
      });
      expect(result.success).toBe(false);
    });

    it("should accept exactly 8 character password", () => {
      const result = signupSchema.safeParse({
        email: "officer@example.com",
        password: "12345678",
        fullName: "Jane Smith",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = signupSchema.safeParse({
        email: "not-an-email",
        password: "securepass123",
        fullName: "Jane Smith",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty fullName", () => {
      const result = signupSchema.safeParse({
        email: "officer@example.com",
        password: "securepass123",
        fullName: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing email", () => {
      const result = signupSchema.safeParse({
        password: "securepass123",
        fullName: "Jane Smith",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const result = signupSchema.safeParse({
        email: "officer@example.com",
        fullName: "Jane Smith",
      });
      expect(result.success).toBe(false);
    });

    it("should reject fullName over 100 characters", () => {
      const result = signupSchema.safeParse({
        email: "officer@example.com",
        password: "securepass123",
        fullName: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  // ── parseBody helper ──────────────────────────────────────

  describe("parseBody()", () => {
    it("should return { success: true, data } for valid input", () => {
      const result = parseBody(signupSchema, {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("should return { success: false, error } for invalid input", () => {
      const result = parseBody(signupSchema, {
        email: "bad",
        password: "short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe("string");
      }
    });

    it("should include field paths in error message", () => {
      const result = parseBody(createLoanSchema, {
        loan_type: "invalid_type",
        loan_amount: -5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("loan_type");
      }
    });
  });

  // ── ausSimulationSchema ───────────────────────────────────

  describe("ausSimulationSchema", () => {
    it("should accept valid AUS simulation data", () => {
      const result = ausSimulationSchema.safeParse({
        loanFileId: "550e8400-e29b-41d4-a716-446655440000",
        creditScore: 720,
        monthlyIncome: 8500,
        monthlyDebts: 2100,
      });
      expect(result.success).toBe(true);
    });

    it("should reject credit score below 300", () => {
      const result = ausSimulationSchema.safeParse({
        loanFileId: "550e8400-e29b-41d4-a716-446655440000",
        creditScore: 200,
        monthlyIncome: 8500,
        monthlyDebts: 2100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject credit score above 850", () => {
      const result = ausSimulationSchema.safeParse({
        loanFileId: "550e8400-e29b-41d4-a716-446655440000",
        creditScore: 900,
        monthlyIncome: 8500,
        monthlyDebts: 2100,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── createDisclosureSchema ────────────────────────────────

  describe("createDisclosureSchema", () => {
    it("should accept valid disclosure data", () => {
      const result = createDisclosureSchema.safeParse({
        disclosure_type: "loan_estimate",
        stage: "initial",
        method: "email",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid disclosure type", () => {
      const result = createDisclosureSchema.safeParse({
        disclosure_type: "imaginary_disclosure",
      });
      expect(result.success).toBe(false);
    });

    it("should default stage to 'initial' if not provided", () => {
      const result = createDisclosureSchema.safeParse({
        disclosure_type: "closing_disclosure",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stage).toBe("initial");
      }
    });
  });
});
