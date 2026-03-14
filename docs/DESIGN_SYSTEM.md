# LoanFlow AI — Design System & UX Specification

**Version**: 2.0
**Date**: March 14, 2026
**Status**: Active — Implementation Reference

---

## 1. Design Philosophy

### Principles

**1. Professional Trust**
Every pixel should say "your data is safe, this tool is reliable." LoanFlow AI handles sensitive financial documents and personally identifiable information. The visual language is clean, restrained, and confident — closer to a private banking interface than consumer fintech. No gradients, no decorative flourishes. White space communicates control.

**2. Triage-First**
Most urgent items surface first — officers are busy, don't make them hunt. Critical escalations are impossible to miss. The dashboard prioritizes what needs attention now, not what is going well. Green items recede; red items advance. Every list is sorted by urgency by default.

**3. Progressive Disclosure**
Show summary first, details on demand. The officer sees a document checklist with status badges. Clicking expands to show AI rationale, confidence score, extracted fields, and issues. The borrower sees "Looks good!" or "We need a clearer copy" — never the full system state.

**4. Zero Jargon in Borrower-Facing UI**
"Your most recent pay stub" not `pay_stub`. "We need a clearer copy" not `precheck_failed`. Borrowers never see: confidence scores, internal state names (`awaiting_upload`, `validated_issue_found`), technical error codes, or system-generated IDs. Every string shown to borrowers is written by a human or reviewed by a human.

**5. State Is Always Visible**
Never leave the user wondering what happened or what's next. Every document has a visible status badge. Every action produces feedback (toast, state change, animation). Loading states use skeleton placeholders, never blank screens. Error states explain what went wrong and what to do next.

**6. Mobile-First Portal**
Borrowers upload from phones. The portal is designed for one-handed use with minimum 48px touch targets, thumb-reachable primary actions, and camera-optimized upload flows. The portal never requires horizontal scrolling. Maximum content width: 640px.

**7. Human Control Is Visible**
AI results are recommendations, not final decisions. Every AI-generated classification has an officer override. The "Mark Review Ready" button is a deliberate officer action — never automatic. The officer must always feel in control.

---

## 2. Color System

All colors are defined as CSS custom properties and mapped to Tailwind utility classes. The system uses the existing Tailwind CSS v4 configuration with Radix UI primitives.

### Primary Palette

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-navy` | `#0F172A` | `bg-slate-900` | Sidebar background, page headers, primary surfaces |
| `--color-navy-light` | `#1E293B` | `bg-slate-800` | Sidebar hover states, secondary dark surfaces |
| `--color-slate` | `#334155` | `text-slate-700` | Secondary text, borders, dividers |
| `--color-slate-muted` | `#64748B` | `text-slate-500` | Muted text, placeholders, metadata |
| `--color-white` | `#FFFFFF` | `bg-white` | Cards, content backgrounds, inputs |
| `--color-warm-white` | `#FAFAF9` | `bg-stone-50` | Page background (officer dashboard) |
| `--color-portal-bg` | `#F8FAFC` | `bg-slate-50` | Page background (borrower portal) |

### Accent / Action

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-amber` | `#F59E0B` | `bg-amber-500` | Primary CTA buttons, active nav indicators |
| `--color-amber-hover` | `#D97706` | `bg-amber-600` | CTA hover state |
| `--color-amber-light` | `#FEF3C7` | `bg-amber-100` | CTA focus ring background |

### Document Workflow State Colors

These are the most critical colors in the system. Document state drives the entire file completion workflow.

| State | Hex | Tailwind | Badge Text | Icon |
|-------|-----|----------|------------|------|
| Required / Needed | `#2563EB` | `text-blue-600 bg-blue-50 border-blue-200` | "Needed" | `Circle` (outline) |
| Awaiting Upload | `#2563EB` | `text-blue-600 bg-blue-50 border-blue-200` | "Waiting" | `Clock` |
| Pending Validation | `#2563EB` | `text-blue-600 bg-blue-50 border-blue-200` | "Reviewing..." | `Loader2` (animated) |
| Tentatively Satisfied | `#059669` | `text-emerald-600 bg-emerald-50 border-emerald-200` | "Accepted" | `CheckCircle` |
| Correction Required | `#D97706` | `text-amber-600 bg-amber-50 border-amber-200` | "Needs Fix" | `AlertTriangle` |
| Needs Officer Review | `#7C3AED` | `text-violet-600 bg-violet-50 border-violet-200` | "Under Review" | `Eye` |
| Confirmed | `#059669` | `text-emerald-700 bg-emerald-100 border-emerald-300` | "Confirmed" | `Lock` |
| Waived | `#6B7280` | `text-gray-500 bg-gray-50 border-gray-200` | "Waived" | `Minus` |

### Escalation Severity Colors

| Severity | Hex | Tailwind Border | Tailwind Background | Tailwind Text |
|----------|-----|-----------------|---------------------|---------------|
| Info | `#6B7280` | `border-l-gray-500` | `bg-gray-50` | `text-gray-700` |
| Warning | `#D97706` | `border-l-amber-600` | `bg-amber-50` | `text-amber-800` |
| High | `#EA580C` | `border-l-orange-600` | `bg-orange-50` | `text-orange-800` |
| Critical | `#DC2626` | `border-l-red-600` | `bg-red-50` | `text-red-800` |

### Readiness Grade Colors

| Grade | Hex | Tailwind | Meaning |
|-------|-----|----------|---------|
| A (90-100%) | `#059669` | `text-emerald-600` | File complete, ready for submission |
| B (75-89%) | `#2563EB` | `text-blue-600` | Nearly complete, minor items remaining |
| C (50-74%) | `#D97706` | `text-amber-600` | Significant gaps, needs attention |
| F (0-49%) | `#DC2626` | `text-red-600` | Major items missing, not submittable |

---

## 3. Typography

Font family: **Inter** (loaded via `next/font/google`, already configured in the project).

| Level | Size | Line Height | Weight | Tailwind Classes | Usage |
|-------|------|-------------|--------|------------------|-------|
| H1 | 28px (1.75rem) | 36px (2.25rem) | 700 (bold) | `text-[28px] leading-9 font-bold tracking-tight` | Page titles: "Dashboard", borrower name on loan detail |
| H2 | 22px (1.375rem) | 28px (1.75rem) | 600 (semibold) | `text-[22px] leading-7 font-semibold` | Section headers: "Document Checklist", "Escalations" |
| H3 | 18px (1.125rem) | 24px (1.5rem) | 500 (medium) | `text-lg leading-6 font-medium` | Card titles, modal headers |
| Body | 16px (1rem) | 24px (1.5rem) | 400 (normal) | `text-base leading-6` | Content text, descriptions, form labels |
| Small | 14px (0.875rem) | 20px (1.25rem) | 400 (normal) | `text-sm leading-5` | Metadata, timestamps, badge text, table cells |
| Micro | 12px (0.75rem) | 16px (1rem) | 500 (medium) | `text-xs leading-4 font-medium` | Labels, captions, overline text |

### Text Colors

| Purpose | Tailwind | Usage |
|---------|----------|-------|
| Primary text | `text-slate-900` | Headings, body content |
| Secondary text | `text-slate-600` | Descriptions, secondary info |
| Muted text | `text-slate-500` / `text-muted-foreground` | Timestamps, metadata, placeholders |
| Disabled text | `text-slate-400` | Disabled inputs, inactive items |
| Inverse text | `text-white` | Text on dark backgrounds (sidebar, banners) |

---

## 4. Spacing and Layout

### Spacing Scale

Based on 4px base unit, using Tailwind's default spacing scale:

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Inline element gaps, icon-to-text |
| `space-2` | 8px | Tight padding, compact list items |
| `space-3` | 12px | Standard padding inside badges, small cards |
| `space-4` | 16px | Card padding, form field gaps |
| `space-6` | 24px | Section gaps within a page, card content padding |
| `space-8` | 32px | Major section separators |
| `space-12` | 48px | Page-level vertical rhythm |

### Layout Widths

| Context | Max Width | Tailwind |
|---------|-----------|----------|
| Officer dashboard content | 1280px | `max-w-7xl` |
| Loan detail content | 960px | `max-w-5xl` |
| Borrower portal content | 640px | `max-w-lg` |
| Modal dialogs (standard) | 480px | `max-w-md` |
| Modal dialogs (large) | 640px | `max-w-lg` |

### Card Styling

All cards use the existing Radix-based `Card` component with these defaults:

```
bg-white rounded-xl border border-slate-200 shadow-sm
```

- Card header padding: `px-6 pt-6 pb-0`
- Card content padding: `px-6 pb-6`
- Card hover (where clickable): `hover:shadow-md transition-shadow duration-200`
- Card spacing between cards: `gap-6` (24px)

---

## 5. Component Specifications

### A. DocumentRequirementRow

**Purpose**: Single row in the document checklist showing a requirement's current status in the resolution loop.

**Location**: Officer loan detail Documents tab, rendered as a list.

**Layout (desktop, min-width 768px)**:
```
[24px Icon] [Doc type label — flex-1] [State badge — w-28] [Action button — w-24] [Expand chevron — 20px]
```
- Row height: 56px minimum
- Row padding: `px-4 py-3`
- Row border: `border-b border-slate-100` (last row no border)
- Row hover: `hover:bg-slate-50 transition-colors`

**Layout (mobile, < 768px)**:
```
Stacked card layout:
[Icon + Doc type label]     [State badge]
[Action button — full width]
```
- Card padding: `p-4`
- Card margin: `mb-3`
- Card border: `border border-slate-200 rounded-lg`

**States**:

| State | Icon | Badge | Action Button | Notes |
|-------|------|-------|---------------|-------|
| Required | `Circle` (blue outline) | "Needed" (blue) | "Upload" (primary) | Default state when checklist is generated |
| Awaiting Upload | `Clock` (blue) | "Waiting" (blue) | "Upload" (primary) | Borrower has been notified |
| Pending Validation | `Loader2` (blue, `animate-spin`) | "Reviewing..." (blue) | None (disabled) | AI is processing the upload |
| Tentatively Satisfied | `CheckCircle` (emerald) | "Accepted" (green) | "View" (ghost) | AI validated, awaiting officer confirm |
| Correction Required | `AlertTriangle` (amber) | "Needs Fix" (amber) | "Re-upload" (amber outline) | Shows correction message below |
| Needs Officer Review | `Eye` (violet) | "Under Review" (violet) | "Review" (violet outline) | AI flagged for human judgment |
| Confirmed | `Lock` (emerald, filled) | "Confirmed" (green, solid bg) | "View" (ghost) | Officer has confirmed — read-only |
| Waived | `Minus` (gray) | "Waived" (gray) | None | Text has `line-through` style |

**Expanded View** (toggles on chevron click or row click):
- Slides down with `300ms ease` animation
- Background: `bg-slate-50 rounded-b-lg`
- Padding: `px-6 py-4`
- Content sections (each separated by 16px gap):
  - **Uploaded file**: Filename, file size, upload timestamp, "Preview" and "Download" links
  - **AI Classification**: Detected document type, confidence score (officer only), rationale text
  - **Extracted Fields** (officer only): Key-value pairs in a 2-column grid (e.g., "Employer: Acme Corp", "Pay Period: 01/15/2026 - 01/31/2026")
  - **Issues**: Bulleted list of validation findings, each with severity icon
  - **Correction Message**: If state is `correction_required`, shows the borrower-facing message in an amber card

**Empty State**: "No documents in checklist yet. Create a checklist to get started." with "Generate Checklist" button (primary).

**Error State**: If document fetch fails, show: "Could not load documents. Please refresh the page." with "Retry" button.

---

### B. EscalationCard

**Purpose**: Display a single escalation in the officer's queue, showing severity, context, and available actions.

**Layout**:
```
[4px left border colored by severity]
[Card content]:
  Row 1: [Severity dot 8px] [Category badge] [Timestamp — right aligned]
  Row 2: [Description text — full width]
  Row 3: [Loan link — borrower name] [Action buttons — right aligned]
```

- Card: `bg-white rounded-lg border border-slate-200 shadow-sm`
- Left border: `border-l-4` colored by severity (see escalation severity colors)
- Padding: `p-4`
- Margin between cards: `mb-3`

**Category Badge**: Small pill badge with text:
- `document_quality` → "Document Quality"
- `suspicious_document` → "Suspicious Document"
- `classification_uncertain` → "Classification"
- `stale_requirement` → "Stale"
- `borrower_unresponsive` → "No Response"

Badge styling: `text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700`

**Action Buttons** (all `size="sm"`):
- "Acknowledge" — `variant="ghost"` — marks escalation as seen, removes from unread count
- "Resolve" — `variant="outline"` — opens modal with:
  - Resolution notes textarea (required, min 10 characters)
  - "Resolve" button (primary) + "Cancel" button (ghost)
- "Dismiss" — `variant="ghost"` — for info-level only; confirms with "Are you sure?" inline

**Severity Dot**: 8px circle, `rounded-full`, colored by severity:
- Info: `bg-gray-400`
- Warning: `bg-amber-500`
- High: `bg-orange-500`
- Critical: `bg-red-500` + `animate-pulse` (subtle)

**Empty State**: "No open escalations. Your queue is clear." with a muted checkmark icon.

**Error State**: "Could not load escalations." with "Retry" button.

---

### C. EscalationBanner

**Purpose**: Persistent top-of-dashboard alert bar for critical or high-severity escalations that demand immediate attention.

**Layout**:
```
Full-width bar above main content area, below header:
[WarningTriangle icon 20px] [Message text: "N critical escalation(s) need attention"] [View button] [Dismiss X]
```

**Styling by severity**:
- Critical: `bg-red-600 text-white`
- High: `bg-orange-500 text-white`

- Height: 48px, `flex items-center`
- Padding: `px-6`
- "View" button: `text-white underline font-medium hover:opacity-80` — navigates to `/dashboard/escalations`
- Dismiss "X": `text-white/70 hover:text-white` — hides banner for current session (reappears on page refresh if unresolved)

**Visibility Rules**:
- Shown only when there are unresolved critical or high escalations
- Auto-dismisses when officer navigates to escalation queue
- If both critical and high exist, critical takes priority (show critical styling + combined count)

**Animation**: Slides down from top, `300ms ease-out`. Dismiss slides up, `200ms ease-in`.

---

### D. FileReadinessCard

**Purpose**: Visual summary of overall file completion status, displayed on loan detail Overview tab.

**Layout**:
```
[Circular progress ring — 96px diameter]  [Text section]
  Ring shows percentage fill                Grade badge (A/B/C/F)
  Center of ring: percentage number         "X of Y documents complete"
                                            Breakdown list:
                                            - Documents: 4/6
                                            - Open Escalations: 1
                                            - Missing: Pay stub, Bank statement
```

**Progress Ring**:
- Diameter: 96px
- Stroke width: 8px
- Track color: `stroke-slate-200`
- Fill color: Based on grade (A=emerald-500, B=blue-500, C=amber-500, F=red-500)
- Center text: Percentage in `text-2xl font-bold`
- Animation: Fill animates from 0 to value on mount, `1000ms ease-out`

**Grade Badge**: Large pill next to ring
- `text-lg font-bold px-4 py-1 rounded-full`
- Background and text colored by grade (see Readiness Grade Colors)

**Breakdown List**:
- Each item: `text-sm`, icon + label + count
- Missing items listed with red dot prefix
- If no missing items: "All documents accounted for" in emerald text

**Card Styling**: Standard card with `p-6`

**Empty State**: "No readiness data yet. Upload documents to see file progress." — shown when loan has no document requirements.

**Error State**: "Could not calculate readiness score." with muted warning icon.

---

### E. ReviewSummaryPanel

**Purpose**: Display AI-generated review summary for officer decision-making on the Review tab.

**Layout**:
```
Card with sections (separated by `Separator`):

1. Overall Assessment
   [1-2 sentence summary text]

2. Readiness Grade
   [Grade badge — same style as FileReadinessCard]

3. Unresolved Issues (if any)
   [Red dot] Issue description
   [Red dot] Issue description

4. Confidence Flags (if any)
   [Amber dot] Flag description
   [Amber dot] Flag description

5. Recommended Actions
   [Checkbox] Action description
   [Checkbox] Action description

6. Document Breakdown Table
   | Document Type | Status | Confidence | Notes |
   |---------------|--------|------------|-------|

7. Action Buttons (sticky bottom of card on scroll)
   [Mark Review Ready — green, primary]
   [Request Corrections — amber, outline]
   [Archive — gray, ghost]
```

**Section Styling**:
- Section headers: `text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2`
- Section padding: `py-4`
- Unresolved issues: `text-red-700` with `bg-red-50 rounded-md p-3`
- Confidence flags: `text-amber-700` with `bg-amber-50 rounded-md p-3`
- Recommended actions: Checkboxes using Radix `Checkbox` component, `text-sm`

**Action Buttons**:
- "Mark Review Ready": `bg-emerald-600 hover:bg-emerald-700 text-white` — confirms with inline "Are you sure?" before executing
- "Request Corrections": `border-amber-300 text-amber-700 hover:bg-amber-50` — opens modal to select which documents need correction and compose messages
- "Archive": `text-slate-500 hover:text-slate-700` — confirms with dialog

**Empty State**: Large centered section with:
- Sparkle icon (`Sparkles` from Lucide), 48px, `text-slate-300`
- "Generate Review Summary" heading
- "AI will analyze all documents and produce a readiness assessment." description
- "Generate Summary" button (primary, with sparkle icon)

**Loading State**: Skeleton placeholders for each section, `animate-pulse`, with text: "Analyzing documents..." below a spinner.

**Error State**: "Could not generate summary. Please try again." with "Retry" button.

---

### F. ActivityTimeline

**Purpose**: Chronological event log showing all significant actions on a loan, displayed on the Activity tab.

**Layout**:
```
Vertical timeline:
[Date group header — "March 14, 2026"]

  [Connector line 2px, slate-200]
  [Actor dot 10px]  [Event card]
                      [Actor name — bold] [Action text]
                      [Timestamp — muted, relative: "2 hours ago"]

  [Connector line]
  [Actor dot]  [Event card]
                ...
```

**Actor Dots** (10px circles on the timeline):
- System: `bg-slate-400` — gear icon overlay
- AI: `bg-violet-500` — sparkle icon overlay
- Officer: `bg-blue-500` — user icon overlay
- Borrower: `bg-emerald-500` — upload icon overlay

**Event Card**:
- `bg-white border border-slate-100 rounded-lg px-4 py-3 ml-6`
- Actor name: `font-medium text-sm text-slate-900`
- Action text: `text-sm text-slate-600`
- Timestamp: `text-xs text-slate-400 mt-1`

**Filter Bar** (above timeline):
- Segmented control / tabs: `All | Documents | Escalations | Communications`
- Active filter: `bg-slate-900 text-white rounded-md px-3 py-1`
- Inactive filter: `text-slate-500 hover:text-slate-700`

**Date Group Header**:
- `text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 mt-8`
- First group has no top margin

**Responsive (mobile)**:
- Timeline line shifts to left edge (12px from left)
- Event cards take full remaining width
- Connector line: `left-[17px]` (centered on dot)

**Empty State**: "No activity recorded yet." with muted clock icon.

**Error State**: "Could not load activity log." with "Retry" button.

---

### G. BorrowerUploadCard

**Purpose**: Document upload card in the borrower portal, designed for mobile-first interaction.

**Location**: Borrower portal page, listed vertically.

**Layout**:
```
Card (full width, max 640px):
  Row 1: [Doc icon 24px] [Friendly doc name — bold] [Status indicator — right]
  Row 2: [Instruction text — muted, 1 line max]
  Row 3: [Action area — contextual by state]
```

**Card Styling**:
- `bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4`
- Touch-friendly: minimum card height 80px
- Active/tappable cards: `active:bg-slate-50` on mobile

**States**:

| State | Status Indicator | Instruction Text | Action Area |
|-------|-----------------|------------------|-------------|
| Needed | Blue dot | "Upload your [friendly name]" | "Upload" button, full width, `h-12`, primary style |
| Uploading | Progress bar (blue, animated) | "Uploading..." | Progress percentage, cancel button (ghost) |
| Processing | Spinner (blue, `animate-spin`) | "Checking your document..." | No action available |
| Accepted | Green checkmark | "Looks good!" | "View" link (ghost, small) |
| Needs Correction | Amber warning triangle | Specific human-readable instruction | "Re-upload" button, full width, `h-12`, amber outline |
| Under Review | Blue info circle | "Your loan officer will review this" | No action available |

**Friendly Document Names** (mapping from internal types):
- `pay_stub` → "Your most recent pay stub"
- `w2` → "W-2 form"
- `bank_statement` → "Bank statement (last 2 months)"
- `drivers_license` → "Photo ID (driver's license or passport)"
- `purchase_contract` → "Purchase contract"
- `mortgage_statement` → "Current mortgage statement"
- `homeowners_insurance` → "Homeowners insurance declaration"
- `tax_return` → "Tax return (most recent year)"

**Upload Button Sizing**: Minimum height 48px, full card width, prominent styling. On mobile, the upload action should be the largest touch target on the card.

**Empty State** (no documents assigned): "Your loan officer hasn't added any document requests yet. Check back soon." with a friendly illustration or muted file icon.

**Error State** (upload failed): Red card: "Upload failed. Please check your connection and try again." with "Try Again" button.

---

### H. ProgressHeader

**Purpose**: Top of borrower portal showing personalized greeting and overall document completion.

**Layout**:
```
[Greeting text — left aligned]
[Progress bar — full width, h-3, rounded-full]
[Completion text — "X of Y completed" — centered below bar]
```

**Greeting**: `text-2xl font-bold text-slate-900 mb-1`
- Text: "Hi [First Name], here's what we need"
- If first name unavailable: "Hello, here's what we need"

**Subtext**: `text-sm text-slate-500 mb-4`
- "Upload your documents below. It only takes a few minutes."

**Progress Bar**:
- Height: 12px (`h-3`)
- Track: `bg-slate-200 rounded-full`
- Fill: Color transitions based on completion percentage:
  - 0-33%: `bg-red-500`
  - 34-66%: `bg-amber-500`
  - 67-99%: `bg-blue-500`
  - 100%: `bg-emerald-500`
- Animation: Smooth width transition, `transition-all duration-500 ease-out`

**Completion Text**: `text-sm font-medium text-slate-600 mt-2 text-center`
- Format: "2 of 5 completed"

**100% Complete State**:
- Replace progress bar with: Green checkmark icon (48px) + "All documents submitted!" in `text-emerald-600 font-semibold text-lg`
- Below: "Your loan officer will review them shortly." in `text-sm text-slate-500`

**Container**: `bg-white rounded-xl p-6 shadow-sm mb-6`

---

### I. CorrectionMessage

**Purpose**: Display specific, human-readable correction instructions to the borrower when a document upload does not pass validation.

**Layout**:
```
Amber card:
  [AlertTriangle icon 20px, amber-600] [Message text]
```

**Styling**:
- `bg-amber-50 border border-amber-200 rounded-lg p-4`
- Icon: `text-amber-600 shrink-0 mt-0.5`
- Text: `text-amber-800 text-sm leading-relaxed ml-3`

**Message Guidelines** (for AI-generated or template-based messages):
- Maximum 2 sentences
- Start with what is wrong, then say what to do
- Never use technical terms, field names, or error codes
- Use "you" and "your" — direct address

**Example Messages**:
- "Please upload a clearer photo. We couldn't read the income information on your pay stub."
- "We need all pages of your bank statement, not just the first page. Please download the full PDF from your bank's website."
- "This looks like a tax return, but we need your W-2 form. Your W-2 is the smaller form your employer gives you."
- "The document you uploaded is too blurry to read. Please take a new photo in good lighting, holding the document flat."
- "We need a more recent pay stub from the last 30 days. The one you uploaded is from October."

**Tone rules**: Helpful, patient, specific, never technical, never accusatory. "We need..." not "You failed to provide..."

---

### J. ConfidenceIndicator

**Purpose**: Show AI confidence score on document classification. Visible to officers only, never shown to borrowers.

**Layout**:
```
[Label: "AI Confidence"] [Horizontal bar 120px wide, 6px tall] [Percentage text]
```

**Bar Colors** (gradient stops based on value):
- 0-49%: `bg-red-500` — low confidence, likely misclassification
- 50-74%: `bg-amber-500` — moderate confidence, officer should verify
- 75-89%: `bg-blue-500` — high confidence, likely correct
- 90-100%: `bg-emerald-500` — very high confidence

**Styling**:
- Label: `text-xs text-slate-500 font-medium`
- Bar track: `bg-slate-200 rounded-full h-1.5 w-[120px]`
- Bar fill: `rounded-full h-1.5 transition-all duration-300`
- Percentage: `text-xs font-semibold ml-2` — colored to match bar

**Placement**: Inside expanded `DocumentRequirementRow`, below the AI Classification section header. Also appears in `ReviewSummaryPanel` document breakdown table.

**Threshold Behavior**:
- Below 50%: Show amber warning icon beside the bar with tooltip: "Low confidence — officer review recommended"
- Below 75%: No additional indicator, but row is flagged for officer review
- 75%+: No additional indicator

---

### K. StakingOrderPreview

**Purpose**: Show the officer the lender-ready document stack in the order it will be assembled for submission.

**Location**: Loan detail Review tab, below the ReviewSummaryPanel.

**Layout**:
```
Card:
  Header: "Document Stack Order" [Reorder toggle]

  Ordered list:
    1. [Drag handle ⠿] [Doc type] [Status badge — small] [Thumbnail 40x52px]
    2. [Drag handle ⠿] [Doc type] [Status badge — small] [Thumbnail 40x52px]
    ...

  Footer:
    [Generate PDF Stack — primary button, full width]
```

**List Item**:
- Height: 56px
- Padding: `px-4 py-2`
- Border: `border-b border-slate-100`
- Drag handle: `text-slate-400`, 6-dot grip icon, `cursor-grab`
- When dragging: `shadow-lg bg-white rounded-lg` with `opacity-90`
- Order number: `text-sm font-bold text-slate-400 w-6`

**Thumbnail**: 40x52px (standard letter ratio), `rounded border border-slate-200 bg-slate-100`. If no preview available, show file-type icon (PDF icon, image icon, etc.).

**Reorder Toggle**: `Switch` component from Radix. When off, drag handles are hidden and list is read-only. Label: "Reorder" in `text-sm`.

**Generate PDF Stack Button**:
- `bg-slate-900 hover:bg-slate-800 text-white h-11 rounded-lg font-medium`
- Disabled when: not all documents are in `confirmed` or `tentatively_satisfied` state
- Disabled style: `opacity-50 cursor-not-allowed`
- Loading state: Spinner + "Generating..."

**Empty State**: "Complete document validation before generating the submission stack. X of Y documents validated." with progress indicator.

**Error State**: "Could not load document stack." with "Retry" button.

---

## 6. Page Layouts

### A. Officer Dashboard (`/dashboard`)

**Layout Structure**:
```
[Sidebar — 256px, collapsible to 64px] | [Main Content Area]
                                         |
                                         | [Escalation Banner — conditional]
                                         | [KPI Row — 4 cards]
                                         | [Quick Filters — tab bar]
                                         | [Loan List Table]
```

**KPI Cards** (4 across on lg+, 2x2 on md, stacked on sm):
- Card size: Equal width, `min-h-[88px]`
- Card styling: `bg-white rounded-xl border shadow-sm p-5`
- Layout per card: [Metric value — text-2xl font-bold] above [Label — text-sm text-muted-foreground]
- Cards:
  1. **Active Loans**: Count of non-archived loans. Icon: `FileText` (slate-400).
  2. **Pending Documents**: Count of documents in `required`/`awaiting_upload`/`correction_required` states across all loans. Icon: `Upload` (blue-500).
  3. **Open Escalations**: Count of unresolved escalations. Icon: `AlertTriangle` (amber-500). If critical exist, number is `text-red-600`.
  4. **Review Ready**: Count of loans with `doc_workflow_state = officer_review_needed`. Icon: `CheckCircle` (emerald-500).

**Quick Filters** (above table):
- Segmented control: `All | Needs Attention | Review Ready | Archived`
- "Needs Attention": Loans with open escalations or documents needing correction
- Active filter: `bg-slate-900 text-white`
- Right side: "New Loan" button (`bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 h-10 rounded-lg`)

**Loan List Table**:
- Columns: `Borrower | Loan Type | Status | Docs (X/Y) | Escalations | Last Activity`
- Row height: 52px
- Row hover: `hover:bg-slate-50 cursor-pointer`
- Click row → navigate to `/loans/[id]`
- Borrower column: `font-medium text-slate-900`
- Docs column: `X/Y` format with color:
  - All complete: `text-emerald-600`
  - Some missing: `text-amber-600`
  - None uploaded: `text-red-600`
- Escalations column: Count badge, colored by highest severity
- Last Activity: Relative time ("2 hours ago"), `text-slate-500 text-sm`
- Sort: Default by last activity (most recent first). Clickable column headers to sort.

**Empty State**: "No loans yet. Create your first loan to get started." with "New Loan" button and a muted illustration.

**Responsive (mobile)**:
- Table becomes a card list
- Each card shows: Borrower name (bold), loan type, status badge, doc count, last activity
- Cards stacked vertically, full width

### B. Loan Detail (`/loans/[id]`)

**Layout Structure**:
```
[Back arrow + Borrower Name + Status Badges]
[Loan type · Amount · File number]

[Tab Bar — horizontal scroll on mobile]
  Documents | Overview | Escalations | Review | Activity | 1003 | Conditions | Messages | AUS | Loan Estimate | Pre-Approval | Submission | Disclosures | Readiness

[Tab Content Area — max-w-5xl]
```

**Header**:
- Back arrow: `Button variant="ghost" size="icon"` linking to `/loans`
- Borrower name: H1 style (`text-[28px] font-bold tracking-tight`)
- Status badges: `LoanStatusBadge` (existing) + doc workflow state badge (new)
- Loan info line: `text-sm text-muted-foreground` — loan type label, formatted amount, file number

**Tab Bar**:
- Uses existing `Tabs` / `TabsList` / `TabsTrigger` from Radix
- **Documents is the default tab** (not Overview) — because file completion is the wedge
- On mobile: horizontal scroll with `overflow-x-auto`, no wrapping
- Active tab: `border-b-2 border-slate-900 text-slate-900 font-medium`
- Inactive tab: `text-slate-500 hover:text-slate-700`

**Documents Tab Content**:
- "Generate Checklist" button (if no requirements exist) — primary, with sparkle icon
- List of `DocumentRequirementRow` components
- "Upload Document" button at bottom (secondary) for manual uploads outside checklist
- Borrower portal link card (compact) with copy button

**Overview Tab Content**:
- Two-column layout on lg+ (2/3 + 1/3 ratio), single column on mobile
- Left: Loan details card (existing), Borrower portal card (existing)
- Right: `FileReadinessCard`, Quick Stats card (existing)

**Escalations Tab Content**:
- List of `EscalationCard` components for this loan only
- Filter bar: `All | Open | Resolved | Dismissed`

**Review Tab Content**:
- `ReviewSummaryPanel` (top)
- `StakingOrderPreview` (below)

**Activity Tab Content**:
- `ActivityTimeline` component with filters

### C. Escalation Queue (`/dashboard/escalations` — New Page)

**Layout Structure**:
```
[Page Header: "Escalation Queue" + unresolved count badge]
[Filter Row: Severity dropdown | Category dropdown | Status toggle (Open/Resolved/All)]
[Bulk Actions: "Acknowledge Selected" — shown when items checked]
[Escalation Table]
```

**Sidebar Navigation**: Add new nav item to Sidebar.tsx:
- `{ href: "/dashboard/escalations", label: "Escalations", icon: AlertTriangle }`
- Position: After "Loan Files" in the navItems array
- When unresolved critical/high exist: Show a red dot indicator (8px, `bg-red-500 rounded-full`) on the nav icon

**Table Columns**: `[Checkbox] Severity | Category | Loan | Borrower | Description | Created | Status | Actions`
- Default sort: Critical first, then High, then Warning, then Info; within each severity, by date (newest first)
- Severity column: Colored dot (8px) + text label
- Loan column: Clickable link → navigates to loan detail Escalations tab
- Description: Truncated at 80 chars with tooltip for full text
- Actions: "Acknowledge" | "Resolve" | "Dismiss" inline buttons (sm, ghost)

**Click Row**: Navigates to `/loans/[loanId]` with Escalations tab active.

**Bulk Actions Bar**: Appears when 1+ rows are checked. Fixed position above table.
- `bg-slate-900 text-white rounded-lg px-4 py-2 flex items-center gap-3`
- "[N] selected" + "Acknowledge" button + "Clear Selection" link

**Empty State**: "No escalations. Your queue is clear." with a green checkmark icon (48px, `text-emerald-400`).

### D. Borrower Portal (`/portal/[token]`)

**Layout Structure**:
```
Full viewport, centered, no sidebar, no navigation:

[Header Bar — sticky top]
  [LoanFlow logo + "Document Upload Portal"]

[Content — max-w-lg mx-auto, px-4, py-8]
  [ProgressHeader]
  [BorrowerUploadCard] (repeated for each requirement)
  [BorrowerUploadCard]
  ...

[Footer — fixed bottom or after content]
  [Lock icon] "Your data is encrypted and secure"
  [Officer contact info if available]
```

**Header Bar**:
- `bg-white border-b sticky top-0 z-10`
- Content: `max-w-lg mx-auto px-4 py-4`
- Logo: `Zap` icon (24px, `text-blue-600`) + "Document Upload Portal" in `font-bold text-lg`
- Officer branding (if available): Officer name + NMLS# below logo in `text-xs text-slate-500`

**Footer**:
- `text-center text-xs text-slate-400 py-8`
- Lock icon (16px) inline with text
- Text: "Your data is encrypted and secure"
- If officer phone/email available: "Questions? Contact [Officer Name] at [phone/email]"

**Background**: `bg-slate-50 min-h-screen`

**No Sidebar**: The portal has no sidebar, no navigation, no hamburger menu. It is a single-purpose page.

**Responsive**: Already single-column. On very small screens (< 375px), reduce padding to `px-3`. All touch targets remain 48px minimum.

### E. Upload Flow (Borrower)

This flow occurs within the borrower portal when the borrower taps "Upload" on a `BorrowerUploadCard`. It should feel like a single-page flow with no page navigation.

**Step 1 — Document Selection** (skipped if tapping from a specific card):
- If accessed via "Upload" on a specific card: document type is pre-selected, skip to Step 2
- If accessed via a general "Upload" button: Show list of needed document types as large tap targets (48px height each, full width)

**Step 2 — Upload Zone**:
- Replaces the card content inline (no modal, no page change)
- Desktop: Drag-and-drop zone (`border-2 border-dashed border-slate-300 rounded-xl p-8`)
  - Text: "Drag and drop your file here" + "or" + "Choose File" button
  - Accepted formats text: "PDF, JPG, PNG — max 25MB"
- Mobile: Two large buttons stacked vertically
  - "Take Photo" button (`h-14`, camera icon, primary style) — opens device camera
  - "Choose File" button (`h-14`, upload icon, outline style) — opens file picker
  - Both buttons: `rounded-xl font-medium text-base`

**Step 3 — Upload Progress**:
- Upload zone is replaced by progress bar
- `h-2 bg-slate-200 rounded-full` track with `bg-blue-500 rounded-full` fill
- Below bar: "Uploading... X%" in `text-sm text-slate-500`
- Cancel button: `text-sm text-slate-400 hover:text-slate-600`

**Step 4 — AI Result** (shown after 2-3 second processing delay):
- Success: Green card (`bg-emerald-50 border-emerald-200 rounded-xl p-5`)
  - `CheckCircle` icon (32px, emerald-500) + "Document received and looks good!" in `font-semibold text-emerald-700`
- Correction: Amber card with `CorrectionMessage` component
  - Below: "Re-upload" button (`h-12`, full width, amber outline)
- Under Review: Blue card (`bg-blue-50 border-blue-200 rounded-xl p-5`)
  - `Info` icon (32px, blue-500) + "Your loan officer will review this shortly." in `font-medium text-blue-700`

**Step 5 — Return**:
- "Back to Checklist" button below the result card
- `h-12 w-full rounded-xl font-medium` — ghost style
- Or: auto-scroll back to the card in the list (which now shows updated state) after 3 seconds

---

## 7. Interaction Flows

### Flow 1: Officer Creates Loan and Generates Checklist

1. Officer clicks "New Loan" on dashboard (amber button, top right)
2. Modal opens with form:
   - Borrower first name, last name (required)
   - Borrower email (required)
   - Borrower phone (optional)
   - Loan type (dropdown: Conventional Purchase, Conventional Refi, FHA Purchase, VA Purchase, etc.)
   - Property state (dropdown)
3. Officer clicks "Create Loan" (primary button, bottom right of modal)
4. Loading: Button shows spinner + "Creating..." (500ms typical)
5. Modal closes. Redirect to `/loans/[id]` with Documents tab active
6. Checklist appears with 5-7 requirements populated (entrance animation: slide up + fade, staggered 50ms per row)
7. Toast notification (top-right): "Document checklist ready. Invite borrower to upload." (emerald, 5s auto-dismiss)
8. "Invite Borrower" button is prominent at the top of the Documents tab — sends portal link via email to borrower

### Flow 2: Borrower Uploads Document Successfully

1. Borrower opens portal link on phone (receives email or SMS)
2. Portal loads: "Hi Sarah, here's what we need" + progress bar showing 0/5
3. Borrower taps "Upload" on the "Pay Stub" card
4. Two buttons appear: "Take Photo" (primary, camera icon) + "Choose File" (outline)
5. Borrower taps "Take Photo" — device camera opens
6. Borrower takes photo — file selected
7. Upload progress bar fills (1-3 seconds depending on file size)
8. Spinner appears: "Checking your document..." (2-3 seconds, AI validation)
9. Green result card: "Document received and looks good!" with checkmark animation
10. After 3 seconds or on "Back to Checklist" tap: returns to card list
11. Pay Stub card now shows green checkmark + "Looks good!"
12. Progress header updates: 1/5 (20%), bar fills with color transition
13. Meanwhile: Officer's dashboard updates via Supabase real-time subscription — doc count changes, activity log entry appears

### Flow 3: Document Needs Correction

1. Borrower uploads blurry bank statement screenshot via portal
2. Upload completes → Processing spinner: "Checking your document..."
3. AI classifies as `bank_statement` (confidence: 0.82)
4. Deterministic validation runs: Fails "all pages" check (1 page detected), fails "full PDF" check (image file)
5. Amber result card appears with CorrectionMessage:
   "We need the full bank statement, not a screenshot. Please download the PDF from your bank's website and upload all pages."
6. "Re-upload" button appears below the message (amber outline, full width, h-12)
7. Card state updates to `correction_required`
8. Borrower taps "Re-upload" → upload flow restarts for this document
9. Borrower uploads full PDF from bank app
10. Processing: "Checking your document..." (2-3 seconds)
11. AI validates → passes all checks → confidence 0.95
12. Green result: "Bank statement accepted!"
13. Card state updates to `tentatively_satisfied`

### Flow 4: Officer Reviews Escalation

1. Officer logs in to dashboard
2. Red escalation banner appears at top: "1 critical escalation needs attention" with "View" link
3. Officer clicks "View" → navigates to `/dashboard/escalations`
4. Escalation queue shows: row with red severity dot, "Suspicious Document" category badge
5. Description: "Possible document alteration detected on bank statement for John Smith"
6. Officer clicks row → navigates to `/loans/[id]` with Escalations tab active
7. Full escalation detail shows:
   - AI rationale: "Document metadata indicates editing software was used. Font inconsistencies detected on page 2."
   - Confidence score: 0.45 (shown via ConfidenceIndicator — red bar)
   - Document preview/download link
8. Officer downloads and reviews the actual document
9. Officer clicks "Resolve" button on the escalation card
10. Modal appears: Resolution notes textarea (required) + "Resolve" button (primary) + "Cancel"
11. Officer types: "Called borrower, verified original. Employer confirmed employment via phone. Original PDF obtained from bank directly."
12. Clicks "Resolve"
13. Escalation status → `resolved`, card updates with green "Resolved" badge
14. Dashboard banner clears (no more critical escalations)
15. Document requirement state → `tentatively_satisfied` (officer accepted)

### Flow 5: All Documents Complete — Officer Review

1. Borrower uploads final document → all requirements now `tentatively_satisfied`
2. System updates `doc_workflow_state` → `officer_review_needed`
3. Officer dashboard: Loan row shows "Review Ready" badge (emerald)
4. KPI card "Review Ready" count increments
5. Officer clicks loan → opens loan detail, defaults to Documents tab (all green checks visible)
6. Officer clicks "Review" tab
7. ReviewSummaryPanel shows empty state: sparkle icon + "Generate Review Summary" button
8. Officer clicks "Generate Summary"
9. Loading state: Skeleton pulse animation + "Analyzing documents..." (3-5 seconds)
10. Summary populates:
    - "All 5 documents validated. No unresolved issues. Income verification consistent across pay stubs and W-2."
    - Grade: A (emerald badge)
    - No unresolved issues (section hidden)
    - No confidence flags (section hidden)
    - Recommended: "Mark as review-ready" (checkbox, pre-checked)
    - Document breakdown table: 5 rows, all showing "Accepted" with 85-97% confidence
11. Below: StakingOrderPreview shows ordered document list
12. Officer reviews, clicks "Mark Review Ready" (emerald button)
13. Inline confirmation: "Mark this file as review-ready?" with "Confirm" + "Cancel"
14. Officer clicks "Confirm"
15. `doc_workflow_state` → `file_complete`
16. Success animation: Checkmark draw (400ms) + toast: "File marked as review-ready" (emerald, 5s)
17. Loan status badge updates to show file-complete state

---

## 8. Responsive Design

### Breakpoints

Using Tailwind's default breakpoint system:

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Small phones → larger phones |
| `md` | 768px | Tablets, small laptops |
| `lg` | 1024px | Laptops, desktops |
| `xl` | 1280px | Large desktops |

### Responsive Behaviors

| Component | `< md` (Mobile) | `md - lg` (Tablet) | `lg+` (Desktop) |
|-----------|-----------------|---------------------|------------------|
| Sidebar | Hidden, hamburger menu in header | Hidden, hamburger menu | Visible, collapsible (64px / 256px) |
| Dashboard KPI cards | Stacked (1 column) | 2x2 grid | 4 across |
| Loan list table | Card list (stacked) | Table with horizontal scroll | Full table |
| Loan detail tabs | Horizontal scroll, no wrap | Horizontal scroll | Wrapping rows if needed |
| Document checklist | Stacked cards | Full rows | Full rows |
| Loan detail layout | Single column | Single column | 2-column (2/3 + 1/3) |
| Borrower portal | Full width, `px-4` | Centered, `max-w-lg` | Centered, `max-w-lg` |
| Upload zone | Stacked buttons (Take Photo + Choose File) | Drag-drop + buttons | Drag-drop zone |
| Tables (escalation queue) | Horizontal scroll with sticky first column | Full table | Full table |

### Mobile Sidebar

- Triggered by hamburger icon in the top-left of the header
- Opens as a full-height overlay from the left (`w-64, bg-slate-950`)
- Backdrop: `bg-black/50`, click to dismiss
- Animation: Slide in from left, `300ms ease-out`
- Contains all nav items identical to desktop sidebar
- Close button (X icon) in the top-right corner of the overlay

### Touch Targets

All interactive elements on mobile must meet minimum 44x44px (48x48px preferred):
- Buttons: Minimum `h-11` (44px)
- Table/list row tap targets: Full row width, minimum 48px height
- Icon buttons: Minimum `h-11 w-11`
- Upload buttons in portal: `h-14` (56px)
- Checkboxes: 20px checkbox + 24px padding around

---

## 9. Accessibility

### Color Independence

Color is never the sole indicator of state. Every colored element is paired with at least one of:
- Text label (e.g., "Accepted", "Needs Fix")
- Icon (e.g., checkmark, warning triangle, lock)
- Pattern (e.g., strikethrough for waived items)

### Contrast Ratios

All text meets WCAG 2.1 AA minimums:
- Body text (16px+): 4.5:1 contrast ratio minimum
- Large text (18px+ bold or 24px+): 3:1 contrast ratio minimum
- Non-text elements (icons, borders): 3:1 contrast ratio minimum
- Verified combinations:
  - `text-slate-900` on `bg-white`: 15.4:1
  - `text-slate-600` on `bg-white`: 5.7:1
  - `text-white` on `bg-red-600`: 4.6:1
  - `text-white` on `bg-amber-500`: 3.1:1 (use only for large text / icons)
  - `text-amber-800` on `bg-amber-50`: 7.2:1

### Keyboard Navigation

- All interactive elements are reachable via Tab key
- Tab order follows visual reading order (top-to-bottom, left-to-right)
- Enter/Space activates buttons and toggles
- Escape closes modals, dropdowns, expanded rows
- Arrow keys navigate within tab bars, dropdowns, and table rows
- Focus trap inside modals (Tab does not leave modal until dismissed)

### Focus Indicators

- All focusable elements show a visible focus ring: `ring-2 ring-blue-500 ring-offset-2`
- Focus ring is visible on both light and dark backgrounds
- Never use `outline-none` without a replacement focus indicator

### Screen Reader Support

- All state badges have `aria-label`: e.g., `aria-label="Document status: correction required"`
- Icon-only buttons have `aria-label`: e.g., `aria-label="Copy portal link"`
- Progress bars have `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`
- Toast notifications use `role="alert"` with `aria-live="polite"`
- Escalation banner uses `role="alert"` with `aria-live="assertive"` (critical only)
- Modals use `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing to modal title
- Tables use proper `<th>` headers with `scope="col"`

### Motion

- All animations respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- No auto-playing animations that cannot be paused
- Loading spinners are exempt (functional, not decorative)

### Touch Targets

- Minimum size: 44px x 44px (WCAG 2.1 Level AA)
- Preferred size: 48px x 48px
- Minimum spacing between adjacent targets: 8px
- Upload buttons in portal: 56px height (oversized for ease of use)

---

## 10. Borrower Communication Templates

### Welcome Email

**Subject**: "Upload your documents for [Officer First Name] [Officer Last Name]"

**Body**:
```
Hi [Borrower First Name],

[Officer First Name] [Officer Last Name] is working on your mortgage and needs a few documents from you.

It's quick and easy — just click the link below to upload your documents securely.

[Upload My Documents — button, amber, centered]

Here's what to expect:
- You'll see a checklist of needed documents
- Upload each one using your phone camera or by selecting a file
- We'll check each document right away and let you know if anything needs attention

Your data is encrypted and secure.

Questions? Contact [Officer First Name] at [Officer Email] or [Officer Phone].

— The LoanFlow AI Team
```

### Reminder Email (Day 3)

**Subject**: "Reminder: [X] documents still needed"

**Body**:
```
Hi [Borrower First Name],

Just a friendly reminder — [Officer First Name] still needs [X] document(s) from you to keep your loan moving:

- [Document name 1]
- [Document name 2]
- [Document name 3]

It only takes a few minutes. Upload them here:

[Upload My Documents — button, amber, centered]

Questions? Reply to this email or contact [Officer First Name] at [Officer Phone].

— The LoanFlow AI Team
```

### Reminder Email (Day 7)

**Subject**: "Your loan file needs attention — [X] documents missing"

**Body**:
```
Hi [Borrower First Name],

We're still waiting on [X] document(s) for your mortgage. Missing documents can delay your closing timeline, so please upload them as soon as you can:

- [Document name 1]
- [Document name 2]

[Upload My Documents — button, amber, centered]

If you're having trouble or have questions about any of these documents, [Officer First Name] is here to help: [Officer Phone] / [Officer Email].

— The LoanFlow AI Team
```

### Reminder SMS

```
Hi [First Name], [X] documents still needed for your mortgage. Upload here: [short link] — [Officer First Name] [Officer Last Name], [Company Name]
```

Maximum 160 characters. If over limit, truncate company name first, then officer last name.

### Correction Email

**Subject**: "Action needed: please re-upload your [friendly doc name]"

**Body**:
```
Hi [Borrower First Name],

We reviewed your [friendly doc name] and need you to upload a new version.

[Correction message — the same human-readable message shown in the portal]

Click here to re-upload:

[Re-upload Document — button, amber, centered]

If you need help, contact [Officer First Name] at [Officer Phone].

— The LoanFlow AI Team
```

### Email Styling

- Max width: 600px, centered
- Background: `#F8FAFC`
- Card background: `#FFFFFF`
- Primary button: `#F59E0B` background, `#FFFFFF` text, 16px padding, rounded-lg
- Text: `#1E293B` (slate-800), 16px, Inter or system sans-serif
- Footer text: `#94A3B8` (slate-400), 12px
- LoanFlow AI logo: Top-left of email header, small (24px icon + text)

---

## 11. Animation and Micro-interactions

All durations and easing functions below. Every animation respects `prefers-reduced-motion` (see Accessibility section).

| Interaction | Animation | Duration | Easing | Notes |
|-------------|-----------|----------|--------|-------|
| Page transition | Fade in | 200ms | `ease` | Content area only, sidebar does not animate |
| Card entrance | Slide up 8px + fade in | 300ms | `ease-out` | Staggered 50ms per card in lists |
| State badge change | Background color transition | 300ms | `ease` | Smooth color shift, no flash |
| Progress bar fill | Width transition | 500ms | `ease-out` | Smooth fill animation |
| Upload progress | Linear width increase | Matches upload | `linear` | Tied to actual upload progress |
| Success checkmark | SVG path draw | 400ms | `ease-out` | Green checkmark draws itself |
| Toast enter | Slide in from top-right | 300ms | `ease-out` | Enters from outside viewport |
| Toast exit | Fade out + slide up | 200ms | `ease-in` | Auto-dismiss after 5 seconds |
| Escalation banner enter | Slide down from top | 300ms | `ease-out` | Pushes content down |
| Escalation banner exit | Slide up | 200ms | `ease-in` | Content shifts up |
| Skeleton loading | Pulse opacity | 2000ms | `ease-in-out` | `animate-pulse` — loops until content loads |
| Modal enter | Fade in backdrop + scale card from 95% | 200ms | `ease-out` | Backdrop: `bg-black/50` fade |
| Modal exit | Fade out | 150ms | `ease-in` | Quick dismiss |
| Expanded row | Height auto + fade in | 300ms | `ease` | `overflow-hidden` during animation |
| Drag reorder | Follow cursor + shadow | Immediate | — | Item follows pointer, `shadow-lg` |
| Button press | Scale to 98% | 100ms | `ease` | Subtle tactile feedback on mobile |
| Sidebar collapse | Width transition | 300ms | `ease` | 256px to 64px, labels fade out |

### Loading States

Every async operation must show a loading state:

| Operation | Loading Pattern | Duration |
|-----------|----------------|----------|
| Page load | Skeleton placeholders matching layout | Until data fetched |
| Form submit | Button spinner + disabled state + "Saving..." text | Until response |
| File upload | Progress bar with percentage | Until upload complete |
| AI processing | Spinner + "Checking your document..." | 2-5 seconds typical |
| Generate summary | Skeleton pulse + "Analyzing documents..." | 3-5 seconds typical |
| Table data | Skeleton rows (3-5 placeholder rows) | Until data fetched |

---

## 12. Error States

Every component and page must handle error conditions gracefully. Below are the standard error patterns.

### Inline Errors (within components)

- Background: `bg-red-50 border border-red-200 rounded-lg p-4`
- Icon: `AlertCircle` (20px, `text-red-500`)
- Message: `text-sm text-red-700`
- Action: "Retry" button (`variant="outline"`, `text-red-600 border-red-300`)

### Toast Errors (for failed actions)

- Background: `bg-red-600 text-white`
- Duration: 8 seconds (longer than success toasts)
- Content: Error message + optional "Retry" text button

### Full Page Errors

- Centered in content area
- Large icon: `AlertTriangle` (48px, `text-slate-300`)
- Heading: `text-lg font-semibold text-slate-900` — "Something went wrong"
- Message: `text-sm text-slate-500` — specific error description
- Action: "Try Again" button (primary) + "Go Back" link (ghost)

### Network Errors

- Display: Inline banner at top of content area
- Background: `bg-amber-50 border border-amber-200`
- Message: "You appear to be offline. Changes will sync when your connection is restored."
- Auto-dismiss when connection is restored

### Form Validation Errors

- Field-level: Red border on input (`border-red-500`) + error message below (`text-xs text-red-600 mt-1`)
- Form-level: Red alert card above submit button with summary of all errors
- Focus first errored field on submit attempt

---

## 13. Empty States

Every list, table, and data view must have a designed empty state.

| Component / Page | Empty State Message | Action |
|-----------------|---------------------|--------|
| Dashboard loan list | "No loans yet. Create your first loan to get started." | "New Loan" button |
| Document checklist | "No document requirements. Generate a checklist to get started." | "Generate Checklist" button |
| Escalation queue | "No open escalations. Your queue is clear." | None (positive state) |
| Activity timeline | "No activity recorded yet." | None |
| Review summary | "Generate Review Summary" with sparkle icon | "Generate Summary" button |
| Stacking order | "Complete document validation before generating the submission stack." | None (shows progress) |
| Borrower portal docs | "Your loan officer hasn't added any document requests yet. Check back soon." | None |
| Portal — all complete | Green checkmark + "All documents submitted!" | None (positive state) |
| Conditions list | "No conditions yet." | "Add Condition" button |
| Messages list | "No messages yet." | "Send Message" button |

Empty state styling:
- Centered within the component area
- Icon: 48px, `text-slate-300`
- Heading: `text-base font-medium text-slate-700`
- Description: `text-sm text-slate-500 mt-1 max-w-sm mx-auto text-center`
- Action button: `mt-4`, standard primary or outline styling

---

## 14. Icon System

Using **Lucide React** (already installed in the project). All icons are 20px default size unless specified otherwise.

### Standard Icon Assignments

| Concept | Icon | Size | Notes |
|---------|------|------|-------|
| Dashboard | `LayoutDashboard` | 20px | Sidebar nav |
| Loans | `FileText` | 20px | Sidebar nav |
| Escalations | `AlertTriangle` | 20px | Sidebar nav, escalation cards |
| Contacts | `Users` | 20px | Sidebar nav |
| Settings | `Settings` | 20px | Sidebar nav |
| Upload | `Upload` | 20px | Upload buttons, KPI card |
| Document accepted | `CheckCircle` | 20px | Green, document state |
| Document confirmed | `Lock` | 20px | Green, locked/confirmed state |
| Document needed | `Circle` | 20px | Blue outline, pending state |
| Correction needed | `AlertTriangle` | 20px | Amber, correction state |
| Under review | `Eye` | 20px | Violet, officer review state |
| Processing | `Loader2` | 20px | Blue, with `animate-spin` |
| AI/System | `Sparkles` | 20px | Violet, AI-generated content |
| Officer actor | `User` | 16px | Activity timeline |
| Borrower actor | `Upload` | 16px | Activity timeline |
| System actor | `Settings` | 16px | Activity timeline (gear) |
| Copy | `Copy` | 16px | Copy to clipboard buttons |
| External link | `ExternalLink` | 16px | Open in new tab |
| Back | `ArrowLeft` | 16px | Back navigation |
| Expand | `ChevronDown` | 16px | Expand/collapse toggles |
| Close | `X` | 20px | Modal close, dismiss |
| Success toast | `CheckCircle` | 20px | Green |
| Error toast | `AlertCircle` | 20px | Red |
| Info | `Info` | 20px | Blue, informational |
| Camera | `Camera` | 20px | Mobile upload |
| Drag handle | `GripVertical` | 16px | Reorderable lists |
| Security | `Shield` | 16px | Portal footer |

---

## 15. Design Tokens Summary

For implementation, these are the key design decisions that differ from or extend the existing codebase:

### New Additions to Existing Codebase

1. **Sidebar nav item**: "Escalations" with `AlertTriangle` icon + red dot indicator for unresolved items
2. **Default loan detail tab**: Documents (currently Overview)
3. **New page**: `/dashboard/escalations` — escalation queue
4. **New components**: `DocumentRequirementRow`, `EscalationCard`, `EscalationBanner`, `FileReadinessCard`, `ReviewSummaryPanel`, `ActivityTimeline`, `BorrowerUploadCard`, `ProgressHeader`, `CorrectionMessage`, `ConfidenceIndicator`, `StakingOrderPreview`
5. **New loan detail tabs**: Escalations, Review, Activity
6. **Portal enhancements**: ProgressHeader with personalized greeting, BorrowerUploadCard replacing current checklist, CorrectionMessage for failed validations

### Existing Components to Preserve

- `Sidebar` (extend with escalation nav item)
- `Card`, `Button`, `Badge`, `Tabs`, `Select`, `Progress`, `Separator`, `Skeleton` (all Radix-based, no changes)
- `LoanStatusBadge` (keep existing)
- `ReadinessScore` (evolve into `FileReadinessCard`)
- `PortalChecklist` (evolve into `BorrowerUploadCard` list)
- `PortalUploader` (enhance with camera-first mobile flow)

### Color System Extension

The existing Tailwind config (`tailwind.config.ts`) is minimal. The color system defined in this document uses Tailwind's built-in color palette (slate, blue, emerald, amber, red, violet, orange, gray) — no custom theme extension is required. All colors are referenced by their Tailwind utility class names.

---

*End of Design System v2.0*
