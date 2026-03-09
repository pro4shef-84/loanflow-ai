# LoanFlow AI — Design System & UX Specification: AI Document Assistant

**Version**: 1.0
**Date**: March 8, 2026
**Status**: Draft for Alignment Review

---

## 1. Design Philosophy

### Principles

**1. Premium & Professional**
LoanFlow AI handles sensitive financial documents. Every pixel must communicate trust, competence, and security. The aesthetic is clean, restrained, and modern — not playful or casual. Think private banking app, not consumer fintech.

**2. Trust-First**
Every element builds confidence. AI results are presented with transparency (showing rationale, not just verdicts). Officer-facing UI shows confidence scores and reasoning. Borrower-facing UI shows clear, simple status without exposing system internals.

**3. Triage-Oriented**
The most urgent items surface first. Critical escalations are impossible to miss. The dashboard prioritizes what needs attention now, not what is going well. Green items recede; red items advance.

**4. Mobile-First Borrower Portal**
Borrowers interact primarily on phones — uploading documents via camera, checking status during lunch breaks. The portal is designed mobile-first with minimum 48px touch targets, thumb-reachable primary actions, and camera-optimized upload flows.

**5. Zero Jargon for Borrowers**
Borrowers never see: `pay_stub`, `precheck_failed`, `validated_issue_found`, `confidence_score`, `awaiting_upload`, or any internal state name. They see: "Your most recent pay stub", "We need a clearer copy", "Accepted", "Under review", and "Needed".

**6. Human Control Visible**
The officer must always feel in control. AI results are recommendations, not final decisions. Every AI-generated result has an override. The "Mark Review Ready" button is a deliberate officer action — never automatic.

---

## 2. Design System Updates

### 2.1 Color Palette

**Existing LoanFlow Colors (preserved)**:

| Name | Hex | Usage |
|---|---|---|
| Navy 900 | `#0F172A` | Sidebar, primary text |
| Navy 800 | `#1E293B` | Card headers, active nav |
| Navy 700 | `#334155` | Secondary text |
| White | `#FFFFFF` | Card backgrounds, page background |
| Slate 50 | `#F8FAFC` | Page background (subtle) |
| Slate 100 | `#F1F5F9` | Dividers, borders |
| Blue 600 | `#2563EB` | Primary actions, links |
| Blue 700 | `#1D4ED8` | Primary button hover |

**New Colors for Document States**:

| Name | Hex | Usage |
|---|---|---|
| Success Green | `#16A34A` | Document accepted, requirement satisfied, validation passed |
| Success Green Light | `#DCFCE7` | Success badge background |
| Warning Amber | `#D97706` | Correction needed, warnings, confidence flags |
| Warning Amber Light | `#FEF3C7` | Warning badge background |
| Error Red | `#DC2626` | Critical escalation, document rejected, validation failed |
| Error Red Light | `#FEE2E2` | Error badge/banner background |
| Info Blue | `#2563EB` | Under review, recommended actions, info severity |
| Info Blue Light | `#DBEAFE` | Info badge background |
| Purple | `#7C3AED` | Human review needed, escalation acknowledged |
| Purple Light | `#EDE9FE` | Purple badge background |
| Neutral Gray | `#6B7280` | Awaiting upload, not started, disabled |
| Neutral Gray Light | `#F3F4F6` | Neutral badge background |

**Escalation Severity Colors**:

| Severity | Badge BG | Badge Text | Banner BG |
|---|---|---|---|
| Critical | `#FEE2E2` | `#DC2626` | `#FEF2F2` with `#DC2626` left border |
| High | `#FFEDD5` | `#C2410C` | — (no banner, badge only) |
| Warning | `#FEF3C7` | `#D97706` | — |
| Info | `#DBEAFE` | `#2563EB` | — |

### 2.2 Typography Hierarchy

| Level | Font | Size | Weight | Usage |
|---|---|---|---|---|
| H1 / Page Title | Inter | 24px / 1.5rem | 700 (Bold) | Page headings ("John Smith's Loan") |
| H2 / Section Title | Inter | 20px / 1.25rem | 600 (Semibold) | Section headers ("Document Checklist") |
| H3 / Card Title | Inter | 16px / 1rem | 600 (Semibold) | Card headers, tab labels |
| Body | Inter | 14px / 0.875rem | 400 (Regular) | Body text, descriptions |
| Body Small | Inter | 13px / 0.8125rem | 400 (Regular) | Secondary info, timestamps |
| Caption | Inter | 12px / 0.75rem | 500 (Medium) | Badges, labels, metadata |
| Mono | JetBrains Mono | 13px | 400 | Confidence scores, technical data (officer view only) |

### 2.3 Spacing System

Based on a 4px grid:

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Inline spacing, icon-to-text gap |
| `space-2` | 8px | Tight element spacing, badge padding |
| `space-3` | 12px | Standard element gap |
| `space-4` | 16px | Card internal padding, section gap |
| `space-5` | 20px | Between related sections |
| `space-6` | 24px | Card padding, major section gap |
| `space-8` | 32px | Between major page sections |
| `space-10` | 40px | Page-level vertical rhythm |

### 2.4 Component Specifications

**Badges** (used for states and categories):
- Height: 24px
- Padding: 4px 8px
- Border radius: 6px
- Font: Caption (12px, weight 500)
- Always includes text (never color-only)

**Cards**:
- Background: White
- Border: 1px solid Slate 100
- Border radius: 12px
- Shadow: `0 1px 3px rgba(0,0,0,0.05)`
- Padding: 24px
- Hover (if interactive): Shadow -> `0 2px 8px rgba(0,0,0,0.08)`

**Buttons**:
- Primary: Blue 600 bg, white text, 40px height, 12px 20px padding, 8px border-radius
- Secondary: White bg, Navy 700 text, 1px Navy 200 border, same dimensions
- Destructive: Error Red bg, white text, same dimensions
- Ghost: Transparent bg, Blue 600 text, same dimensions
- Disabled: 50% opacity, cursor not-allowed
- Mobile minimum touch target: 48px height

**Banners**:
- Full-width, positioned above page content (below header)
- Height: auto (padding 12px 16px)
- Left border: 4px solid (severity color)
- Background: severity light color
- Icon + text + dismiss button
- Critical: Red banner, cannot be auto-dismissed (must acknowledge)
- Warning/Info: Can be dismissed

---

## 3. Dashboard Changes (Officer View)

### 3.1 Main Dashboard Page — Enhancements

**KPI Row — New Cards**:

The existing dashboard KPI row shows cards for Active Loans, Pipeline Value, etc. Add two new cards:

**Escalation Card**:
```
┌─────────────────────────────┐
│  ⚠ Escalations              │
│  ┌──────┐                   │
│  │  3   │  open             │
│  └──────┘                   │
│  1 critical · 2 high        │
│  View Queue →               │
└─────────────────────────────┘
```
- Count: Number of escalations in `open` or `acknowledged` state
- Sub-text: Breakdown by severity (only show critical and high counts)
- Color: Card border turns red if any critical escalations exist
- Link: "View Queue" navigates to `/dashboard/escalations`

**Documents Pending Card**:
```
┌─────────────────────────────┐
│  📄 Documents Pending        │
│  ┌──────┐                   │
│  │  7   │  awaiting action  │
│  └──────┘                   │
│  3 uploads · 4 corrections  │
│  View Loans →               │
└─────────────────────────────┘
```
- Count: Total requirements across all loans in `uploaded_pending_validation`, `correction_required`, or `needs_human_review` state
- Sub-text: Breakdown by category
- Link: Filters loan list to show loans with pending document actions

**Urgent Escalation Banner**:

When any escalation exists with severity = `critical` and status = `open`:

```
┌──────────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: Suspicious document detected on John Smith's   │
│    loan file. Immediate review required.           [Review]  │
└──────────────────────────────────────────────────────────────┘
```

- Position: Above KPI row, below header
- Style: Error Red Light background, Error Red left border (4px)
- Content: Escalation description + loan borrower name
- Action: "Review" button navigates to the loan detail's escalation section
- Multiple critical escalations: Stack vertically (max 3 visible, "+N more" link)
- Dismissing: Officer must Acknowledge or Resolve — cannot simply dismiss the banner

**Loan Cards — State Indicators**:

Each loan card in the pipeline view shows the `doc_workflow_state` as a secondary badge:

| State | Badge | Color |
|---|---|---|
| `draft` | "No Checklist" | Gray |
| `loan_created` | "Checklist Ready" | Gray |
| `borrower_invited` | "Invited" | Blue |
| `awaiting_borrower_documents` | "Awaiting Docs" | Amber |
| `documents_under_validation` | "Validating" | Blue |
| `borrower_correction_required` | "Correction Needed" | Amber |
| `borrower_unresponsive` | "Unresponsive" | Red |
| `human_review_required` | "Review Required" | Purple |
| `officer_followup_required` | "Follow Up" | Red |
| `awaiting_officer_review` | "Ready for Review" | Green |
| `review_ready` | "Review Ready" | Green (filled) |
| `blocked` | "Blocked" | Red |
| `archived` | "Archived" | Gray |

### 3.2 Loan Detail Page — New Sections

The loan detail page currently uses tabs. Add the following new tabs/sections:

#### Tab: Document Checklist

Replaces the existing basic document list. This is the primary new tab.

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│  Document Checklist                          [Invite Borrower] │
│  4 of 5 complete (80%)                                       │
│  ████████████████████░░░░                                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ✅ Pay Stub          Accepted       [View] [Replace]   │  │
│  │    Confidence: 0.95 · Validated Mar 5                  │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ ✅ W-2 Tax Form      Accepted       [View] [Replace]   │  │
│  │    Confidence: 0.91 · Validated Mar 5                  │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ ✅ Bank Statement    Accepted       [View] [Replace]   │  │
│  │    Confidence: 0.88 · Validated Mar 6                  │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ ⚠️  Government ID    Needs Correction  [Upload]         │  │
│  │    Issue: ID image is not legible                      │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ ✅ Purchase Contract Accepted       [View] [Replace]   │  │
│  │    Confidence: 0.82 · Validated Mar 7                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [+ Add Custom Requirement]  [Generate AI Summary]           │
└──────────────────────────────────────────────────────────────┘
```

**Row Components**:

Each requirement row contains:
- **Icon**: Color-coded by state (green checkmark, amber warning, red X, purple eye, gray circle)
- **Label**: Human-readable document type name
- **State Badge**: Color-coded badge (see table below)
- **Actions**: View (opens document), Replace (upload new), Upload (if awaiting)
- **Expandable detail**: Click row to expand and see:
  - Uploaded file name and size
  - AI classification result and confidence score (displayed as "AI Confidence: 95%")
  - AI rationale text
  - Validation issues (if any)
  - Upload timestamp
  - Previous uploads (if superseded) — collapsed accordion

**State Badge Mapping** (officer view):

| Requirement State | Badge Text | Badge Color |
|---|---|---|
| `required` | "Required" | Gray |
| `awaiting_upload` | "Awaiting Upload" | Gray |
| `uploaded_pending_validation` | "Processing..." | Blue |
| `tentatively_satisfied` | "Accepted" | Green |
| `correction_required` | "Needs Correction" | Amber |
| `needs_human_review` | "Needs Review" | Purple |
| `confirmed_by_officer` | "Confirmed" | Green (filled/solid) |
| `waived_by_officer` | "Waived" | Gray (strikethrough) |

**Row Actions by State**:

| State | Available Actions |
|---|---|
| `required` / `awaiting_upload` | Upload, Waive |
| `uploaded_pending_validation` | (none — processing) |
| `tentatively_satisfied` | View, Confirm, Request Correction, Replace |
| `correction_required` | Upload (on behalf of borrower), View (previous upload) |
| `needs_human_review` | View, Accept, Reject, Waive |
| `confirmed_by_officer` | View, Replace |
| `waived_by_officer` | (View waiver note) |

#### Panel: AI Review Summary

Triggered by the "Generate AI Summary" button. Appears as a slide-out panel or modal.

```
┌──────────────────────────────────────────────────────────────┐
│  AI Review Summary                               [Close ×]  │
│  Generated Mar 8, 2026 at 2:14 PM                           │
│                                                              │
│  ┌── Overall Assessment ──────────────────────────────────┐  │
│  │ All 5 required documents have been validated. No       │  │
│  │ unresolved issues remain. The file appears ready for   │  │
│  │ lender submission.                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  🔴 Unresolved Issues (0)                                    │
│  None                                                        │
│                                                              │
│  🟡 Confidence Flags (1)                                     │
│  • Bank statement confidence at 78% — close to threshold.   │
│    Consider manual verification.                             │
│                                                              │
│  🔵 Recommended Actions (1)                                  │
│  • Mark file as review-ready for lender submission.          │
│                                                              │
│  ┌── Document Breakdown ──────────────────────────────────┐  │
│  │ Doc Type        │ State     │ Confidence │ Issues      │  │
│  │ Pay Stub        │ Accepted  │ 95%        │ None        │  │
│  │ W-2             │ Accepted  │ 91%        │ None        │  │
│  │ Bank Statement  │ Accepted  │ 78%        │ None        │  │
│  │ Government ID   │ Accepted  │ 89%        │ None        │  │
│  │ Purchase Cont.  │ Accepted  │ 82%        │ None        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [Mark Review Ready]                 [Request Corrections]   │
└──────────────────────────────────────────────────────────────┘
```

**Content Sections**:
- **Overall Assessment**: 1-3 sentences from the Copilot Agent. Plain language.
- **Unresolved Issues** (red section): Items that MUST be addressed before submission. Each is a bullet with specific description.
- **Confidence Flags** (amber section): Items worth noting but not blocking. Low confidence scores, minor warnings.
- **Recommended Actions** (blue section): Specific next steps the officer should take.
- **Document Breakdown**: Table with one row per requirement showing doc type, state, confidence, and issues.

**Action Buttons**:
- "Mark Review Ready" — only enabled when unresolved issues count = 0. Triggers `doc_workflow_state` -> `review_ready`.
- "Request Corrections" — Opens a form to specify which requirements need correction. Sends correction emails.

#### Section: Escalations

Displayed below the document checklist tab content (or as its own tab if many escalations).

```
┌──────────────────────────────────────────────────────────────┐
│  Escalations (2 open)                                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔴 CRITICAL · Suspicious Document                      │  │
│  │ W-2 document may have been digitally altered.          │  │
│  │ Created: Mar 7, 2:30 PM                                │  │
│  │ [Acknowledge]  [Resolve]  [Dismiss]                    │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 🟡 WARNING · Low Confidence Classification             │  │
│  │ Bank statement classified at 72% confidence.           │  │
│  │ Created: Mar 6, 4:15 PM · Acknowledged                │  │
│  │ [Resolve]  [Dismiss]                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ▾ Resolved (3) — click to expand                            │
└──────────────────────────────────────────────────────────────┘
```

**Each Escalation Card**:
- Severity badge (colored dot + text)
- Category badge (text)
- Description (1-2 sentences)
- Created timestamp
- Status (if acknowledged)
- Action buttons based on current state
- If associated with a specific document: link to view that document

**Resolve/Dismiss Flow**:
- Clicking "Resolve" or "Dismiss" opens an inline text area for required notes
- Officer must type at least 10 characters explaining their decision
- After submission: escalation state updates, event logged, card moves to "Resolved" section

**Resolved Section**:
- Collapsed by default (accordion)
- Shows resolved/dismissed escalations with resolution notes and timestamp
- Sorted by resolved_at DESC

#### Section: Activity Timeline

Displayed as a vertical timeline on the loan detail page (dedicated tab or sidebar).

```
┌──────────────────────────────────────────────────────────────┐
│  Activity Timeline                    [Filter: All Types ▾]  │
│                                                              │
│  ● Mar 8, 2:14 PM — AI                                      │
│  │ Officer summary generated                                 │
│  │                                                           │
│  ● Mar 7, 3:00 PM — System                                  │
│  │ Escalation created: Suspicious document (W-2)             │
│  │                                                           │
│  ● Mar 7, 2:30 PM — AI                                      │
│  │ W-2 classified (confidence: 0.88) — validation passed     │
│  │                                                           │
│  ● Mar 7, 2:30 PM — Borrower                                │
│  │ Document uploaded: W2_2025_JSmith.pdf                     │
│  │                                                           │
│  ● Mar 6, 4:15 PM — AI                                      │
│  │ Bank statement classified (confidence: 0.72) — escalated  │
│  │                                                           │
│  ● Mar 5, 10:00 AM — System                                 │
│  │ Borrower accessed portal for the first time               │
│  │                                                           │
│  ● Mar 4, 9:30 AM — System                                  │
│  │ Borrower invited — portal link sent to john@example.com   │
│  │                                                           │
│  ● Mar 4, 9:28 AM — AI                                      │
│  │ Document checklist generated (5 requirements)             │
│  │                                                           │
│  ● Mar 4, 9:28 AM — Officer                                 │
│  │ Loan created                                              │
│  └                                                           │
└──────────────────────────────────────────────────────────────┘
```

**Timeline Entry Components**:
- **Dot**: Color-coded by actor (blue = AI, green = system, navy = officer, amber = borrower)
- **Timestamp**: Relative for recent (e.g., "2 hours ago"), absolute for older
- **Actor Label**: "AI", "System", "Officer", "Borrower"
- **Description**: Human-readable event summary (no technical jargon)
- **Expandable detail**: Some events have expandable detail (e.g., AI classification shows confidence and rationale)

**Filter**: Dropdown to filter by event type category:
- All
- Document Events
- Escalations
- System Events
- Communications

### 3.3 New Page: Escalation Queue

**Route**: `/dashboard/escalations`

**Purpose**: Central queue for all open escalations across all loans.

```
┌──────────────────────────────────────────────────────────────┐
│  Escalation Queue                                            │
│  12 open · 3 critical · 5 high · 4 warning                  │
│                                                              │
│  [Filter: All Categories ▾]  [Filter: All Severities ▾]     │
│  [Filter: Open ▾]           [Bulk: Acknowledge Selected]     │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ □ │ John Smith's Loan │ 🔴 CRITICAL │ Suspicious Doc    ││
│  │   │ W-2 may be altered │ Mar 7 2:30 PM │ Open           ││
│  │   │                                        [Review →]   ││
│  ├──────────────────────────────────────────────────────────┤│
│  │ □ │ Jane Doe's Loan   │ 🟠 HIGH     │ Name Mismatch    ││
│  │   │ Pay stub vs bank statement │ Mar 7 1:00 PM │ Open   ││
│  │   │                                        [Review →]   ││
│  ├──────────────────────────────────────────────────────────┤│
│  │ □ │ Bob Wilson's Loan │ 🟠 HIGH     │ Unresponsive     ││
│  │   │ 3 reminders sent, no response │ Mar 6 │ Acknowledged││
│  │   │                                        [Review →]   ││
│  ├──────────────────────────────────────────────────────────┤│
│  │ □ │ Alice Chen's Loan │ 🟡 WARNING  │ Low Confidence   ││
│  │   │ Bank statement at 68% │ Mar 6 4:15 PM │ Open       ││
│  │   │                                        [Review →]   ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  Showing 1-10 of 12                        [< 1 2 >]        │
└──────────────────────────────────────────────────────────────┘
```

**Table Columns**:
| Column | Content |
|---|---|
| Checkbox | For bulk actions |
| Loan | Borrower name + loan identifier (clickable — navigates to loan detail) |
| Severity | Colored badge (Critical, High, Warning, Info) |
| Category | Category label (Suspicious Document, Name Mismatch, etc.) |
| Description | Brief description (1 line) |
| Created | Timestamp |
| Status | Current status badge (Open, Acknowledged) |
| Action | "Review" link -> navigates to loan detail escalation section |

**Sorting**: Default sort by severity (critical first, then high, warning, info), then by created_at (oldest first within each severity).

**Filters**:
- Category: All, Suspicious Document, Name Mismatch, Low Confidence, Unresponsive, etc.
- Severity: All, Critical, High, Warning, Info
- Status: Open (default), Acknowledged, All Open

**Bulk Actions**:
- Select multiple escalations via checkboxes
- "Acknowledge Selected" — marks all as acknowledged

---

## 4. Borrower Portal Changes

### 4.1 Portal Checklist View — Enhanced

The borrower portal at `/portal/[token]` is redesigned with a friendly, non-intimidating checklist view.

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐    │
│  │  LoanFlow                                            │    │
│  │  Welcome, John! Here's what we need for your loan.   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Your Progress                                               │
│  ██████████████░░░░░░░░ 3 of 5 complete (60%)               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ✅ Your most recent pay stub                           │  │
│  │    Accepted                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ✅ Your 2025 W-2 tax form                              │  │
│  │    Accepted                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ✅ Your most recent bank statement                     │  │
│  │    Accepted                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ⚠️  A photo of your driver's license or passport       │  │
│  │    Needs a clearer copy                                │  │
│  │    "Please take a photo in good lighting. Make sure    │  │
│  │     all text is readable and no edges are cut off."    │  │
│  │                                                        │  │
│  │    ┌────────────────────────────────┐                  │  │
│  │    │     📷 Upload a New Copy       │                  │  │
│  │    └────────────────────────────────┘                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ○ Your signed purchase contract                        │  │
│  │    Needed                                              │  │
│  │                                                        │  │
│  │    ┌────────────────────────────────┐                  │  │
│  │    │     📎 Upload Document         │                  │  │
│  │    └────────────────────────────────┘                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Questions? Your loan officer Sarah Johnson is        │    │
│  │  available at sarah@example.com or (555) 123-4567.    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Human-Readable Document Labels**:

| Internal doc_type | Borrower Label |
|---|---|
| `pay_stub` | "Your most recent pay stub" |
| `w2` | "Your [year] W-2 tax form" |
| `bank_statement` | "Your most recent bank statement (all pages)" |
| `government_id` | "A photo of your driver's license or passport" |
| `purchase_contract` | "Your signed purchase contract" |

**Borrower-Facing Status Labels**:

| Internal State | Borrower Label | Icon | Color |
|---|---|---|---|
| `awaiting_upload` | "Needed" | Gray circle | Gray text |
| `uploaded_pending_validation` | "Uploaded — Under Review" | Blue spinner | Blue text |
| `tentatively_satisfied` | "Accepted" | Green checkmark | Green text |
| `confirmed_by_officer` | "Accepted" | Green checkmark | Green text |
| `correction_required` | "Needs a clearer copy" / specific message | Amber warning | Amber text |
| `needs_human_review` | "Under review by your loan officer" | Blue eye | Blue text |
| `waived_by_officer` | (hidden from borrower — row not shown) | — | — |

**Progress Bar**:
- Position: Top of checklist, below welcome message
- Style: Rounded bar, green fill, gray background
- Label: "X of Y complete (Z%)"
- Calculation: Count requirements in (`tentatively_satisfied`, `confirmed_by_officer`, `waived_by_officer`) / total requirements
- Waived requirements are excluded from the count (both numerator and denominator)

**Document Cards**:
- Each requirement is a card (not a table row — better for mobile)
- Accepted cards: Collapsed (just label + status), green left border
- Correction needed cards: Expanded by default, amber left border, correction instructions visible
- Needed cards: Expanded with upload button, no border color
- Card ordering: Correction needed first, then Needed, then Under Review, then Accepted

**Correction Instructions**:
- Displayed inside the card when a document needs correction
- Written in plain English — no technical jargon
- Specific to the issue (not generic "please re-upload")
- Examples:
  - "Please upload all pages of your bank statement, not just the first page. If you have the PDF from your bank's website, that works best."
  - "Your pay stub is from more than 60 days ago. Please upload your most recent pay stub."
  - "We couldn't read the text on your ID. Please take a new photo in good lighting with all corners visible."

**Footer**:
- Officer contact info (name, email, phone if available)
- No technical support links — the officer is the borrower's point of contact

### 4.2 Upload Flow — Enhanced

**Step 1: Select Document Type**

If the borrower clicked "Upload" from a specific checklist item, the document type is pre-selected. If they arrived via a general "Upload Document" button, they see a selector:

```
┌──────────────────────────────────────────────────────────────┐
│  What are you uploading?                                     │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ 📄 Pay Stub       │  │ 📄 W-2 Tax Form  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ 🏦 Bank Statement │  │ 🪪 Photo ID      │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  ┌──────────────────┐                                       │
│  │ 📋 Purchase       │                                       │
│  │    Contract       │                                       │
│  └──────────────────┘                                       │
└──────────────────────────────────────────────────────────────┘
```

- Only show document types that are still needed (not yet satisfied)
- Each option is a large touch target (min 64px height)

**Step 2: Upload**

```
┌──────────────────────────────────────────────────────────────┐
│  Upload your pay stub                                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │     Drag and drop your file here                       │  │
│  │     or                                                 │  │
│  │     ┌──────────────────────┐                           │  │
│  │     │  📎 Choose File      │                           │  │
│  │     └──────────────────────┘                           │  │
│  │     ┌──────────────────────┐                           │  │
│  │     │  📷 Take Photo       │  (mobile only)            │  │
│  │     └──────────────────────┘                           │  │
│  │                                                        │  │
│  │     PDF, JPG, or PNG · Max 20MB                        │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Tips:                                                       │
│  • PDF files from your bank or payroll system work best      │
│  • If taking a photo, use good lighting and include all edges│
│  • Make sure all text is readable                            │
└──────────────────────────────────────────────────────────────┘
```

- Drop zone: Large, clearly bordered area (dashed border on desktop)
- "Choose File" button: Opens file picker
- "Take Photo" button: Opens camera (mobile only — detected via media query)
- File type/size validation happens BEFORE upload begins
- If invalid: Inline error message ("This file is too large. Maximum size is 20MB.")

**Step 3: Upload Progress**

```
┌──────────────────────────────────────────────────────────────┐
│  Uploading your pay stub...                                  │
│                                                              │
│  paystub_march2026.pdf                                       │
│  ████████████████████░░░░ 78%                               │
│                                                              │
│  Checking your document...                                   │
└──────────────────────────────────────────────────────────────┘
```

- Progress bar shows upload percentage
- After upload completes: "Checking your document..." with a subtle loading animation
- Total wait time: 2-5 seconds (upload + AI classification + validation)

**Step 4: Result**

**Success**:
```
┌──────────────────────────────────────────────────────────────┐
│  ✅ Pay stub received and validated!                         │
│                                                              │
│  Your document has been accepted. One less thing to          │
│  worry about!                                                │
│                                                              │
│  [Back to Checklist]                                         │
└──────────────────────────────────────────────────────────────┘
```
- Green checkmark animation (subtle scale-in)
- Encouraging message
- Auto-redirect to checklist after 3 seconds (with "Back to Checklist" link for immediate return)

**Needs Correction**:
```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️  We need a better copy                                   │
│                                                              │
│  We received your bank statement, but it looks like only     │
│  the first page was included. Please upload the complete     │
│  statement with all pages as a single PDF file.              │
│                                                              │
│  If you downloaded it from your bank's website, it should    │
│  include all pages automatically.                            │
│                                                              │
│  [Upload Again]                     [Back to Checklist]      │
└──────────────────────────────────────────────────────────────┘
```
- Amber warning icon
- Specific, actionable instruction (not generic)
- "Upload Again" button (stays on upload flow for this requirement)
- No technical details (no "validation failed", no confidence score)

**Under Review**:
```
┌──────────────────────────────────────────────────────────────┐
│  🔵 Document received — under review                         │
│                                                              │
│  Your document has been received and is being reviewed       │
│  by your loan officer. We'll update you once it's been      │
│  confirmed.                                                  │
│                                                              │
│  [Back to Checklist]                                         │
└──────────────────────────────────────────────────────────────┘
```
- Blue info icon
- Shown when document goes to `needs_human_review` (low confidence or edge case)
- No mention of AI, confidence, or escalation — just "under review"

### 4.3 Portal Color Scheme

The portal uses a friendlier, lighter color scheme than the officer dashboard:

| Element | Color |
|---|---|
| Background | `#FAFBFC` (very light gray) |
| Card background | `#FFFFFF` |
| Primary text | `#1F2937` (dark gray, not navy) |
| Secondary text | `#6B7280` |
| Primary button | `#2563EB` (blue) |
| Primary button hover | `#1D4ED8` |
| Success elements | `#16A34A` (green) |
| Warning elements | `#D97706` (amber) |
| Card borders | `#E5E7EB` |
| Progress bar fill | `#2563EB` (blue, not green — less judgmental) |
| Progress bar track | `#E5E7EB` |

---

## 5. New UI Components

### 5.1 EscalationBadge

A compact badge showing escalation severity and category.

**Props**:
- `severity`: "critical" | "high" | "warning" | "info"
- `category`: string (human-readable category name)
- `size`: "sm" | "md" (default: "md")

**Rendering**:
- Severity dot (colored circle, 8px) + severity text in severity color
- Optionally followed by category text in neutral color

**Examples**:
- `🔴 CRITICAL` (red dot + red text)
- `🟠 HIGH · Name Mismatch` (orange dot + orange "HIGH" + gray "Name Mismatch")
- `🟡 WARNING` (amber dot + amber text)

### 5.2 DocumentRequirementRow

A list row for displaying a document requirement in the checklist.

**Props**:
- `requirement`: DocumentRequirement object
- `uploadedDocument`: UploadedDocument | null
- `onUpload`: callback
- `onAction`: callback (waive, confirm, reject)
- `isExpanded`: boolean
- `onToggleExpand`: callback

**States**: Renders differently based on requirement.state (see Section 3.2 for details).

### 5.3 AIReviewSummary

A structured display of the Officer Copilot's loan review summary.

**Props**:
- `summary`: OfficerCopilotSummary object
- `onMarkReviewReady`: callback
- `onRequestCorrections`: callback
- `isLoading`: boolean

**Sections**: Overall assessment, unresolved issues, confidence flags, recommended actions, document breakdown table (see Section 3.2 for layout).

### 5.4 ActivityTimeline

A vertical timeline of events.

**Props**:
- `events`: EventLog[]
- `filter`: EventType | null
- `onFilterChange`: callback

**Entry rendering**:
- Colored dot by actor type
- Timestamp (relative/absolute)
- Actor label
- Event description (human-readable)
- Expandable detail (optional)

### 5.5 ConfidenceIndicator

A visual confidence score display (officer view only — never shown to borrowers).

**Props**:
- `score`: number (0-1)
- `size`: "sm" | "md"

**Rendering**:
- Score >= 0.90: Green text, "95%"
- Score 0.75-0.89: Amber text, "82%"
- Score < 0.75: Red text, "68%"
- Format: "AI Confidence: X%" in monospace font
- Optional: Thin progress bar under the text (colored by threshold)

### 5.6 CorrectionInstructions

A borrower-friendly display of why a document needs re-upload.

**Props**:
- `issues`: string[]
- `docType`: string (human-readable label)

**Rendering**:
- Amber left border card
- Icon: warning triangle
- Each issue as a paragraph (not a bullet list — paragraphs feel friendlier)
- Helpful tip at the bottom (contextual per doc type)

### 5.7 ReminderStatus

Shows the reminder state for a borrower on a loan.

**Props**:
- `remindersSent`: number (0-3)
- `lastSentAt`: string | null
- `nextScheduledAt`: string | null

**Rendering**:
- "Reminders: X of 3 sent"
- "Last sent: [date]"
- "Next: [date]" or "No more reminders (escalated)"
- Visual dots: 3 circles, filled for sent, empty for remaining

### 5.8 ProgressBar

A progress bar for borrower portal checklist completion.

**Props**:
- `completed`: number
- `total`: number
- `showPercentage`: boolean (default true)
- `showLabel`: boolean (default true)

**Rendering**:
- Rounded bar (8px height, 8px border-radius)
- Fill color: Blue 600
- Track color: Slate 200
- Label: "X of Y complete (Z%)"

---

## 6. Interaction Flows

### Flow 1: Officer Creates Loan and Invites Borrower

```
1. Officer navigates to Dashboard → clicks "New Loan"
2. Modal or page shows loan creation form:
   - Borrower name (first, last) — required
   - Borrower email — required
   - Borrower phone — optional
   - Loan type: Purchase / Refinance — required
   - Property state — optional
   - Employment type: W-2 (default, future: self-employed, 1099)
3. Officer clicks "Create Loan"
4. API: Creates loan_file + contact (borrower) + runs Intake Agent
5. Redirect to loan detail page → Document Checklist tab
6. Officer sees auto-generated checklist:
   "5 documents required for this purchase loan"
   All items in "Required" state
7. Officer clicks "Invite Borrower" button
8. System sends welcome email with portal link
9. Toast notification: "Borrower invited. Portal link sent to john@example.com."
10. Checklist header updates: "Borrower invited — waiting for uploads"
11. doc_workflow_state badge changes to "Invited"
```

### Flow 2: Borrower Uploads Document Successfully

```
1. Borrower receives email → clicks portal link
2. Portal loads → shows friendly checklist with progress bar (0%)
3. Borrower sees 5 document cards, all showing "Needed"
4. Borrower taps "Upload Document" on "Your most recent pay stub"
5. Upload screen appears with drop zone + "Take Photo" button
6. Borrower taps "Take Photo" → camera opens → takes photo of pay stub
7. Photo selected → file size/type validated → upload begins
8. Progress bar fills → "Checking your document..." message
9. 2-3 seconds later:
   "Pay stub received and validated!" (green checkmark animation)
10. Auto-redirect to checklist → progress bar now shows 1 of 5 (20%)
11. Pay stub card shows green checkmark + "Accepted"
12. Officer receives no notification for individual uploads (only when all complete)
```

### Flow 3: Document Needs Correction

```
1. Borrower uploads a screenshot of bank statement (only page 1)
2. Progress bar fills → "Checking your document..."
3. AI classifies as bank_statement (confidence 0.85)
4. Deterministic validation fails: "All pages required, only page 1 detected"
5. Result screen:
   "We need a better copy"
   "We received your bank statement, but it looks like only the first page
    was included. Please upload the complete statement with all pages as a
    single PDF file."
6. Borrower taps "Upload Again"
7. This time uploads complete PDF from bank website (8 pages)
8. AI classifies (confidence 0.91), validation passes (all pages, recent date)
9. "Bank statement received and validated!" (green checkmark)
10. Previous upload marked as superseded (not shown to borrower)
11. Checklist updates accordingly
```

### Flow 4: Officer Reviews and Resolves Escalation

```
1. Officer opens LoanFlow dashboard
2. Red banner at top:
   "CRITICAL: Suspicious document detected on John Smith's loan. [Review]"
3. Officer clicks [Review]
4. Navigates to John Smith's loan → Escalation section
5. Sees escalation card:
   - 🔴 CRITICAL · Suspicious Document
   - "W-2 document may have been digitally altered. AI detected inconsistent
     font rendering across the document."
   - Created: Mar 7, 2:30 PM
6. Officer clicks [View Document] → document viewer opens
7. Officer examines the W-2 carefully
8. Officer determines: It's a scan from a copier, not altered
9. Officer clicks [Resolve]
10. Text area appears. Officer types:
    "Verified with borrower — this is a photocopy from employer's HR department.
     Font inconsistency is due to the copier, not digital editing. Original
     verified via phone call to employer."
11. Officer clicks "Submit Resolution"
12. Escalation → Resolved. Red banner clears.
13. Document state can be updated: Officer clicks "Accept" on the document
14. Event logged. Timeline shows resolution.
```

### Flow 5: Officer Review and Mark Ready

```
1. All 5 documents uploaded and validated by AI
2. doc_workflow_state automatically transitions to "Awaiting Officer Review"
3. Officer receives email: "All documents for John Smith's loan have been
   validated. Ready for your review."
4. Officer opens loan detail → Document Checklist tab
5. All 5 items show green "Accepted" badges
6. Officer clicks "Generate AI Summary"
7. Loading state (1-2 seconds while Copilot Agent runs)
8. Summary panel slides in:
   "All 5 required documents have been validated. No unresolved issues.
    1 confidence flag: Bank statement confidence at 78%.
    Recommended: Mark as review-ready."
9. Officer reviews document breakdown table
10. Officer clicks on bank statement row → expands → reviews AI rationale
11. Satisfied, officer clicks "Mark Review Ready"
12. Confirmation dialog: "Mark this loan file as review-ready?"
13. Officer confirms
14. doc_workflow_state → "Review Ready"
15. Subtle confetti animation (3 seconds, small particles, not distracting)
16. Toast: "Loan file marked as review-ready. You can now submit to lender."
17. Green "Review Ready" badge appears on the loan card
```

---

## 7. Responsive Design

### 7.1 Breakpoints

| Breakpoint | Width | Target |
|---|---|---|
| Mobile | < 640px | Phone (portrait) |
| Tablet | 640px - 1024px | Tablet, phone landscape |
| Desktop | > 1024px | Laptop, desktop |

### 7.2 Dashboard (Officer View)

**Mobile**:
- Sidebar collapses to hamburger menu (existing behavior)
- KPI cards stack vertically (1 column)
- Loan cards stack vertically (full width)
- Escalation banner: Full width, text wraps, action button below text

**Tablet**:
- Sidebar collapsed by default, expandable
- KPI cards: 2 columns
- Loan cards: 2 columns

**Desktop**:
- Sidebar visible
- KPI cards: 4 columns (row)
- Loan cards: list view or grid (officer preference)

### 7.3 Loan Detail Page

**Mobile**:
- Tabs become a horizontal scroll bar (swipeable)
- Document checklist: Full-width cards, stacked vertically
- AI Summary: Full-screen modal (not slide-out)
- Escalation cards: Full width, stacked
- Timeline: Full width, compact entries

**Tablet**:
- Tabs as horizontal bar
- 2-column layout where appropriate

**Desktop**:
- Standard tab layout
- Checklist + escalations in main column, timeline in sidebar (optional layout)

### 7.4 Borrower Portal

**Mobile (primary)**:
- Full-width cards
- Progress bar: Full width
- Upload button: Full width, 56px height (large touch target)
- "Take Photo" button: Prominent, full width
- Drop zone: Hidden on mobile (camera/file picker only)
- Document cards: Touch-friendly, min 48px interactive areas
- All text at 16px minimum (no zoom required on iOS)

**Tablet**:
- Centered content (max-width 640px)
- Drop zone visible
- Cards slightly wider

**Desktop**:
- Centered content (max-width 720px)
- Drop zone with drag-and-drop
- Camera button hidden (desktop users use file picker)

---

## 8. Accessibility

### 8.1 ARIA Labels

All interactive elements must have appropriate ARIA labels:

| Element | ARIA Label |
|---|---|
| Document requirement row | `aria-label="Pay stub requirement, status: accepted"` |
| Upload button | `aria-label="Upload document for pay stub requirement"` |
| Escalation badge | `aria-label="Critical severity escalation: suspicious document"` |
| Progress bar | `aria-role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" aria-label="Document completion progress: 3 of 5 complete"` |
| State badge | `aria-label="Document status: accepted"` |
| Timeline entry | `aria-label="March 7 at 2:30 PM, AI agent: W-2 classified with 88% confidence"` |
| Resolve button | `aria-label="Resolve this escalation"` |
| Dismiss button | `aria-label="Dismiss this escalation"` |
| Confidence indicator | `aria-label="AI confidence score: 95 percent"` |

### 8.2 Color Independence

Color is NEVER the sole indicator of state or severity:

| State | Color | Secondary Indicator |
|---|---|---|
| Accepted | Green | Checkmark icon + "Accepted" text |
| Correction needed | Amber | Warning triangle icon + "Needs Correction" text |
| Rejected | Red | X icon + "Rejected" text |
| Under review | Purple | Eye icon + "Needs Review" text |
| Awaiting | Gray | Empty circle icon + "Needed" text |
| Processing | Blue | Spinner animation + "Processing..." text |
| Critical severity | Red | Filled circle + "CRITICAL" text label |
| High severity | Orange | Filled circle + "HIGH" text label |
| Warning severity | Amber | Filled circle + "WARNING" text label |
| Info severity | Blue | Filled circle + "INFO" text label |

### 8.3 Keyboard Navigation

| Flow | Keyboard Support |
|---|---|
| Document checklist | Arrow keys to navigate between requirement rows, Enter to expand/collapse, Tab to reach action buttons within expanded row |
| Upload | Tab to reach drop zone (Enter to open file picker), Tab to reach "Choose File" button |
| Escalation queue | Arrow keys to navigate rows, Enter to open escalation detail, Tab to reach action buttons |
| Timeline | Arrow keys to navigate entries, Enter to expand detail |
| Modals/panels | Escape to close, Tab cycles within modal (focus trap), focus returns to trigger element on close |

### 8.4 Screen Reader Support

- All state transitions announce the new state via `aria-live="polite"` regions
- Upload progress is announced: "Uploading, 50 percent complete" ... "Upload complete, checking document"
- Upload result is announced: "Pay stub received and validated" or "Document needs correction: [reason]"
- Escalation banner uses `aria-live="assertive"` for critical severity
- Badge counts on dashboard use `aria-live="polite"` to announce changes
- Document type labels use the human-readable form, not the internal enum value

### 8.5 Motion & Animation

- All animations respect `prefers-reduced-motion` media query
- When reduced motion is preferred:
  - Confetti animation: Replaced with static "Ready" badge appearance
  - Loading spinners: Replaced with pulsing opacity
  - Slide-out panels: Instant appear/disappear (no slide)
  - Progress bar: Instant fill (no animation)
- No animation exceeds 300ms duration
- No animation is required to understand the interface (always paired with static state indicator)

---

## Appendix A: Document Type Icons

| Document Type | Icon | Description |
|---|---|---|
| Pay Stub | Receipt/paycheck icon | Simple receipt with dollar sign |
| W-2 | Tax document icon | Document with "W-2" text overlay |
| Bank Statement | Bank building icon | Small bank/institution icon |
| Government ID | ID card icon | Card with photo placeholder |
| Purchase Contract | Clipboard/contract icon | Clipboard with signature line |
| Unknown | Question mark document | Document with "?" |

Icons should be from a consistent icon library (Lucide Icons, which is already available via Radix UI). All icons are 20px in the checklist, 24px in the document type selector, and 16px in badges.

---

## Appendix B: Borrower Email Templates

### Welcome / Portal Invite Email

**Subject**: Upload your documents for your loan application

**Body**:
```
Hi [Borrower First Name],

Your loan officer [Officer Full Name] has started your mortgage application and needs a few documents from you.

Click the link below to see what's needed and upload your documents:

[Upload My Documents →] (button linking to portal)

What you'll need:
• Your most recent pay stub
• Your [year] W-2 tax form
• Your most recent bank statement (all pages)
• A photo of your driver's license or passport
[• Your signed purchase contract] (if purchase loan)

This usually takes about 10 minutes. You can upload documents from your phone or computer.

Questions? Reply to this email or contact [Officer Full Name] at [officer email/phone].

Thanks,
The LoanFlow Team
```

### Document Accepted Email (optional — officer can enable/disable)

**Subject**: Document received: [doc type human label]

**Body**:
```
Hi [Borrower First Name],

Your [doc type human label] has been received and accepted.

You've completed [X] of [Y] documents. [Keep going! / Almost there! / All done!]

[View Your Checklist →]

Thanks,
The LoanFlow Team
```

### Correction Needed Email

**Subject**: We need a better copy of your [doc type]

**Body**:
```
Hi [Borrower First Name],

We received your [doc type human label], but we need a better version:

[Specific issue in plain English — e.g., "The image was too blurry to read.
Please take a new photo in good lighting, or upload the PDF directly from
your payroll system."]

Click below to upload a new copy:

[Upload New Copy →]

If you have questions, contact your loan officer [Officer Full Name] at [email/phone].

Thanks,
The LoanFlow Team
```

### Reminder Emails

See Section 5.2 of the PRD for reminder cadence and content.

---

*This design specification should be reviewed by engineering and refined during implementation. Wireframes and high-fidelity mockups should be created in Figma based on this specification before development begins.*
