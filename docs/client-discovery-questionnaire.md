# Trading Web Application — Client Discovery & Engagement Document

**Prepared by:** Core Care Consultancy
**Project:** Real-money trading web application
**Prepared for:** _[Client name]_
**Date:** _[Date sent]_

> Please complete all sections. Items marked ⚠️ require supporting documents before development can begin. Sections 7–9 cover API access, running costs, and engagement terms.

---

## Section 1 — Business & Scope

1. Company / brand name
2. Instruments to be traded (tick all): Stocks / Forex / CFDs / Crypto / Options / Futures / Commodities / Other
3. Target users (retail / professional / institutional / internal)
4. Countries/regions you operate in and accept clients from
5. Primary goal: Marketing site + portal / Full trading terminal / Both
6. Existing platform or codebase to build on or replace?

---

## Section 2 — Legal, Licensing & Compliance ⚠️ (required before build)

7. Are you a licensed broker/financial entity? (Yes — attach license / No — partner with licensed broker / No — neither yet)
8. ⚠️ If partnering, which broker? (attach partnership / IB agreement)
9. Which regulator(s) govern you? (UAE: SCA, DFSA, ADGM/FSRA; or other)
10. Who is legally responsible for holding/safeguarding client funds?
11. KYC/AML requirements & preferred vendor (Sumsub / Onfido / Jumio / Other / Need recommendation)
12. Data residency / privacy obligations (where must data be stored?)

> **Note:** We cannot build a system that holds client money or executes real trades without proof of a valid license or a licensed-broker partnership (Q7/Q8). This protects both parties.

---

## Section 3 — Trading Execution & Market Data ⚠️

13. ⚠️ Which broker / liquidity provider / exchange will execute trades?
14. Can you provide their API documentation and sandbox credentials?
15. Real-time market data provider, and who pays for the feed licenses?
16. Required order types (market / limit / stop / stop-limit / trailing)
17. Charting expectations (TradingView library — licensed — or lighter)
18. How are leverage, margin, spreads, and commissions configured?

---

## Section 4 — Funding & Money Movement ⚠️

19. Deposit/withdrawal methods (bank transfer / cards / crypto / e-wallets / other)
20. ⚠️ Payment processor(s) / PSP — do you already have an account?
21. Where will client funds be held (bank / custodian)?
22. Withdrawal rules (approvals, limits, processing times)

---

## Section 5 — Features & User Experience

23. Account types/tiers offered and how they differ
24. Onboarding flow (registration → KYC → approval → funding)
25. Required client portal features (dashboard / funds / KYC / downloads / support / profile / other)
26. Need an admin / back-office panel? (users, KYC approval, reporting)
27. Notifications required (email / SMS / in-app / push)
28. Languages to support

---

## Section 6 — Technical & Operational

29. Existing systems to integrate (CRM, broker backend, analytics)
30. Hosting/infrastructure preferences, and who owns/pays for it?
31. Security expectations (2FA / encryption at rest / penetration test / other)
32. Ongoing maintenance and support after launch required?

---

## Section 7 — API Access & Credentials

> **Note:** Generating API keys is free, and all **sandbox/test keys are free** to use. We build and test the app on sandbox keys. Production (live) keys are issued against your own licensed accounts and are provided near launch.

33. Sandbox / test credentials you can provide now (broker sandbox key+secret / market data test key / KYC sandbox key / payment gateway test keys / none yet)
34. Who will provide the **production (live)** credentials at launch, and when?

---

## Section 8 — Third-Party Running Costs (Client Responsibility)

> **Note:** The following are recurring operating costs billed to your own accounts — they are the **client's responsibility, not part of the development fee**. Development uses free sandbox services; these costs begin only when the platform goes live.

35. I acknowledge the following live-service costs are the client's responsibility:
    - Market data feed (monthly license)
    - KYC/AML checks (per verification)
    - Payment processing (per-transaction fee)
    - Email / SMS notifications
    - Hosting & infrastructure (monthly)
    - Charting library license (if commercial)
36. Authorised signatory name & signature (acknowledging the above)

---

## Section 9 — Engagement Terms & Developer Protection

> **Note:** This engagement is for **software development services only**. Core Care Consultancy builds the application; it is **not a broker, financial advisor, or party to any trade**. The client is solely responsible for licensing, regulatory compliance, KYC/AML, and custody of client funds.

37. Documents the client will provide before development begins:
    - Company trade license / registration
    - Brokerage license OR broker partnership agreement
    - ID & proof of authority of signatory
    - Signed development contract
38. The client acknowledges and agrees that:
    - Compliance, licensing & fund custody are the client's responsibility
    - Core Care Consultancy provides software only — no financial/legal advice
    - Liability is limited to fees paid; no liability for trading or fund losses
    - Client indemnifies the developer against end-user or regulator claims
    - Developer is not liable for third-party outages (broker, data, payments)
    - Scope changes require written change requests
    - Code ownership transfers on full payment
39. Payment terms agreed (deposit %, milestones, final payment)

---

## Required attachments checklist (⚠️ before development begins)

- [ ] Company trade license / registration (Q37)
- [ ] Brokerage license OR licensed-broker partnership agreement (Q7 / Q8)
- [ ] Broker/exchange API documentation + sandbox credentials (Q13 / Q14 / Q33)
- [ ] Payment processor details / account confirmation (Q20)
- [ ] Signed development contract (Q38)

---

*Once this form is completed and the required documents are attached, Core Care Consultancy will prepare a detailed scope, architecture proposal, timeline, and quote.*
