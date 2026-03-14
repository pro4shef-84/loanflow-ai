# LoanFlow AI — Product Requirements Document: File Completion Engine

**Version**: 2.0
**Date**: March 14, 2026
**Status**: Active — Engineering Specification
**Supersedes**: PRD v1.0 (AI Document Assistant, March 8, 2026)

---

## 1. Product Overview

### Feature Name

**File Completion Engine**

### Purpose

Build a workflow engine inside LoanFlow AI that automates the resolution loop for mortgage document collection: what documents are needed, what was received, what is wrong with it, who needs to act, and whether the file is ready for submission. This engine reduces the manual labor of document chasing, validation, and follow-up that consumes processor and officer time on every file.

### Core Principle

**The workflow engine decides; AI advises.** All state transitions are governed by deterministic rules. AI provides classification, extraction, and summarization. The system never makes a lending decision, never advises a borrower on rates or approval, and never marks a loan as ready without explicit officer confirmation.

### Strategic Alignment

This feature implements the wedge described in Strategy v3.0:

- **Table stakes** (LOS/POS parity) earn the right to be tried. The File Completion Engine does not replace table-stakes features — it builds on top of them.
- **The wedge** (file completion automation) wins the account. This PRD specifies the wedge in full engineering detail.
- **The resolution loop** is the core value proposition. Every design decision in this PRD serves the loop: what's needed, what's received, what's wrong, who acts, is the file ready.

### What Changed from PRD v1.0

| Change | v1.0 | v2.0 |
|---|---|---|
| Feature name | AI Document Assistant | File Completion Engine |
| Agent count | 4 agents | 5 agents (added Follow-Up Agent, removed Borrower Concierge) |
| Loan scope | Conventional only | Conventional + FHA + VA |
| Self-employed | Deferred entirely | Narrow support with aggressive escalation |
| Borrower Concierge | Full chat agent in portal | Removed from launch scope — advisory risk too high for v1 |
| Follow-up | Notification system (passive) | Dedicated Follow-Up Agent with reminder cadence |
| Review Agent | Read-only summary | Structured review with readiness grade and stacking order |
| Tone | "Replacing the manual work of a human processor" | "Gets mortgage files complete with less chasing" |

### Scope

This PRD covers the integration of five agents into the existing LoanFlow AI platform:

1. **Checklist Agent** — Generates document requirements when a loan is created
2. **Document Intelligence Agent** — Classifies, extracts, and validates uploaded documents
3. **Follow-Up Agent** — Sends reminders for missing or correction-needed documents
4. **Escalation Agent** — Routes issues to officer attention based on severity
5. **Review Agent (Officer Copilot)** — Generates structured review summaries for officer decisions

This PRD also covers workflow state machines, the event model, database schema changes, API endpoints, integration points with existing LoanFlow features, security and compliance, and testing scenarios.

---

## 2. Agent Architecture

### Agent 1: Checklist Agent

**Purpose**: Generate the document requirements checklist for a loan based on loan scenario. This is a deterministic rule engine — no AI call is needed.

**Trigger**: Loan created (POST to loan creation endpoint) OR loan type changed (PATCH to loan update endpoint where `loan_type` or `loan_program` or `employment_type` changes).

**Inputs**:

| Field | Type | Source |
|---|---|---|
| `loan_type` | `"purchase" \| "refinance"` | `loan_files.loan_type` |
| `loan_program` | `"conventional" \| "fha" \| "va"` | `loan_files` (new field or derived from existing data) |
| `employment_type` | `"w2" \| "self_employed"` | Loan creation form (default: `"w2"`) |
| `property_state` | `string \| null` | `loan_files.property_state` |
| `loan_purpose` | `"purchase" \| "refinance" \| "cash_out_refinance"` | `loan_files.loan_type` (mapped) |

**Outputs**: Array of `document_requirements` rows inserted into the database.

**Document Requirement Sets**:

| Loan Program | Loan Purpose | Employment | Required Documents |
|---|---|---|---|
| Conventional | Purchase | W-2 | pay_stub, w2, bank_statement, government_id, purchase_contract |
| Conventional | Refinance | W-2 | pay_stub, w2, bank_statement, government_id |
| FHA | Purchase | W-2 | pay_stub, w2, bank_statement, government_id, purchase_contract, fha_case_number |
| FHA | Refinance | W-2 | pay_stub, w2, bank_statement, government_id, fha_case_number |
| VA | Purchase | W-2 | pay_stub, w2, bank_statement, government_id, purchase_contract, dd214, va_coe |
| VA | Refinance | W-2 | pay_stub, w2, bank_statement, government_id, dd214, va_coe |
| Any | Any | Self-employed | Add: tax_return_1040, schedule_c, profit_loss_statement |

**Prompt Strategy**: None. This agent is purely deterministic. The checklist is a lookup table indexed by `(loan_program, loan_purpose, employment_type)`.

**Confidence Thresholds**: Not applicable — no AI involved.

**Error Handling**:
- If `loan_program` is not recognized: default to conventional checklist + create escalation (`unsupported_scenario`, severity `info`)
- If `employment_type` is not recognized: default to W-2 checklist + create escalation (`unsupported_scenario`, severity `info`)
- If database insert fails: return 500 error, log to `event_logs`, do not leave partial checklist (transaction wraps all inserts)

**Idempotency**: Before inserting, check for existing `document_requirements` rows for this `loan_file_id`. If found:
- If loan scenario has NOT changed: return existing checklist without modification
- If loan scenario HAS changed (e.g., loan_type changed from purchase to refinance): delete existing unfulfilled requirements, keep requirements that are already `tentatively_satisfied` or beyond, add any new requirements for the new scenario

**DB Operations**:
- INSERT into `document_requirements`: one row per required document type
- UPDATE `loan_files.doc_workflow_state`: set to `checklist_pending` -> `awaiting_documents`
- UPDATE `loan_files.checklist_generated_at`: set to `now()`
- INSERT into `event_logs`: `checklist_generated` event

**Events Emitted**:

| Event | Payload |
|---|---|
| `checklist_generated` | `{ loan_id, loan_program, loan_purpose, employment_type, requirements: [{ doc_type, id }], count }` |

---

### Agent 2: Document Intelligence Agent

**Purpose**: When a document is uploaded (by borrower via portal or officer via dashboard), classify the document type, extract structured fields, run deterministic validation, match to a requirement, and decide the next workflow state.

**Trigger**: File upload received (POST to document upload endpoint — officer or portal).

**Inputs**:

| Field | Type | Source |
|---|---|---|
| `file` | Binary (PDF, JPG, PNG, HEIC) | Upload form/API |
| `file_name` | string | Upload metadata |
| `file_size` | number (bytes) | Upload metadata |
| `mime_type` | string | Upload metadata |
| `loan_id` | string (UUID) | URL parameter |
| `requirement_id` | string (UUID) or null | Optional — pre-selected from checklist |

**Outputs**:

```typescript
{
  doc_type: DocumentType;
  confidence_score: number;        // 0.0 - 1.0
  issues: string[];
  rationale_summary: string;
  extracted_fields: Record<string, string>;
}
```

**10-Step Pipeline**:

**Step 1: File Precheck** (deterministic, no AI)
- Validate file size: max 25MB
- Validate MIME type: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`
- Validate file is not empty (size > 0)
- If precheck fails: document state -> `precheck_failed`, return error to caller immediately
- No event log for precheck failures (they are user-facing validation errors)

**Step 2: Upload to Supabase Storage** (deterministic)
- Upload file to Supabase Storage bucket `loan-documents`
- Path: `{user_id}/{loan_id}/{document_id}/{original_filename}`
- Store `storage_path` on the document row

**Step 3: Create DB Record** (deterministic)
- INSERT into `documents` table with `state: 'received'`
- Set `requirement_id` if provided
- Set `file_name`, `file_size`, `mime_type`, `storage_path`

**Step 4: Transition to Processing** (deterministic)
- UPDATE document `state` from `received` to `processing`
- Emit event: `document_received`

**Step 5: Send to Claude for Classification + Extraction** (AI call)

Claude prompt:

```
System: You are a mortgage document classifier for a loan origination system. Analyze the uploaded document and determine its type.

Classify this document as exactly ONE of the following types:
- pay_stub: A pay stub or pay statement showing earnings
- w2: A W-2 tax form showing annual wages
- bank_statement: A bank account statement
- government_id: A government-issued photo ID (driver's license, passport, state ID)
- purchase_contract: A real estate purchase agreement or sales contract
- fha_case_number: FHA case number assignment
- dd214: Certificate of Release or Discharge from Active Duty
- va_coe: VA Certificate of Eligibility
- tax_return_1040: IRS Form 1040 individual income tax return
- schedule_c: IRS Schedule C (Profit or Loss From Business)
- profit_loss_statement: Business profit and loss statement
- unknown_document: Cannot be classified as any of the above

Respond in JSON format:
{
  "doc_type": "pay_stub",
  "confidence": 0.95,
  "rationale": "Document shows employee name, employer name, pay period dates, and YTD earnings consistent with a pay stub.",
  "extracted_fields": {
    "employee_name": "John Smith",
    "employer_name": "Acme Corp",
    "pay_period": "2026-02-15",
    "ytd_income": "45000.00",
    "image_quality": "good"
  },
  "issues": []
}

For extracted_fields, include ALL fields you can identify from the document.
For image_quality, rate as: "good", "acceptable", "low", "poor", "blurry", or "unreadable".
For issues, list any concerns about the document (e.g., "only first page visible", "partially cut off").
```

- Model: `claude-haiku-4-5-20251001` (classification is a fast, high-volume task)
- Log token usage to `token_usage` table with `module = 'doc_intelligence'`

**Step 6: Apply Deterministic Validation Rules** (no AI)

Validation rules by document type:

| Doc Type | Rule | Failure Message |
|---|---|---|
| `pay_stub` | `pay_period` date within 60 days of today | "Pay stub is older than 60 days. Please provide your most recent pay stub." |
| `pay_stub` | `ytd_income` field present | "Year-to-date income could not be identified. Please upload a pay stub that shows YTD earnings." |
| `pay_stub` | `employer_name` field present | "Employer name could not be identified on this pay stub." |
| `pay_stub` | `image_quality` not in ("low", "poor", "blurry", "unreadable") | "The image quality is too low to read clearly. Please take a clearer photo or upload the PDF from your payroll system." |
| `w2` | `tax_year` equals current year minus 1 | "This W-2 is for the wrong tax year. Please provide your most recent W-2 (tax year {expected_year})." |
| `w2` | `wages` (Box 1) field present | "Wages (Box 1) could not be identified on this W-2." |
| `w2` | `image_quality` check | Same as pay stub |
| `bank_statement` | `statement_date` within 90 days of today | "This bank statement is older than 90 days. Please provide a statement from the last 90 days." |
| `bank_statement` | All pages present (`page_count` >= 2 or `all_pages` = "true") | "It looks like only some pages were uploaded. Please upload the complete bank statement as a single file." |
| `bank_statement` | `image_quality` check | Same as pay stub |
| `government_id` | Image is readable | "The ID photo is not clear enough to read. Please take a new photo with good lighting." |
| `government_id` | Not expired (if `expiration_date` extracted and parseable) | "This ID appears to be expired. Please provide a valid, non-expired ID." |
| `purchase_contract` | Identifiable structure (AI classified with confidence >= 0.75) | "This document could not be identified as a purchase contract." |
| `tax_return_1040` | `agi` (adjusted gross income) field present | "Adjusted gross income (AGI) could not be identified on this tax return." |
| `tax_return_1040` | `tax_year` matches expected year | "This tax return is for the wrong year." |
| `schedule_c` | `net_profit` field present | "Net profit could not be identified on this Schedule C." |
| `schedule_c` | `tax_year` matches the `tax_return_1040` year for this loan | "Schedule C tax year does not match the tax return on file." |
| `profit_loss_statement` | Document is identifiable (confidence >= 0.75) | "This document could not be identified as a profit and loss statement." |
| `fha_case_number` | Identifiable FHA case number string | "FHA case number could not be identified." |
| `dd214` | Identifiable structure | "This document could not be identified as a DD-214." |
| `va_coe` | Identifiable structure | "This document could not be identified as a VA Certificate of Eligibility." |
| `unknown_document` | Always fails | "This document type could not be determined. Please check that you uploaded the correct file." |

Validation output: `{ valid: boolean, issues: string[], warnings: string[] }`

**Step 7: Match to Requirement** (deterministic)
- If `requirement_id` was provided in the upload: use that requirement directly
- If not provided: search `document_requirements` for this loan where `doc_type` matches the AI classification AND state is in (`awaiting_upload`, `correction_required`)
- If no matching requirement found: document is accepted but unmatched (orphan upload). Log warning event `document_unmatched`.

**Step 8: Evaluate Confidence** (deterministic)
- If `confidence_score >= 0.75`: auto-proceed through validation
- If `confidence_score < 0.75`:
  - Document state -> `needs_officer_review`
  - Create escalation: category = `low_confidence_classification`, severity = `warning`
  - Requirement state -> `needs_officer_review`
  - STOP pipeline — officer must review

**Step 9: Check for Suspicious Indicators** (deterministic)
- Scan `rationale` and `extracted_fields` for suspicious keywords: "edited", "photoshop", "altered", "modified", "manipulated", "fake", "forged", "tampered", "inconsistent font", "digitally edited"
- If any found:
  - Document state -> `needs_officer_review`
  - Create escalation: category = `suspicious_document`, severity = `critical`
  - Requirement state -> `needs_officer_review`
  - STOP pipeline

**Step 10: Update Workflow State + Emit Events** (deterministic)

If validation passed (`valid = true`):
- Document state -> `validated_ok` -> `accepted_tentatively`
- Requirement state -> `tentatively_satisfied`
- Emit: `document_validated`

If validation failed (`valid = false`, issues found):
- Document state -> `validated_issue_found`
- Requirement state -> `correction_required`
- Emit: `document_issue_detected`
- Trigger correction notification to borrower (plain-English instructions from the `issues` array)

After processing, evaluate all `document_requirements` for this loan:
- If ALL requirements are in (`tentatively_satisfied`, `confirmed_by_officer`, `waived_by_officer`): loan `doc_workflow_state` -> `review_ready`. Emit: `all_requirements_satisfied`
- If ANY requirement is in `correction_required`: loan `doc_workflow_state` -> `corrections_needed` (if not already)
- If ANY requirement is in `needs_officer_review`: loan `doc_workflow_state` -> `officer_review_needed` (if not already)

**Duplicate Handling**: If the same `doc_type` already has an `accepted_tentatively` or `validated_ok` document for the same requirement:
- Mark the previous document as `superseded` (set `superseded_by` to new document ID)
- The new upload becomes the active document
- Emit: `document_superseded`

**Name Mismatch Detection** (cross-document, deterministic):
- After validation, compare name fields across validated documents for the same loan
- Fields: `employee_name` (pay stub, W-2), `account_holder_name` (bank statement), `full_name` (government ID)
- Use fuzzy comparison allowing for middle name/initial variations
- If mismatch detected: create escalation (`name_mismatch`, severity `high`). Do NOT reject the document.

**Error Handling**:
- If Claude API call fails: retry up to 2 times with exponential backoff (1s, 3s)
- If still failing after retries: mark document as `needs_officer_review`, create escalation (`system_processing_failure`, severity `warning`), do NOT block the borrower from uploading more documents
- If Supabase Storage upload fails: return 500 to caller, do not create DB record
- If DB insert/update fails: log error, return 500, attempt cleanup of storage upload

**DB Operations**:
- INSERT into `documents`: one row per upload
- UPDATE `document_requirements.state`: based on validation result
- UPDATE `loan_files.doc_workflow_state`: based on aggregate requirement states
- INSERT into `escalations`: if confidence < 0.75, suspicious doc, name mismatch, or system failure
- INSERT into `event_logs`: multiple events per upload (received, classified, validated/issue_detected)
- INSERT into `token_usage`: AI classification cost

**Events Emitted**:

| Event | Payload |
|---|---|
| `document_received` | `{ document_id, loan_id, file_name, file_size, mime_type, requirement_id }` |
| `document_classified` | `{ document_id, doc_type, confidence_score, rationale_summary }` |
| `document_validated` | `{ document_id, requirement_id, warnings }` |
| `document_issue_detected` | `{ document_id, requirement_id, issues, missing_fields }` |
| `document_superseded` | `{ old_document_id, new_document_id, requirement_id }` |
| `document_unmatched` | `{ document_id, classified_as }` |
| `requirement_matched` | `{ requirement_id, document_id, doc_type }` |
| `all_requirements_satisfied` | `{ loan_id, requirement_count }` |

---

### Agent 3: Follow-Up Agent

**Purpose**: Send reminders to borrowers who have outstanding document requirements. Detect unresponsive borrowers and escalate to the officer.

**Trigger**:
- **Scheduled**: Runs every hour via Vercel Cron or Supabase Edge Function
- **Manual**: Officer clicks "Send Reminder" on a specific loan from the dashboard

**Inputs**:

| Field | Type | Source |
|---|---|---|
| All active loans | Query | `loan_files` where `doc_workflow_state` in (`awaiting_documents`, `corrections_needed`) |
| Outstanding requirements | Query | `document_requirements` where `state` in (`awaiting_upload`, `correction_required`) for each loan |
| Reminder history | Query | `document_reminders` for each loan |
| Borrower contact | Query | `contacts` linked to loan |
| Officer tier | Query | `users.subscription_tier` for the loan's officer |

**Outputs**: Reminder emails (and SMS for Pro/Team tiers) sent to borrowers.

**Logic**:

For each active loan with outstanding requirements:

1. Check `document_reminders` table for last reminder sent
2. Calculate days since last reminder (or since borrower invite, or since last correction request)
3. Apply reminder cadence:

| Reminder | Days Since Last Touch | Tone | Channel |
|---|---|---|---|
| Reminder 1 | Day 3 | Friendly | Email (all tiers), SMS (Pro/Team) |
| Reminder 2 | Day 7 | More urgent | Email (all tiers), SMS (Pro/Team) |
| Reminder 3 | Day 14 | Final notice | Email (all tiers), SMS (Pro/Team) |
| After Reminder 3 | Day 14+ | No more reminders | Create escalation |

4. After 3 reminders with no borrower response: create escalation (`borrower_unresponsive`, severity `high`), transition loan `doc_workflow_state` to `borrower_unresponsive`

**Reminder Templates**:

Each reminder includes:
- Borrower's first name
- Specific list of documents still needed (human-readable labels, not internal codes)
- Direct link to the borrower portal
- Officer's name and contact info

Example Reminder 1:
> Hi {first_name}, just a friendly reminder — we still need the following documents for your loan: {doc_list}. You can upload them here: {portal_link}. If you have any questions, reach out to {officer_name} at {officer_email}.

Example Reminder 3:
> Hi {first_name}, this is our final automated reminder. We still need: {doc_list}. Please upload them at {portal_link} or contact {officer_name} directly at {officer_phone} to discuss.

**Prompt Strategy**: None. This agent is deterministic — no AI calls. Templates are pre-written with variable substitution.

**Confidence Thresholds**: Not applicable.

**Idempotency**:
- Before sending, check `document_reminders` for existing reminder sent to this borrower for this loan within the last 24 hours. If found, skip.
- Quiet hours: Do not send reminders between 9 PM and 8 AM borrower's local time (inferred from `property_state`, default to ET if unknown).
- Correction reminders: When a document is rejected, the correction email counts as "touch 0" — the Day 3/7/14 cadence resets from the correction email timestamp.

**Error Handling**:
- If Resend (email) API fails: log error, retry once after 30 seconds
- If still failing: create escalation (`system_processing_failure`, severity `warning`) with description "Failed to send reminder email to borrower"
- If Twilio (SMS) fails: log error, do not retry SMS (email is primary), log warning event
- If borrower has no email on file: skip reminders entirely, immediately create escalation (`borrower_unresponsive`, severity `high`)

**DB Operations**:
- INSERT into `document_reminders`: one row per reminder sent
- INSERT into `messages`: one row per email/SMS sent (ties into existing communication log)
- INSERT into `event_logs`: `reminder_sent` event
- INSERT into `escalations`: if 3 reminders exhausted
- UPDATE `loan_files.doc_workflow_state`: if transitioning to `borrower_unresponsive`

**Events Emitted**:

| Event | Payload |
|---|---|
| `reminder_sent` | `{ loan_id, borrower_email, reminder_number, channel, outstanding_docs }` |
| `borrower_unresponsive_escalation` | `{ loan_id, reminders_sent: 3, days_since_invite }` |

---

### Agent 4: Escalation Agent

**Purpose**: Route issues to officer attention based on severity. Manage the lifecycle of escalations from creation through resolution.

**Trigger**: Created by other agents (Document Intelligence, Follow-Up) or manual officer action. This agent does not run on a schedule — it is invoked when an escalation-worthy event occurs.

**Inputs**:

| Field | Type | Source |
|---|---|---|
| `loan_file_id` | UUID | The loan this escalation relates to |
| `document_id` | UUID or null | The document this escalation relates to (if applicable) |
| `category` | string | One of the 10 escalation categories |
| `severity` | string | `info`, `warning`, `high`, `critical` |
| `description` | string | Human-readable description |
| `source_agent` | string | Which agent created this escalation |

**Outputs**: Escalation record created, officer notified based on severity.

**Escalation Categories** (10):

| # | Category | Description | Default Severity | Example Trigger |
|---|---|---|---|---|
| 1 | `low_confidence_classification` | AI unsure about document type | `warning` | Confidence score < 0.75 on classification |
| 2 | `borrower_advisory_question` | Borrower asked about approval/rates | `high` | Borrower submits question about rates (future: when portal chat is added) |
| 3 | `repeated_failed_upload` | 3+ failed uploads for same requirement | `warning` | Borrower uploads phone screenshots 3 times |
| 4 | `borrower_unresponsive` | No response after 3 reminders | `high` | Follow-Up Agent exhausts reminder cadence |
| 5 | `name_mismatch` | Name on document doesn't match borrower record | `high` | Pay stub says "John Smith", bank statement says "Jonathan A. Smith Jr." |
| 6 | `contradictory_data` | Data conflicts between documents | `high` | W-2 employer "Acme Corp" vs pay stub employer "Beta Inc" |
| 7 | `suspicious_document` | Possible alteration detected | `critical` | AI rationale mentions "inconsistent font" or "digitally edited" |
| 8 | `unsupported_scenario` | Loan type or doc type outside supported scope | `info` | Self-employed borrower with doc type not in validation rules |
| 9 | `system_processing_failure` | AI/storage/email service failure | `warning` | Claude API fails after 2 retries |
| 10 | `borrower_frustration_signal` | Borrower expressed frustration | `high` | Borrower uploads same doc 3+ times (inferred from behavior) |

**Officer Notification by Severity**:

| Severity | UI Treatment | Notification Channel |
|---|---|---|
| `critical` | Red banner at top of dashboard | Email + in-app banner (immediate) |
| `high` | Orange badge on loan card in pipeline | In-app notification (within 1 hour) |
| `warning` | Amber indicator in escalation queue | In-app only (standard queue position) |
| `info` | Blue indicator, lowest priority | In-app only (informational) |

**Officer Actions**:

| Action | Required Input | Result |
|---|---|---|
| Acknowledge | None | Status -> `acknowledged`. Signals officer has seen the issue. |
| Resolve | Notes (required, min 1 char) | Status -> `resolved`. `resolved_at` set. May trigger downstream state changes. |
| Dismiss | Notes (required, min 1 char) | Status -> `dismissed`. `resolved_at` set. Issue was not actionable. |

**Auto-Escalation Rules** (which scenarios automatically create escalations):

| Condition | Category | Severity | Created By |
|---|---|---|---|
| AI confidence < 0.75 | `low_confidence_classification` | `warning` | Document Intelligence Agent |
| AI rationale contains suspicious keywords | `suspicious_document` | `critical` | Document Intelligence Agent |
| 3+ failed uploads for same requirement | `repeated_failed_upload` | `warning` | Document Intelligence Agent |
| 3 reminders sent, no borrower action | `borrower_unresponsive` | `high` | Follow-Up Agent |
| Name mismatch across validated documents | `name_mismatch` | `high` | Document Intelligence Agent |
| Contradictory employer/income data | `contradictory_data` | `high` | Document Intelligence Agent |
| AI API failure after 2 retries | `system_processing_failure` | `warning` | Document Intelligence Agent |
| Unsupported loan/doc type detected | `unsupported_scenario` | `info` | Checklist Agent / Document Intelligence Agent |
| 3+ uploads of same doc type by borrower | `borrower_frustration_signal` | `high` | Document Intelligence Agent |

**Prompt Strategy**: None. Escalation creation and routing is deterministic.

**Confidence Thresholds**: Not applicable.

**Error Handling**:
- If escalation insert fails: log error, do not block the calling agent's pipeline. The calling agent should continue processing.
- If notification delivery fails: log error, the escalation still exists in the queue — officer will see it on next dashboard load.

**DB Operations**:
- INSERT into `escalations`: one row per escalation
- INSERT into `event_logs`: `escalation_created` event
- UPDATE `escalations`: on acknowledge/resolve/dismiss
- INSERT into `event_logs`: `escalation_acknowledged`, `escalation_resolved`, or `escalation_dismissed`

**Events Emitted**:

| Event | Payload |
|---|---|
| `escalation_created` | `{ escalation_id, loan_id, category, severity, description, source_agent }` |
| `escalation_acknowledged` | `{ escalation_id, officer_id }` |
| `escalation_resolved` | `{ escalation_id, officer_id, resolution_notes }` |
| `escalation_dismissed` | `{ escalation_id, officer_id, dismiss_reason }` |

---

### Agent 5: Review Agent (Officer Copilot)

**Purpose**: Generate a structured review summary of a loan file's document status for officer decision-making. This is primarily a read-only agent — it generates a summary but does not modify workflow state directly.

**Trigger**:
- Officer clicks "Generate Summary" button on the loan detail page
- Automatically triggered when all requirements reach `tentatively_satisfied` (configurable — can be toggled off)

**Inputs** (all read from database):

| Field | Type | Source |
|---|---|---|
| `loan_id` | UUID | Loan detail page |
| `loan_data` | Loan record | `loan_files` table |
| `borrower_data` | Contact record | `contacts` table |
| `application_data` | 1003 data | `loan_applications` table |
| `document_requirements` | Array with states | `document_requirements` table |
| `documents` | Array with AI results | `documents` table (joined to requirements) |
| `escalations` | Open/acknowledged | `escalations` table |

**Outputs**:

```typescript
{
  loan_id: string;
  overall_assessment: string;          // 2-3 sentence natural language summary
  readiness_grade: "A" | "B" | "C" | "F";
  file_completion_percentage: number;  // 0-100
  unresolved_issues: Array<{
    description: string;
    severity: "critical" | "high" | "warning" | "info";
    requirement_id: string | null;
  }>;
  confidence_flags: Array<{
    field: string;
    concern: string;
    confidence: number;
  }>;
  recommended_actions: Array<{
    action: string;
    priority: "immediate" | "soon" | "when_convenient";
    reason: string;
  }>;
  document_breakdown: Array<{
    doc_type: string;
    requirement_state: string;
    document_state: string | null;
    confidence_score: number | null;
    issues: string[];
    ai_rationale: string | null;
  }>;
  stacking_order: Array<{
    position: number;
    doc_type: string;
    document_id: string;
    label: string;
  }>;
}
```

**Readiness Grade Logic**:

| Grade | Criteria |
|---|---|
| A | All requirements `confirmed_by_officer` or `waived_by_officer`. No open escalations. |
| B | All requirements at least `tentatively_satisfied`. No critical/high escalations open. |
| C | Some requirements still outstanding, but progress is being made. No critical escalations. |
| F | Critical escalations open, OR multiple requirements in `correction_required`/`awaiting_upload`, OR borrower unresponsive. |

**Prompt Strategy**:

```
System: You are an AI copilot for a mortgage loan officer. Generate a concise, actionable review summary for this loan file.

Be direct and specific. Flag anything that needs attention. Do not provide lending advice or approval recommendations — you are summarizing document status, not making credit decisions.

The officer will use your summary to decide whether the file is ready for lender submission.

Loan data:
{serialized: loan record, requirements with states, document metadata with AI results, open escalations}

Respond in the JSON schema provided. For stacking_order, list validated documents in standard lender submission order:
1. Government ID
2. Purchase Contract (if purchase)
3. Pay Stubs
4. W-2s
5. Tax Returns (if self-employed)
6. Schedule C (if self-employed)
7. P&L Statement (if self-employed)
8. Bank Statements
9. VA/FHA documents (if applicable)
```

- Model: `claude-sonnet-4-6` (this is a higher-stakes, more nuanced summarization task)

**Confidence Thresholds**: The Review Agent itself does not have a confidence threshold. It surfaces confidence concerns from the underlying document classifications.

**Officer Actions After Review**:

| Action | Effect |
|---|---|
| Mark Review Ready | `doc_workflow_state` -> `file_complete`. Creates `review_decisions` record with `decision: 'review_ready'`. |
| Request Corrections | `doc_workflow_state` -> `corrections_needed`. Officer specifies which requirements need correction. Triggers borrower notification. |
| Archive | `doc_workflow_state` -> remains current (loan `status` may change to `withdrawn`). |

**Stacking Order**: The review summary includes an ordered list of validated documents in standard lender-submission order. This is a convenience for the officer — it does not enforce a particular order, but suggests the conventional packaging sequence.

**Integration with Readiness Score**: The `file_completion_percentage` from the Review Agent feeds into the existing `submission_readiness_score` on `loan_files`. The readiness score formula is updated:
- Document completion component: `file_completion_percentage * 0.4` (40% weight)
- Escalation penalty: critical = -20 points, high = -10 points
- Application completeness: existing 1003 scoring (unchanged)
- Conditions: existing condition scoring (unchanged)

**Error Handling**:
- If Claude API fails: return error to officer with message "Summary generation failed. Please try again." Do not block any workflow.
- If loan data is incomplete (e.g., no requirements generated): return error "Checklist has not been generated for this loan yet."

**DB Operations**:
- INSERT into `event_logs`: `review_summary_generated`
- INSERT into `token_usage`: AI cost with `module = 'officer_copilot'`
- INSERT into `review_decisions`: when officer takes action after review
- UPDATE `loan_files.doc_workflow_state`: when officer marks review ready or requests corrections

**Events Emitted**:

| Event | Payload |
|---|---|
| `review_summary_generated` | `{ loan_id, readiness_grade, file_completion_percentage, unresolved_count }` |
| `review_decision_made` | `{ loan_id, officer_id, decision, notes }` |

---

## 3. Workflow State Machines

### 3.1 Loan Workflow States

LoanFlow AI currently uses the `status` field on `loan_files` with values: `intake`, `verification`, `submitted`, `in_underwriting`, `conditional_approval`, `clear_to_close`, `closed`, `withdrawn`.

The File Completion Engine introduces a parallel `doc_workflow_state` field that tracks the document collection lifecycle independently. The two fields coexist and are independent.

**Existing `loan_files.status`** (unchanged):

| State | Purpose | Controlled By |
|---|---|---|
| `intake` | Loan created, application in progress | Officer |
| `verification` | Documents being collected/verified | System + Officer |
| `submitted` | Submitted to lender | Officer |
| `in_underwriting` | Lender is underwriting | Officer (manual) |
| `conditional_approval` | Conditions issued | Officer |
| `clear_to_close` | All conditions cleared | Officer |
| `closed` | Loan closed | Officer |
| `withdrawn` | Loan withdrawn | Officer |

**New `loan_files.doc_workflow_state`**:

| State | Purpose | Controlled By |
|---|---|---|
| `checklist_pending` | Loan created, checklist not yet generated | System |
| `awaiting_documents` | Checklist generated, waiting for borrower uploads | System |
| `documents_in_review` | At least one document uploaded and being processed | System |
| `corrections_needed` | One or more documents need re-upload | System |
| `borrower_unresponsive` | 3 reminders sent, no response | System |
| `officer_review_needed` | Escalation requires officer attention | System |
| `review_ready` | All docs tentatively satisfied, officer can review | System |
| `file_complete` | Officer confirmed — file ready for submission | Officer |

**State Transitions**:

```
checklist_pending ──[checklist generated]──> awaiting_documents

awaiting_documents ──[first doc uploaded]──> documents_in_review
awaiting_documents ──[3 reminders, no response]──> borrower_unresponsive

documents_in_review ──[doc fails validation]──> corrections_needed
documents_in_review ──[all requirements satisfied]──> review_ready
documents_in_review ──[escalation created (high/critical)]──> officer_review_needed
documents_in_review ──[more docs still needed]──> awaiting_documents

corrections_needed ──[borrower re-uploads]──> documents_in_review
corrections_needed ──[3 reminders, no response]──> borrower_unresponsive

borrower_unresponsive ──[officer re-engages]──> awaiting_documents
borrower_unresponsive ──[borrower uploads]──> documents_in_review

officer_review_needed ──[officer resolves all escalations]──> documents_in_review
officer_review_needed ──[officer resolves, all docs ok]──> review_ready
officer_review_needed ──[officer: borrower must re-upload]──> corrections_needed

review_ready ──[officer confirms]──> file_complete
review_ready ──[officer finds issues]──> corrections_needed

file_complete ──[officer reopens]──> review_ready
```

**Transition Rules with Guards**:

| From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|
| `checklist_pending` | `awaiting_documents` | Checklist Agent completes | At least 1 requirement created | `checklist_generated_at` set |
| `awaiting_documents` | `documents_in_review` | Document uploaded | At least 1 document in `processing` or beyond | Document Intelligence pipeline starts |
| `awaiting_documents` | `borrower_unresponsive` | Follow-Up Agent | 3 reminders sent, 0 uploads | Escalation created |
| `documents_in_review` | `corrections_needed` | Document Intelligence Agent | Any requirement in `correction_required` | Correction email sent to borrower |
| `documents_in_review` | `review_ready` | Document Intelligence Agent | ALL requirements in terminal-positive state | Officer notified |
| `documents_in_review` | `officer_review_needed` | Escalation Agent | Escalation with severity `high` or `critical` created | Officer notified |
| `documents_in_review` | `awaiting_documents` | Document Intelligence Agent | Some requirements satisfied, others still `awaiting_upload` | No side effect |
| `corrections_needed` | `documents_in_review` | Borrower re-uploads | New document received for a `correction_required` requirement | Pipeline restarts |
| `corrections_needed` | `borrower_unresponsive` | Follow-Up Agent | 3 reminders since correction request, no response | Escalation created |
| `borrower_unresponsive` | `awaiting_documents` | Officer action | Officer clicks "Re-engage Borrower" | Reminder counter reset |
| `borrower_unresponsive` | `documents_in_review` | Borrower uploads | Document received after unresponsive period | Pipeline processes doc |
| `officer_review_needed` | `documents_in_review` | Officer action | All escalations for this loan resolved or dismissed | Re-evaluate requirements |
| `officer_review_needed` | `review_ready` | Officer action | All escalations resolved AND all requirements satisfied | Officer can proceed to full review |
| `officer_review_needed` | `corrections_needed` | Officer action | Officer determines borrower must re-upload | Correction email sent |
| `review_ready` | `file_complete` | Officer action | Officer clicks "Mark File Complete" | `review_decisions` record created. `status` may advance to `verification`. |
| `review_ready` | `corrections_needed` | Officer action | Officer finds issues during review | Correction email sent |
| `file_complete` | `review_ready` | Officer action | Officer clicks "Reopen for Review" | Allows re-review if new information surfaces |

**Relationship Between `status` and `doc_workflow_state`**:
- They are independent: a loan can be `status = intake` and `doc_workflow_state = review_ready`
- When `doc_workflow_state` reaches `file_complete`, the system can auto-advance `status` from `intake` to `verification` (if not already there)
- When `status` advances to `submitted`, `doc_workflow_state` is no longer actively driven by the engine (documents are complete)

### 3.2 Document Requirement States

```
required
  │
  └──[checklist generated, borrower portal active]──> awaiting_upload
       │                                                │
       │                                                └──[officer waives]──> waived_by_officer
       │
       └──[document uploaded]──> uploaded_pending_validation
            │
            ├──[validation passes]──> tentatively_satisfied
            │     │
            │     ├──[officer confirms]──> confirmed_by_officer
            │     │
            │     └──[officer rejects]──> correction_required
            │                                │
            │                                └──[borrower re-uploads]──> uploaded_pending_validation
            │
            ├──[validation fails]──> correction_required
            │
            └──[low confidence / suspicious]──> needs_officer_review
                  │
                  ├──[officer: looks good]──> tentatively_satisfied
                  ├──[officer: needs correction]──> correction_required
                  └──[officer: waive]──> waived_by_officer
```

**Complete Transition Table**:

| From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|
| `required` | `awaiting_upload` | Borrower accesses portal OR checklist generated | Borrower has portal token | None |
| `required` | `waived_by_officer` | Officer waives | Officer authenticated | Event logged |
| `awaiting_upload` | `uploaded_pending_validation` | Document uploaded for this requirement | File passes precheck | Document Intelligence pipeline starts |
| `awaiting_upload` | `waived_by_officer` | Officer waives | Officer authenticated | Event logged |
| `uploaded_pending_validation` | `tentatively_satisfied` | Validation passes | `valid = true` AND `confidence >= 0.75` | Document -> `accepted_tentatively` |
| `uploaded_pending_validation` | `correction_required` | Validation fails | `valid = false`, issues found | Correction notification sent |
| `uploaded_pending_validation` | `needs_officer_review` | Low confidence or suspicious | `confidence < 0.75` OR suspicious indicators | Escalation created |
| `correction_required` | `uploaded_pending_validation` | Borrower re-uploads | New document for this requirement | Previous doc -> `superseded` |
| `needs_officer_review` | `tentatively_satisfied` | Officer resolves: acceptable | Officer action | Escalation resolved |
| `needs_officer_review` | `correction_required` | Officer resolves: re-upload needed | Officer action | Correction notification sent |
| `needs_officer_review` | `waived_by_officer` | Officer waives | Officer action | Escalation resolved |
| `tentatively_satisfied` | `confirmed_by_officer` | Officer explicitly confirms | Officer action | Final state for this requirement |
| `tentatively_satisfied` | `correction_required` | Officer finds issue on review | Officer action | Correction notification sent |

### 3.3 Uploaded Document States

```
received
  │
  ├──[precheck fails]──> precheck_failed (terminal)
  │
  └──[precheck passes, stored]──> processing
       │
       └──[AI classifies]──> classified
            │
            ├──[validation OK]──> validated_ok ──> accepted_tentatively
            │
            ├──[validation issues]──> validated_issue_found
            │
            └──[low confidence / suspicious]──> needs_officer_review
                  │
                  ├──[officer accepts]──> accepted_tentatively
                  └──[officer rejects]──> rejected

  (any active state) ──[new doc for same requirement]──> superseded
```

**Complete Transition Table**:

| From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|
| `received` | `precheck_failed` | File fails size/type/empty check | Precheck fails | Error returned to caller |
| `received` | `processing` | File passes precheck, stored | Upload to storage succeeds | Storage path saved |
| `processing` | `classified` | AI returns classification | Claude API succeeds | `classification`, `confidence_score`, `extracted_fields` set |
| `classified` | `validated_ok` | Deterministic validation passes | `valid = true` | `validated_at` set |
| `classified` | `validated_issue_found` | Deterministic validation finds issues | `valid = false` | `issues` set |
| `classified` | `needs_officer_review` | Confidence < 0.75 OR suspicious | Threshold check | Escalation created |
| `validated_ok` | `accepted_tentatively` | Automatic (immediate) | None | Requirement updated |
| `needs_officer_review` | `accepted_tentatively` | Officer accepts | Officer action | Escalation resolved |
| `needs_officer_review` | `rejected` | Officer rejects | Officer action | Escalation resolved |
| `accepted_tentatively` | `superseded` | New doc uploaded for same req | New document received | `superseded_by` set |
| `validated_issue_found` | `superseded` | New doc uploaded for same req | New document received | `superseded_by` set |
| `validated_ok` | `superseded` | New doc uploaded for same req | New document received | `superseded_by` set |

### 3.4 Escalation States

```
open ──[officer acknowledges]──> acknowledged
  │                                │
  │                                ├──[officer resolves]──> resolved (terminal)
  │                                │
  │                                └──[officer dismisses]──> dismissed (terminal)
  │
  ├──[officer resolves directly]──> resolved (terminal)
  │
  └──[officer dismisses directly]──> dismissed (terminal)
```

| From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|
| `open` | `acknowledged` | Officer clicks "Acknowledge" | Officer authenticated | Event logged |
| `open` | `resolved` | Officer clicks "Resolve" | Notes provided (min 1 char) | `resolved_at` set, downstream state changes |
| `open` | `dismissed` | Officer clicks "Dismiss" | Notes provided (min 1 char) | `resolved_at` set |
| `acknowledged` | `resolved` | Officer clicks "Resolve" | Notes provided | `resolved_at` set, downstream state changes |
| `acknowledged` | `dismissed` | Officer clicks "Dismiss" | Notes provided | `resolved_at` set |

---

## 4. Database Schema Changes

All changes are **additive** to the existing LoanFlow schema. No columns removed, no tables dropped, no breaking migrations.

### 4.1 New Tables

**`document_requirements`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | Primary key |
| `loan_file_id` | uuid | FK -> `loan_files(id)` ON DELETE CASCADE, NOT NULL | Parent loan |
| `doc_type` | text | NOT NULL | Document type (`pay_stub`, `w2`, `bank_statement`, etc.) |
| `state` | text | NOT NULL, default `'required'` | Current state in requirement state machine |
| `label` | text | NULL | Human-readable label (e.g., "Most recent pay stub") |
| `notes` | text | NULL | Officer notes about this requirement |
| `created_at` | timestamptz | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default `now()` | Last update timestamp |

**`escalations`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | Primary key |
| `loan_file_id` | uuid | FK -> `loan_files(id)` ON DELETE CASCADE, NOT NULL | Parent loan |
| `document_id` | uuid | FK -> `documents(id)`, NULL | Related document (if applicable) |
| `category` | text | NOT NULL | Escalation category (one of 10 defined categories) |
| `severity` | text | NOT NULL | `info`, `warning`, `high`, `critical` |
| `status` | text | NOT NULL, default `'open'` | `open`, `acknowledged`, `resolved`, `dismissed` |
| `description` | text | NULL | Human-readable description of the issue |
| `owner` | uuid | FK -> `users(id)`, NULL | Officer who owns this escalation (auto-set to loan's officer) |
| `resolution_notes` | text | NULL | Officer's resolution/dismissal notes |
| `resolved_at` | timestamptz | NULL | When resolved or dismissed |
| `created_at` | timestamptz | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default `now()` | Last update timestamp |

**`review_decisions`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | Primary key |
| `loan_file_id` | uuid | FK -> `loan_files(id)` ON DELETE CASCADE, NOT NULL | Parent loan |
| `user_id` | uuid | FK -> `users(id)`, NOT NULL | Officer making the decision |
| `decision` | text | NOT NULL | `review_ready`, `needs_correction`, `archived` |
| `notes` | text | NULL | Officer notes explaining the decision |
| `document_snapshot` | jsonb | NULL | Snapshot of all requirement/document states at time of decision |
| `created_at` | timestamptz | NOT NULL, default `now()` | Decision timestamp |

**`document_reminders`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | Primary key |
| `loan_file_id` | uuid | FK -> `loan_files(id)` ON DELETE CASCADE, NOT NULL | Parent loan |
| `requirement_id` | uuid | FK -> `document_requirements(id)`, NULL | Specific requirement (null if reminder covers multiple) |
| `reminder_number` | integer | NOT NULL | 1, 2, or 3 |
| `channel` | text | NOT NULL | `email` or `sms` |
| `status` | text | NOT NULL, default `'sent'` | `sent`, `failed`, `delivered` |
| `sent_at` | timestamptz | NULL | When actually sent |
| `created_at` | timestamptz | NOT NULL, default `now()` | Creation timestamp |

**`event_logs`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | Primary key |
| `loan_file_id` | uuid | FK -> `loan_files(id)`, NULL | Parent loan (null for system events) |
| `event_type` | text | NOT NULL | Event type identifier |
| `actor` | text | NULL | Who caused the event (`system`, `officer:{id}`, `borrower:{id}`, `ai:{agent}`) |
| `payload` | jsonb | default `'{}'` | Event-specific data |
| `created_at` | timestamptz | NOT NULL, default `now()` | Event timestamp |

### 4.2 Modified Tables

**`loan_files`** — Add columns:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `doc_workflow_state` | text | `'checklist_pending'` | Parallel document workflow state |
| `checklist_generated_at` | timestamptz | NULL | When the checklist was last generated |

**`documents`** (existing table) — Add columns:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `requirement_id` | uuid (FK -> `document_requirements(id)`) | NULL | Link to the requirement this satisfies |
| `confidence_score` | numeric(4,3) | NULL | AI classification confidence (0.000-1.000) |
| `ai_rationale` | text | NULL | AI reasoning for classification |
| `issues` | jsonb | `'[]'` | Array of validation issue descriptions |
| `classification_raw` | jsonb | NULL | Full raw AI response for audit |
| `validated_at` | timestamptz | NULL | When deterministic validation completed |
| `superseded_by` | uuid (FK -> `documents(id)`) | NULL | ID of the document that replaced this one |

Note: The existing `documents` table continues to work for documents uploaded before the File Completion Engine is enabled. The new columns are nullable and do not affect existing records.

### 4.3 New Indexes

| Table | Columns | Purpose |
|---|---|---|
| `document_requirements` | `(loan_file_id)` | All requirements for a loan |
| `document_requirements` | `(loan_file_id, doc_type)` | Lookup by loan + doc type |
| `document_requirements` | `(loan_file_id, state)` | Outstanding requirements filter |
| `escalations` | `(loan_file_id)` | All escalations for a loan |
| `escalations` | `(loan_file_id, status)` | Open escalations for a loan |
| `escalations` | `(status, severity, created_at)` | Escalation queue sorting (dashboard) |
| `escalations` | `(owner, status)` | Officer's escalation queue |
| `event_logs` | `(loan_file_id, created_at DESC)` | Activity timeline (most recent first) |
| `event_logs` | `(event_type)` | Filter by event type |
| `event_logs` | `(created_at DESC)` | System-wide recent events |
| `review_decisions` | `(loan_file_id)` | All decisions for a loan |
| `review_decisions` | `(loan_file_id, created_at DESC)` | Most recent decision |
| `document_reminders` | `(loan_file_id)` | All reminders for a loan |
| `document_reminders` | `(loan_file_id, reminder_number)` | Check reminder cadence |
| `documents` | `(requirement_id)` | Documents for a requirement |
| `documents` | `(loan_file_id, confidence_score)` | Low-confidence document lookup |
| `loan_files` | `(user_id, doc_workflow_state)` | Dashboard filtering by doc workflow state |

### 4.4 RLS Policies

**`document_requirements`**:
- SELECT: `auth.uid() = (SELECT user_id FROM loan_files WHERE id = document_requirements.loan_file_id)`
- INSERT: Same ownership check
- UPDATE: Same ownership check
- DELETE: Same ownership check

**`escalations`**:
- SELECT: `auth.uid() = (SELECT user_id FROM loan_files WHERE id = escalations.loan_file_id)`
- UPDATE: Same ownership check
- INSERT: Service role only (system creates escalations)

**`event_logs`**:
- SELECT: `auth.uid() = (SELECT user_id FROM loan_files WHERE id = event_logs.loan_file_id)` (for loan-specific events) OR `loan_file_id IS NULL` (system events visible to all authenticated users)
- INSERT: Service role only (system creates events)
- UPDATE: Never (events are immutable)
- DELETE: Never (events are immutable)

**`review_decisions`**:
- SELECT: `auth.uid() = (SELECT user_id FROM loan_files WHERE id = review_decisions.loan_file_id)`
- INSERT: `auth.uid() = user_id` (officer can only create their own decisions)

**`document_reminders`**:
- SELECT: `auth.uid() = (SELECT user_id FROM loan_files WHERE id = document_reminders.loan_file_id)`
- INSERT: Service role only
- UPDATE: Service role only

**Portal access**: Portal API routes use the service role client (bypasses RLS), authenticated via portal token. Token is validated against `loan_files.portal_token` and `loan_files.portal_expires_at` before any operation.

### 4.5 Migration Strategy

- Migration file: `supabase/migrations/003_file_completion_engine.sql`
- All changes are additive — no columns removed, no tables dropped
- The `doc_workflow_state` column on `loan_files` defaults to `'checklist_pending'` — existing loans are unaffected
- The new columns on `documents` are all nullable — existing document records are unaffected
- The migration is safe to apply to production with zero downtime
- Foreign key cascades ensure cleanup when a loan is deleted

---

## 5. API Endpoints

### 5.1 New Endpoints

**POST `/api/loans/[loanId]/requirements`** — Generate document checklist

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Request Schema | `z.object({ employment_type: z.enum(["w2", "self_employed"]).optional() })` |
| Response | `{ requirements: DocumentRequirement[] }` |
| Logic | Runs Checklist Agent. Idempotent — returns existing checklist if already generated and scenario unchanged. |

**GET `/api/loans/[loanId]/requirements`** — Get document checklist

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Response | `{ requirements: (DocumentRequirement & { documents: Document[] })[] }` |
| Logic | Returns requirements with joined document data (latest active document per requirement). |

**PATCH `/api/loans/[loanId]/requirements/[reqId]`** — Officer action on requirement

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Request Schema | `z.object({ action: z.enum(["waive", "confirm", "request_correction"]), notes: z.string().max(2000).optional() })` |
| Response | `{ requirement: DocumentRequirement }` |
| Logic | Validates state transition. Creates event log. If `request_correction`: sends borrower notification. |

**POST `/api/loans/[loanId]/documents/upload`** — Upload document (officer)

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Request Schema | FormData with `file` (required) + `requirement_id` (optional UUID) |
| Response | `{ document: Document }` (includes AI classification result) |
| Logic | Runs Document Intelligence Agent pipeline. Returns after classification + validation complete. |

**POST `/api/portal/[token]/upload`** — Upload document (borrower)

| Property | Value |
|---|---|
| Auth | None (token-based) |
| Validation | Portal token must match and not be expired |
| Request Schema | FormData with `file` (required) + `requirement_id` (optional UUID) |
| Response | `{ document: BorrowerDocumentView }` (limited fields — no AI rationale, no confidence score) |
| Logic | Same pipeline as officer upload. Response is filtered to borrower-safe fields only. |

**GET `/api/portal/[token]/requirements`** — Get checklist (borrower view)

| Property | Value |
|---|---|
| Auth | None (token-based) |
| Validation | Portal token must match and not be expired |
| Response | `{ requirements: BorrowerRequirementView[] }` |
| Logic | Returns requirements with borrower-friendly labels and simplified status (needed / uploaded / accepted / needs_correction). |

**GET `/api/loans/[loanId]/escalations`** — Get escalations for a loan

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Query Params | `status` (optional filter), `severity` (optional filter) |
| Response | `{ escalations: Escalation[] }` |
| Logic | Returns escalations sorted by severity (critical first), then created_at. |

**PATCH `/api/loans/[loanId]/escalations/[escId]`** — Officer action on escalation

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Request Schema | `z.object({ action: z.enum(["acknowledge", "resolve", "dismiss"]), notes: z.string().min(1).max(2000).optional() }).refine(d => d.action === "acknowledge" \|\| (d.notes && d.notes.length > 0), { message: "Notes required for resolve/dismiss" })` |
| Response | `{ escalation: Escalation }` |
| Logic | Validates state transition. Creates event log. Resolution may trigger downstream state changes on documents/requirements. |

**GET `/api/dashboard/escalations`** — All escalations for officer (queue view)

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Query Params | `status`, `severity`, `page`, `limit` |
| Response | `{ escalations: EscalationWithLoan[], total: number }` |
| Logic | Returns all escalations across all officer's loans. Sorted by severity (critical first), then created_at. |

**POST `/api/loans/[loanId]/review`** — Generate review summary

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Response | `{ summary: ReviewSummary }` |
| Logic | Runs Review Agent (Officer Copilot). Returns structured summary. Logs event + token usage. |

**POST `/api/loans/[loanId]/review/decision`** — Submit officer review decision

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Request Schema | `z.object({ decision: z.enum(["review_ready", "needs_correction", "archived"]), notes: z.string().max(2000).optional() })` |
| Response | `{ review_decision: ReviewDecision, loan: LoanFile }` |
| Logic | Creates review_decisions record. Transitions doc_workflow_state. If `needs_correction`: triggers borrower notification. |

**GET `/api/loans/[loanId]/events`** — Get activity timeline

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Query Params | `event_type` (optional), `page`, `limit` |
| Response | `{ events: EventLog[], total: number }` |
| Logic | Returns events sorted by created_at DESC. |

**POST `/api/loans/[loanId]/reminders`** — Manually trigger reminder

| Property | Value |
|---|---|
| Auth | Required (officer) |
| Ownership | Loan must belong to authenticated user |
| Response | `{ sent: boolean, reminder_number: number }` |
| Logic | Runs Follow-Up Agent for this specific loan immediately. Respects idempotency (won't send if reminder sent in last 24h). |

### 5.2 Modified Endpoints

**POST `/api/loans`** (existing loan creation):
- After creating the loan, auto-run the Checklist Agent (generate requirements)
- Return the loan with `doc_workflow_state` in the response
- Include `requirements_count` in the response

**GET `/api/loans/[loanId]`** (existing loan detail):
- Include `doc_workflow_state` in response
- Include `requirements_summary: { total, satisfied, pending, correction_needed, officer_review }`
- Include `escalations_summary: { open, critical, high }`

**PATCH `/api/loans/[loanId]`** (existing loan update):
- If `loan_type` or `employment_type` changes: re-run Checklist Agent
- Allow explicit `doc_workflow_state` transition (only valid transitions per state machine)

---

## 6. Event Model

All events are stored in the `event_logs` table. Events are immutable — no UPDATE or DELETE.

### 6.1 Event Catalog

| Event Type | Trigger | Actor | Payload Schema | Purpose |
|---|---|---|---|---|
| `checklist_generated` | Checklist Agent completes | `ai:checklist` | `{ loan_id, loan_program, employment_type, requirements: [{ doc_type, id }], count }` | Track checklist creation |
| `document_received` | File uploaded and stored | `borrower:{id}` or `officer:{id}` | `{ document_id, file_name, file_size, mime_type, requirement_id }` | Track upload events |
| `document_classified` | AI classification complete | `ai:doc_intelligence` | `{ document_id, doc_type, confidence_score, rationale_summary }` | Track AI classification |
| `document_validated` | Deterministic validation passes | `system` | `{ document_id, requirement_id, warnings }` | Track successful validation |
| `document_issue_detected` | Deterministic validation fails | `system` | `{ document_id, requirement_id, issues, missing_fields }` | Track validation failures |
| `document_superseded` | New doc replaces old | `system` | `{ old_document_id, new_document_id, requirement_id }` | Track document replacement |
| `document_unmatched` | Uploaded doc doesn't match any requirement | `system` | `{ document_id, classified_as }` | Track orphan uploads |
| `requirement_state_changed` | Any requirement state transition | `system` or `officer:{id}` | `{ requirement_id, from_state, to_state, reason }` | Audit trail |
| `workflow_transition` | Loan doc_workflow_state changes | varies | `{ loan_id, from_state, to_state, reason }` | Audit trail |
| `escalation_created` | Escalation Agent creates escalation | `system` or `ai:{agent}` | `{ escalation_id, category, severity, description }` | Track escalation creation |
| `escalation_acknowledged` | Officer acknowledges | `officer:{id}` | `{ escalation_id }` | Track officer response |
| `escalation_resolved` | Officer resolves | `officer:{id}` | `{ escalation_id, resolution_notes }` | Track resolution |
| `escalation_dismissed` | Officer dismisses | `officer:{id}` | `{ escalation_id, dismiss_reason }` | Track dismissal |
| `reminder_sent` | Follow-Up Agent sends reminder | `system` | `{ loan_id, borrower_email, reminder_number, channel, outstanding_docs }` | Track follow-up |
| `borrower_unresponsive_escalation` | 3 reminders exhausted | `system` | `{ loan_id, reminders_sent, days_since_invite }` | Track unresponsive borrowers |
| `review_summary_generated` | Review Agent completes | `ai:review` | `{ loan_id, readiness_grade, file_completion_percentage, unresolved_count }` | Track review generation |
| `review_decision_made` | Officer submits review decision | `officer:{id}` | `{ loan_id, decision, notes }` | Track officer decisions |
| `correction_email_sent` | System sends correction request | `system` | `{ borrower_email, requirement_id, issues }` | Track borrower communications |
| `all_requirements_satisfied` | All requirements in terminal-positive state | `system` | `{ loan_id, requirement_count }` | Track file readiness |
| `name_mismatch_detected` | Cross-document name mismatch | `system` | `{ loan_id, documents_compared, names_found }` | Track data inconsistencies |

### 6.2 Event Usage

Events serve three purposes:

1. **Audit trail**: Complete record of everything that happened to a loan file. Required for compliance and regulatory review.
2. **Activity timeline**: Displayed on the loan detail page as a chronological feed. Officers can see every action, AI classification, and system decision.
3. **Analytics**: Used to calculate metrics: document collection time, AI accuracy rates, borrower response times, officer intervention frequency.

---

## 7. Integration Points

### 7.1 Readiness Score

The existing `submission_readiness_score` on `loan_files` is updated to incorporate document requirement states:

| Component | Weight | Source |
|---|---|---|
| Document completion | 40% | `file_completion_percentage` from Review Agent |
| Application completeness | 30% | Existing 1003 scoring (unchanged) |
| Condition status | 20% | Existing condition scoring (unchanged) |
| Escalation penalty | -10 to -20 | Critical: -20 pts, High: -10 pts (per open escalation) |

Requirement state weights for the document completion component:
- `confirmed_by_officer` or `waived_by_officer`: 100%
- `tentatively_satisfied`: 80%
- `uploaded_pending_validation`: 40%
- `correction_required` or `needs_officer_review`: 0%
- `awaiting_upload` or `required`: 0%

### 7.2 Conditions Tracking

When a `document_requirement` reaches `tentatively_satisfied` or `confirmed_by_officer`:
- Check if any open `conditions` have a matching `required_document_type`
- If match found: auto-update condition status from `open` or `borrower_notified` to `document_received`
- Officer can still manually validate and advance to `validated` -> `cleared`
- This is available "where available" — not all conditions will have a `required_document_type` mapping. Unmapped conditions are unaffected.

### 7.3 AUS Simulation

No direct integration in v2.0. The AUS simulation feature uses application data, not document data. Future: validated income from pay stubs and W-2s could pre-populate AUS input fields, but this is not in scope for launch.

### 7.4 Pre-Approval Letters

No direct integration in v2.0. Pre-approval letters are generated from application data and officer judgment. Future: the Review Agent could flag when documents support (or contradict) the stated income used in a pre-approval letter.

### 7.5 Lender Submissions

When an officer attempts to create a `lender_submission`:
- Check if `doc_workflow_state` is `file_complete`
- If not: show warning "Document file is not complete. {count} requirements are still outstanding."
- Do NOT hard-block — officer may submit with explanations for missing docs
- Include document checklist summary in the `documents_included` JSON on the submission record
- The Review Agent's `stacking_order` can be used to package documents in lender-expected order

### 7.6 Borrower Portal

The existing portal at `/portal/[token]` currently shows a basic document upload interface. With the File Completion Engine:

- Replace basic upload with a visual checklist showing each required document
- Each checklist item shows borrower-friendly status: "Needed", "Uploaded — Under Review", "Accepted", "Needs Correction" (with specific instructions)
- Upload flow accepts files per requirement (or unmatched, which the system auto-matches)
- Correction instructions use plain English (from the validation `issues` array)
- Progress bar shows completion percentage
- Real-time feedback after upload (classification result, or "under review" if processing)

### 7.7 Communication Templates

The existing `messages` table logs all SMS/email communications. The File Completion Engine:

- Creates `messages` rows for all automated emails (reminders, correction requests, welcome)
- Channel: `email` (Pro/Team: also `sms`)
- Direction: `outbound`
- Trigger type: `file_completion_engine`
- Officers can see all automated communications in the existing messages timeline on the loan detail page

---

## 8. Security & Compliance

### 8.1 PII in AI Prompts

**What IS sent to Claude**:
- Document images/PDFs (required for classification and extraction)
- Loan type and employment type (for classification context)
- Document requirement list (for Review Agent context)

**What is NEVER sent to Claude**:
- Social Security Numbers (even last 4)
- Full dates of birth
- Bank account numbers
- Credit scores or credit report data
- Income amounts from the 1003 application (AI extracts from documents independently)
- Borrower addresses (not needed for document classification)

**Data minimization principle**: Each AI prompt includes only the minimum data needed for the specific task. Classification prompts include only the document image/PDF. Review Agent prompts include document states and AI rationale but NOT the actual document images.

### 8.2 Document Storage

- Documents stored in Supabase Storage bucket `loan-documents`
- Bucket is PRIVATE (no public access)
- Access via signed URLs with 1-hour expiration
- Storage path includes `user_id` for partitioning: `{user_id}/{loan_id}/{document_id}/{filename}`
- RLS on `documents` table ensures officers can only access their own loans' documents
- Portal access uses service role client with token validation — borrowers can only access their own loan's documents via signed URLs generated server-side

### 8.3 Audit Trail Completeness

- Every state change is logged in `event_logs`
- Every AI classification result is stored on the `documents` record (`classification_raw` preserves the full AI response)
- Every escalation creation, acknowledgment, and resolution is logged
- Every officer decision is recorded in `review_decisions` (with `document_snapshot` preserving point-in-time state)
- Events are immutable — no UPDATE or DELETE on `event_logs`
- The `actor` field on every event identifies whether the action was taken by the system, an AI agent, an officer, or a borrower

### 8.4 RESPA Compliance

- LoanFlow AI does NOT make lending decisions
- The AI does NOT determine loan eligibility, pricing, or approval
- The AI does NOT advise borrowers on rates, lock timing, or loan products
- Document validation is based on completeness and recency — not on the content's impact on loan approval
- The officer is always the final decision-maker (`file_complete` requires explicit officer action)
- No borrower-facing chat or Q&A in v2.0 launch scope (removed Borrower Concierge to avoid advisory risk)

### 8.5 Borrower Portal Security

- Portal access is token-based, not authenticated via Supabase Auth
- Portal tokens are UUIDs stored on `loan_files.portal_token`
- Tokens have expiration dates (`loan_files.portal_expires_at`)
- Portal API routes validate token + expiration before every operation
- Portal uses `createServiceClient()` (service role key) — correct by design, as borrowers do not have Supabase auth accounts
- Portal responses are filtered to exclude internal data (AI rationale, confidence scores, escalation details)
- Rate limiting: document uploads are limited to 20 per session per day per token

---

## 9. Testing Scenarios

### Scenario 1: Happy Path — Conventional Purchase (W-2)

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | Officer | Creates loan (conventional purchase, W-2, CA) | Loan created, checklist generated (5 requirements: pay_stub, w2, bank_statement, government_id, purchase_contract). `doc_workflow_state` = `awaiting_documents`. |
| 2 | Officer | Clicks "Invite Borrower" | Email sent with portal link. |
| 3 | Borrower | Clicks portal link | Portal loads, shows 5 items needed. |
| 4 | Borrower | Uploads pay stub (good quality PDF) | AI classifies (confidence 0.92), validates (all fields present, date within 60 days). Requirement -> `tentatively_satisfied`. Portal shows "Accepted". |
| 5 | Borrower | Uploads W-2 (correct year) | Same flow. 2 of 5 complete. |
| 6 | Borrower | Uploads bank statement (all pages, recent) | Same. 3 of 5. |
| 7 | Borrower | Uploads driver's license (clear photo) | Same. 4 of 5. |
| 8 | Borrower | Uploads purchase contract | Same. 5 of 5. All requirements `tentatively_satisfied`. `doc_workflow_state` -> `review_ready`. Officer notified. |
| 9 | Officer | Clicks "Generate Summary" | Review Agent returns: readiness_grade "B", file_completion_percentage 100, no unresolved issues, recommended action "Mark file complete." |
| 10 | Officer | Clicks "Mark File Complete" | `doc_workflow_state` -> `file_complete`. `review_decisions` record created. |

### Scenario 2: Correction Path — Blurry Pay Stub

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1-3 | — | Same as Scenario 1 | — |
| 4 | Borrower | Uploads blurry phone photo of pay stub | AI classifies as `pay_stub` (confidence 0.78), validation fails: image_quality = "blurry". |
| 5 | System | — | Requirement -> `correction_required`. `doc_workflow_state` -> `corrections_needed`. Correction email sent: "We need a clearer copy of your pay stub. Please take a photo in good lighting or upload the PDF from your payroll system." |
| 6 | Borrower | Re-uploads clear PDF from payroll portal | AI classifies (confidence 0.95), validates (all fields present, date recent). Previous upload -> `superseded`. Requirement -> `tentatively_satisfied`. |
| 7 | — | Continue with remaining docs | — |

### Scenario 3: Escalation Path — Name Mismatch

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1-4 | — | Borrower uploads pay stub (employee: "John Smith") | Validated, requirement satisfied. |
| 5 | Borrower | Uploads W-2 (employee: "John Smith") | Validated. |
| 6 | Borrower | Uploads bank statement (account holder: "John A. Smith Jr.") | AI validates statement. Cross-document name check detects mismatch: "John Smith" vs "John A. Smith Jr." |
| 7 | System | — | Escalation created: `name_mismatch`, severity `high`. Document is still `accepted_tentatively` (NOT rejected). `doc_workflow_state` -> `officer_review_needed`. |
| 8 | Officer | Reviews escalation | Sees description: "Name on bank statement (John A. Smith Jr.) differs from pay stub and W-2 (John Smith)." |
| 9 | Officer | Resolves with notes | "Verified — John A. Smith Jr. is borrower's legal name. Pay stub uses informal name. Confirmed via phone." Escalation -> `resolved`. |
| 10 | System | — | All escalations resolved. `doc_workflow_state` re-evaluated based on requirement states. |

### Scenario 4: Advisory Question Escalation

Note: In v2.0, there is no Borrower Concierge chat agent. However, the `borrower_advisory_question` escalation category is defined for future use. In the interim, this scenario covers the case where the officer manually creates an escalation.

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | Officer | Receives direct email/text from borrower asking "Am I approved?" | Officer logs into LoanFlow AI. |
| 2 | Officer | Creates manual escalation on the loan | Category: `borrower_advisory_question`, severity: `high`, description: "Borrower asked about approval status via text." |
| 3 | Officer | Contacts borrower directly | Discusses loan status within regulatory boundaries. |
| 4 | Officer | Resolves escalation | Notes: "Called borrower, discussed loan status. Explained next steps." Escalation -> `resolved`. |

### Scenario 5: Unresponsive Borrower — 3 Reminders to Escalation

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1-2 | — | Loan created, borrower invited | `doc_workflow_state` = `awaiting_documents`. |
| 3 | System | Day 3: No uploads received | Follow-Up Agent sends Reminder 1: "Hi Sarah, just a friendly reminder — we still need your pay stub, W-2, bank statement, government ID, and purchase contract. Upload them here: {link}." |
| 4 | System | Day 7: Still no uploads | Reminder 2: "Your loan file is almost complete! We need your documents to keep things moving." |
| 5 | System | Day 14: Still no uploads | Reminder 3: "This is our final automated reminder. Please upload your documents or contact your loan officer directly." |
| 6 | System | After Reminder 3 | Escalation created: `borrower_unresponsive`, severity `high`. `doc_workflow_state` -> `borrower_unresponsive`. No more automated reminders. |
| 7 | Officer | Sees escalation in queue | Reviews and calls borrower directly. |
| 8 | Officer | Clicks "Re-engage Borrower" | `doc_workflow_state` -> `awaiting_documents`. Reminder counter reset. |
| 9 | Borrower | Uploads documents within the week | Normal pipeline resumes. |

### Scenario 6: Self-Employed Narrow Path — Tax Return + Schedule C

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | Officer | Creates loan (conventional purchase, self-employed) | Checklist generated with 8 requirements: pay_stub, w2, bank_statement, government_id, purchase_contract + tax_return_1040, schedule_c, profit_loss_statement. |
| 2 | Borrower | Uploads Form 1040 | AI classifies as `tax_return_1040` (confidence 0.85). Validation checks: AGI present, tax year correct. Requirement -> `tentatively_satisfied`. |
| 3 | Borrower | Uploads Schedule C | AI classifies as `schedule_c` (confidence 0.80). Validation checks: net_profit present, tax year matches 1040. Requirement -> `tentatively_satisfied`. |
| 4 | Borrower | Uploads P&L statement | AI classifies as `profit_loss_statement` (confidence 0.72). Confidence < 0.75 threshold. |
| 5 | System | — | Escalation created: `low_confidence_classification`, severity `warning`. Requirement -> `needs_officer_review`. `doc_workflow_state` -> `officer_review_needed`. |
| 6 | Officer | Reviews escalation | Examines the document. Confirms it is a P&L statement from the borrower's accountant. |
| 7 | Officer | Resolves escalation, confirms requirement | Escalation -> `resolved`. Requirement -> `tentatively_satisfied`. |
| 8 | — | Continue with remaining standard docs | — |
| 9 | Officer | Generates review summary | Review Agent flags self-employed scenario: recommended action "Verify income calculation independently — self-employed income validation is narrow in scope." |

---

## 10. Success Criteria

Aligned to Strategy v3.0 success gates for Q2 2026.

### Product Metrics

| Metric | Target | How Measured |
|---|---|---|
| Borrower touchpoints per file | Meaningful reduction vs baseline | Compare reminder count + correction count per file to pre-engine baseline (collected from early users) |
| Auto-classification accuracy | >= 85% correct on first attempt | `document_classified` events where `doc_type` matches `requirement.doc_type` / total classified |
| False positive rate (incorrect acceptance) | < 10% | Documents marked `accepted_tentatively` that officer later rejects / total accepted |
| False negative rate (incorrect rejection) | < 15% | Documents marked `validated_issue_found` that officer later determines were fine / total issue_detected |
| Files processed through engine | 50+ live files | Count of loans where `doc_workflow_state` progressed beyond `awaiting_documents` |
| File completion time | Measurable reduction | Median time from `checklist_generated` to `file_complete` |

### Business Metrics

| Metric | Target | How Measured |
|---|---|---|
| Repeat paying customers | 10+ | Customers who processed 2+ files on a paid plan |
| Trial-to-paid conversion | Track (no target yet) | Users who upgraded after processing a live file |
| Doc collection time reduction | Measurable, reportable | Before/after comparison for early customers |

### Operational Metrics

| Metric | Target | How Measured |
|---|---|---|
| AI API cost per file | < $0.50 per file (Haiku-dominant) | `token_usage` table, grouped by loan |
| System uptime for doc processing | 99.5% | Monitor Document Intelligence pipeline availability |
| Escalation resolution time | < 8 hours for high, < 2 hours for critical | `escalation_created` to `escalation_resolved` timestamps |
| Reminder delivery rate | > 95% | `document_reminders` with `status = 'sent'` or `'delivered'` / total created |

### What "Success" Means

Per Strategy v3.0, the success condition is NOT "we built a lot of AI." It is:

**A solo or small-team LO can move a standard file from intake to submission materially faster, with fewer borrower touchpoints and less processor labor, inside LoanFlow AI than with their previous workflow.**

The File Completion Engine succeeds when officers stop chasing documents manually because the system does it for them — and they trust the results enough to keep using it.

---

*This PRD should be reviewed by engineering and compliance before implementation begins. Migration file `003_file_completion_engine.sql` should be drafted after engineering review.*
