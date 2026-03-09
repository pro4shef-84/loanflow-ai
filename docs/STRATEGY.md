# LoanFlow AI — Product Strategy

**Version**: 1.0
**Date**: March 8, 2026
**Status**: Draft for Alignment Review

---

## 1. Executive Summary

LoanFlow AI is building the first AI-native loan processing platform purpose-built for independent mortgage loan officers. By integrating intelligent document processing into a full-stack loan origination system, we eliminate the single largest operational cost in an independent LO's business: the human loan processor.

**The problem**: Independent loan officers pay $500-$750 per loan file to human processors whose primary job is chasing, collecting, and validating borrower documents. For an officer closing 3-10 loans per month, this represents $1,500-$7,500 in monthly processor costs — often the single largest line item after their broker split.

**The solution**: An AI Document Assistant that operates 24/7, automatically generating document checklists, classifying and validating uploads in real-time, requesting corrections with plain-English instructions, and escalating edge cases to the officer for human judgment. The officer retains full control; the AI handles the repetitive work.

**The product today**: LoanFlow AI already has a fully functional loan origination platform — 1003 application wizard, pricing engine, AUS simulation, pre-approval letters, lender submission tracking, condition management, borrower portal, CRM, compliance tools, and billing. What it lacks is the intelligent document processing layer that transforms it from a productivity tool into a processor replacement.

**The merger**: A standalone document processing prototype (Mortgage AI) has been built with 4 AI agents, deterministic workflow engines, validation rules, an escalation system, and confidence scoring. This strategy document outlines how we integrate that system into LoanFlow AI to create the industry's first AI loan processor for independent originators.

**Market opportunity**: There are approximately 100,000+ independent mortgage loan officers in the United States. At $99/month (Pro tier), converting just 1% of that market represents $1.2M ARR. At the target price point, LoanFlow AI pays for itself if it replaces even a single processor on a single loan per month.

---

## 2. Vision

### The North Star

**"Every independent loan officer gets an AI processor that works 24/7, costs a fraction of a human processor, and never loses a document."**

### Where We Are Today

The typical independent LO's document workflow looks like this:

1. Officer creates a loan file and manually decides which documents to request
2. Officer (or processor) emails the borrower a list of needed documents
3. Borrower emails back documents — sometimes the wrong ones, sometimes blurry photos, sometimes partial
4. Processor reviews each document manually, identifies issues, emails the borrower again
5. Steps 3-4 repeat 2-5 times per document type
6. Processor confirms everything is in order, officer reviews and submits to lender
7. Lender issues conditions requiring more documents — cycle repeats

Average time from application to complete document file: **12-18 days**. Average number of borrower touchpoints for document collection: **8-15 emails/calls**.

### Where We Are Going

1. Officer creates a loan file — AI instantly generates the exact document checklist
2. Borrower receives a portal link and sees a friendly, visual checklist
3. Borrower uploads each document — AI validates in 2-3 seconds, confirms acceptance or requests a specific correction
4. If anything looks suspicious or ambiguous, AI escalates to the officer with a clear summary and recommended action
5. When all documents validate, AI generates a review summary for the officer
6. Officer confirms with one click — file is ready for lender submission

Target time from application to complete document file: **3-5 days**. Target borrower touchpoints: **1-2 interactions** (initial upload + at most one correction round).

### Human Judgment Preserved

This is not a "black box" system. The AI never makes lending decisions, never advises borrowers on rates or approval odds, and never marks a loan as ready without officer confirmation. The officer is the decision-maker. The AI is the processor — fast, tireless, and consistent.

---

## 3. Competitive Landscape

### Direct Competitors

| Competitor | Model | Price Point | AI Capability | Target Market | Weakness |
|---|---|---|---|---|---|
| **Human Processor** | Per-loan fee | $500-750/loan | N/A (human) | All LOs | Expensive, slow, inconsistent, limited hours |
| **Blend** | Enterprise SaaS | $10K+/mo | Some automation | Top 200 lenders | Enterprise-only, no independent LO support |
| **Floify** | Document portal | $99-299/mo | None (portal only) | Small-mid brokerages | No AI validation, just file storage and status tracking |
| **SimpleNexus (ICE/nCino)** | Enterprise LOS | Custom pricing | Minimal | Mid-large lenders | Enterprise sales cycle, not built for independents |
| **Encompass (ICE)** | LOS platform | $100+/user/mo | Plugin-based | All sizes | Legacy architecture, requires add-ons for any intelligence |
| **LendingPad** | Cloud LOS | $99/user/mo | None | Small-mid | Basic LOS, no document intelligence |
| **Calyx Point** | Desktop LOS | Per-seat license | None | Independents | Desktop-only, aging technology, no AI |

### Our Competitive Advantages

1. **AI-native architecture**: Document intelligence is not bolted on — it is the core product. Every upload triggers a classification/validation pipeline from day one.

2. **Built for independents**: No enterprise sales cycle. Self-serve signup, free trial, immediate value. The UX is designed for a solo operator, not a 50-person ops team.

3. **Full-stack platform**: Unlike Floify (portal only) or standalone AI tools, LoanFlow AI is a complete loan origination system. Officers do not need to stitch together 5 products.

4. **Fraction of the cost**: At $99/month for Pro tier, LoanFlow AI costs less than what a processor charges for a single loan. The ROI argument is self-evident.

5. **Deterministic + AI hybrid**: We do not rely on AI for everything. Document validation rules are deterministic and auditable. AI handles classification and extraction; rules handle validation. This makes the system explainable and trustworthy.

6. **Human-in-the-loop by design**: The escalation system ensures that edge cases always reach a human. Officers never lose control.

---

## 4. Product Positioning

### Tagline Options

| Option | Angle |
|---|---|
| **"Your AI Loan Processor"** | Direct replacement positioning — immediately understood |
| **"Close More Loans. Chase Fewer Documents."** | Outcome-focused, addresses daily pain |
| **"The Processor That Never Sleeps"** | 24/7 availability, memorable |
| **"AI-Powered Loan Origination for Independent Officers"** | Descriptive, SEO-friendly |

**Recommended primary tagline**: **"Your AI Loan Processor"**

This positions directly against the $500-750/loan human processor, makes the value proposition instantly clear, and naturally leads into a cost-savings conversation.

### Value Proposition

**For the independent mortgage loan officer who closes 3-10 loans per month**, LoanFlow AI is an AI-powered loan origination platform that replaces your loan processor at a fraction of the cost. Unlike hiring a human processor or cobbling together a portal + LOS + email, LoanFlow AI provides a single platform where AI handles document collection, validation, and chasing — while you keep full control over every decision.

### Pricing Strategy

LoanFlow AI uses a tiered subscription model aligned with officer volume:

| Tier | Monthly Price | Target User | AI Document Features |
|---|---|---|---|
| **Trial** | Free (14 days) | New signups | Full access, 2 active loans max |
| **Starter** | $49/month | Part-time LOs, 1-3 loans/mo | AI doc validation, 5 active loans, email reminders only |
| **Pro** | $99/month | Full-time independents, 3-8 loans/mo | Full AI pipeline, 25 active loans, email + SMS reminders, escalation dashboard |
| **Team** | $199/month | Small teams, 8+ loans/mo | Everything in Pro + 3 officer seats, bulk operations, priority AI processing |

**Pricing rationale**: The Pro tier at $99/month is the sweet spot. An officer closing 5 loans/month currently pays $2,500-$3,750 to a processor. LoanFlow AI Pro represents a 96-97% cost reduction. Even if the AI only fully replaces the processor on 2 of those 5 loans, the officer saves $900-$1,400/month — a 9-14x ROI.

**Per-loan economics** (Pro tier at 5 loans/month):
- LoanFlow cost: $99 / 5 loans = **$19.80 per loan**
- Processor cost: $500-750 per loan
- **Savings: $480-730 per loan (96-97%)**

### AI Cost Management

Claude API costs per document classification + extraction + validation: approximately $0.02-$0.08 per document. At 5 documents per loan and 5 loans per month, AI cost is approximately $0.50-$2.00 per month per officer — well within margin.

The `token_usage` table already tracks per-module, per-model costs. We will add a `doc_intelligence` module tag to monitor AI document processing costs separately.

---

## 5. Go-to-Market

### Target Persona

**Primary**: Independent mortgage loan officer
- Licensed NMLS originator working under a broker or small lender
- Closes 3-10 loans per month
- Currently pays a processor or does processing themselves
- Tech-savvy enough to use a web app (already using Encompass, Floify, etc.)
- Active on LinkedIn, mortgage broker forums, state association events
- Age: 30-55
- Pain: Spending evenings chasing documents, paying processor fees that eat margins

**Secondary**: Small brokerage owner (2-5 LOs)
- Manages a small team, wants to reduce overhead
- Team tier customer
- Often the decision-maker for tool adoption

### Distribution Channels

| Channel | Strategy | Expected CAC |
|---|---|---|
| **Organic Search / SEO** | Content: "How to reduce processor costs," "AI for mortgage brokers," "Best document portal for LOs" | $0-20 |
| **LinkedIn** | Targeted content + ads to NMLS-licensed professionals. LO influencer partnerships. | $50-100 |
| **Mortgage Broker Forums** | Mortgage Professionals (Facebook), LoanOfficerHub, BiggerPockets mortgage threads | $0-30 |
| **NMLS State Associations** | Sponsor local MBA events, present at state conferences | $100-200 |
| **Referral Program** | Existing users refer peers — 1 month free for both parties | $49 (one free month) |
| **YouTube / Demo Videos** | Screen recordings showing the AI in action (doc upload -> instant validation) | $0-20 |

### Activation Funnel

```
Visit landing page
  --> Sign up (free trial, no credit card)
    --> Create first loan
      --> AI generates document checklist (first "wow" moment)
        --> Upload a test document
          --> AI validates in 2 seconds (second "wow" moment)
            --> Invite first real borrower
              --> Borrower completes document uploads
                --> "This replaced my processor" realization
                  --> Convert to paid (Starter or Pro)
```

**Key activation metric**: Time from signup to first AI-validated document. Target: under 10 minutes.

**Aha moment**: The instant a loan officer uploads a document and sees it classified, validated, and matched to a requirement in under 3 seconds — they understand the value.

### Launch Phases

**Phase 1 — Private Beta (Weeks 1-4)**:
- 10-20 hand-selected independent LOs
- Direct onboarding calls
- Daily feedback collection
- Focus: AI accuracy, UX friction, edge cases

**Phase 2 — Open Beta (Weeks 5-8)**:
- Open signups with extended trial (30 days)
- LinkedIn launch announcement
- First YouTube demo video
- Focus: Funnel conversion, activation rate, support volume

**Phase 3 — General Availability (Week 9+)**:
- Standard 14-day trial
- Paid ads on LinkedIn
- Referral program launch
- Conference sponsorships begin

---

## 6. Success Metrics

### North Star Metric

**Monthly Active Loan Files with AI-Validated Documents**: The count of unique loan files per month where at least one document was AI-validated. This metric captures both user engagement and feature adoption.

### Activation Metrics

| Metric | Definition | Target |
|---|---|---|
| Time to first loan | Minutes from signup to first loan created | < 5 minutes |
| Time to first AI validation | Minutes from signup to first document AI-validated | < 10 minutes |
| Checklist generation rate | % of new loans where officer sees auto-generated checklist | 100% |
| Borrower invite rate | % of loans where borrower portal invite is sent | > 70% within first week |

### Engagement Metrics

| Metric | Definition | Target |
|---|---|---|
| Document collection time | Days from borrower invite to all docs validated | < 5 days (vs. 12-18 today) |
| Document chasing reduction | Reduction in officer-initiated follow-up messages per loan | > 70% |
| AI auto-validation rate | % of uploads validated without human intervention | > 80% |
| Escalation rate | % of uploads requiring officer attention | < 15% |
| Correction rate | % of uploads requiring borrower re-upload | < 25% |
| Monthly active loans per officer | Average loan files actively using AI docs per officer per month | > 3 |

### Business Metrics

| Metric | Definition | Target (Month 6) |
|---|---|---|
| Trial-to-paid conversion | % of trial users converting to any paid tier | > 15% |
| Monthly recurring revenue (MRR) | Total subscription revenue | $25K |
| Paying customers | Total active paid subscriptions | 200 |
| Net revenue retention | Revenue from existing customers (upsells - churn) | > 110% |
| Churn rate | Monthly paid customer churn | < 5% |
| NPS score | Net Promoter Score from quarterly surveys | > 50 |

### AI Quality Metrics

| Metric | Definition | Target |
|---|---|---|
| Classification accuracy | % of documents correctly classified by doc type | > 95% |
| False positive rate | % of valid documents incorrectly flagged as issues | < 3% |
| False negative rate | % of problematic documents incorrectly accepted | < 2% |
| Average confidence score | Mean confidence score on AI classifications | > 0.85 |
| Escalation resolution time | Average time from escalation created to resolved | < 4 hours |

---

## 7. Risk Analysis

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **AI misclassifies a document** | Medium | Medium | Confidence scoring with 0.75 threshold; below threshold always escalates to human. Deterministic validation rules catch misclassifications that pass confidence threshold. |
| **Claude API downtime** | High | Low | Graceful degradation: documents accepted with `pending_ai_review` status, queued for processing when API returns. Officer can still manually review. |
| **Claude API cost spikes** | Medium | Low | Per-user token tracking already in place. Rate limiting per tier. Haiku model for classification (fast/cheap), Sonnet only for complex extraction. |
| **Document extraction inaccuracy** | Medium | Medium | Deterministic validation rules as a safety net (date checks, field presence checks). AI extraction is advisory; rules are authoritative. |
| **Scalability under load** | Medium | Low | Supabase handles DB scaling. Document processing is async (upload -> queue -> process). No synchronous bottleneck. |

### Regulatory & Compliance Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **RESPA / TILA violation** | Critical | Low | LoanFlow AI never makes lending decisions, never quotes rates to borrowers, never advises on loan products. The Borrower Concierge explicitly deflects all advisory questions and escalates to the officer. |
| **Fair lending concerns** | Critical | Low | AI is used for document classification and data extraction only — never for credit decisions, pricing, or approval/denial. No protected-class data is used in any AI decision. |
| **PII in AI prompts** | High | Medium | Minimize PII sent to Claude: no SSN, no full DOB, no account numbers. Send only document images and metadata needed for classification. Document our data handling in a privacy policy. |
| **State-specific licensing** | Medium | Low | LoanFlow AI is a tool for licensed LOs, not a lender. No licensing required for the software itself. Officers must maintain their own NMLS licenses. |
| **Data breach** | Critical | Low | Supabase Storage with signed URLs (time-limited access). RLS on all tables. No document data stored in browser localStorage. Service role key used only in server-side API routes. |

### Business Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **LOs resist AI adoption** | High | Medium | Position as "assistant" not "replacement for you." Human-in-the-loop design. Officers maintain full control. Start with beta users who are already tech-forward. |
| **Incumbents add AI features** | Medium | Medium | Speed advantage: we ship AI-native features while incumbents retrofit legacy systems. Our indie-LO focus means we move faster than enterprise vendors. |
| **Processor pushback** | Low | Medium | Not our target market's concern — indie LOs want to reduce processor costs. Team tier could be positioned for brokerages where processors use LoanFlow as their tool. |
| **Customer concentration** | Medium | High (early) | Diversify early via multiple channels. No single customer should exceed 5% of revenue. |

---

## 8. Roadmap

### Q2 2026 — "AI Document Assistant" (This Quarter)

**Theme**: Integrate intelligent document processing into LoanFlow AI

**Deliverables**:
- Intake Agent: Auto-generate document checklists when a loan is created
- Document Intelligence Agent: Classify, extract, and validate uploaded documents with confidence scoring
- Deterministic validation rules for 5 core document types (pay stub, W-2, bank statement, government ID, purchase contract)
- Enhanced borrower portal with visual checklist, real-time AI feedback on uploads, and correction instructions
- Escalation system with 10 categories and 4 severity levels
- Officer escalation dashboard
- Automated reminder emails (Day 3, Day 7, Day 14) with auto-escalation after 3 attempts
- Officer Copilot: AI-generated loan review summary
- Activity timeline / event log on loan detail page
- Database migration: new tables (document_requirements, escalations, event_logs, review_decisions), enhanced documents table
- Integration with existing readiness score and conditions system

**Success criteria**: 20 beta users with at least 50 loans processed through the AI pipeline. >90% classification accuracy. <5 day average document collection time.

### Q3 2026 — "Smart Conditions & Compliance"

**Theme**: Close the loop between lender conditions and document validation

**Deliverables**:
- Auto-detect when a validated document satisfies a lender condition
- Condition-to-document mapping engine (lender says "provide 2 months bank statements" -> system checks if bank_statement requirement is satisfied)
- Automated compliance checks: TRID timeline enforcement, rate lock expiration warnings
- Enhanced AUS simulation that factors in document completeness
- Borrower Concierge Agent: Portal chat interface for borrower Q&A
- FHA/VA loan type support with expanded document checklists (DD-214, VA certificate of eligibility, FHA case number docs)
- Self-employed borrower support: tax return (1040), Schedule C, profit & loss statement validation
- SMS reminders via Twilio (in addition to email)

**Success criteria**: 100+ paying customers. Condition auto-matching accuracy >85%. FHA/VA loans represent >20% of AI-processed files.

### Q4 2026 — "Multi-Borrower & Team Workflows"

**Theme**: Scale to handle real-world loan complexity and team operations

**Deliverables**:
- Co-borrower support: Separate document checklists per borrower on a single loan
- Multi-property support (investment property loans)
- Team features: Officer assignment, processor role (view-only access to AI pipeline), admin dashboard
- Batch operations: Bulk reminder send, bulk status update
- Custom document types: Officers can define additional required documents beyond the standard checklist
- Document expiration tracking: Notify when a previously validated document is about to expire (e.g., pay stub approaching 60-day limit)
- Webhook API for third-party integrations

**Success criteria**: 300+ paying customers. Team tier adoption >10% of paid base. Co-borrower loans processed without manual workarounds.

### Q1 2027 — "LOS Integration & Marketplace"

**Theme**: Become the hub of the independent LO's technology stack

**Deliverables**:
- Encompass integration: Push validated documents and loan data to Encompass
- Byte Software integration
- LendingPad integration
- Lender marketplace: Browse wholesale lender requirements, auto-match document checklists to specific lender overlays
- Rate lock monitoring: Alert when rate lock is expiring and documents are still incomplete
- Advanced analytics dashboard: Per-loan AI cost, time savings, document turnaround trends
- Mobile app (React Native): Officer can review escalations and approve documents on the go
- White-label portal option for brokerages

**Success criteria**: 1,000+ paying customers. At least one LOS integration live. $100K+ MRR.

---

## Appendix A: Market Sizing

### Bottom-Up

- Independent mortgage LOs in US: ~100,000
- Addressable (tech-forward, 3+ loans/month): ~40,000
- Realistic penetration at maturity (Year 3): 2-5%
- Customers: 800-2,000
- Average revenue per customer: $100/month (blended across tiers)
- **ARR: $960K-$2.4M**

### Top-Down

- Total US mortgage originations (2025): ~$2.0T across ~5M loans
- Independent broker/LO origination share: ~25% = 1.25M loans
- Processing cost per loan: $500-750
- Total addressable processing spend: **$625M-$937M per year**
- LoanFlow AI captures 0.1-0.3% of that spend
- **Revenue: $625K-$2.8M**

### Comparable Valuations

- Floify (acquired by Pylon): Est. $20-30M at acquisition, ~3,000 customers
- Blend (public, enterprise): $200M+ revenue but enterprise-focused
- A vertical SaaS at $2M ARR with 100%+ NRR and AI differentiation commands 15-25x revenue multiple in current market

---

## Appendix B: Key Assumptions

1. Claude API remains available and affordable (Anthropic does not dramatically increase pricing)
2. Document classification accuracy exceeds 90% out of the gate (validated via Mortgage AI prototype testing)
3. Independent LOs are willing to pay $49-$199/month for a SaaS tool (validated by Floify's pricing model)
4. Borrowers will use a self-serve portal (validated by Floify and Blend adoption rates)
5. The regulatory environment does not change to restrict AI use in mortgage document processing
6. Supabase infrastructure scales to 1,000+ concurrent users without architecture changes

---

*This document should be reviewed quarterly and updated as market conditions, competitive dynamics, and product learnings evolve.*
