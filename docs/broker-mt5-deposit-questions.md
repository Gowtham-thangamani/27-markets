# Broker / MT5 / Deposits — Questions for the Client

_Purpose: answers to these decide how real‑money deposits, withdrawals, and MT5 trading will work on the 27 Markets platform. Questions 1–4 are the deal‑breakers._

## A. Broker relationship & licensing
1. Are you a licensed broker yourselves, or do you work through a partner broker? If partner — **which broker**, and under **which regulator/jurisdiction**?
2. Whose company name is the **"merchant of record"** on the client's card statement / bank receipt — yours or the broker's?

## B. MT5 access
3. Does the broker provide a **deposit/cashier page or API** we can redirect to or embed?
4. How do we access MT5 — **MT5 Manager/Admin API**, **MetaApi.cloud**, a **white‑label** you control, or clients' **own MT5 logins**?
16. Can we **create new MT5 accounts** programmatically, or only **link existing** ones?
17. Can we **place/close orders via API** on the client's behalf, or is trading done only inside MT5?
18. Do we get **live balance, equity, positions, and price feed** via the broker's API or MetaApi?
19. Are there **leverage, instrument, or symbol restrictions** enforced by the broker?

## C. Deposits (money in)
5. Which payment methods must be supported — **card, bank transfer, netbanking, UPI, wallets, crypto**?
6. Which **countries and currencies** are the clients in?
7. Is there an existing **payment gateway / PSP account**, and in whose name? Can it legally process trading‑account funding?
8. When a client deposits, **who credits the MT5 account and how fast** — instant via API, or manual by finance?
9. Is there a **minimum deposit** or any **deposit fees**?

## D. Withdrawals (money out)
10. Who **pays withdrawals** back to the client's bank — you or the broker?
11. What is the **withdrawal approval process** (who approves, time, limits)?
12. Must withdrawals go back to the **same source** the client deposited from?

## E. KYC / AML / compliance
13. Who **performs and stores KYC** (ID, address, selfie) — your platform or the broker?
14. Is trading **blocked until KYC is approved**, and who decides?
15. Are there **prohibited countries or client types** we must block?

## F. Commercials
20. How do you **earn revenue** — IB rebates/commission from the broker, or a markup you add? Who calculates and pays it?

---
_Once these are answered, we lock the architecture: (a) an IB/portal that links to the broker and never touches money, (b) a front‑end over the broker's cashier API, or (c) a model that needs you to be licensed._
