# LoanFlow AI — Product Requirements Document: AI Document Assistant

**Version**: 1.0
**Date**: March 8, 2026
**Status**: Draft for Alignment Review

---

## 1. Overview

### Feature Name

**AI Document Assistant**

### Purpose

Integrate an intelligent, agent-based document processing pipeline into LoanFlow AI that automates document checklist generation, classification, validation, correction requests, and officer review — replacing the manual work of a human loan processor.

### Core Principle

**The workflow engine decides; AI advises.** All state transitions are governed by deterministic rules. AI provides classification, extraction, and summarization. The system never makes a lending decision, never advises a borrower on rates or approval, and never marks a loan as ready without explicit officer confirmation.

### Scope

This PRD covers the integration of four AI agents into the existing LoanFlow AI platform:

1. **Intake Agent** — Generates document checklists when a loan is created
2. **Document Intelligence Agent** — Classifies, extracts, and validates uploaded documents
3. **Borrower Concierge Agent** — Answers borrower questions via the portal
4. **Officer Copilot Agent** — Generates review summaries for officer decision-making

This PRD also covers the workflow state machines, escalation system, notification/reminder service, event model, database changes, API endpoints, and integration points with existing LoanFlow features.

---

## 2. Agent Architecture

### Agent 1: Intake Agent

**Purpose**: Automatically generate the document checklist for a new loan based on loan type and employment type.

**Trigger**: Officer creates a new loan file (POST to loan creation endpoint).

**Input**:
| Field | Type | Source |
|---|---|---|
| `loan_type` | `"purchase" \| "refinance"` | Loan creation form |
| `employment_type` | `"w2"` (future: `"self_employed"`, `"1099"`) | Loan creation form (default: `"w2"`) |
| `property_state` | `string \| null` | Loan creation form (optional) |

**Output**: An array of `document_requirements` rows inserted into the database.

**Document Requirements by Loan Type**:

| Loan Type | Employment | Required Documents |
|---|---|---|
| Purchase (conventional) | W-2 | pay_stub, w2, bank_statement, government_id, purchase_contract |
| Refinance (conventional) | W-2 | pay_stub, w2, bank_statement, government_id |

Future expansion will add FHA, VA, USDA, non-QM loan types and self-employed/1099 employment types with additional document requirements (tax returns, Schedule C, P&L, DD-214, etc.).

**Behavior**:
- **Deterministic**: No AI call is needed. The checklist is a pure lookup from loan_type + employment_type.
- **Idempotent**: If called again for the same loan, it returns the existing checklist without creating duplicates. The system checks for existing `document_requirements` rows before inserting.
- **Initial state**: Each requirement is created with state = `required`. When the borrower is invited and accesses the portal, all requirements transition to `awaiting_upload`.

**Database impact**:
- INSERT into `document_requirements`: one row per required document type
- UPDATE `loan_files.status`: remains `intake` (no change — the existing LoanFlow status is not affected at this point)

**Event emitted**: `loan_checklist_generated`

**Event payload**:
```json
{
  "loan_id": "uuid",
  "loan_type": "purchase",
  "employment_type": "w2",
  "requirements_created": ["pay_stub", "w2", "bank_statement", "government_id", "purchase_contract"],
  "count": 5
}
```

---

### Agent 2: Document Intelligence Agent

**Purpose**: When a document is uploaded (by borrower via portal or officer via dashboard), classify the document type, extract structured fields, run deterministic validation, match to a requirement, and decide the next workflow state.

**Trigger**: File upload received (POST to document upload endpoint).

**Input**:
| Field | Type | Source |
|---|---|---|
| `file` | Binary (PDF, JPG, PNG) | Upload form/API |
| `file_name` | string | Upload metadata |
| `file_size` | number (bytes) | Upload metadata |
| `mime_type` | string | Upload metadata |
| `loan_id` | string (UUID) | URL parameter |
| `requirement_id` | string (UUID) or null | Optional — pre-selected from checklist |

**Output**:
```typescript
{
  doc_type: DocumentType;          // e.g., "pay_stub", "w2", "bank_statement"
  confidence_score: number;        // 0.0 - 1.0
  issues: string[];                // Human-readable issue descriptions
  rationale_summary: string;       // AI's reasoning for classification
  extracted_fields: Record<string, string>;  // Structured data from the document
}
```

**Pipeline (sequential steps)**:

**Step 1: File Precheck** (deterministic, no AI)
- Validate file size: max 20MB
- Validate MIME type: `application/pdf`, `image/jpeg`, `image/png`
- Validate file is not empty (size > 0)
- If precheck fails: document_state -> `precheck_failed`, return error to user immediately
- No event log needed for precheck failures (they are user-facing errors)

**Step 2: Storage Upload** (deterministic)
- Upload file to Supabase Storage bucket `loan-documents`
- Path: `{user_id}/{loan_id}/{document_id}/{original_filename}`
- Store `storage_path` on the uploaded_documents row
- Document state: `received` -> `processing`

**Step 3: AI Classification** (Claude API call)
- Send document image/PDF to Claude with the following prompt structure:

```
System: You are a mortgage document classifier. Analyze the uploaded document and determine its type.

Classify this document as exactly ONE of the following types:
- pay_stub: A pay stub or pay statement showing earnings
- w2: A W-2 tax form showing annual wages
- bank_statement: A bank account statement
- government_id: A government-issued photo ID (driver's license, passport, state ID)
- purchase_contract: A real estate purchase agreement or sales contract
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
  }
}

For extracted_fields, include ALL fields you can identify. For image_quality, rate as: "good", "acceptable", "low", "poor", "blurry", or "unreadable".
```

- Model: `claude-haiku-4-5-20251001` for speed (classification is a fast task)
- If Claude API call fails: document_state -> `processing` (remains), retry up to 2 times with exponential backoff, then escalate as `system_processing_failure`
- Log token usage to `token_usage` table with module = `doc_intelligence`

**Step 4: Confidence Check** (deterministic)
- If `confidence_score >= 0.75`: proceed to Step 5
- If `confidence_score < 0.75`:
  - Document state -> `needs_human_review`
  - Create escalation: category = `low_confidence_classification`, severity = `warning`
  - If `requirement_id` provided: requirement state -> `needs_human_review`
  - STOP pipeline here — officer must review

**Step 5: Suspicious Document Check** (deterministic)
- Scan `rationale_summary` and `extracted_fields` for suspicious keywords: "edited", "photoshop", "altered", "modified", "manipulated", "fake", "forged", "tampered"
- If any found:
  - Document state -> `needs_human_review`
  - Create escalation: category = `suspicious_document`, severity = `critical`
  - Requirement state -> `needs_human_review`
  - STOP pipeline

**Step 6: Deterministic Validation** (no AI)
- Run the appropriate validation function based on `doc_type`:

  **Pay Stub validation**:
  - Required fields: `employee_name`, `employer_name`, `pay_period`
  - Must have `ytd_income` (missing = issue)
  - `pay_period` date must be within 60 days of today (older = issue)
  - `image_quality` must not be "low", "poor", "blurry", or "unreadable"

  **W-2 validation**:
  - Required fields: `employee_name`
  - Must have `tax_year` (missing = issue)
  - `tax_year` must equal current year minus 1 (wrong year = issue)
  - Must have `wages` / Box 1 amount (missing = issue)
  - `image_quality` check

  **Bank Statement validation**:
  - Required fields: `account_holder_name`
  - Must have `statement_date` (missing = issue)
  - `statement_date` must be within 90 days of today (older = issue)
  - Must include all pages: `all_pages` = "true" AND `page_count` >= 2 (partial = issue)
  - `image_quality` check

  **Government ID validation**:
  - Required fields: `full_name`
  - Must have `id_type` (missing = issue: cannot identify ID type)
  - `image_quality` check (must be legible)

  **Purchase Contract validation**:
  - `document_type` must be identifiable as a purchase agreement/sales contract

  **Unknown Document**:
  - Always fails validation with issue: "Document type could not be determined"

- Validation output: `{ valid: boolean, issues: string[], missing_fields: string[], warnings: string[] }`

**Step 7: Requirement Matching** (deterministic)
- If `requirement_id` was provided in the upload: use that requirement directly
- If not provided: search `document_requirements` for this loan where `doc_type` matches the AI classification AND state is in (`awaiting_upload`, `correction_required`)
- If no matching requirement found: document is accepted but unmatched (orphan upload). Log a warning event.

**Step 8: Duplicate Detection** (deterministic)
- If matching requirement already has an `accepted_tentatively` or `validated_ok` uploaded document:
  - Mark the previous document as `superseded`
  - The new upload becomes the active document for this requirement
  - Log event: `document_superseded`

**Step 9: Workflow Decision** (deterministic)
- If validation passed (`valid = true`):
  - Document state -> `validated_ok` -> `accepted_tentatively`
  - Requirement state -> `tentatively_satisfied`
  - Event: `document_validated`

- If validation failed (`valid = false`, issues found):
  - Document state -> `validated_issue_found`
  - Requirement state -> `correction_required`
  - Event: `document_issue_detected`
  - Trigger correction notification to borrower (with specific issues as plain-English instructions)

- If validation produced warnings only:
  - Document state -> `validated_ok` -> `accepted_tentatively`
  - Requirement state -> `tentatively_satisfied`
  - Event: `document_validated` (with warnings in payload)

**Step 10: Loan-Level State Evaluation** (deterministic)
- After processing, evaluate all document_requirements for this loan:
  - If ALL requirements are in (`tentatively_satisfied`, `confirmed_by_officer`, `waived_by_officer`):
    - Loan workflow state -> `awaiting_officer_review`
    - Event: `all_documents_validated`
  - If ANY requirement is in `correction_required`:
    - Loan workflow state -> `borrower_correction_required` (if not already)
  - If ANY requirement is in `needs_human_review`:
    - Loan workflow state -> `human_review_required` (if not already)

**Name Mismatch Detection** (cross-document, deterministic):
- After a document is validated, compare the name on this document against names on other validated documents for the same loan
- Fields to compare: `employee_name` (pay stub, W-2), `account_holder_name` (bank statement), `full_name` (government ID)
- If names do not match (fuzzy comparison allowing for middle name/initial variations):
  - Create escalation: category = `name_mismatch`, severity = `high`
  - Do NOT reject the document — flag it for officer review

**Database impact**:
- INSERT into `uploaded_documents`: one row per upload
- UPDATE `document_requirements.state`: based on validation result
- UPDATE `loan_files` workflow state: based on aggregate requirement states
- INSERT into `escalations`: if confidence < 0.75, suspicious doc, or name mismatch
- INSERT into `event_logs`: document_uploaded, document_classified, document_validated, or document_issue_detected
- INSERT into `token_usage`: AI classification cost tracking

---

### Agent 3: Borrower Concierge Agent

**Purpose**: Answer borrower questions submitted through the portal with helpful, non-advisory responses. Detect and escalate advisory questions and frustration signals.

**Trigger**: Borrower submits a question via the portal (future: chat interface widget on the portal page).

**Input**:
| Field | Type | Source |
|---|---|---|
| `question_text` | string | Borrower's typed question |
| `loan_id` | string (UUID) | Portal context |
| `borrower_name` | string | Portal context |
| `loan_type` | string | Loan record |
| `checklist_status` | object | Current state of all document requirements |

**Output**:
```typescript
{
  response_text: string;           // The answer to show the borrower
  is_advisory: boolean;            // True if the question was about rates, approval, etc.
  escalation_needed: boolean;      // True if an escalation should be created
  escalation_reason: string | null; // Category description if escalation needed
}
```

**Claude API Prompt**:
```
System: You are a helpful assistant for a mortgage borrower who is uploading documents for their loan application. You work for the borrower's loan officer.

ALLOWED topics — answer helpfully:
- How to upload documents
- What documents are needed and why
- Status of their document checklist
- How to fix a document that was rejected (e.g., "upload all pages", "take a clearer photo")
- General mortgage process questions (what happens after documents are submitted)
- Technical help with the portal

FORBIDDEN topics — you must NOT answer these:
- "Am I approved?" or any approval/denial question
- "What rate will I get?" or any rate/pricing question
- "Should I lock my rate?"
- "How much can I borrow?"
- Any question about underwriting decisions
- Any question that constitutes financial or legal advice

If the borrower asks a FORBIDDEN question, respond with:
"That's a great question, but I'm not able to advise on that — your loan officer [officer_name] is the best person to answer. I've flagged this so they can follow up with you directly."

Set is_advisory = true and escalation_needed = true.

If the borrower expresses frustration, anger, or confusion (e.g., "this is ridiculous", "I've uploaded this 3 times", "why is this so complicated"), respond empathetically and set escalation_needed = true with reason "borrower_frustration_signal".

Context for this borrower:
- Name: {borrower_name}
- Loan type: {loan_type}
- Checklist status: {checklist_status_summary}

Respond in JSON:
{
  "response_text": "...",
  "is_advisory": false,
  "escalation_needed": false,
  "escalation_reason": null
}
```

- Model: `claude-haiku-4-5-20251001`

**ALLOWED response topics** (with examples):

| Topic | Example Question | Example Response |
|---|---|---|
| Upload help | "How do I upload my W-2?" | "You can upload your W-2 by clicking the 'Upload' button next to 'W-2 Tax Form' on your checklist. PDF format works best, but you can also take a photo." |
| What's needed | "What documents do I still need?" | "You still need to upload your bank statement and government ID. Everything else looks good!" |
| Status check | "What's the status of my loan?" | "Your loan officer has received 3 of 5 required documents. Once you upload your bank statement and government ID, your officer will review everything." |
| Correction help | "Why was my bank statement rejected?" | "It looks like only the first page was uploaded. Please upload the complete statement — all pages — as a single PDF." |
| General process | "What happens after I upload everything?" | "Once all your documents are uploaded and validated, your loan officer will review the complete file. They'll reach out if anything else is needed." |

**FORBIDDEN response topics** (with escalation):

| Topic | Example Question | Behavior |
|---|---|---|
| Approval status | "Am I approved?" | Polite deflection + escalation (category: `borrower_advisory_question`, severity: `high`) |
| Rate questions | "What rate will I get?" | Polite deflection + escalation |
| Borrowing capacity | "How much can I qualify for?" | Polite deflection + escalation |
| Lock advice | "Should I lock now?" | Polite deflection + escalation |
| Underwriting | "Will the underwriter approve this?" | Polite deflection + escalation |

**Frustration detection**:
- If the response indicates borrower frustration, escalation is created with category = `borrower_frustration_signal`, severity = `warning`
- The AI response should be empathetic: acknowledge the frustration, offer to help, and assure them their officer will be notified

**Database impact**:
- INSERT into `event_logs`: `borrower_question_received` (with question text in payload)
- INSERT into `event_logs`: `borrower_question_answered` (with response in payload)
- INSERT into `escalations`: if advisory question or frustration detected
- INSERT into `token_usage`: AI cost tracking with module = `borrower_concierge`

**Rate limiting**: Max 20 questions per borrower per day to prevent abuse.

---

### Agent 4: Officer Copilot Agent

**Purpose**: Generate a comprehensive, actionable review summary of a loan file's document status for the officer. This is a read-only agent — it does not modify any state.

**Trigger**:
- Officer clicks "Generate Summary" button on the loan detail page
- Automatically triggered when all document requirements reach `tentatively_satisfied` (optional — can be toggled)

**Input** (all read from database):
| Field | Type | Source |
|---|---|---|
| `loan_id` | string (UUID) | Loan detail page |
| `loan_data` | Loan record | `loan_files` table |
| `borrower_data` | Contact record | `contacts` table |
| `document_requirements` | Array of requirements with states | `document_requirements` table |
| `uploaded_documents` | Array of uploads with AI results | `uploaded_documents` table (joined) |
| `escalations` | Array of open/acknowledged escalations | `escalations` table |
| `application_data` | 1003 application data (if available) | `loan_applications` table |

**Output**:
```typescript
{
  loan_id: string;
  overall_status: string;            // "Ready for review", "Issues remain", etc.
  summary: string;                   // 2-3 sentence natural language summary
  unresolved_issues: string[];       // Red items requiring action
  confidence_flags: string[];        // Amber items worth noting
  recommended_actions: string[];     // Blue action items
  document_breakdown: {
    doc_type: string;
    requirement_state: string;
    document_state: string | null;
    confidence_score: number | null;
    issues: string[];
    ai_rationale: string | null;
  }[];
  escalation_summary: {
    open_count: number;
    critical_count: number;
    categories: string[];
  };
}
```

**Claude API Prompt**:
```
System: You are an AI copilot for a mortgage loan officer. Generate a concise, actionable review summary for this loan file.

Be direct and specific. Use bullet points. Flag anything that needs attention.

Format your response as:
1. Overall Assessment (1-2 sentences)
2. Unresolved Issues (red flags — must be addressed before submission)
3. Confidence Flags (things to double-check — not blocking but worth attention)
4. Recommended Actions (specific next steps for the officer)

Loan data:
{serialized loan, requirements, documents, escalations}

Respond in JSON matching the output schema.
```

- Model: `claude-sonnet-4-6` (Sonnet for the summary — this is a higher-stakes, more nuanced task)

**Behavior**:
- Read-only: This agent does not modify any database state
- The summary is NOT persisted to the database — it is generated on demand and returned to the client
- If the officer wants to act on the summary (e.g., "Mark Review Ready"), they use separate action buttons
- The summary includes a document-by-document breakdown table so the officer can drill into any specific document

**Database impact**:
- INSERT into `event_logs`: `officer_summary_generated`
- INSERT into `token_usage`: AI cost tracking with module = `officer_copilot`

---

## 3. Workflow State Machines

### 3.1 Loan File States

LoanFlow AI currently uses the `status` field on `loan_files` with values: `intake`, `verification`, `submitted`, `in_underwriting`, `conditional_approval`, `clear_to_close`, `closed`, `withdrawn`.

The AI Document Assistant introduces a parallel `doc_workflow_state` field that tracks the document collection lifecycle independently. The two state fields coexist:

| `loan_files.status` (existing) | Purpose | Who controls |
|---|---|---|
| `intake` | Loan created, application in progress | Officer |
| `verification` | Documents being collected/verified | System + Officer |
| `submitted` | Submitted to lender | Officer |
| `in_underwriting` | Lender is underwriting | Officer (manual) |
| `conditional_approval` | Conditions issued | Officer |
| `clear_to_close` | All conditions cleared | Officer |
| `closed` | Loan closed | Officer |
| `withdrawn` | Loan withdrawn | Officer |

| `loan_files.doc_workflow_state` (new) | Purpose | Who controls |
|---|---|---|
| `draft` | Loan created, checklist not yet generated | System |
| `loan_created` | Checklist generated, borrower not yet invited | System |
| `borrower_invited` | Portal invite sent, awaiting first access | System |
| `awaiting_borrower_documents` | Borrower accessing portal, uploads pending | System |
| `documents_under_validation` | At least one doc uploaded, AI processing | System |
| `borrower_correction_required` | One or more docs need re-upload | System |
| `borrower_unresponsive` | 3 reminders sent, no response | System |
| `human_review_required` | Suspicious/low-confidence doc needs officer | System |
| `officer_followup_required` | Escalated for direct officer intervention | System |
| `awaiting_officer_review` | All docs validated, waiting for officer sign-off | System |
| `review_ready` | Officer confirmed — file ready for submission | Officer |
| `blocked` | System error or compliance hold | System/Officer |
| `archived` | Loan archived | Officer |

**Relationship between the two state fields**:
- `status` tracks the overall loan lifecycle (application -> underwriting -> closing)
- `doc_workflow_state` tracks the document collection sub-lifecycle
- They are independent: A loan can be in `status = verification` and `doc_workflow_state = awaiting_officer_review`
- When `doc_workflow_state` reaches `review_ready`, the system can auto-advance `status` from `intake` to `verification` (if not already there)
- When `status` advances to `submitted`, the `doc_workflow_state` is no longer actively used (documents are complete)

**Loan Workflow State Transitions**:

```
draft ──[officer creates loan]──> loan_created
  │
  └──[intake agent generates checklist]──> loan_created

loan_created ──[officer invites borrower]──> borrower_invited

borrower_invited ──[borrower accesses portal]──> awaiting_borrower_documents

awaiting_borrower_documents ──[first doc uploaded]──> documents_under_validation
awaiting_borrower_documents ──[3 reminders, no response]──> borrower_unresponsive

documents_under_validation ──[doc fails validation]──> borrower_correction_required
documents_under_validation ──[all docs satisfied]──> awaiting_officer_review
documents_under_validation ──[suspicious/low confidence]──> human_review_required
documents_under_validation ──[system error]──> blocked

borrower_correction_required ──[borrower re-uploads]──> documents_under_validation
borrower_correction_required ──[3 reminders, no response]──> borrower_unresponsive

borrower_unresponsive ──[auto-escalation]──> officer_followup_required

officer_followup_required ──[officer re-engages borrower]──> awaiting_borrower_documents

human_review_required ──[officer resolves, reprocessing]──> documents_under_validation
human_review_required ──[officer resolves, all good]──> awaiting_officer_review
human_review_required ──[officer: borrower must re-upload]──> borrower_correction_required

awaiting_officer_review ──[officer approves]──> review_ready
awaiting_officer_review ──[officer finds issues]──> borrower_correction_required
awaiting_officer_review ──[officer archives]──> archived

review_ready ──[officer archives]──> archived

blocked ──[officer unblocks]──> documents_under_validation

borrower_unresponsive ──[officer archives]──> archived
```

**Transition Rules**:

| From | To | Actor | Guard Condition | Side Effects |
|---|---|---|---|---|
| `draft` | `loan_created` | officer | Loan saved with borrower info | Intake agent runs, checklist generated |
| `loan_created` | `borrower_invited` | system/officer | Borrower has email address | Portal invite email sent |
| `borrower_invited` | `awaiting_borrower_documents` | system/borrower | Borrower clicks portal link | All requirements -> `awaiting_upload` |
| `awaiting_borrower_documents` | `documents_under_validation` | system | At least one document uploaded | Document Intelligence pipeline starts |
| `documents_under_validation` | `borrower_correction_required` | system | Any requirement in `correction_required` | Correction email sent to borrower |
| `documents_under_validation` | `awaiting_officer_review` | system | All requirements satisfied | Officer notification sent |
| `documents_under_validation` | `human_review_required` | system | Any escalation with severity >= high | Officer notification sent |
| `documents_under_validation` | `blocked` | system/officer | System failure or compliance hold | Officer notification sent |
| `borrower_correction_required` | `documents_under_validation` | system/borrower | Borrower uploads replacement doc | Pipeline restarts for new doc |
| `borrower_correction_required` | `borrower_unresponsive` | system | 3 reminders sent, no response | Escalation created |
| `awaiting_borrower_documents` | `borrower_unresponsive` | system | 3 reminders sent, no uploads | Escalation created |
| `borrower_unresponsive` | `officer_followup_required` | system | Auto-escalation | Officer email/SMS notification |
| `officer_followup_required` | `awaiting_borrower_documents` | officer | Officer confirms re-engagement | Reminder counter reset |
| `human_review_required` | `documents_under_validation` | officer | Officer resolves escalation(s) | Re-run validation on flagged docs |
| `human_review_required` | `awaiting_officer_review` | officer | Officer resolves, all docs ok | Summary generation available |
| `human_review_required` | `borrower_correction_required` | officer | Officer determines re-upload needed | Correction email sent |
| `awaiting_officer_review` | `review_ready` | officer | Officer clicks "Mark Review Ready" | Status may advance to `verification` |
| `awaiting_officer_review` | `borrower_correction_required` | officer | Officer finds issues | Correction email sent |
| `awaiting_officer_review` | `archived` | officer | Officer archives | — |
| `review_ready` | `archived` | officer | Officer archives | — |
| `borrower_unresponsive` | `archived` | officer | Officer archives | — |
| `blocked` | `documents_under_validation` | officer | Officer unblocks | Re-process pending docs |

### 3.2 Document Requirement States

```
required
  │
  └──[borrower accesses portal]──> awaiting_upload
       │                              │
       │                              └──[officer waives]──> waived_by_officer
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
            └──[low confidence / suspicious]──> needs_human_review
                  │
                  ├──[officer: looks good]──> tentatively_satisfied
                  ├──[officer: needs correction]──> correction_required
                  └──[officer: waive]──> waived_by_officer
```

**Valid Transitions**:

| From | To | Trigger |
|---|---|---|
| `required` | `awaiting_upload` | Borrower accesses portal |
| `required` | `waived_by_officer` | Officer waives the requirement |
| `awaiting_upload` | `uploaded_pending_validation` | Document uploaded for this requirement |
| `awaiting_upload` | `waived_by_officer` | Officer waives |
| `uploaded_pending_validation` | `tentatively_satisfied` | Validation passes |
| `uploaded_pending_validation` | `correction_required` | Validation fails (issues found) |
| `uploaded_pending_validation` | `needs_human_review` | Low confidence or suspicious |
| `correction_required` | `uploaded_pending_validation` | Borrower re-uploads |
| `needs_human_review` | `tentatively_satisfied` | Officer resolves: document acceptable |
| `needs_human_review` | `correction_required` | Officer resolves: borrower must re-upload |
| `needs_human_review` | `waived_by_officer` | Officer waives |
| `tentatively_satisfied` | `confirmed_by_officer` | Officer explicitly confirms |
| `tentatively_satisfied` | `correction_required` | Officer finds issue on review |

### 3.3 Uploaded Document States

```
received
  │
  ├──[precheck fails]──> precheck_failed (terminal)
  │
  └──[precheck passes]──> processing
       │
       └──[AI classifies]──> classified
            │
            ├──[validation OK]──> validated_ok ──> accepted_tentatively
            │
            ├──[validation issues]──> validated_issue_found
            │
            └──[low confidence / suspicious]──> needs_human_review
                  │
                  └──[officer resolves]──> accepted_tentatively / rejected

  (any active state) ──[new doc uploaded for same requirement]──> superseded
```

**Valid Transitions**:

| From | To | Trigger |
|---|---|---|
| `received` | `precheck_failed` | File fails size/type/empty check |
| `received` | `processing` | File passes precheck, stored |
| `processing` | `classified` | AI returns classification result |
| `classified` | `validated_ok` | Deterministic validation passes |
| `classified` | `validated_issue_found` | Deterministic validation finds issues |
| `classified` | `needs_human_review` | Confidence < 0.75 or suspicious keywords |
| `validated_ok` | `accepted_tentatively` | Automatic (immediate after validation OK) |
| `needs_human_review` | `accepted_tentatively` | Officer accepts the document |
| `needs_human_review` | `rejected` | Officer rejects the document |
| `validated_issue_found` | `rejected` | System marks as rejected (borrower must re-upload) |
| `accepted_tentatively` | `superseded` | New document uploaded for same requirement |
| `validated_ok` | `superseded` | New document uploaded for same requirement |
| `validated_issue_found` | `superseded` | New document uploaded for same requirement |

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

| From | To | Trigger |
|---|---|---|
| `open` | `acknowledged` | Officer clicks "Acknowledge" |
| `open` | `resolved` | Officer clicks "Resolve" with notes |
| `open` | `dismissed` | Officer clicks "Dismiss" with reason |
| `acknowledged` | `resolved` | Officer clicks "Resolve" with notes |
| `acknowledged` | `dismissed` | Officer clicks "Dismiss" with reason |

---

## 4. Escalation System

### 4.1 Escalation Categories

| Category | Description | Example Trigger | Default Severity |
|---|---|---|---|
| `low_confidence_classification` | AI confidence score below 0.75 on document classification | Borrower uploads a blurry document that could be either a pay stub or a bank statement | `warning` |
| `borrower_advisory_question` | Borrower asked a question that constitutes financial advice | "Am I approved for this loan?" | `high` |
| `repeated_failed_upload` | Borrower has uploaded 3+ documents for the same requirement that all failed validation | Borrower uploads phone screenshots instead of PDFs, three times in a row | `warning` |
| `borrower_unresponsive` | 3 automated reminders sent with no borrower action | Borrower has not uploaded any documents in 14 days despite 3 email reminders | `high` |
| `name_mismatch` | Names on different documents do not match | Pay stub says "John Smith" but bank statement says "Jonathan A. Smith" | `high` |
| `contradictory_data` | Data extracted from different documents conflicts | W-2 shows employer as "Acme Corp" but pay stub shows employer as "Beta Inc" | `high` |
| `suspicious_document` | AI rationale includes indicators of document tampering | AI notes "text appears to be digitally edited" or "inconsistent font rendering" | `critical` |
| `unsupported_scenario` | Loan type or document type not yet supported by the system | Self-employed borrower with Schedule C (not yet in our validation rules) | `info` |
| `system_processing_failure` | AI classification or storage failed after retries | Claude API returned error 3 times for the same document | `warning` |
| `borrower_frustration_signal` | Borrower expressed frustration or confusion via Concierge | "This is ridiculous, I've uploaded this document three times!" | `warning` |

### 4.2 Severity Levels

| Severity | Color | SLA (response) | SLA (resolution) | UI Treatment |
|---|---|---|---|---|
| `critical` | Red | Immediate notification (email + in-app banner) | Within 2 hours | Red banner at top of dashboard; red badge on loan card |
| `high` | Orange | Within 1 hour (in-app notification) | Within 8 hours | Orange badge on loan card; appears in escalation queue sorted first after critical |
| `warning` | Amber | Within 4 hours | Within 24 hours | Amber badge; standard queue position |
| `info` | Blue | No notification | Best effort | Blue indicator; lowest priority in queue |

### 4.3 Officer Resolution Flow

1. Officer sees escalation notification (banner for critical, badge for others)
2. Officer navigates to escalation (via dashboard banner, loan detail, or escalation queue page)
3. Officer reviews: category, severity, affected document, AI rationale, confidence score
4. Officer takes action:
   - **Acknowledge**: "I've seen this, working on it" (status -> `acknowledged`)
   - **Resolve**: "Issue addressed" + required notes explaining resolution (status -> `resolved`)
   - **Dismiss**: "Not a real issue" + required notes explaining why (status -> `dismissed`)
5. Resolution may trigger downstream state changes:
   - Resolving a `low_confidence_classification` on a document may transition the requirement to `tentatively_satisfied` (if officer confirms the classification was correct)
   - Resolving a `suspicious_document` may keep the document in `needs_human_review` until the officer explicitly accepts or rejects it
   - Resolving a `borrower_advisory_question` creates a follow-up event reminding the officer to contact the borrower

### 4.4 Auto-Escalation Rules

| Condition | Category Created | Severity |
|---|---|---|
| AI confidence < 0.75 | `low_confidence_classification` | `warning` |
| AI rationale contains suspicious keywords | `suspicious_document` | `critical` |
| 3+ failed uploads for same requirement | `repeated_failed_upload` | `warning` |
| 3 reminders sent, no borrower action | `borrower_unresponsive` | `high` |
| Name mismatch across validated documents | `name_mismatch` | `high` |
| Contradictory employer/income data across docs | `contradictory_data` | `high` |
| Borrower asks advisory question via Concierge | `borrower_advisory_question` | `high` |
| Borrower expresses frustration via Concierge | `borrower_frustration_signal` | `warning` |
| AI API failure after 2 retries | `system_processing_failure` | `warning` |
| Unsupported loan/doc type detected | `unsupported_scenario` | `info` |

---

## 5. Notification & Reminder System

### 5.1 Notification Types

| Trigger | Recipient | Channel | Content |
|---|---|---|---|
| Borrower invited | Borrower | Email | Welcome message + portal link. "Your loan officer [name] has started your loan file. Click here to upload your documents." |
| Document uploaded | Borrower | Email | Confirmation. "Your [doc_type_human_name] has been received. We'll review it shortly." |
| Document validated | Borrower | Email (optional) | "Your [doc_type] has been accepted. [X of Y] documents complete." |
| Document needs correction | Borrower | Email | Specific instructions. "We need a better copy of your [doc_type]. [specific_issue]. Please upload a replacement." |
| All docs validated | Officer | Email + in-app | "All documents for [borrower_name]'s loan have been validated. Ready for your review." |
| Critical escalation | Officer | Email + in-app banner | "[Escalation category] on [borrower_name]'s loan requires immediate attention." |
| High/warning escalation | Officer | In-app only | Badge update on dashboard |
| Borrower unresponsive | Officer | Email | "[Borrower_name] has not responded to 3 document requests. Manual follow-up recommended." |

### 5.2 Reminder Cadence

Reminders are sent to borrowers who have outstanding document requirements in `awaiting_upload` or `correction_required` state.

| Reminder | Timing | Content Tone |
|---|---|---|
| Reminder 1 | Day 3 after invite (or last correction request) | Friendly. "Just a reminder — we're still waiting on [doc_list]. Upload them here: [portal_link]" |
| Reminder 2 | Day 7 | Slightly more urgent. "Your loan file is almost complete! We need [doc_list] to keep things moving." |
| Reminder 3 | Day 14 | Final. "This is our final automated reminder. Please upload [doc_list] or contact your loan officer at [email/phone]." |
| After Reminder 3 | Day 14 | System creates `borrower_unresponsive` escalation. No more automated reminders. |

### 5.3 Reminder Service Rules

- **Idempotency**: Before sending, check `notification_messages` for existing reminder of the same `message_type` sent to this borrower for this loan within the last 24 hours. If found, skip.
- **Quiet hours**: Do not send reminders between 9 PM and 8 AM borrower's local time (inferred from property state, default to ET if unknown).
- **Correction reminders**: When a document is rejected and the borrower needs to re-upload, the correction email counts as "touch 0" — the Day 3/7/14 reminder cadence resets from the correction email timestamp.
- **Opt-out**: If the borrower has no email on file, no reminders are sent — escalate immediately to officer.
- **Channel**: Email via Resend (existing LoanFlow integration). Future: SMS via Twilio for Pro/Team tiers.

### 5.4 Reminder Execution

Reminders are processed by a scheduled function (Supabase Edge Function or Vercel Cron) that runs every hour:

1. Query all loans in `awaiting_borrower_documents` or `borrower_correction_required` state
2. For each loan, check all requirements in `awaiting_upload` or `correction_required`
3. Calculate days since last reminder (or borrower invite, or correction email)
4. If threshold met (3, 7, or 14 days) and no reminder sent in last 24 hours for this loan:
   - Send reminder email
   - Insert into `notification_messages`
   - Insert into `event_logs`: `reminder_sent`
5. If 3 reminders already sent for this loan:
   - Create escalation: `borrower_unresponsive`, severity `high`
   - Transition loan workflow state -> `borrower_unresponsive`

---

## 6. Event Model

### 6.1 Event Types

All events are stored in the `event_logs` table with the following schema:

| Field | Type | Description |
|---|---|---|
| `id` | UUID (auto) | Primary key |
| `loan_id` | UUID (nullable) | Associated loan file |
| `event_type` | string (enum) | Event type identifier |
| `actor` | string (nullable) | Who caused the event: `system`, `officer:{user_id}`, `borrower:{borrower_id}`, `ai:intake`, `ai:doc_intelligence`, `ai:concierge`, `ai:copilot` |
| `payload` | JSONB | Event-specific data |
| `created_at` | timestamptz | When the event occurred |

### 6.2 Event Catalog

| Event Type | Actor | Payload |
|---|---|---|
| `loan_created` | `officer:{id}` | `{ loan_type, borrower_name, employment_type }` |
| `loan_checklist_generated` | `ai:intake` | `{ requirements: [{ doc_type, id }], count }` |
| `borrower_invited` | `system` | `{ borrower_email, portal_token, expires_at }` |
| `borrower_portal_accessed` | `borrower:{id}` | `{ first_access: boolean }` |
| `document_uploaded` | `borrower:{id}` or `officer:{id}` | `{ document_id, file_name, file_size, mime_type, requirement_id }` |
| `document_classified` | `ai:doc_intelligence` | `{ document_id, doc_type, confidence_score, rationale_summary }` |
| `document_validated` | `system` | `{ document_id, requirement_id, valid: true, warnings }` |
| `document_issue_detected` | `system` | `{ document_id, requirement_id, issues, missing_fields }` |
| `document_rejected` | `system` or `officer:{id}` | `{ document_id, reason }` |
| `document_superseded` | `system` | `{ old_document_id, new_document_id, requirement_id }` |
| `requirement_state_changed` | `system` or `officer:{id}` | `{ requirement_id, from_state, to_state, reason }` |
| `document_state_changed` | `system` or `officer:{id}` | `{ document_id, from_state, to_state }` |
| `workflow_transition` | varies | `{ from_state, to_state, reason }` |
| `escalation_created` | `system` or `ai:*` | `{ escalation_id, category, severity, description }` |
| `escalation_acknowledged` | `officer:{id}` | `{ escalation_id }` |
| `escalation_resolved` | `officer:{id}` | `{ escalation_id, resolution_notes }` |
| `escalation_dismissed` | `officer:{id}` | `{ escalation_id, dismiss_reason }` |
| `reminder_sent` | `system` | `{ borrower_email, reminder_number, outstanding_docs }` |
| `borrower_question_received` | `borrower:{id}` | `{ question_text }` |
| `borrower_question_answered` | `ai:concierge` | `{ response_text, is_advisory, escalation_needed }` |
| `officer_summary_generated` | `ai:copilot` | `{ unresolved_count, confidence_flags_count }` |
| `officer_review_submitted` | `officer:{id}` | `{ decision, notes }` |
| `correction_email_sent` | `system` | `{ borrower_email, requirement_id, issues }` |
| `all_documents_validated` | `system` | `{ requirement_count }` |
| `name_mismatch_detected` | `system` | `{ documents_compared, names_found }` |

### 6.3 Event Usage

Events serve three purposes:

1. **Audit trail**: Complete record of everything that happened to a loan file, required for compliance
2. **Activity timeline**: Displayed on the loan detail page as a chronological activity feed
3. **Analytics**: Used to calculate metrics like document collection time, AI accuracy, etc.

---

## 7. Database Changes

### 7.1 New Tables

**`document_requirements`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | Primary key |
| `loan_file_id` | uuid | FK -> loan_files(id), NOT NULL | Parent loan |
| `doc_type` | text | NOT NULL | Document type (pay_stub, w2, etc.) |
| `state` | text | NOT NULL, default 'required' | Current state in the requirement state machine |
| `label` | text | NULL | Human-readable label override (e.g., "Most recent pay stub") |
| `created_at` | timestamptz | NOT NULL, default now() | — |
| `updated_at` | timestamptz | NOT NULL, default now() | — |

Indexes: `(loan_file_id)`, `(loan_file_id, doc_type)`, `(loan_file_id, state)`

**`uploaded_documents`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | Primary key |
| `loan_file_id` | uuid | FK -> loan_files(id), NOT NULL | Parent loan |
| `requirement_id` | uuid | FK -> document_requirements(id), NULL | Matched requirement (null if unmatched) |
| `storage_path` | text | NOT NULL | Path in Supabase Storage |
| `file_name` | text | NOT NULL | Original filename |
| `file_size` | integer | NULL | File size in bytes |
| `mime_type` | text | NULL | MIME type |
| `classification` | text | NULL | AI-determined document type |
| `document_state` | text | NOT NULL, default 'received' | Current state in the document state machine |
| `confidence_score` | numeric(3,2) | NULL | AI confidence (0.00-1.00) |
| `issues` | text[] | default '{}' | Array of validation issue descriptions |
| `ai_rationale` | text | NULL | AI's classification reasoning |
| `extracted_fields` | jsonb | default '{}' | Structured data extracted by AI |
| `created_at` | timestamptz | NOT NULL, default now() | — |
| `updated_at` | timestamptz | NOT NULL, default now() | — |

Indexes: `(loan_file_id)`, `(requirement_id)`, `(loan_file_id, document_state)`, `(loan_file_id, classification)`

**`escalations`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | Primary key |
| `loan_file_id` | uuid | FK -> loan_files(id), NOT NULL | Parent loan |
| `uploaded_document_id` | uuid | FK -> uploaded_documents(id), NULL | Related document (if applicable) |
| `category` | text | NOT NULL | Escalation category |
| `severity` | text | NOT NULL | info, warning, high, critical |
| `status` | text | NOT NULL, default 'open' | open, acknowledged, resolved, dismissed |
| `description` | text | NULL | Human-readable description of the issue |
| `owner` | uuid | FK -> users(id), NULL | Officer who owns this escalation |
| `resolution` | text | NULL | Officer's resolution notes |
| `resolved_at` | timestamptz | NULL | When resolved/dismissed |
| `created_at` | timestamptz | NOT NULL, default now() | — |
| `updated_at` | timestamptz | NOT NULL, default now() | — |

Indexes: `(loan_file_id)`, `(loan_file_id, status)`, `(status, severity)`, `(owner, status)`

**`event_logs`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | Primary key |
| `loan_file_id` | uuid | FK -> loan_files(id), NULL | Parent loan (null for system events) |
| `event_type` | text | NOT NULL | Event type identifier |
| `actor` | text | NULL | Who caused the event |
| `payload` | jsonb | default '{}' | Event-specific data |
| `created_at` | timestamptz | NOT NULL, default now() | — |

Indexes: `(loan_file_id, created_at DESC)`, `(event_type)`, `(created_at DESC)`

**`review_decisions`**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | Primary key |
| `loan_file_id` | uuid | FK -> loan_files(id), NOT NULL | Parent loan |
| `officer_id` | uuid | FK -> users(id), NOT NULL | Officer making the decision |
| `decision` | text | NOT NULL | review_ready, needs_correction, archived |
| `notes` | text | NULL | Officer notes |
| `created_at` | timestamptz | NOT NULL, default now() | — |

Indexes: `(loan_file_id)`, `(loan_file_id, created_at DESC)`

### 7.2 Changes to Existing Tables

**`loan_files`** — Add column:
| Column | Type | Default |
|---|---|---|
| `doc_workflow_state` | text | `'draft'` |

Index: `(user_id, doc_workflow_state)`

**`documents`** (existing) — Add columns:
| Column | Type | Default | Purpose |
|---|---|---|---|
| `confidence_score` | numeric(3,2) | NULL | AI classification confidence |
| `ai_rationale` | text | NULL | AI reasoning for classification |
| `ai_issues` | text[] | '{}' | Issues found during validation |
| `requirement_id` | uuid (FK -> document_requirements) | NULL | Link to the requirement this satisfies |

Note: The existing `documents` table will continue to work as-is for documents uploaded before the AI Document Assistant is enabled. New uploads will flow through the `uploaded_documents` table. The columns above are added to `documents` for backward compatibility and to allow gradual migration.

### 7.3 New Indexes

| Table | Columns | Purpose |
|---|---|---|
| `document_requirements` | `(loan_file_id, state)` | Fast lookup of outstanding requirements |
| `uploaded_documents` | `(loan_file_id, document_state)` | Fast lookup of documents by processing state |
| `escalations` | `(status, severity, created_at)` | Escalation queue sorting |
| `escalations` | `(loan_file_id, status)` | Per-loan escalation lookup |
| `event_logs` | `(loan_file_id, created_at DESC)` | Activity timeline (most recent first) |
| `loan_files` | `(user_id, doc_workflow_state)` | Dashboard filtering by document state |

### 7.4 RLS Policies

**`document_requirements`**:
- SELECT: `auth.uid() = (SELECT user_id FROM loan_files WHERE id = document_requirements.loan_file_id)`
- INSERT/UPDATE/DELETE: Same ownership check

**`uploaded_documents`**:
- SELECT: Same ownership check via loan_files.user_id
- INSERT: Same ownership check (officer uploads) OR service role (portal uploads via service client)
- UPDATE/DELETE: Ownership check

**`escalations`**:
- SELECT/UPDATE: Ownership check via loan_files.user_id
- INSERT: Service role only (system creates escalations)

**`event_logs`**:
- SELECT: Ownership check via loan_files.user_id
- INSERT: Service role only (system creates events)
- UPDATE/DELETE: Never (events are immutable)

**`review_decisions`**:
- SELECT: Ownership check via loan_files.user_id
- INSERT: `auth.uid() = officer_id`

**Portal access**: Portal API routes use the service role client (bypasses RLS), authenticated via portal token. The portal token is validated against `loan_files.portal_token` and `loan_files.portal_expires_at` before any operation.

### 7.5 Migration Strategy

- All changes are **additive** — no columns removed, no tables dropped, no data migrations required
- New tables are created alongside existing tables
- The `doc_workflow_state` column on `loan_files` defaults to `'draft'` — existing loans are unaffected
- Existing document upload flows continue to use the `documents` table unchanged
- The new AI pipeline uses the `uploaded_documents` table
- Migration file: `supabase/migrations/003_ai_document_assistant.sql`
- The migration is safe to apply to production with zero downtime

---

## 8. API Endpoints

### 8.1 New Endpoints

**POST `/api/loans/[loanId]/requirements`** — Generate document checklist (Intake Agent)
- Auth: Required (officer)
- Ownership: loan must belong to authenticated user
- Request body: `{ employment_type?: "w2" }` (optional override)
- Response: `{ requirements: DocumentRequirement[] }`
- Idempotent: Returns existing checklist if already generated

**GET `/api/loans/[loanId]/requirements`** — Get document checklist
- Auth: Required (officer)
- Ownership: loan must belong to authenticated user
- Response: `{ requirements: DocumentRequirement[] }` (joined with uploaded_documents)

**PATCH `/api/loans/[loanId]/requirements/[reqId]`** — Update requirement state (officer actions)
- Auth: Required (officer)
- Ownership: loan must belong to authenticated user
- Request body: `{ action: "waive" | "confirm" | "request_correction" }`
- Response: `{ requirement: DocumentRequirement }`
- Creates event_log entry

**POST `/api/loans/[loanId]/documents/upload`** — Upload document (officer)
- Auth: Required (officer)
- Ownership: loan must belong to authenticated user
- Request body: FormData with `file` + optional `requirement_id`
- Response: `{ document: UploadedDocument }` (includes AI classification result)
- Triggers Document Intelligence pipeline

**POST `/api/portal/[token]/upload`** — Upload document (borrower, via portal)
- Auth: None (token-based)
- Token validation: portal_token must match and not be expired
- Request body: FormData with `file` + optional `requirement_id`
- Response: `{ document: UploadedDocument }` (limited fields — no AI rationale, no confidence score)
- Triggers Document Intelligence pipeline

**GET `/api/portal/[token]/requirements`** — Get document checklist (borrower view)
- Auth: None (token-based)
- Response: `{ requirements: BorrowerRequirementView[] }` (simplified — human-readable labels, no internal states)

**POST `/api/portal/[token]/question`** — Submit question (Borrower Concierge)
- Auth: None (token-based)
- Request body: `{ question: string }`
- Response: `{ answer: string }`
- Rate limited: 20/day per token

**GET `/api/loans/[loanId]/escalations`** — Get escalations for a loan
- Auth: Required (officer)
- Ownership check
- Response: `{ escalations: Escalation[] }`

**PATCH `/api/loans/[loanId]/escalations/[escId]`** — Update escalation (officer actions)
- Auth: Required (officer)
- Ownership check
- Request body: `{ action: "acknowledge" | "resolve" | "dismiss", notes?: string }`
- Response: `{ escalation: Escalation }`
- Notes required for resolve/dismiss

**GET `/api/dashboard/escalations`** — Get all escalations for the officer (queue view)
- Auth: Required (officer)
- Query params: `status`, `severity`, `page`, `limit`
- Response: `{ escalations: EscalationWithLoan[], total: number }`
- Sorted by severity (critical first), then created_at

**POST `/api/loans/[loanId]/summary`** — Generate officer summary (Copilot Agent)
- Auth: Required (officer)
- Ownership check
- Response: `{ summary: OfficerCopilotSummary }`
- No database state changes (read-only + event log)

**POST `/api/loans/[loanId]/review`** — Submit officer review decision
- Auth: Required (officer)
- Ownership check
- Request body: `{ decision: "review_ready" | "needs_correction" | "archived", notes?: string }`
- Response: `{ review_decision: ReviewDecision, loan: LoanFile }`
- Triggers workflow state transition

**GET `/api/loans/[loanId]/events`** — Get activity timeline
- Auth: Required (officer)
- Ownership check
- Query params: `event_type`, `page`, `limit`
- Response: `{ events: EventLog[], total: number }`
- Sorted by created_at DESC

### 8.2 Modified Endpoints

**POST `/api/loans`** (existing loan creation) — Modified to:
- After creating the loan, auto-run the Intake Agent (generate checklist)
- Return the loan with `doc_workflow_state` in the response
- Include `requirements_count` in the response

**GET `/api/loans/[loanId]`** (existing loan detail) — Modified to:
- Include `doc_workflow_state` in response
- Include `requirements_summary: { total, satisfied, pending, correction_needed, human_review }`
- Include `escalations_summary: { open, critical }`

**PATCH `/api/loans/[loanId]`** (existing loan update) — Modified to:
- Allow updating `doc_workflow_state` (only valid transitions)
- Validate transition using workflow rules

### 8.3 Zod Schemas

All new endpoints will have corresponding Zod schemas added to `lib/validation/api-schemas.ts`:

```typescript
// Document upload
const documentUploadSchema = z.object({
  requirement_id: z.string().uuid().optional(),
});

// Requirement actions
const requirementActionSchema = z.object({
  action: z.enum(["waive", "confirm", "request_correction"]),
});

// Escalation actions
const escalationActionSchema = z.object({
  action: z.enum(["acknowledge", "resolve", "dismiss"]),
  notes: z.string().min(1).max(2000).optional(),
}).refine(
  (data) => data.action === "acknowledge" || (data.notes && data.notes.length > 0),
  { message: "Notes required for resolve/dismiss" }
);

// Borrower question
const borrowerQuestionSchema = z.object({
  question: z.string().min(1).max(2000),
});

// Officer review
const officerReviewSchema = z.object({
  decision: z.enum(["review_ready", "needs_correction", "archived"]),
  notes: z.string().max(2000).optional(),
});
```

---

## 9. Integration Points

### 9.1 Conditions System

When a lender issues conditions (e.g., "Provide 2 most recent bank statements"), the existing `conditions` table has a `required_document_type` field. The AI Document Assistant integrates:

- When a `document_requirement` reaches `tentatively_satisfied` or `confirmed_by_officer`, check if any open `conditions` have a matching `required_document_type`
- If match found: Auto-update condition status from `open` or `borrower_notified` to `document_received`
- Officer can still manually validate and advance to `validated` -> `cleared`
- This closes the loop: borrower uploads doc -> AI validates -> condition auto-satisfied

### 9.2 Submission Readiness Score

The existing `submission_readiness_score` on `loan_files` currently factors in document completeness as a rough percentage. With the AI Document Assistant:

- Readiness score formula incorporates document requirement states:
  - Each `confirmed_by_officer` or `waived_by_officer` requirement: full weight
  - Each `tentatively_satisfied`: 80% weight (not yet officer-confirmed)
  - Each `correction_required` or `needs_human_review`: 0% weight
  - Each `awaiting_upload`: 0% weight
- Readiness score also penalizes for open escalations (critical: -20 points, high: -10 points)
- The `readiness_breakdown` JSON field is updated to include a `documents` section with per-requirement scores

### 9.3 Lender Submission

When an officer attempts to create a `lender_submission`:
- Check if `doc_workflow_state` is `review_ready`
- If not: Show warning "Document file is not complete. X requirements are still outstanding."
- Do not hard-block (officer may be submitting with explanations for missing docs), but warn prominently
- Include document checklist status in the `documents_included` JSON on the submission record

### 9.4 Borrower Portal

The existing portal at `/portal/[token]` currently shows a basic document upload interface. With the AI Document Assistant:

- Replace basic upload with the visual checklist (see DESIGN_SYSTEM.md)
- Each checklist item shows status with borrower-friendly language
- Upload flow gives real-time AI feedback
- Correction instructions are borrower-friendly (no technical jargon)
- Progress bar shows completion percentage
- The Borrower Concierge (future) adds a chat widget to the portal

### 9.5 Communications (Messages Table)

The existing `messages` table logs all SMS/email communications. The AI Document Assistant:
- Creates `messages` rows for all automated emails (reminders, corrections, welcome)
- Channel: `email` (future: `sms`)
- Direction: `outbound`
- Trigger type: `ai_document_assistant`
- This allows officers to see all AI-sent communications in the existing messages timeline

### 9.6 Token Usage Tracking

All AI calls are logged to the existing `token_usage` table:
- Module values: `doc_intelligence`, `borrower_concierge`, `officer_copilot`
- Model: `claude-haiku-4-5-20251001` for classification/concierge, `claude-sonnet-4-6` for copilot summaries
- This allows per-loan AI cost calculation and per-module cost monitoring

---

## 10. Security & Compliance

### 10.1 PII Handling in AI Prompts

**What IS sent to Claude**:
- Document images/PDFs (required for classification and extraction)
- Loan type and employment type (for context)
- Document requirement list (for matching context in Copilot)
- Borrower's first name only (for Concierge personalization)

**What is NEVER sent to Claude**:
- Social Security Numbers (even last 4)
- Full dates of birth
- Bank account numbers
- Credit scores
- Income amounts from the 1003 application (AI extracts from documents independently)
- Borrower addresses (not needed for document classification)

**Data minimization principle**: Each AI prompt includes only the minimum data needed for the specific task. Classification prompts include only the document image. Concierge prompts include only the question text and checklist status (no financial data). Copilot prompts include document states and issues but not the actual document images.

### 10.2 Document Storage Security

- Documents stored in Supabase Storage bucket `loan-documents`
- Bucket is PRIVATE (no public access)
- Access via signed URLs with 1-hour expiration
- Storage path includes user_id for partitioning: `{user_id}/{loan_id}/{document_id}/{filename}`
- RLS on `uploaded_documents` table ensures officers can only access their own loans' documents
- Portal access uses service role client with token validation — borrowers can only access their own loan's documents

### 10.3 Audit Trail

- Every state change is logged in `event_logs`
- Every AI classification result is stored on the `uploaded_documents` record
- Every escalation creation, acknowledgment, and resolution is logged
- Every officer decision is recorded in `review_decisions`
- Events are immutable — no UPDATE or DELETE on `event_logs`
- This provides a complete audit trail for regulatory review

### 10.4 RESPA / TILA Compliance

- LoanFlow AI does NOT make lending decisions
- The AI does NOT determine loan eligibility, pricing, or approval
- The AI does NOT advise borrowers on rates, lock timing, or loan products
- The Borrower Concierge explicitly refuses advisory questions and escalates to the officer
- Document validation is based on completeness and recency — not on the content's impact on loan approval
- The officer is always the final decision-maker

### 10.5 Fair Lending

- AI classification is based on document characteristics (format, fields present, dates) — not on borrower demographics
- No protected-class data (race, sex, national origin, religion, marital status, age, disability) is used in any AI decision
- Confidence scoring is document-quality based, not borrower-based
- Escalation categories are objective (low confidence, name mismatch, suspicious document) — none are demographic

---

## 11. Testing Scenarios

### Scenario 1: Happy Path — Full Document Collection

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | Officer | Creates loan (purchase, W-2, CA) | Loan created, checklist generated (5 requirements), `doc_workflow_state` = `loan_created` |
| 2 | Officer | Clicks "Invite Borrower" | Email sent, `doc_workflow_state` = `borrower_invited` |
| 3 | Borrower | Clicks portal link | Portal loads, requirements -> `awaiting_upload`, `doc_workflow_state` = `awaiting_borrower_documents` |
| 4 | Borrower | Uploads pay stub (good quality PDF) | AI classifies (confidence 0.92), validates (all fields present, date recent), requirement -> `tentatively_satisfied` |
| 5 | Borrower | Uploads W-2 (correct year) | Same as above. 2 of 5 complete. |
| 6 | Borrower | Uploads bank statement (all pages, recent) | Same. 3 of 5. |
| 7 | Borrower | Uploads driver's license (clear photo) | Same. 4 of 5. |
| 8 | Borrower | Uploads purchase contract | Same. 5 of 5. All requirements satisfied. `doc_workflow_state` -> `awaiting_officer_review`. Officer notified. |
| 9 | Officer | Clicks "Generate Summary" | Copilot returns: "All 5 documents validated. No issues. Recommend: Mark review ready." |
| 10 | Officer | Clicks "Mark Review Ready" | `doc_workflow_state` -> `review_ready`. Review decision recorded. |

### Scenario 2: Correction Path — Blurry Document

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1-3 | — | Same as Scenario 1 | — |
| 4 | Borrower | Uploads blurry photo of pay stub | AI classifies as pay_stub (confidence 0.78), validation fails: "Image quality is too low to read required fields clearly." |
| 5 | System | — | Requirement -> `correction_required`. `doc_workflow_state` -> `borrower_correction_required`. Correction email sent to borrower with: "We need a clearer copy of your pay stub. Please take a photo in good lighting or upload the PDF from your payroll system." |
| 6 | Borrower | Re-uploads clear PDF | AI classifies (confidence 0.95), validates (all fields present). Previous upload -> `superseded`. Requirement -> `tentatively_satisfied`. |
| 7 | — | Continue with remaining docs | — |

### Scenario 3: Escalation Path — Name Mismatch

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1-5 | — | Borrower uploads pay stub (employee: "John Smith") and W-2 (employee: "John Smith") | Both validated. |
| 6 | Borrower | Uploads bank statement (account holder: "John A. Smith Jr.") | AI validates statement itself. Cross-document name check detects mismatch: "John Smith" vs "John A. Smith Jr." |
| 7 | System | — | Escalation created: category `name_mismatch`, severity `high`. Officer notified. Document still `accepted_tentatively` (not rejected). |
| 8 | Officer | Reviews escalation | Sees: "Name on bank statement (John A. Smith Jr.) differs from name on pay stub and W-2 (John Smith)." |
| 9 | Officer | Clicks "Resolve" with notes | "Verified — John A. Smith Jr. is the borrower's legal name. Pay stub uses informal name. Confirmed via phone." Escalation -> `resolved`. |

### Scenario 4: Advisory Question — Borrower Asks About Approval

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | Borrower | Types in portal: "Am I going to be approved for this loan?" | — |
| 2 | System | Concierge processes question | Response: "That's a great question, but I'm not able to advise on that — your loan officer Sarah is the best person to answer. I've flagged this so they can follow up with you directly." |
| 3 | System | — | Escalation created: category `borrower_advisory_question`, severity `high`. Event logged. |
| 4 | Officer | Sees escalation in queue | Reviews and resolves: "Called borrower, discussed loan status." |

### Scenario 5: Unresponsive Borrower

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1-2 | — | Loan created, borrower invited | — |
| 3 | System | Day 3: No uploads | Reminder 1 sent: "Just a reminder — we're still waiting on your documents." |
| 4 | System | Day 7: Still no uploads | Reminder 2 sent: "Your loan file is almost complete! We need your documents to keep things moving." |
| 5 | System | Day 14: Still no uploads | Reminder 3 sent: "This is our final automated reminder." |
| 6 | System | After Reminder 3 | Escalation created: `borrower_unresponsive`, severity `high`. `doc_workflow_state` -> `borrower_unresponsive`. No more automated reminders. |
| 7 | System | Auto-escalation | `doc_workflow_state` -> `officer_followup_required`. Officer emailed: "[Borrower] has not responded to 3 document requests." |
| 8 | Officer | Calls borrower directly | Borrower was traveling, will upload this week. Officer clicks "Re-engage Borrower." |
| 9 | System | — | `doc_workflow_state` -> `awaiting_borrower_documents`. Reminder counter reset. |

### Scenario 6: Suspicious Document — Critical Escalation

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | Borrower | Uploads a W-2 that AI detects may be altered | AI classifies as W-2 (confidence 0.88), but rationale includes: "Font rendering is inconsistent across the document, suggesting possible digital editing." |
| 2 | System | Suspicious keyword detected ("editing") | Document state -> `needs_human_review`. Escalation created: `suspicious_document`, severity `critical`. |
| 3 | Officer | Sees RED BANNER on dashboard | "CRITICAL: Suspicious document detected on [Borrower]'s loan. Immediate review required." |
| 4 | Officer | Reviews document and AI rationale | Downloads the document, reviews carefully. |
| 5a | Officer | Determines it's legitimate | Resolves escalation: "Document is a scanned copy from employer's payroll system. Font inconsistency due to scan quality." Accepts document. |
| 5b | Officer | Determines it's fraudulent | Rejects document. Resolves escalation: "Document appears altered. Contacting borrower for original." Requirement -> `correction_required`. |

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Document Requirement** | A specific document type that must be provided for a loan (e.g., "pay_stub for conventional purchase") |
| **Uploaded Document** | A specific file uploaded by a borrower or officer, linked to a requirement |
| **Classification** | AI determining what type of document was uploaded |
| **Extraction** | AI pulling structured data fields from a document |
| **Validation** | Deterministic rule-based checks on extracted fields (dates, field presence, etc.) |
| **Confidence Score** | AI's self-reported certainty (0-1) about its classification |
| **Escalation** | A flagged issue requiring human (officer) attention |
| **Tentatively Satisfied** | A requirement where the AI has validated the document but the officer has not yet confirmed |
| **Superseded** | A previously accepted document that has been replaced by a newer upload |

---

*This PRD should be reviewed by engineering, design, and compliance before implementation begins.*
