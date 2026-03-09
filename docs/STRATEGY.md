# LoanFlow AI — Product Strategy

**Version**: 2.0
**Date**: March 8, 2026
**Status**: Active — Investor-Grade Strategic Plan

---

## 1. Executive Summary

LoanFlow AI is building the first **AI loan processor** — not an AI tool, not an AI feature, but a full replacement for the human processor role that costs independent mortgage loan officers $3,000-$7,500 per month.

**The problem**: Independent loan officers pay $500-$750 per loan file to human processors whose primary job is chasing, collecting, validating, and stacking borrower documents. For an officer closing 3-10 loans per month, this represents $1,500-$7,500 in monthly processor costs — often the single largest line item after their broker split. The process is slow (12-18 days to collect a complete file), error-prone (8-15 borrower touchpoints per loan), and entirely manual.

**The solution**: A full-stack AI-powered loan origination platform that replaces the processor end-to-end. Four AI agents work in concert: an Intake Agent generates document checklists instantly, a Document Intelligence Agent classifies and validates uploads in real-time, a Borrower Concierge answers borrower questions 24/7 in the portal, and an Officer Copilot generates review summaries with one-click approval. The system handles conventional, FHA, VA, and self-employed loans. It chases documents via SMS and email. It auto-matches lender conditions to validated documents. It produces lender-ready stacking orders. The officer retains full control; the AI does the work.

**The product today**: LoanFlow AI already has a fully functional loan origination platform — 1003 application wizard, pricing engine, AUS simulation, pre-approval letters, lender submission tracking, condition management, borrower portal, CRM, compliance tools, and billing. What we are building this quarter is the intelligent document processing layer that transforms it from a productivity tool into a processor replacement.

**The integration**: A standalone document processing prototype (Mortgage AI) has been built with 4 AI agents, deterministic workflow engines, validation rules, an escalation system, and confidence scoring. This strategy outlines how we integrate that system into LoanFlow AI to create the industry's first AI loan processor for independent originators.

**Why now**: The competitive window is open but closing. Floify just launched "Dynamic AI" — basic document validation bolted onto their portal. DocVu AI and Infrrd are selling enterprise AI extraction tools. No one has built the full processor replacement. We have 6-12 months to establish the category before incumbents catch up.

**Market opportunity**: 100,000+ independent mortgage LOs in the US. At $299/month (Pro tier), converting 500 customers in Year 1 represents $2.1M ARR. At 5,000 customers in Year 3, $21M ARR. At vertical AI SaaS multiples (15-25x revenue), that represents $315M-$525M in valuation potential.

---

## 2. Vision

### The North Star

**"Every independent loan officer gets an AI processor that works 24/7, costs 90% less than a human processor, and delivers a lender-ready file faster than any human can."**

### Where We Are Today

The typical independent LO's document workflow:

1. Officer creates a loan file and manually decides which documents to request
2. Officer (or processor) emails the borrower a list of needed documents
3. Borrower emails back documents — sometimes the wrong ones, sometimes blurry photos, sometimes partial
4. Processor reviews each document manually, identifies issues, emails the borrower again
5. Steps 3-4 repeat 2-5 times per document type
6. Processor confirms everything is in order, stacks documents in lender-required order, officer reviews and submits
7. Lender issues 15+ conditions requiring additional documents — processor manually maps each condition to a document, cycle repeats

Average time from application to complete document file: **12-18 days**. Average number of borrower touchpoints for document collection: **8-15 emails/calls**. Average processor cost: **$500-$750 per loan**.

### Where We Are Going

1. Officer creates a loan file — AI instantly generates the exact document checklist (conventional, FHA, VA, or self-employed)
2. Borrower receives a portal link (via SMS + email) and sees a friendly, visual checklist with the officer's branding
3. Borrower uploads each document — AI validates in 2-3 seconds, confirms acceptance or requests a specific correction in plain English
4. Borrower has questions — the Concierge chat answers instantly in the portal (no waiting for the officer to respond)
5. If anything looks suspicious or ambiguous, AI escalates to the officer with a clear summary and recommended action
6. Documents approaching expiration trigger proactive alerts before they go stale
7. When all documents validate, AI generates a review summary, calculates qualifying income, and produces a lender-ready stacking order
8. Lender issues conditions — AI auto-matches each condition to validated documents, flags gaps
9. Officer confirms with one click — file is ready

Target time from application to complete document file: **3-5 days**. Target borrower touchpoints: **1-2 interactions**. Target processor cost: **$0**.

### Human Judgment Preserved

This is not a "black box" system. The AI never makes lending decisions, never advises borrowers on rates or approval odds, and never marks a loan as ready without officer confirmation. The officer is the decision-maker. The AI is the processor — fast, tireless, and consistent. The escalation system ensures that every edge case reaches a human. Officers never lose control.

---

## 3. Competitive Landscape

### Direct Competitors

| Competitor | Model | Price Point | AI Capability | Target Market | Key Weakness |
|---|---|---|---|---|---|
| **Human Processor** | Per-loan fee | $500-750/loan | N/A (human) | All LOs | Expensive, slow, inconsistent, limited hours, single point of failure |
| **Floify** | Document portal | $49-175/mo | "Dynamic AI" (2026) — basic doc validation at application start | Small-mid brokerages | Portal only, no LOS, AI is a feature not architecture. No conditions matching, no escalation, no stacking order |
| **DocVu AI** | Enterprise IDP | Custom (enterprise) | 500+ doc types, 60-80% cost reduction claims | Lenders with 100+ LOs | Enterprise-only, no portal, no LOS, no LO-facing features. Sells to ops teams, not independent LOs |
| **Infrrd** | Enterprise IDP | Custom (enterprise) | AI extraction for paystubs, bank statements, 1003s. HousingWire 2026 Tech100 | Enterprise lenders | Same as DocVu — enterprise platform, not an end-user product. API/platform, not a tool an LO would use |
| **Cloudvirga** | Digital mortgage platform | Custom | Claims "underwriter-ready loan files in 10 minutes" | Mid-market lenders | Acquired, mostly serving mid-market. Not indie-focused. Limited AI innovation post-acquisition |
| **Addy AI** | AI extraction | Custom | ML-based extraction for bank statements, pay stubs, tax forms | Lenders | Extraction-only tool. No workflow, no portal, no escalation system. A component, not a product |
| **Blend** | Enterprise SaaS | $10K+/mo | Some automation | Top 200 lenders | Enterprise-only, no independent LO support. Massive overhead |
| **Encompass (ICE)** | LOS platform | $100+/user/mo | Plugin-based | All sizes | Legacy architecture, requires add-ons for any intelligence. No native AI |
| **LendingPad** | Cloud LOS | $59/user/mo | None | Small-mid | Basic cloud LOS, no document intelligence, no AI |
| **SimpleNexus (ICE/nCino)** | Enterprise LOS | Custom | Minimal | Mid-large lenders | Enterprise sales cycle, not built for independents |
| **Calyx Point** | Desktop LOS | Per-seat license | None | Independents | Desktop-only, aging technology, no AI, no portal |

### The Competitive Insight

**No one has built an AI processor. Everyone has built AI tools.**

DocVu, Infrrd, Addy AI = AI extraction tools (they pull data from documents). Floify = document portal with some AI bolted on. Encompass = LOS with plugin ecosystem. None of them deliver what a processor delivers: checklist generation, document chasing, validation, correction requests, escalation, conditions matching, review summary, and stacking order.

LoanFlow AI is not competing with any single tool. We are replacing a $500-$750/loan human role with a $50/loan AI system that works 24/7. That is a fundamentally different value proposition.

### Our Competitive Advantages

1. **AI-native architecture**: Document intelligence is not bolted on — it is the core product. Every upload triggers a classification/validation pipeline. The AI is the architecture, not a feature.

2. **Full processor replacement**: Checklist generation, document chasing (SMS + email), validation, correction requests, escalation, conditions matching, review summaries, income calculation, and stacking order. This is the complete processor workflow, automated end-to-end.

3. **Built for independents**: No enterprise sales cycle. Self-serve signup, free trial, immediate value. The UX is designed for a solo operator, not a 50-person ops team.

4. **Full-stack platform**: Unlike Floify (portal only) or standalone AI tools, LoanFlow AI is a complete loan origination system. Officers do not need to stitch together 5 products.

5. **Deterministic + AI hybrid**: Document validation rules are deterministic and auditable. AI handles classification and extraction; rules handle validation. This makes the system explainable, consistent, and trustworthy — critical for mortgage compliance.

6. **Human-in-the-loop by design**: The escalation system (10 categories, 4 severity levels) ensures that edge cases always reach a human. Officers never lose control. The AI knows what it does not know.

7. **Government and self-employed loan support**: FHA, VA, and self-employed borrower support from Day 1. 30%+ of independent LO volume is government loans. Self-employed is the fastest-growing segment and the hardest to process. No competitor does self-employed with AI.

---

## 4. Product Positioning

### Primary Tagline

**"Your AI Loan Processor"**

This positions directly against the $500-750/loan human processor, makes the value proposition instantly clear, and naturally leads into a cost-savings conversation. The word "processor" is industry-specific and immediately resonant with the target buyer.

### Supporting Taglines

| Tagline | Angle |
|---|---|
| **"Close More Loans. Chase Fewer Documents."** | Outcome-focused, addresses daily pain |
| **"The Processor That Never Sleeps"** | 24/7 availability, memorable |
| **"90% Less Than a Processor. 10x Faster."** | ROI-first messaging |
| **"AI-Powered Loan Origination for Independent Officers"** | Descriptive, SEO-friendly |

### Value Proposition

**For the independent mortgage loan officer who closes 3-10 loans per month**, LoanFlow AI is an AI-powered loan origination platform that replaces your loan processor at 90% less cost. Unlike hiring a human processor or cobbling together a portal + LOS + email, LoanFlow AI provides a single platform where AI handles document checklists, validation, borrower chasing, conditions matching, and stacking orders — while you keep full control over every decision. It works on conventional, FHA, VA, and self-employed loans. It works at 2 AM. It never calls in sick.

---

## 5. Pricing Strategy

### Competitive Pricing Context

| Competitor/Alternative | Price | What You Get |
|---|---|---|
| Floify Business | $49/mo | Document portal only. No AI, no LOS |
| Floify Team | $175/mo | Multi-user portal. Still no AI |
| LendingPad | $59/user/mo | Basic cloud LOS. No AI |
| Encompass | $100+/user/mo | Full LOS, legacy architecture. No AI |
| Human processor | $500-750/loan | $3,000-7,500/mo for 3-10 loans. Full processor workflow |
| DocVu AI / Infrrd | Enterprise pricing ($$$) | AI doc processing only. No LOS, no portal |

### Why We Price Higher, Not Lower

The previous $49/$99/$199 pricing was wrong for three reasons:

1. **It signals cheap, not premium.** Pricing below Floify — which has NO AI — tells the market we are inferior, not superior. Independent LOs already pay $100+/month for basic tools. An AI processor replacement at $99 feels suspicious, not attractive.

2. **It leaves money on the table.** The value delivered is $3,000-7,500/month in processor cost savings. Capturing 4-10% of that value ($149-$599) is reasonable and expected by buyers accustomed to ROI-based purchasing.

3. **It cannot sustain a business.** At $99 average and 200 customers, MRR is $19,800. At $299 average and 200 customers, MRR is $59,800. Same customers, 3x revenue. The higher price funds faster iteration, better support, and longer runway.

### Pricing Tiers

| Tier | Price | Target | Included |
|---|---|---|---|
| **Trial** | Free (30 days) | New signups | Full Pro access, 2 active loans max, no credit card required |
| **Starter** | $149/mo | Solo LO, 1-3 loans/mo | AI doc processing (6 core doc types), 10 active loans, email reminders, basic borrower portal, readiness score |
| **Professional** | $299/mo | Full-time LO, 3-8 loans/mo | Full AI pipeline, 30 active loans, SMS + email reminders, FHA/VA/self-employed support, condition-to-document matching, escalation dashboard, officer copilot summaries, borrower concierge chat, stacking order generation, income calculator, document expiration warnings, portal branding, priority AI processing |
| **Team** | $599/mo | Small teams, 8+ loans/mo | 5 officer seats, 75 active loans, team workflows (officer assignment, processor role), custom document types, analytics dashboard, branded portal, bulk operations, all Pro features |
| **Enterprise** | Custom | Brokerages with 10+ LOs | Unlimited seats, LOS integration (Encompass, LendingPad, Byte), white-label portal, dedicated support, custom AI training, webhook API, SLA |

### Per-Loan Economics (Professional Tier)

At $299/month and 6 loans/month:

| Metric | Value |
|---|---|
| LoanFlow cost per loan | $299 / 6 = **$49.83** |
| Human processor cost per loan | $500-$750 |
| Savings per loan | **$450-$700 (90-93%)** |
| Monthly savings | $2,700-$4,200 |
| Annual savings | **$32,400-$50,400** |
| ROI | **9-14x** |

Even at the Starter tier ($149/month, 3 loans/month): $49.67/loan vs $500-$750/loan = $1,350-$2,100/month in savings. The ROI argument is self-evident at every tier.

### Revenue Impact of New Pricing

| Scenario | Avg Price | Customers | MRR | ARR |
|---|---|---|---|---|
| Old pricing | $99 | 200 | $19,800 | $237,600 |
| **New pricing** | $299 | 200 | **$59,800** | **$717,600** |
| Year 1 target | $350 (blended) | 500 | $175,000 | $2,100,000 |
| Year 3 target | $350 (blended) | 5,000 | $1,750,000 | $21,000,000 |

### AI Cost Management

Claude API costs per document classification + extraction + validation: approximately $0.02-$0.08 per document (Haiku for classification, Sonnet for complex extraction).

| Scale | Docs/Month | AI Cost/Month | % of Revenue |
|---|---|---|---|
| 200 customers | 6,000 | ~$300 | 0.5% |
| 2,000 customers | 60,000 | ~$3,000 | 0.5% |
| 5,000 customers | 150,000 | ~$7,500 | 0.4% |

AI costs are negligible at every scale point. The `token_usage` table already tracks per-module, per-model costs. A `doc_intelligence` module tag will monitor document processing costs separately.

---

## 6. Go-to-Market

### Target Persona

**Primary: Independent Mortgage Loan Officer**
- Licensed NMLS originator working under a broker or small lender
- Closes 3-10 loans per month
- Currently pays a processor ($500-$750/loan) or does processing themselves (evenings and weekends)
- Tech-savvy enough to use a web app (already using Encompass, Floify, etc.)
- Active on LinkedIn, mortgage broker Facebook groups, state association events
- Age: 30-55
- Core pain: Spending evenings chasing documents, paying processor fees that eat margins, losing deals because files take too long to complete

**Secondary: Small Brokerage Owner (2-5 LOs)**
- Manages a small team, wants to reduce overhead and standardize quality
- Team tier customer ($599/month)
- Decision-maker for tool adoption across the team
- Cares about consistency, compliance, and cost control

### First 10 Customers Strategy

The first 10 customers will not come from ads or SEO. They come from handshakes, demos, and direct proof of value.

**Week 1-2: Warm Network**
- Personal network outreach — anyone who knows a mortgage LO gets a text
- LinkedIn connection requests to 50 LOs who post about paperwork/processing pain
- Direct DM with a 90-second Loom video (the Activation Trigger Video — see below)
- Ask every connection: "Who's your LO?" — mortgage is a relationship industry, everyone has one

**Week 3-4: Community Seeding**
- Facebook groups: "Mortgage Loan Officers" (50K members), "Mortgage Professionals" (30K members)
- Post genuine value-add content (not salesy): "I built an AI tool that validates mortgage docs in 3 seconds. Here is a demo. Looking for 10 LOs to try it free for 30 days."
- Reddit: r/mortgagesales, r/realestate, r/loanoriginators
- BiggerPockets mortgage forums — high-intent audience

**Week 5-8: Proof Points**
- Offer to process 1 loan file for free — literally take their next loan, run it through LoanFlow AI, show them the before/after
- Record case study videos with first beta users (screen share, 3-5 minutes, real loan file with PII redacted)
- Local MBA (Mortgage Bankers Association) chapter events — show up, demo on phone, collect emails
- State association conferences — not a booth, just attendance with a phone demo ready

### The Activation Trigger Video

A 90-second screen recording that demonstrates the core value loop:

1. **0:00-0:15** — Officer creates a loan, selects "FHA" loan type. AI generates a complete checklist instantly (including DD-214, FHA case number docs).
2. **0:15-0:30** — Borrower receives SMS with portal link. Opens portal branded with officer's name, photo, and NMLS#.
3. **0:30-0:50** — Borrower uploads a blurry pay stub. AI rejects it in 2 seconds with a specific message: "Please upload a clearer photo showing your year-to-date income in the top section."
4. **0:50-1:05** — Borrower uploads a clean version. AI validates in 2 seconds. Green checkmark appears. Borrower sees progress bar advance.
5. **1:05-1:20** — All docs are complete. AI generates an officer review summary with qualifying income calculated and a one-click "Mark Ready" button.
6. **1:20-1:30** — Officer clicks "Generate Stacking Order" — a lender-ready PDF of all validated documents in correct order downloads instantly.

This video IS the GTM. It shows the magic in 90 seconds. Every channel — LinkedIn, Facebook, Reddit, DMs, email — leads back to this video.

### Distribution Channels

| Channel | Strategy | Expected CAC | Timeline |
|---|---|---|---|
| **Direct Outreach** | Personal DMs with Activation Trigger Video | $0 | Weeks 1-4 |
| **Mortgage Facebook Groups** | Value-add posts with demo link, not ads | $0-20 | Weeks 3-8 |
| **LinkedIn** | Targeted content + connection-based outreach to NMLS professionals | $50-100 | Weeks 2-12 |
| **YouTube / Demo Videos** | Activation Trigger Video + case studies. SEO for "AI mortgage processor" | $0-20 | Weeks 4+ |
| **Organic Search / SEO** | Content: "How to reduce processor costs," "AI for mortgage brokers," "Best document portal for LOs" | $0-20 | Month 3+ |
| **Referral Program** | Existing users refer peers — 1 month free for both parties | $149-299 | Month 3+ |
| **NMLS State Associations** | Sponsor local MBA events, present at state conferences | $100-200 | Month 4+ |
| **Paid LinkedIn Ads** | Retargeting video viewers + lookalike audiences from first 50 customers | $100-200 | Month 6+ |

### Activation Funnel with Targets

```
Landing page visit                              → 100%
Sign up (free 30-day trial, no CC required)     →  15%
Create first loan (within 10 min of signup)     →  80% of signups
AI generates checklist (first "wow" moment)     → 100% of loan creators
Upload test document (within first session)     →  60%
AI validates in 2 seconds (second "wow" moment) → 100% of uploaders
Invite first real borrower (within first week)  →  40%
Borrower uploads documents                      →  70% of invited borrowers
"This replaced my processor" realization        →  50%
Convert to paid                                 →  25% of active trial users
```

**Key activation metric**: Time from signup to first AI-validated document. Target: **under 10 minutes**.

**Aha moment**: The instant a loan officer uploads a document and sees it classified, validated, and matched to a requirement in under 3 seconds — they understand the value. The second aha moment is when their borrower uploads a document at 11 PM and it is validated without the officer lifting a finger.

### Launch Phases

**Phase 1 — Private Beta (Weeks 1-4)**
- 10-20 hand-selected independent LOs from direct outreach
- Direct onboarding calls (30 min each)
- Daily feedback collection via Slack channel or group text
- Focus: AI accuracy, UX friction, edge cases, false positives/negatives
- Success criteria: 50 loans processed, >90% classification accuracy, 3 case study videos recorded

**Phase 2 — Open Beta (Weeks 5-8)**
- Open signups with 30-day trial (no credit card)
- LinkedIn launch announcement with Activation Trigger Video
- First YouTube demo videos published
- Community seeding in Facebook groups and Reddit
- Focus: Funnel conversion rates, activation metrics, support volume
- Success criteria: 100 signups, 40% activation rate, first 10 paying customers

**Phase 3 — General Availability (Week 9+)**
- Standard 30-day trial (no credit card)
- Referral program launch
- Paid LinkedIn ads begin
- Conference sponsorships begin
- Focus: MRR growth, churn rate, NPS
- Success criteria: 50 paying customers by end of Month 3

---

## 7. MVP Feature Set — Q2 2026: "The AI Loan Processor"

This is not a "minimum viable product" in the sense of shipping something half-baked. This is the minimum feature set required to genuinely replace a human processor on a standard loan. If we ship less than this, we are "Floify with AI classification bolted on" — not enough differentiation to win.

### Core AI Agents

| Agent | Role | Key Capabilities |
|---|---|---|
| **Intake Agent** | Generates document checklists | Loan-type-aware (conventional, FHA, VA, self-employed). Instant checklist creation on loan creation. Adjusts for borrower employment type, property type, and loan program |
| **Document Intelligence Agent** | Classifies, extracts, and validates | 6 core doc types + FHA/VA types + self-employed types. Confidence scoring with 0.75 threshold. Deterministic validation rules. Correction requests in plain English |
| **Borrower Concierge Agent** | Real-time portal Q&A | Answers borrower questions about document status, what is needed, why something was rejected. Deflects all advisory questions (rates, approval odds) to officer. Available 24/7 in portal chat |
| **Officer Copilot Agent** | Review summaries + stacking | Generates loan review summary when all docs validate. Calculates qualifying income from validated pay stubs + W-2s. Produces lender-ready stacking order PDF. One-click "Mark Ready" |

### Document Types Supported at MVP

**Conventional Loans**:
- Pay stub (30-day, YTD verification)
- W-2 (2-year history)
- Bank statement (2-month, all pages)
- Government ID (driver's license, passport)
- Purchase contract (executed, all addenda)
- Tax returns (1040, 2-year — for self-employed)

**FHA Loans** (additional):
- FHA case number documentation
- FHA-specific appraisal requirements checklist
- Gift letter (if applicable)

**VA Loans** (additional):
- DD-214 (Certificate of Release or Discharge)
- VA Certificate of Eligibility (COE)
- VA-specific documentation requirements

**Self-Employed Borrowers** (additional):
- Tax returns (1040, 2-year with all schedules)
- Schedule C (sole proprietor)
- Profit & loss statement (year-to-date)
- Business license (if applicable)

### Escalation System

- 10 escalation categories (document quality, data mismatch, missing information, fraud indicators, etc.)
- 4 severity levels (info, warning, critical, urgent)
- Officer escalation dashboard with recommended actions
- Auto-escalation after 3 failed reminder attempts

### Condition-to-Document Auto-Matching

When a lender issues conditions (e.g., "Provide 2 most recent bank statements showing all pages"), the system:
1. Parses condition text to identify the document type and requirements
2. Checks if a validated document already satisfies the condition
3. If satisfied: auto-links condition to document, marks as cleared
4. If not satisfied: creates a new document requirement on the borrower's checklist and triggers a reminder

This is the **#1 time-sink for processors** — manually mapping 15+ conditions to documents. Automating this is a genuine differentiator that no competitor offers.

### Communication & Chasing

- **SMS reminders via Twilio**: Day 1 (welcome + portal link), Day 3 (gentle reminder), Day 7 (urgency nudge), Day 14 (escalation warning)
- **Email reminders**: Same cadence, richer formatting with visual checklist progress
- **Auto-escalation**: After 3 attempts with no response, escalate to officer with recommended action
- **SMS open/delivery tracking**: Confirm messages are received

SMS has a 98% open rate vs 20% for email. Without SMS, the "auto-chase" value prop is half-baked. Both channels are required at MVP.

### Borrower Portal Enhancements

- Visual document checklist with real-time AI feedback
- Concierge chat for instant Q&A
- Officer branding: name, photo, NMLS#, company logo
- One-click portal link sharing (copy link + pre-written text for SMS/email)
- Real-time status updates (no page refresh needed — Supabase subscriptions)
- Mobile-optimized upload experience (camera capture + file upload)

### Officer Dashboard Enhancements

- Escalation dashboard with severity-sorted queue
- Document expiration warnings ("John's pay stub expires in 5 days" — proactive alerts so LOs never get caught with stale docs)
- Readiness score integration (factor doc checklist completion into existing readiness score: "Your file is 78% ready — missing: bank statement")
- Income calculator integration (when pay stubs + W-2s validate, auto-calculate qualifying income)
- Real-time dashboard updates via Supabase subscriptions (when borrower uploads, dashboard updates live)
- Activity timeline / event log on loan detail page
- Stacking order preview and PDF generation

### Database Changes

New tables: `document_requirements`, `escalations`, `event_logs`, `review_decisions`. Enhanced `documents` table with AI classification fields, confidence scores, and validation results. New migration file in `supabase/migrations/`.

### MVP Success Criteria

| Metric | Target |
|---|---|
| Beta users | 20+ officers with real loans |
| Loans processed through AI pipeline | 50+ |
| Classification accuracy | >90% (target >95%) |
| Average document collection time | <5 days (vs 12-18 today) |
| Condition auto-match accuracy | >85% |
| FHA/VA loans as % of AI-processed | >20% |
| Self-employed loans processed | 5+ |
| Paying customers at end of Q2 | 10+ |

---

## 8. Roadmap

### Q2 2026 — "The AI Loan Processor" (This Quarter)

**Theme**: Ship everything needed to replace a human processor on a standard loan.

**Deliverables**:
- All 4 AI agents (Intake, Document Intelligence, Borrower Concierge, Officer Copilot)
- Deterministic document validation for all supported types (conventional + FHA + VA + self-employed)
- Escalation system with 10 categories and 4 severity levels
- Condition-to-document auto-matching
- SMS + email reminders with auto-escalation after 3 attempts
- Borrower portal with concierge chat, officer branding, real-time updates
- Officer copilot review summaries + lender-ready stacking order PDF
- Document expiration warnings
- Income calculator integration with validated pay stubs + W-2s
- Readiness score integration with document checklist completion
- One-click portal link sharing
- Real-time Supabase subscriptions for live dashboard updates
- Activity timeline / event log
- Database migration for new tables and enhanced documents table

**Success criteria**: 20 beta users, 50+ loans processed, >90% classification accuracy, <5 day average document collection time, 10+ paying customers.

### Q3 2026 — "Scale & Delight"

**Theme**: Handle real-world complexity and deliver features that create delight.

**Deliverables**:
- Co-borrower support (separate document checklists per borrower on a single loan)
- Custom document types (officer-defined additional requirements beyond standard checklist)
- Advanced analytics dashboard (time savings per loan, document turnaround trends, AI accuracy per officer, cost per loan)
- Batch operations (bulk reminders, bulk status updates)
- Document version history and comparison
- Automated compliance checks (TRID timeline enforcement, rate lock expiration warnings)
- Enhanced AUS simulation factoring in document completeness
- Mobile-optimized officer experience (responsive design, not native app yet)

**Success criteria**: 150+ paying customers, $45K MRR, co-borrower loans processed without manual workarounds, analytics dashboard adopted by >50% of Pro/Team users.

### Q4 2026 — "Integration & Teams"

**Theme**: Become the hub of the independent LO's technology stack.

**Deliverables**:
- Encompass integration (push validated documents + extracted data)
- LendingPad integration
- Byte Software integration
- Team workflows (officer assignment, processor role with scoped access)
- White-label portal for brokerages
- Webhook API for third-party integrations
- Multi-property support (investment loans)
- Custom AI training on customer document corpus (with consent, opt-in)

**Success criteria**: 500+ paying customers, $175K MRR, at least one LOS integration live, Team tier adoption >10% of paid base.

### Q1 2027 — "Marketplace & Mobile"

**Theme**: Network effects and mobile-first officer experience.

**Deliverables**:
- Lender marketplace (browse wholesale lender requirements, auto-match document checklists to specific lender overlays)
- Rate lock monitoring + document completeness alerts ("Rate lock expires in 5 days, file is 85% ready")
- Mobile app (React Native) for officer escalation review, document approval, and borrower communication
- AI model fine-tuning on customer document corpus (with consent) for improved accuracy
- SOC 2 Type II certification
- Advanced fraud detection (document tampering, inconsistency detection across docs)

**Success criteria**: 2,000+ paying customers, $700K+ MRR, mobile app live on iOS + Android, SOC 2 certification in progress.

---

## 9. Success Metrics

### North Star Metric

**Monthly Active Loan Files with AI-Validated Documents**: The count of unique loan files per month where at least one document was AI-validated. This metric captures both user engagement and core feature adoption.

### Activation Metrics

| Metric | Definition | Target |
|---|---|---|
| Time to first loan | Minutes from signup to first loan created | < 5 minutes |
| Time to first AI validation | Minutes from signup to first document AI-validated | < 10 minutes |
| Checklist generation rate | % of new loans with auto-generated checklist | 100% |
| Borrower invite rate | % of loans where borrower portal invite is sent | > 70% within first week |

### Engagement Metrics

| Metric | Definition | Target |
|---|---|---|
| Document collection time | Days from borrower invite to all docs validated | < 5 days (vs 12-18 today) |
| Document chasing reduction | Reduction in officer-initiated follow-up messages per loan | > 70% |
| AI auto-validation rate | % of uploads validated without human intervention | > 80% |
| Escalation rate | % of uploads requiring officer attention | < 15% |
| Correction rate | % of uploads requiring borrower re-upload | < 25% |
| Condition auto-match rate | % of lender conditions auto-matched to documents | > 85% |
| Monthly active loans per officer | Average loan files actively using AI docs per officer per month | > 3 |

### Business Metrics

| Metric | Month 3 Target | Month 6 Target | Month 12 Target |
|---|---|---|---|
| Paying customers | 50 | 150 | 500 |
| MRR | $15K | $45K | $175K |
| Trial-to-paid conversion | >15% | >20% | >25% |
| Net revenue retention | >100% | >110% | >115% |
| Monthly churn rate | <5% | <3% | <3% |
| NPS score | >40 | >60 | >65 |
| Blended ARPU | $300 | $300 | $350 |

### AI Quality Metrics

| Metric | Definition | Target |
|---|---|---|
| Classification accuracy | % of documents correctly classified by doc type | > 95% |
| False positive rate | % of valid documents incorrectly flagged as issues | < 3% |
| False negative rate | % of problematic documents incorrectly accepted | < 2% |
| Average confidence score | Mean confidence score on AI classifications | > 0.85 |
| Escalation resolution time | Average time from escalation created to resolved | < 4 hours |
| Self-employed doc accuracy | Classification accuracy on tax returns, Schedule C, P&L | > 90% |

---

## 10. Risk Analysis

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **AI misclassifies a document** | Medium | Medium | Confidence scoring with 0.75 threshold; below threshold always escalates to human. Deterministic validation rules catch misclassifications that pass confidence threshold. Double-validation on high-stakes doc types (tax returns, contracts). |
| **Claude API downtime** | High | Low | Graceful degradation: documents accepted with `pending_ai_review` status, queued for processing when API returns. Officer can still manually review. Status page monitoring with alerts. |
| **Claude API cost spikes** | Medium | Low | Per-user token tracking already in place. Rate limiting per tier. Haiku for classification (fast/cheap), Sonnet only for complex extraction. Cost is <1% of revenue at all scale points (see Section 5). |
| **Document extraction inaccuracy** | Medium | Medium | Deterministic validation rules as a safety net (date checks, field presence checks, amount cross-references). AI extraction is advisory; rules are authoritative. |
| **Self-employed doc complexity** | Medium | High | Tax returns are 20+ pages, Schedule C varies wildly. Mitigation: Start with extraction of key fields only (AGI, net profit, YTD). Do not try to replicate a full CPA review. Escalate edge cases to officer with extracted data for manual verification. |
| **API cost at scale** | Low | Low | At 200 customers x 6 loans x 5 docs = 6,000 classifications/mo. At ~$0.05/classification = $300/mo. At 2,000 customers = $3,000/mo. Still <1% of revenue at new pricing. Manageable at every scale point. |
| **Scalability under load** | Medium | Low | Supabase handles DB scaling. Document processing is async (upload -> queue -> process). No synchronous bottleneck. Supabase Storage for file hosting. |

### Competitive Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **Floify Dynamic AI** | High | High | Direct competitive threat — they have brand recognition and existing customer base. Mitigation: They are a POS (point-of-sale), we are a full platform. Their AI is feature-level (validation at application start), ours is architecture-level (full processor replacement). Their AI does not do conditions matching, stacking orders, escalation, or borrower concierge. Speed: ship faster, iterate weekly. |
| **Incumbents add AI features** | Medium | Medium | Speed advantage: we ship AI-native features while incumbents retrofit legacy systems. Our indie-LO focus means we move faster than enterprise vendors. By the time Encompass ships meaningful AI, we should have 500+ customers and case studies. |
| **Enterprise IDP vendors move downmarket** | Medium | Low | DocVu, Infrrd, and Addy are built for enterprise ops teams, not individual LOs. Rebuilding for self-serve SMB is a 12-18 month effort. Different GTM, different UX, different pricing model. |

### Regulatory & Compliance Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **RESPA / TILA violation** | Critical | Low | LoanFlow AI never makes lending decisions, never quotes rates to borrowers, never advises on loan products. The Borrower Concierge explicitly deflects all advisory questions and escalates to the officer. All disclosures remain officer-controlled. |
| **Fair lending concerns** | Critical | Low | AI is used for document classification and data extraction only — never for credit decisions, pricing, or approval/denial. No protected-class data is used in any AI decision. Classification rules are deterministic and auditable. |
| **PII in AI prompts** | High | Medium | Minimize PII sent to Claude: no SSN, no full DOB, no account numbers in prompts. Send only document images and metadata needed for classification. Document data handling in privacy policy. Supabase Storage with signed URLs for document access. |
| **State-specific licensing** | Medium | Low | LoanFlow AI is a tool for licensed LOs, not a lender or servicer. No licensing required for the software itself. Officers must maintain their own NMLS licenses. |
| **Data breach** | Critical | Low | Supabase Storage with signed URLs (time-limited access). RLS on all tables. No document data stored in browser localStorage. Service role key used only in server-side API routes. SOC 2 certification planned for Q1 2027. |

### Business Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **LOs resist AI adoption** | High | Medium | Position as "assistant" not "replacement for you." Human-in-the-loop design. Officers maintain full control. Start with beta users who are already tech-forward. The Activation Trigger Video demonstrates trust and control. |
| **Processor pushback / industry resistance** | Low | Medium | Not our target market's concern — indie LOs want to reduce processor costs. Team tier positions LoanFlow as a tool processors can use (augmentation, not replacement, in team context). |
| **Customer concentration** | Medium | High (early) | Diversify early via multiple channels. No single customer should exceed 5% of revenue. Target multiple geographies and broker networks. |
| **Churn from unmet expectations** | High | Medium | Set expectations during onboarding: AI handles 80%+ of processing, officer handles edge cases. Transparent about what AI can and cannot do. Escalation system makes limitations visible, not hidden. |

---

## Appendix A: Market Sizing

### Bottom-Up Analysis

| Metric | Value | Source/Reasoning |
|---|---|---|
| Independent mortgage LOs in US | ~100,000 | NMLS data, industry estimates |
| Addressable (tech-forward, 3+ loans/mo, not locked into enterprise LOS) | ~40,000 | ~40% of independents meet all three criteria |
| Year 1 target (500 customers) | 1.25% penetration | Achievable with direct sales + community + referrals |
| Year 2 target (2,000 customers) | 5% penetration | Requires paid acquisition channels + LOS integrations |
| Year 3 target (5,000 customers) | 12.5% penetration | Requires marketplace effects + mobile app + brand recognition |
| Blended ARPU | $350/mo | Mix: 40% Starter ($149), 45% Pro ($299), 10% Team ($599), 5% Enterprise ($800 avg) |

| Year | Customers | ARPU | MRR | ARR |
|---|---|---|---|---|
| Year 1 | 500 | $350 | $175,000 | **$2,100,000** |
| Year 2 | 2,000 | $350 | $700,000 | **$8,400,000** |
| Year 3 | 5,000 | $350 | $1,750,000 | **$21,000,000** |

### Top-Down Analysis

| Metric | Value |
|---|---|
| Total US mortgage originations | ~5M loans/year |
| Independent broker/LO share | ~25% = 1.25M loans |
| Processing cost per loan | $500-$750 |
| **Total addressable processing spend** | **$625M-$937M/year** |
| LoanFlow AI at 5,000 customers x $350/mo | $21M ARR |
| **% of processing spend captured** | **2.2-3.4%** |

Capturing 2-3% of total addressable processing spend at Year 3 is conservative. The market is fragmented, underserved by technology, and ripe for AI disruption.

### Valuation Potential

| Metric | Conservative | Optimistic |
|---|---|---|
| Year 3 ARR | $21M | $21M |
| Revenue multiple (vertical AI SaaS with high NRR) | 15x | 25x |
| **Implied valuation** | **$315M** | **$525M** |

Comparable vertical AI SaaS companies with >100% NRR and strong category positioning are commanding 15-25x revenue multiples in 2026. LoanFlow AI's combination of AI-native architecture, clear ROI story, and underserved market segment supports the upper end of this range.

### Comparable Transactions

| Company | Context | Valuation/Revenue |
|---|---|---|
| Floify (acquired by Pylon) | ~3,000 customers, document portal, no AI | Est. $20-30M |
| Blend (public, enterprise) | Enterprise digital lending | $200M+ revenue, enterprise-focused |
| Vertical AI SaaS (category avg) | AI-native, high NRR, SMB/mid-market | 15-25x revenue |

LoanFlow AI at $21M ARR with AI differentiation, 90%+ customer ROI, and low churn would be a significantly more valuable asset than Floify at acquisition — serving the same market with 10x the product capability.

---

## Appendix B: Key Assumptions

1. **Claude API availability and pricing**: Anthropic maintains API availability with pricing at or below current levels. At current pricing, AI costs are <1% of revenue at all scale points. If pricing increases 5x, AI costs are still <5% of revenue — manageable.

2. **Document classification accuracy**: Exceeds 90% at launch, reaches 95%+ within 3 months. Validated by Mortgage AI prototype testing on real documents. Deterministic validation rules provide a safety net for AI errors.

3. **Willingness to pay**: Independent LOs will pay $149-$599/month for a SaaS tool that replaces a $3,000-$7,500/month processor cost. Validated by Floify's existing $49-$175 pricing for a portal-only product (no AI, no LOS). Our value proposition is 10x stronger at 2x the price.

4. **Borrower portal adoption**: Borrowers will use a self-serve portal to upload documents. Validated by Floify and Blend adoption rates. SMS delivery of portal links (vs email-only) significantly increases adoption.

5. **FHA/VA volume**: Government loans represent 30%+ of independent LO volume. Supporting only conventional loans cuts addressable market in half. FHA/VA support is required at MVP, not a nice-to-have.

6. **Self-employed growth**: Self-employed borrowers are a growing segment and the hardest to process manually. AI support for tax returns, Schedule C, and P&L statements is a genuine differentiator — no competitor does this well.

7. **Regulatory stability**: The regulatory environment does not change to restrict AI use in mortgage document processing. AI is used for classification and extraction only (not lending decisions), which is low regulatory risk.

8. **Infrastructure scalability**: Supabase infrastructure scales to 5,000+ concurrent users without architecture changes. Document processing is async and horizontally scalable.

9. **SMS effectiveness**: SMS reminders achieve 90%+ delivery rate and 50%+ response rate (vs 20% email open rate). Twilio provides reliable SMS delivery with tracking.

10. **Competitive window**: We have 6-12 months before incumbents ship meaningful AI processor features. Floify's "Dynamic AI" is basic validation at application start — not a full processor replacement. This window allows us to establish the category.

---

## Appendix C: Competitive Matrix

| Capability | LoanFlow AI | Floify | DocVu AI | Infrrd | Encompass | LendingPad | Human Processor |
|---|---|---|---|---|---|---|---|
| AI document classification | Yes | Basic (2026) | Yes (enterprise) | Yes (enterprise) | No | No | Manual |
| AI document validation | Yes | Basic (2026) | Yes (enterprise) | Partial | No | No | Manual |
| Deterministic validation rules | Yes | No | No | No | No | No | Judgment-based |
| Confidence scoring + escalation | Yes | No | Partial | No | No | No | N/A |
| Condition-to-document matching | Yes | No | No | No | Plugin | No | Manual |
| Borrower portal | Yes | Yes | No | No | Plugin | No | N/A |
| Borrower concierge chat | Yes | No | No | No | No | No | Phone/email |
| SMS + email reminders | Yes | Email only | No | No | No | No | Manual |
| Stacking order generation | Yes | No | No | No | No | No | Manual |
| Income calculation | Yes | No | No | No | Plugin | No | Manual |
| FHA/VA support | Yes | Partial | Yes | Partial | Yes | Yes | Yes |
| Self-employed support | Yes | No | Partial | Partial | Plugin | No | Yes (manual) |
| Full LOS | Yes | No | No | No | Yes | Yes | N/A |
| Self-serve signup | Yes | Yes | No | No | No | Yes | N/A |
| Price (monthly) | $149-599 | $49-175 | Enterprise ($$$) | Enterprise ($$$) | $100+/user | $59/user | $3,000-7,500 |
| Target market | Independent LOs | Small-mid brokerages | Enterprise lenders | Enterprise lenders | All sizes | Small-mid | All |
| 24/7 availability | Yes | Portal only | N/A | N/A | N/A | N/A | No |

---

## Appendix D: Feature Priority Framework

Features are evaluated on two axes: **differentiation impact** (does this make us meaningfully different from alternatives?) and **implementation effort** (engineering time required).

### MVP Features (Q2 2026) — High Differentiation, Justified Effort

| Feature | Differentiation | Effort | Rationale |
|---|---|---|---|
| 4 AI agents | Critical | High | This IS the product. Without all 4 agents, we are not a processor replacement. |
| Condition-to-document matching | Critical | Medium | #1 processor time-sink. Automating this is the "holy shit" moment for LOs. |
| FHA/VA support | High | Medium | 30%+ of volume. Without it, we cut addressable market in half. |
| Self-employed support | High | Medium | Fastest-growing segment, hardest to process. No competitor does this with AI. |
| SMS reminders (Twilio) | High | Low | 98% open rate vs 20% email. Without SMS, auto-chase is half-baked. |
| Borrower concierge chat | High | Medium | 24/7 borrower support without officer involvement. Genuine delight feature. |
| Document expiration warnings | Medium | Low | Small effort, prevents stale-doc surprises. Processors do this manually. |
| Stacking order generation | High | Medium | This is the processor's final deliverable. If we produce this, replacement is complete. |
| Income calculator integration | Medium | Low | Leverages existing AI income calculation. Natural extension of validation. |
| Readiness score integration | Medium | Low | Already built. Just connect doc checklist completion to existing score. |
| Portal branding | Medium | Low | Makes it feel like the officer's tool. Drives ownership and retention. |
| One-click portal sharing | Medium | Low | Reduces friction for officer's most common action. |
| Real-time subscriptions | Medium | Medium | Live updates when borrower uploads. Professional, modern experience. |

---

*This document is a living strategy. It should be reviewed monthly and updated as market conditions, competitive dynamics, and product learnings evolve. Version history is maintained in git.*

*Next review: April 8, 2026*
