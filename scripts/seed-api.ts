/**
 * Seed script for LoanFlow AI
 *
 * Creates realistic test data via the Supabase service role client.
 * Bypasses RLS so it can insert into any table.
 *
 * Usage:
 *   npx tsx scripts/seed-api.ts
 *   USER_ID=<uuid> npx tsx scripts/seed-api.ts   # specify officer user ID
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qwhuqahkpdxvbqxnhwig.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVxYWhrcGR4dmJxeG5od2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg1NDI5MiwiZXhwIjoyMDg4NDMwMjkyfQ.v1mpp-LQxS0YnF1m30zgRNWHnVFX6f-PQHj4gveuoAY";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(msg: string, detail?: unknown): never {
  console.error(`\nERROR: ${msg}`);
  if (detail) console.error(detail);
  process.exit(1);
}

async function insert(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[]
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from(table)
    .insert(Array.isArray(rows) ? rows : [rows])
    .select();
  if (error) fail(`Insert into ${table} failed`, error);
  return (data ?? []) as Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Resolve the officer user ID
// ---------------------------------------------------------------------------

async function resolveUserId(): Promise<string> {
  // Accept from env or CLI arg
  const envId = process.env.USER_ID ?? process.argv[2];
  if (envId) return envId;

  // Otherwise list auth users and pick the first one
  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (error) fail("Could not list auth users", error);
  if (!users || users.length === 0) fail("No auth users found — sign up first");

  console.log(`Found ${users.length} auth user(s). Using first: ${users[0].email}`);
  return users[0].id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== LoanFlow AI Seed Script ===\n");

  const userId = await resolveUserId();
  console.log(`Officer user ID: ${userId}\n`);

  // Ensure the user record exists in public.users
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (!existingUser) {
    // Look up email from auth
    const {
      data: { users: authUsers },
    } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.find((u) => u.id === userId);
    const email = authUser?.email ?? "officer@example.com";

    await insert("users", {
      id: userId,
      email,
      full_name: "Test Officer",
      nmls_id: "1234567",
      subscription_tier: "pro",
    });
    console.log("Created public.users record");
  }

  // --------------------------------------------------
  // 1. Contacts (3 borrowers)
  // --------------------------------------------------
  const contacts = await insert("contacts", [
    {
      user_id: userId,
      type: "borrower",
      first_name: "Maria",
      last_name: "Gonzalez",
      email: "maria.gonzalez@example.com",
      phone: "555-100-2001",
      address: "123 Oak Lane",
      city: "Austin",
      state: "TX",
      zip: "78701",
      property_value: 425000,
      loan_balance: 320000,
      note_rate: 6.75,
    },
    {
      user_id: userId,
      type: "borrower",
      first_name: "James",
      last_name: "Chen",
      email: "james.chen@example.com",
      phone: "555-200-3002",
      address: "456 Maple Dr",
      city: "Irvine",
      state: "CA",
      zip: "92618",
      property_value: 890000,
      loan_balance: 600000,
      note_rate: 7.125,
    },
    {
      user_id: userId,
      type: "borrower",
      first_name: "Sarah",
      last_name: "Williams",
      email: "sarah.williams@example.com",
      phone: "555-300-4003",
      address: "789 Pine St",
      city: "Virginia Beach",
      state: "VA",
      zip: "23451",
    },
  ]);
  console.log(`Created ${contacts.length} contacts`);

  // --------------------------------------------------
  // 2. Look up a lender (use first system lender)
  // --------------------------------------------------
  const { data: lenders } = await supabase
    .from("lenders")
    .select("id, name")
    .eq("is_system", true)
    .limit(3);
  const lenderIds = lenders?.map((l) => l.id) ?? [];
  if (lenderIds.length === 0) fail("No system lenders found — run migration 001 first");

  // --------------------------------------------------
  // 3. Loan Files (3 loans in different states)
  // --------------------------------------------------
  const loanFiles = await insert("loan_files", [
    {
      user_id: userId,
      borrower_id: contacts[0].id,
      lender_id: lenderIds[0],
      file_number: "LF-2026-001",
      loan_type: "purchase",
      loan_purpose: "primary_residence",
      loan_amount: 340000,
      property_address: "100 Bluebonnet Way",
      property_city: "Austin",
      property_state: "TX",
      property_zip: "78702",
      estimated_value: 425000,
      status: "verification",
      submission_readiness_score: 62,
      doc_workflow_state: "collecting",
      employment_type: "w2",
    },
    {
      user_id: userId,
      borrower_id: contacts[1].id,
      lender_id: lenderIds[1] ?? lenderIds[0],
      file_number: "LF-2026-002",
      loan_type: "refinance",
      loan_purpose: "primary_residence",
      loan_amount: 580000,
      property_address: "456 Maple Dr",
      property_city: "Irvine",
      property_state: "CA",
      property_zip: "92618",
      estimated_value: 890000,
      status: "submitted",
      submission_readiness_score: 88,
      doc_workflow_state: "review_ready",
      employment_type: "w2",
      rate_lock_date: "2026-03-10",
      rate_lock_expires_at: "2026-04-10",
    },
    {
      user_id: userId,
      borrower_id: contacts[2].id,
      lender_id: lenderIds[2] ?? lenderIds[0],
      file_number: "LF-2026-003",
      loan_type: "va",
      loan_purpose: "primary_residence",
      loan_amount: 380000,
      property_address: "789 Pine St",
      property_city: "Virginia Beach",
      property_state: "VA",
      property_zip: "23451",
      estimated_value: 400000,
      status: "intake",
      submission_readiness_score: 15,
      doc_workflow_state: "checklist_pending",
      employment_type: "w2",
    },
  ]);
  console.log(`Created ${loanFiles.length} loan files`);

  // --------------------------------------------------
  // 4. Document Requirements
  // --------------------------------------------------
  const purchaseDocTypes = [
    "w2",
    "pay_stub",
    "bank_statement",
    "tax_return_1040",
    "purchase_contract",
    "drivers_license",
    "homeowners_insurance",
  ];
  const refiDocTypes = [
    "w2",
    "pay_stub",
    "bank_statement",
    "tax_return_1040",
    "mortgage_statement",
    "drivers_license",
    "homeowners_insurance",
  ];
  const vaDocTypes = [
    "w2",
    "pay_stub",
    "bank_statement",
    "tax_return_1040",
    "drivers_license",
    "voe",
  ];

  const reqRows = [
    ...purchaseDocTypes.map((dt) => ({
      loan_file_id: loanFiles[0].id,
      doc_type: dt,
      state: dt === "w2" || dt === "pay_stub" ? "received" : "required",
    })),
    ...refiDocTypes.map((dt) => ({
      loan_file_id: loanFiles[1].id,
      doc_type: dt,
      state: "received", // all docs received for the submitted loan
    })),
    ...vaDocTypes.map((dt) => ({
      loan_file_id: loanFiles[2].id,
      doc_type: dt,
      state: "required", // fresh intake — nothing received yet
    })),
  ];

  const docReqs = await insert("document_requirements", reqRows);
  console.log(`Created ${docReqs.length} document requirements`);

  // --------------------------------------------------
  // 5. Documents (sample uploads for first two loans)
  // --------------------------------------------------
  // Map requirement IDs for loan 1
  const loan1Reqs = docReqs.filter(
    (r) => r.loan_file_id === loanFiles[0].id
  );
  const loan2Reqs = docReqs.filter(
    (r) => r.loan_file_id === loanFiles[1].id
  );

  const findReqId = (reqs: Record<string, unknown>[], docType: string) =>
    reqs.find((r) => r.doc_type === docType)?.id as string | undefined;

  const documents = await insert("documents", [
    // Loan 1: 2 uploaded docs
    {
      loan_file_id: loanFiles[0].id,
      type: "w2",
      status: "verified",
      original_filename: "W2_Gonzalez_2025.pdf",
      file_size_bytes: 245_000,
      mime_type: "application/pdf",
      confidence_score: 0.97,
      ai_rationale: "Document matched W-2 template. Employer name, wages, and tax year extracted.",
      extracted_data: {
        employer: "TechCorp Inc",
        wages: 95000,
        tax_year: 2025,
      },
      required: true,
      uploaded_at: "2026-03-05T14:30:00Z",
      verified_at: "2026-03-05T14:31:00Z",
      requirement_id: findReqId(loan1Reqs, "w2"),
    },
    {
      loan_file_id: loanFiles[0].id,
      type: "pay_stub",
      status: "verified",
      original_filename: "PayStub_Gonzalez_Feb2026.pdf",
      file_size_bytes: 120_000,
      mime_type: "application/pdf",
      confidence_score: 0.92,
      ai_rationale: "Pay stub from Feb 2026. Gross pay and employer confirmed.",
      extracted_data: {
        employer: "TechCorp Inc",
        gross_pay: 7916.67,
        pay_period: "2026-02-01 to 2026-02-28",
      },
      required: true,
      uploaded_at: "2026-03-06T10:15:00Z",
      verified_at: "2026-03-06T10:16:00Z",
      requirement_id: findReqId(loan1Reqs, "pay_stub"),
    },
    {
      loan_file_id: loanFiles[0].id,
      type: "bank_statement",
      status: "needs_attention",
      original_filename: "BankStmt_Gonzalez_Jan2026.pdf",
      file_size_bytes: 380_000,
      mime_type: "application/pdf",
      confidence_score: 0.78,
      ai_rationale: "Bank statement detected but only 1 month provided; lender requires 2 months.",
      issues: [
        { type: "insufficient_period", message: "Only 1 month provided, 2 months required" },
      ],
      required: true,
      uploaded_at: "2026-03-07T09:00:00Z",
      requirement_id: findReqId(loan1Reqs, "bank_statement"),
    },
    // Loan 2: all docs verified
    {
      loan_file_id: loanFiles[1].id,
      type: "w2",
      status: "verified",
      original_filename: "W2_Chen_2025.pdf",
      file_size_bytes: 260_000,
      mime_type: "application/pdf",
      confidence_score: 0.99,
      ai_rationale: "W-2 verified. High confidence match.",
      extracted_data: {
        employer: "Pacific Design Group",
        wages: 185000,
        tax_year: 2025,
      },
      required: true,
      uploaded_at: "2026-03-02T08:00:00Z",
      verified_at: "2026-03-02T08:01:00Z",
      requirement_id: findReqId(loan2Reqs, "w2"),
    },
    {
      loan_file_id: loanFiles[1].id,
      type: "mortgage_statement",
      status: "verified",
      original_filename: "MortgageStmt_Chen_2026.pdf",
      file_size_bytes: 190_000,
      mime_type: "application/pdf",
      confidence_score: 0.95,
      ai_rationale: "Current mortgage statement from existing servicer. Balance and rate extracted.",
      extracted_data: {
        servicer: "Wells Fargo",
        current_balance: 605000,
        interest_rate: 7.125,
        monthly_payment: 4078,
      },
      required: true,
      uploaded_at: "2026-03-02T08:05:00Z",
      verified_at: "2026-03-02T08:06:00Z",
      requirement_id: findReqId(loan2Reqs, "mortgage_statement"),
    },
  ]);
  console.log(`Created ${documents.length} documents`);

  // --------------------------------------------------
  // 6. Escalations (1 open, 1 resolved)
  // --------------------------------------------------
  const escalations = await insert("escalations", [
    {
      loan_file_id: loanFiles[0].id,
      document_id: documents[2].id, // bank statement with issues
      category: "document_issue",
      severity: "warning",
      status: "open",
      owner_id: userId,
      description:
        "Bank statement covers only 1 month. Lender requires 2 consecutive months of statements.",
    },
    {
      loan_file_id: loanFiles[1].id,
      category: "rate_lock",
      severity: "info",
      status: "resolved",
      owner_id: userId,
      description: "Rate lock secured at 6.25% for 30 days.",
      resolution_notes: "Lock confirmed by UWM on 3/10/2026.",
      resolved_at: "2026-03-10T16:00:00Z",
    },
  ]);
  console.log(`Created ${escalations.length} escalations`);

  // --------------------------------------------------
  // 7. File Completion Events
  // --------------------------------------------------
  const events = await insert("file_completion_events", [
    {
      loan_file_id: loanFiles[0].id,
      event_type: "checklist_generated",
      actor: "system",
      payload: { doc_count: purchaseDocTypes.length },
    },
    {
      loan_file_id: loanFiles[0].id,
      event_type: "document_uploaded",
      actor: "borrower",
      payload: { doc_type: "w2", filename: "W2_Gonzalez_2025.pdf" },
    },
    {
      loan_file_id: loanFiles[1].id,
      event_type: "review_approved",
      actor: userId,
      payload: { decision: "review_ready" },
    },
  ]);
  console.log(`Created ${events.length} file completion events`);

  // --------------------------------------------------
  // 8. Lender Submission (loan 2 — already submitted)
  // --------------------------------------------------
  const submissions = await insert("lender_submissions", [
    {
      loan_file_id: loanFiles[1].id,
      lender_id: lenderIds[1] ?? lenderIds[0],
      submitted_by: userId,
      submission_type: "initial",
      status: "submitted",
      lender_loan_number: "UWM-2026-88431",
      documents_included: ["w2", "pay_stub", "bank_statement", "mortgage_statement", "drivers_license"],
      notes: "Initial submission package. All docs verified.",
      submitted_at: "2026-03-10T15:00:00Z",
    },
  ]);
  console.log(`Created ${submissions.length} lender submissions`);

  // --------------------------------------------------
  // 9. Conditions (2 — one for each active loan)
  // --------------------------------------------------
  const conditions = await insert("conditions", [
    {
      loan_file_id: loanFiles[0].id,
      source: "internal",
      lender_condition_text: null,
      plain_english_summary:
        "Need 2 consecutive months of bank statements showing sufficient reserves.",
      required_document_type: "bank_statement",
      status: "open",
      priority: "high",
      due_date: "2026-03-20",
    },
    {
      loan_file_id: loanFiles[1].id,
      source: "lender",
      lender_condition_text:
        "Provide VOE dated within 10 business days of closing.",
      plain_english_summary:
        "Lender needs a current verification of employment letter from your employer.",
      required_document_type: "voe",
      status: "borrower_notified",
      priority: "high",
      due_date: "2026-03-25",
      borrower_task_sent_at: "2026-03-11T09:00:00Z",
    },
  ]);
  console.log(`Created ${conditions.length} conditions`);

  // --------------------------------------------------
  // 10. Loan Application (URLA 1003 data for loan 1)
  // --------------------------------------------------
  const applications = await insert("loan_applications", [
    {
      loan_file_id: loanFiles[0].id,
      borrower_first_name: "Maria",
      borrower_last_name: "Gonzalez",
      borrower_ssn_last4: "4567",
      borrower_dob: "1988-06-15",
      borrower_email: "maria.gonzalez@example.com",
      borrower_phone: "555-100-2001",
      borrower_marital_status: "married",
      borrower_dependents: 2,
      borrower_citizenship: "us_citizen",
      current_address: "123 Oak Lane",
      current_city: "Austin",
      current_state: "TX",
      current_zip: "78701",
      current_housing: "rent",
      years_at_address: 3,
      employer_name: "TechCorp Inc",
      employer_address: "500 Congress Ave, Austin TX 78701",
      employer_phone: "512-555-0100",
      employment_start_date: "2021-04-01",
      years_employed: 5,
      job_title: "Senior Software Engineer",
      self_employed: false,
      base_income: 7916.67,
      overtime_income: 0,
      bonus_income: 833.33,
      commission_income: 0,
      other_income: 0,
      checking_balance: 28500,
      savings_balance: 45000,
      retirement_balance: 120000,
      other_assets: [],
      liabilities: [
        {
          type: "auto_loan",
          creditor: "Toyota Financial",
          monthly_payment: 450,
          balance: 12000,
          months_remaining: 27,
        },
        {
          type: "student_loan",
          creditor: "Navient",
          monthly_payment: 280,
          balance: 22000,
          months_remaining: 84,
        },
      ],
      outstanding_judgments: false,
      declared_bankruptcy: false,
      property_foreclosed: false,
      party_to_lawsuit: false,
      loan_obligations: false,
      delinquent_federal_debt: false,
      intend_to_occupy: true,
      ownership_interest: false,
      completed_sections: [
        "borrower_info",
        "address",
        "employment",
        "income",
        "assets",
        "liabilities",
        "declarations",
      ],
    },
  ]);
  console.log(`Created ${applications.length} loan applications`);

  // --------------------------------------------------
  // 11. Disclosures (2 for loan 1)
  // --------------------------------------------------
  const disclosures = await insert("disclosures", [
    {
      loan_file_id: loanFiles[0].id,
      disclosure_type: "loan_estimate",
      stage: "initial",
      status: "sent",
      sent_at: "2026-03-06T12:00:00Z",
      viewed_at: "2026-03-06T14:30:00Z",
      due_date: "2026-03-09",
      method: "email",
      notes: "Initial LE sent within 3 business days of application.",
    },
    {
      loan_file_id: loanFiles[0].id,
      disclosure_type: "intent_to_proceed",
      stage: "initial",
      status: "signed",
      sent_at: "2026-03-06T12:00:00Z",
      viewed_at: "2026-03-06T14:30:00Z",
      signed_at: "2026-03-06T14:35:00Z",
      method: "electronic",
      notes: "Borrower signed intent to proceed electronically.",
    },
  ]);
  console.log(`Created ${disclosures.length} disclosures`);

  // --------------------------------------------------
  // Summary
  // --------------------------------------------------
  console.log("\n=== Seed Complete ===");
  console.log(`  Contacts:              ${contacts.length}`);
  console.log(`  Loan Files:            ${loanFiles.length}`);
  console.log(`  Document Requirements: ${docReqs.length}`);
  console.log(`  Documents:             ${documents.length}`);
  console.log(`  Escalations:           ${escalations.length}`);
  console.log(`  File Completion Events:${events.length}`);
  console.log(`  Lender Submissions:    ${submissions.length}`);
  console.log(`  Conditions:            ${conditions.length}`);
  console.log(`  Loan Applications:     ${applications.length}`);
  console.log(`  Disclosures:           ${disclosures.length}`);
  console.log(`\nLoan file IDs:`);
  loanFiles.forEach((lf) => {
    console.log(`  ${lf.file_number}: ${lf.id} (${lf.loan_type} / ${lf.status})`);
  });
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
