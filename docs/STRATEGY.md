# LoanFlow AI — Product Strategy

**Version**: 3.0  
**Date**: March 9, 2026  
**Status**: Active — Product / GTM / Fundraising Operating Strategy

---

## 1. Executive Summary

LoanFlow AI is building the best workflow system for independent mortgage loan officers to get from application to lender-ready file with less chasing, less rework, and fewer processor handoffs.

The key strategic change in this version is focus:

- We are **not** positioning the Q2 product as a magical full processor replacement on every file type from day one.
- We **are** positioning LoanFlow AI as the fastest way for an independent LO to get a complete, clean file on core loans while keeping enough LOS parity that the LO can actually run their workflow in one place.
- Our wedge is **document collection, validation, borrower follow-up, and officer-ready file completion**.
- Our table stakes are **LOS/POS parity features** that remove adoption friction: loan file creation, 1003 capture, pricing, borrower portal, pre-approval output, pipeline tracking, condition tracking, templates, and lender submission visibility.

This matters because independent LOs do not buy standalone “AI document tools” in a vacuum. They buy systems that fit into the real workflow they already run. If LoanFlow AI does not cover the minimum day-to-day origination workflow, many officers will not even start a trial, no matter how good the AI is.

Our strategy is therefore:

1. Earn the right to be tried by shipping credible LOS/POS table stakes.
2. Win the account by dramatically reducing document chasing and file assembly labor.
3. Expand from “processor compression” into “processor replacement” only after live production proof.

The success condition is not “we built a lot of AI.” The success condition is:

**A solo or small-team LO can move a standard file from intake to submission materially faster, with fewer borrower touchpoints and less processor labor, inside LoanFlow AI than with ARIVE + Floify + email + a contract processor.**

---

## 2. Strategic Diagnosis

### The Real Customer Problem

The independent LO does not wake up asking for AI. They are trying to solve four concrete operational problems:

1. Borrowers do not send the right documents the first time.
2. Officers or processors spend nights and weekends chasing missing items.
3. Files stall because no one has a reliable view of what is actually complete.
4. Existing tools split the workflow across POS, LOS, email, text, spreadsheets, and human memory.

The pain is not just extraction. The pain is the **resolution loop**:

- what documents are needed,
- what was received,
- what is wrong with it,
- who needs to act,
- whether the file is ready,
- and what still blocks submission.

That loop is where processor time is consumed and where LoanFlow AI can create defensible value.

### The Adoption Reality

“Best-in-class AI” is not enough to win in mortgage.

To get an LO to even test a new system, the product must be credible on the surrounding workflow:

- creating and managing the loan file,
- capturing the borrower application,
- quoting pricing / scenarios,
- issuing pre-approval letters,
- sharing a borrower portal,
- tracking conditions and status,
- and keeping basic communication and compliance records.

These features do not differentiate us by themselves, but without them we create workflow duplication and trial friction. In this market, lack of parity kills adoption before differentiation has a chance to matter.

### Strategic Choice

We will compete as:

**An AI-native loan workflow platform for independent LOs, with a wedge in file completion and processor labor reduction.**

We will not compete first on:

- enterprise breadth,
- every lender integration,
- every niche loan scenario,
- deep secondary / correspondent complexity,
- or “AI for everything.”

---

## 3. Product Thesis

### Category Thesis

There is a gap between:

- low-cost LOS/POS systems that manage workflow but do little real work, and
- enterprise document / verification vendors that automate pieces of the process but are not built for self-serve independent LOs.

LoanFlow AI fills that gap by becoming the **system of action for file readiness**.

### Positioning

**Primary position**: `The AI workflow platform that gets mortgage files complete.`  
**Secondary position**: `Your LOS, borrower portal, and AI file assistant in one place.`  
**Proof-oriented claim**: `Reduce document chasing and processor labor on standard files.`

We should avoid broad “full replacement” language until we have strong production evidence across a wide mix of files.

### Strategy Statement

LoanFlow AI will win independent LOs by combining enough LOS/POS parity to replace fragmented daily workflow with an AI-native file-completion engine that automates checklisting, document validation, borrower follow-up, and officer review. We will start with conventional and government-friendly core workflows for solo and small-team brokers, prove processor labor reduction on live files, then expand into broader loan complexity, deeper lender workflows, and team operations.

---

## 4. Target Market and ICP

### Phase 1 ICP

**Primary ICP**: independent loan officers and small broker teams with 1-5 originators who:

- close roughly 3-15 loans per month,
- already use modern software,
- feel real pain around document collection and follow-up,
- are willing to change systems if value is obvious,
- and do enough standard W-2 / paystub / bank statement files to make early AI automation reliable.

### Best Early Customer

The best early customer is not the most complex shop. It is the LO who:

- wants one modern workflow,
- does meaningful volume,
- is currently paying for some combination of LOS + POS + processor support,
- and is embarrassed by how manual their file completion process still is.

### Customers to Deprioritize Initially

- large retail lenders,
- highly customized enterprise operations,
- heavy correspondent / delegated workflows,
- teams that require dozens of deep integrations before first use,
- and shops dominated by highly complex self-employed or non-QM files.

These are attractive later, but they are poor starting points for product learning.

---

## 5. Product Strategy

### Product Architecture: Table Stakes + Wedge

The product has two layers.

#### Layer A: Table Stakes Required for Trial and Retention

These features are not the main reason we win, but they are necessary so LOs can use the system without workflow duplication:

- loan file creation and pipeline management,
- 1003 / application capture,
- product pricing / scenario support,
- borrower portal,
- pre-approval output,
- document storage,
- basic condition tracking,
- communication templates / history,
- lender submission visibility,
- basic CRM / contact management,
- billing and self-serve onboarding.

**Rule**: table stakes do not need to be category-best. They need to be credible, coherent, and good enough that the LO does not have to leave the system constantly.

#### Layer B: The Wedge That Wins

These features create differentiated value and should receive disproportionate investment:

- AI-generated document checklist based on loan scenario,
- document upload classification and quality validation,
- plain-English borrower correction requests,
- automated follow-up via email and SMS,
- officer escalation queue for ambiguous or high-risk items,
- file readiness view showing what is complete, blocked, or stale,
- review summary that tells the LO what happened and what still needs judgment.

This is the core job-to-be-done: get the file complete with less human effort.

### Product Principle

Every feature must answer one of three questions:

1. Does this help an LO trust the system enough to try it?
2. Does this reduce human labor in the file-completion loop?
3. Does this increase switching cost or data advantage over time?

If the answer is no to all three, it is likely not a priority.

---

## 6. What We Are Building Now

### Phase 1 Product Goal

**Win the first dollar by making standard files materially easier to complete.**

### Phase 1 Scope: “File Completion Assistant”

The Q2 2026 release should focus on:

- dynamic checklist generation for core file types,
- borrower portal tasks tied to document requirements,
- real-time validation on the highest-frequency document set,
- borrower correction messaging,
- automated reminders,
- officer review queue,
- readiness scoring,
- audit trail of validations, exceptions, and approvals.

### Core Document Set for Launch

Launch on the documents that drive the majority of early-file friction:

- pay stubs,
- W-2s,
- bank statements,
- driver’s licenses / IDs,
- purchase contracts,
- mortgage statements,
- homeowners insurance,
- basic tax returns where extraction scope is narrow.

### Loan Scope for Launch

Launch scope should prioritize:

- conventional purchase and refi,
- FHA / VA where checklisting and doc collection are manageable,
- standard salaried / hourly borrowers.

Self-employed should be handled carefully:

- support a narrow initial experience,
- extract a limited set of fields,
- escalate aggressively,
- and do not market it as “fully automated” until accuracy and officer trust are proven.

### Not in the True MVP

These may remain on the roadmap, but they should not be allowed to destabilize launch:

- broad self-employed automation,
- lender-specific stacking across many investors,
- generalized borrower concierge for every question type,
- full condition-to-document automation across all condition classes,
- every specialty loan workflow,
- deep mobile apps before the desktop workflow is trusted.

---

## 7. Product Roadmap

### Q2 2026: Prove the Wedge

Objective: demonstrate that LoanFlow AI reduces document-chasing labor on live files.

Ship:

- AI checklist generation
- document classification and quality checks
- borrower correction prompts
- automated follow-up
- officer escalation queue
- readiness dashboard
- core LOS/POS parity polish needed for trial

Success gate:

- 50+ live files processed
- meaningful reduction in borrower touchpoints
- acceptable false positive / false negative rates
- repeat usage by at least 10 paying customers

### Q3 2026: Expand Reliability and Trust

Objective: make the product reliable enough to become default workflow for a meaningful subset of users.

Add:

- stronger condition workflows
- expiration monitoring
- improved review summaries
- lender submission packaging
- better support for FHA / VA edge cases
- shared queue views for teams

Success gate:

- strong weekly active usage
- materially lower manual review time per file
- referenceable case studies from live customers

### Q4 2026: Broaden the Value Envelope

Objective: move from workflow win to platform lock-in.

Add:

- deeper team workflows
- stronger lender / partner integrations
- better self-employed support where data proves demand
- benchmarking and operational insights across files

Success gate:

- higher expansion into team plans
- lower churn caused by “missing workflow coverage”
- increasing share of customer workflow happening inside LoanFlow AI

---

## 8. Competitive Landscape

### Market Reality as of March 9, 2026

Independent LOs can already buy low-cost workflow software:

- [ARIVE pricing](https://www.arive.com/pricing): roughly `$59.99` to `$79.99` per originator seat monthly for broker plans, with LOS, POS, and pricing included.
- [Floify Broker Edition pricing](https://floify.com/broker-edition-pricing): roughly `$79/month` for Business and `$250/month` for Team.
- [Encompass](https://mortgagetech.ice.com/products/encompass): broad system of record with extensive workflow automation and ecosystem depth, but generally heavier and less indie-friendly.

Incumbents are also adding more intelligence:

- [Floify Dynamic AI](https://floify.com/press-room/press-release-floify-launches-dynamic-ai-embedded-intelligence) moves document upload and AI extraction to the start of the application flow.
- [Encompass](https://mortgagetech.ice.com/products/encompass) explicitly positions around automation that reduces errors and saves time on document collection, data verification, and quality checks.

### What This Means

Two conclusions follow:

1. We cannot price as if there is no substitute. There are already low-cost workflow systems in market.
2. We cannot claim the moat is “we use AI.” Incumbents can and will add AI features.

### Where We Can Still Win

We win if we are better at the actual file-completion loop than LOS/POS incumbents and easier to adopt than enterprise document vendors.

That means outperforming on:

- checklist specificity,
- document deficiency detection,
- borrower correction quality,
- follow-up automation,
- officer exception handling,
- and visibility into file readiness.

### Competitive Table

| Competitor | Current strength | Weakness vs LoanFlow AI |
|---|---|---|
| Human processor | Handles ambiguity, flexible, trusted | Expensive, slow, non-scalable, inconsistent |
| ARIVE | Strong low-cost LOS/POS/PPE value | Workflow software, not processor-labor compression |
| Floify | Strong portal / borrower workflow, brand, improving AI | Primarily POS-first, still narrower than an integrated workflow platform |
| Encompass | Deep workflow and ecosystem power | Heavy, complex, expensive, not built for the independent self-serve motion |
| Enterprise doc vendors | Strong extraction / verification tech | Not a self-serve LO workflow product |

---

## 9. Pricing Strategy

### Pricing Principle

Price should reflect two truths:

1. The buyer compares us first to existing LOS/POS tools priced around `60-80` dollars per LO per month, not just to a human processor.
2. The buyer will only pay a “processor replacement” premium after the product proves it saves real labor on live files.

The old logic of pricing purely off processor replacement value is directionally attractive but too aggressive for the first 12 months of market learning.

### Recommended Pricing

#### Trial

- `30-day free trial`
- no credit card
- white-glove onboarding for early cohorts

#### Starter — `99/month`

For solo LOs who need enough workflow coverage to try the platform.

Includes:

- core LOS/POS table stakes
- borrower portal
- basic document checklisting
- limited AI validation on core docs
- email reminders
- up to 5 active loans

Purpose:

- compete credibly with ARIVE / Floify entry points
- reduce trial friction
- land customers who are curious but not ready to rewire all processing

#### Pro — `249/month`

For serious solo LOs and small shops using LoanFlow AI for real file completion.

Includes:

- full core workflow
- AI checklist generation
- real-time validation on priority docs
- SMS + email chasing
- officer escalation queue
- readiness dashboard
- condition support where available
- up to 25 active loans

Purpose:

- capture clear value above low-cost LOS/POS tools
- remain meaningfully below the perceived risk of a full processor replacement promise that is not yet proven on every file

#### Team — `499/month`

For 3 originators plus support coverage.

Includes:

- shared pipeline
- shared exception queue
- team admin controls
- 3 LO seats + 2 support seats
- up to 75 active loans

#### Enterprise

Custom pricing for brokerages requiring integrations, migration, security review, or workflow customization.

### Why This Pricing Is Better

- It is above commodity LOS/POS pricing, which reflects real differentiation.
- It is below the “we have already replaced your processor” pricing posture, which the product has not yet fully earned.
- It creates a practical land-and-expand motion.

### Planned Pricing Evolution

If, after 6-9 months, we can prove:

- measurable reduction in borrower touchpoints,
- strong document-validation accuracy,
- low exception rates on core files,
- and high retention among Pro users,

then Pro can move toward `299-349/month` without changing the value story.

---

## 10. Moat

### The Moat Is Not the Model

LLM access is not scarce. “AI-powered” is not a moat. Incumbents and startups can all call the same models.

Our moat must come from four compounding advantages.

### 1. Workflow Embedment

If the LO creates the file, collects docs, reviews issues, communicates with borrowers, and tracks readiness in LoanFlow AI, we become the daily operating surface, not just a utility.

### 2. Proprietary Resolution Data

The most valuable dataset is not raw documents alone. It is:

- which docs were requested,
- which deficiencies were detected,
- what correction message was sent,
- whether the borrower fixed it,
- whether the officer approved it,
- and whether the file advanced.

That closed-loop supervision improves checklisting, validations, escalation rules, and borrower communication over time.

### 3. Trust and Auditability

Mortgage buyers care about explainability and control.

We can build trust through:

- deterministic validations where possible,
- explicit confidence thresholds,
- clear escalation rules,
- audit logs,
- and officer approval controls.

Trust is a moat because it compounds through referenceability and production comfort, not just technical performance.

### 4. Switching Cost Through Workflow Coverage

The more of the LO’s workflow lives in LoanFlow AI, the harder it is to go back to fragmented tools. LOS parity matters because it helps create this switching cost.

### Moat Statement

**Our moat is workflow + data + trust, not generic AI.**

---

## 11. Go-to-Market Strategy

### GTM Thesis

This product will not win first through broad self-serve PLG alone. It will win through proof on live files, founder-led sales, and referenceable outcomes.

### Core GTM Motion

1. Acquire early users through direct outreach, community channels, and partner intros.
2. Onboard them manually.
3. Process real files with them.
4. Turn operational wins into case studies, metrics, and referrals.

### Messaging

The GTM message should shift from “replace your processor completely” to:

- `Get files complete faster.`
- `Cut document chasing dramatically.`
- `Run your workflow in one place.`
- `Use AI where it actually saves time: document collection and review.`

This is more believable and still commercially strong.

### Best Initial Offer

The strongest launch offer is:

**“Bring us your next live file. We will help you run it in LoanFlow AI and show you exactly where time was saved.”**

### GTM Assets

The product still needs a strong demo video, but the most persuasive artifacts are:

- one-file case studies,
- before/after touchpoint counts,
- time-to-complete comparisons,
- officer testimonials about reduced manual follow-up.

---

## 12. Success Metrics

### North Star

**Percent of active files that reach officer-ready status with materially less manual follow-up than the customer’s prior workflow.**

### Phase 1 Product Metrics

- time from signup to first live loan created
- time from loan created to first borrower upload
- percent of uploaded docs auto-classified correctly
- percent of doc issues caught before officer review
- borrower resubmission success rate after correction request
- average borrower touchpoints per file
- average officer interventions per file
- percent of files reaching “ready for officer review”

### Business Metrics

- trial-to-live-loan conversion
- live-loan-to-paid conversion
- 30 / 90 day logo retention
- Pro plan penetration
- number of customer references and case studies

### Strategy Metrics

- percent of product usage concentrated in wedge workflows
- percent of churn caused by missing table-stakes parity
- share of files that stay entirely inside LoanFlow AI workflow

---

## 13. Key Risks and Mitigations

### Risk: Trying to Build Everything at Once

Mitigation:

- hold a strict table-stakes vs wedge distinction
- use roadmap gates tied to learning, not ambition
- maintain an explicit “not now” list

### Risk: Customers Do Not Trust AI Enough

Mitigation:

- market labor reduction first, not full autonomy
- keep officer approval in the loop
- show clear exception handling and audit trails

### Risk: Incumbents Ship “Good Enough” AI

Mitigation:

- focus on the resolution loop, not generic extraction
- move faster on workflow depth for independents
- use case studies and customer intimacy as an advantage

### Risk: The Product Is Too Thin Outside the Wedge

Mitigation:

- maintain enough LOS/POS coverage to prevent workflow duplication
- prioritize “credible parity” features that unblock adoption
- instrument where customers leave the product to complete work elsewhere

### Risk: Pricing Is Too High for a Young Product

Mitigation:

- use launch pricing that balances proof and ambition
- offer white-glove trial conversion
- raise prices only after outcome evidence is strong

---

## 14. Explicit Non-Goals

For the next two quarters, we are **not** optimizing for:

- being the most feature-complete enterprise LOS,
- serving every loan scenario equally well,
- replacing every processor on every file,
- deep customization for large lender operations,
- or maximizing ARPU ahead of trust and retention.

We are optimizing for:

**winning the file-completion workflow for independent LOs.**

---

## 15. Bottom Line

The right strategy is not “build an AI mortgage company.” It is:

**Build the best independent-LO workflow for getting files complete, using enough LOS parity to earn adoption and enough AI leverage to save real labor.**

If we execute this correctly:

- parity features get us considered,
- the file-completion wedge gets us adopted,
- workflow data and trust create moat,
- and processor replacement becomes an outcome we earn, not a claim we lead with.

That is a more credible strategy, a better operating plan, and a stronger foundation for fundraising.

---

## Appendix: External Market Inputs

These sources informed the pricing and competitive framing in this document:

- [ARIVE Pricing](https://www.arive.com/pricing)
- [Floify Broker Edition Pricing](https://floify.com/broker-edition-pricing)
- [Floify Dynamic AI announcement](https://floify.com/press-room/press-release-floify-launches-dynamic-ai-embedded-intelligence)
- [Encompass product overview](https://mortgagetech.ice.com/products/encompass)

Internal product context also informed this strategy:

- LoanFlow AI already has meaningful LOS/POS surface area including application capture, pricing, AUS simulation, pre-approval letters, borrower portal, conditions, lender submissions, disclosures, CRM, and billing.
