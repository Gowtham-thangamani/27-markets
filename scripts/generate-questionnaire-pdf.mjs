// Generates a fillable PDF of the client discovery questionnaire.
// Run: node scripts/generate-questionnaire-pdf.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

// Optional brand logo: drop a PNG at assets/logo.png to embed it automatically.
const LOGO_PATH = new URL('../assets/logo.png', import.meta.url);
const COMPANY = 'CORE CARE CONSULTANCY';

// ---- Questionnaire content as structured data ------------------------------
// item types: 'text' (one-line input), 'area' (multi-line input),
//             'checks' (checkbox list), 'note' (info paragraph, no field)
const sections = [
  {
    title: 'Section 1 — Business & Scope',
    items: [
      { q: '1. Company / brand name', type: 'text' },
      { q: '2. Instruments to be traded (tick all that apply)', type: 'checks',
        options: ['Stocks / equities', 'Forex', 'CFDs', 'Crypto', 'Options', 'Futures', 'Commodities', 'Other'] },
      { q: '3. Target users (retail / professional / institutional / internal)', type: 'text' },
      { q: '4. Countries/regions you operate in and accept clients from', type: 'text' },
      { q: '5. Primary goal of the platform', type: 'checks',
        options: ['Marketing website + client portal', 'Full trading terminal with live execution', 'Both'] },
      { q: '6. Existing platform/codebase to build on or replace?', type: 'text' },
    ],
  },
  {
    title: 'Section 2 — Legal, Licensing & Compliance  (required before build)',
    items: [
      { q: '7. Are you a licensed broker/financial entity?', type: 'checks',
        options: ['Yes — license attached (regulator + number)', 'No — we partner with a licensed broker', 'No — neither yet'] },
      { q: '8. If partnering, which broker? (attach partnership / IB agreement)', type: 'text' },
      { q: '9. Which regulator(s) govern you? (e.g. SCA, DFSA, ADGM/FSRA, other)', type: 'text' },
      { q: '10. Who is legally responsible for holding/safeguarding client funds?', type: 'text' },
      { q: '11. KYC/AML requirements & preferred vendor', type: 'checks',
        options: ['Sumsub', 'Onfido', 'Jumio', 'Other', 'Need a recommendation'] },
      { q: '12. Data residency / privacy obligations (where must data be stored?)', type: 'text' },
      { q: 'Note: We cannot build a system that holds client money or executes real trades without proof of a valid license or a licensed-broker partnership (Q7/Q8). This protects both parties.', type: 'note' },
    ],
  },
  {
    title: 'Section 3 — Trading Execution & Market Data',
    items: [
      { q: '13. Which broker / liquidity provider / exchange will EXECUTE trades?', type: 'text' },
      { q: '14. Can you provide their API documentation and sandbox credentials?', type: 'text' },
      { q: '15. Real-time market data provider, and who pays for the feed licenses?', type: 'text' },
      { q: '16. Required order types (market / limit / stop / stop-limit / trailing)', type: 'text' },
      { q: '17. Charting expectations (TradingView library — licensed — or lighter)', type: 'text' },
      { q: '18. How are leverage, margin, spreads, and commissions configured?', type: 'area' },
    ],
  },
  {
    title: 'Section 4 — Funding & Money Movement',
    items: [
      { q: '19. Deposit/withdrawal methods', type: 'checks',
        options: ['Bank transfer', 'Cards', 'Crypto', 'E-wallets', 'Other'] },
      { q: '20. Payment processor(s) / PSP — do you already have an account?', type: 'text' },
      { q: '21. Where will client funds be held (bank / custodian)?', type: 'text' },
      { q: '22. Withdrawal rules (approvals, limits, processing times)', type: 'area' },
    ],
  },
  {
    title: 'Section 5 — Features & User Experience',
    items: [
      { q: '23. Account types/tiers offered and how they differ', type: 'area' },
      { q: '24. Onboarding flow (registration -> KYC -> approval -> funding)', type: 'area' },
      { q: '25. Required client portal features', type: 'checks',
        options: ['Dashboard / KPIs', 'Deposit / withdraw / transfer', 'KYC upload & status', 'Downloads', 'Support tickets', 'Profile & settings', 'Other'] },
      { q: '26. Need an admin / back-office panel? (users, KYC approval, reporting)', type: 'text' },
      { q: '27. Notifications required', type: 'checks',
        options: ['Email', 'SMS', 'In-app', 'Push'] },
      { q: '28. Languages to support', type: 'text' },
    ],
  },
  {
    title: 'Section 6 — Technical & Operational',
    items: [
      { q: '29. Existing systems to integrate (CRM, broker backend, analytics)', type: 'text' },
      { q: '30. Hosting/infrastructure preferences, and who owns/pays for it?', type: 'text' },
      { q: '31. Security expectations', type: 'checks', options: ['2FA', 'Encryption at rest', 'Penetration test', 'Other'] },
      { q: '32. Ongoing maintenance and support after launch required?', type: 'text' },
    ],
  },
  {
    title: 'Section 7 — API Access & Credentials',
    items: [
      { q: 'Note: Generating API keys is free, and all SANDBOX/TEST keys are free to use. We build and test the app on sandbox keys. Production (live) keys are issued against your own licensed accounts and are provided near launch.', type: 'note' },
      { q: '33. Sandbox / test credentials you can provide now (tick all available)', type: 'checks',
        options: ['Broker/exchange sandbox API key + secret', 'Market data test key', 'KYC vendor sandbox key', 'Payment gateway test keys', 'None yet — need guidance'] },
      { q: '34. Who will provide the PRODUCTION (live) credentials at launch, and when?', type: 'area' },
    ],
  },
  {
    title: 'Section 8 — Third-Party Running Costs (Client Responsibility)',
    items: [
      { q: 'Note: The following are recurring operating costs billed to your own accounts — they are the client\'s responsibility, not part of the development fee. Development uses free sandbox services; these costs begin only when the platform goes live.', type: 'note' },
      { q: '35. I acknowledge the following live-service costs are the client\'s responsibility', type: 'checks',
        options: ['Market data feed (monthly license)', 'KYC/AML checks (per verification)', 'Payment processing (per-transaction fee)', 'Email / SMS notifications', 'Hosting & infrastructure (monthly)', 'Charting library license (if commercial)'] },
      { q: '36. Authorised signatory name & signature (acknowledging the above)', type: 'text' },
    ],
  },
  {
    title: 'Section 9 — Engagement Terms & Developer Protection',
    items: [
      { q: 'Note: This engagement is for software development services only. Core Care Consultancy builds the application; it is NOT a broker, financial advisor, or party to any trade. The client is solely responsible for licensing, regulatory compliance, KYC/AML, and custody of client funds.', type: 'note' },
      { q: '37. Documents the client will provide before development begins', type: 'checks',
        options: ['Company trade license / registration', 'Brokerage license OR broker partnership agreement', 'ID & proof of authority of signatory', 'Signed development contract'] },
      { q: '38. The client acknowledges and agrees that:', type: 'checks',
        options: ['Compliance, licensing & fund custody are the client\'s responsibility', 'Core Care Consultancy provides software only — no financial/legal advice', 'Liability is limited to fees paid; no liability for trading or fund losses', 'Client indemnifies the developer against end-user or regulator claims', 'Developer is not liable for third-party outages (broker, data, payments)', 'Scope changes require written change requests', 'Code ownership transfers on full payment'] },
      { q: '39. Payment terms agreed (deposit %, milestones, final payment)', type: 'text' },
    ],
  },
];

// ---- Layout engine ---------------------------------------------------------
const A4 = [595.28, 841.89];
const M = 48;                 // margin
const CW = A4[0] - M * 2;     // content width
const NAVY = rgb(0.16, 0.19, 0.29);   // Core Care wordmark navy (#293049)
const BLUE = rgb(0.36, 0.56, 0.93);   // Core Care accent blue (#5b8eed)
const WARN = rgb(0.85, 0.18, 0.20);   // red — reserved for legal warnings only
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.8, 0.8, 0.8);
const BANDBG = rgb(0.96, 0.97, 0.98);

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const form = pdf.getForm();

let page = pdf.addPage(A4);
let y = A4[1] - M;
let fieldId = 0;

function newPage() {
  page = pdf.addPage(A4);
  y = A4[1] - M;
}
function ensure(space) {
  if (y - space < M) newPage();
}
// word-wrap helper
function wrap(text, f, size, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (f.widthOfTextAtSize(test, size) > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function drawWrapped(text, f, size, color, x, maxW, lineGap = 3) {
  const lines = wrap(text, f, size, maxW);
  for (const ln of lines) {
    ensure(size + lineGap);
    page.drawText(ln, { x, y: y - size, size, font: f, color });
    y -= size + lineGap;
  }
}

// ---- Logo (no box / no band — logo on plain white) -------------------------
const headTop = A4[1] - M;
let haveLogo = false;
if (existsSync(LOGO_PATH)) {
  try {
    const img = await pdf.embedPng(readFileSync(LOGO_PATH));
    const h = 72, w = (img.width / img.height) * h;
    page.drawImage(img, { x: M, y: headTop - h, width: w, height: h });
    haveLogo = true;
    y = headTop - h - 14;
  } catch { /* fall back to wordmark */ }
}
if (!haveLogo) {
  page.drawText('CORE CARE', { x: M, y: headTop - 18, size: 18, font: bold, color: NAVY });
  page.drawText('CONSULTANCY', { x: M + 1, y: headTop - 32, size: 9, font, color: GRAY });
  y = headTop - 48;
}

// ---- Header ----------------------------------------------------------------
page.drawText('Trading Web Application', { x: M, y: y - 22, size: 22, font: bold, color: NAVY });
y -= 30;
page.drawText('Client Discovery Questionnaire', { x: M, y: y - 16, size: 14, font: bold, color: BLUE });
y -= 30;
drawWrapped('Real-money trading platform. Please complete all sections. Items in Sections 2-4 require supporting documents (license, broker agreement, payment processor) before development can begin.',
  font, 9.5, GRAY, M, CW);
y -= 6;

// top meta fields
for (const [label, w] of [['Prepared for', 200], ['Date', 120]]) {
  ensure(34);
  page.drawText(label, { x: M, y: y - 9, size: 9, font: bold, color: DARK });
  const tf = form.createTextField(`meta_${fieldId++}`);
  tf.setText('');
  tf.addToPage(page, { x: M, y: y - 28, width: w, height: 16, borderColor: LINE, borderWidth: 1 });
  y -= 0; // keep same row
  // shift x for second field handled below
  if (label === 'Prepared for') {
    page.drawText('Date', { x: M + 230, y: y - 9, size: 9, font: bold, color: DARK });
    const tf2 = form.createTextField(`meta_${fieldId++}`);
    tf2.setText('');
    tf2.addToPage(page, { x: M + 230, y: y - 28, width: 150, height: 16, borderColor: LINE, borderWidth: 1 });
    y -= 36;
    break;
  }
}
y -= 4;

// ---- Render sections -------------------------------------------------------
for (const sec of sections) {
  ensure(40);
  // section header bar
  page.drawRectangle({ x: M, y: y - 22, width: CW, height: 20, color: rgb(0.94, 0.96, 0.99) });
  page.drawRectangle({ x: M, y: y - 22, width: 3, height: 20, color: BLUE });
  page.drawText(sec.title, { x: M + 10, y: y - 17, size: 11, font: bold, color: NAVY });
  y -= 32;

  for (const it of sec.items) {
    if (it.type === 'note') {
      ensure(20);
      const lines = wrap(it.q, font, 8.5, CW - 16);
      const boxH = lines.length * 11 + 12;
      ensure(boxH + 6);
      page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: rgb(0.99, 0.95, 0.95), borderColor: WARN, borderWidth: 0.7 });
      let ty = y - 12;
      for (const ln of lines) {
        page.drawText(ln, { x: M + 8, y: ty - 2, size: 8.5, font, color: rgb(0.55, 0.1, 0.13) });
        ty -= 11;
      }
      y -= boxH + 8;
      continue;
    }

    // question label
    drawWrapped(it.q, font, 10, DARK, M, CW);
    y -= 2;

    if (it.type === 'text') {
      ensure(22);
      const tf = form.createTextField(`f_${fieldId++}`);
      tf.setText('');
      tf.addToPage(page, { x: M, y: y - 17, width: CW, height: 16, borderColor: LINE, borderWidth: 1 });
      y -= 24;
    } else if (it.type === 'area') {
      ensure(48);
      const tf = form.createTextField(`f_${fieldId++}`);
      tf.enableMultiline();
      tf.setText('');
      tf.addToPage(page, { x: M, y: y - 44, width: CW, height: 42, borderColor: LINE, borderWidth: 1 });
      y -= 50;
    } else if (it.type === 'checks') {
      const colW = CW / 2;
      const colTextW = colW - 18;   // text room per column in 2-col mode
      // Only use two columns when every label fits; otherwise long labels overlap.
      const fits2col = it.options.every(o => font.widthOfTextAtSize(o, 9) <= colTextW);
      if (fits2col) {
        let rowTop = y;
        for (let i = 0; i < it.options.length; i++) {
          const opt = it.options[i];
          const col = i % 2;
          if (col === 0) { ensure(18); rowTop = y; }
          const x = M + col * colW;
          const cb = form.createCheckBox(`f_${fieldId++}`);
          cb.addToPage(page, { x, y: rowTop - 14, width: 11, height: 11, borderColor: LINE, borderWidth: 1 });
          page.drawText(opt, { x: x + 16, y: rowTop - 13, size: 9, font, color: DARK });
          if (col === 1 || i === it.options.length - 1) y = rowTop - 18;
        }
      } else {
        // single full-width column, wrapping any long labels
        const textW = CW - 18;
        for (const opt of it.options) {
          const lines = wrap(opt, font, 9, textW);
          const rowH = Math.max(16, lines.length * 11 + 4);
          ensure(rowH);
          const cb = form.createCheckBox(`f_${fieldId++}`);
          cb.addToPage(page, { x: M, y: y - 14, width: 11, height: 11, borderColor: LINE, borderWidth: 1 });
          let ty = y - 13;
          for (const ln of lines) {
            page.drawText(ln, { x: M + 16, y: ty, size: 9, font, color: DARK });
            ty -= 11;
          }
          y -= rowH;
        }
      }
      y -= 4;
    }
  }
  y -= 6;
}

// ---- Attachments checklist -------------------------------------------------
ensure(120);
page.drawRectangle({ x: M, y: y - 22, width: CW, height: 20, color: rgb(0.99, 0.95, 0.95) });
page.drawRectangle({ x: M, y: y - 22, width: 3, height: 20, color: WARN });
page.drawText('Required attachments (before development begins)', { x: M + 10, y: y - 17, size: 11, font: bold, color: NAVY });
y -= 34;
const attachments = [
  'Company trade license / registration (Q37)',
  'Brokerage license OR licensed-broker partnership agreement (Q7 / Q8)',
  'Broker/exchange API documentation + sandbox credentials (Q13 / Q14 / Q33)',
  'Payment processor details / account confirmation (Q20)',
  'Signed development contract (Q38)',
];
for (const a of attachments) {
  ensure(18);
  const cb = form.createCheckBox(`att_${fieldId++}`);
  cb.addToPage(page, { x: M, y: y - 14, width: 11, height: 11, borderColor: LINE, borderWidth: 1 });
  page.drawText(a, { x: M + 16, y: y - 13, size: 9.5, font, color: DARK });
  y -= 18;
}
y -= 8;
drawWrapped('Once this form is completed and the required documents are attached, we will prepare a detailed scope, architecture proposal, timeline, and quote.',
  font, 8.5, GRAY, M, CW);

// ---- Sign-off block --------------------------------------------------------
ensure(180);
y -= 12;
page.drawRectangle({ x: M, y: y - 22, width: CW, height: 20, color: rgb(0.94, 0.96, 0.99) });
page.drawRectangle({ x: M, y: y - 22, width: 3, height: 20, color: BLUE });
page.drawText('Sign-off — Agreement of Both Parties', { x: M + 10, y: y - 17, size: 11, font: bold, color: NAVY });
y -= 40;

const halfW = CW / 2;
const boxW = halfW - 16;
const topY = y;
['Client', 'Core Care Consultancy'].forEach((party, idx) => {
  const x = M + idx * halfW;
  let yy = topY;
  page.drawText(party, { x, y: yy, size: 9.5, font: bold, color: NAVY });
  yy -= 12;
  // Blank signature area — kept free of form fields so the signer can INSERT a
  // signature image/drawing (WPS: Insert > Sign/Picture; Adobe: Fill & Sign).
  page.drawRectangle({ x, y: yy - 36, width: boxW, height: 36, borderColor: LINE, borderWidth: 1, color: rgb(0.99, 0.995, 1) });
  page.drawText('Signature  (insert signature here)', { x, y: yy - 48, size: 7.5, font, color: GRAY });
  yy -= 64;
  // Name
  page.drawText('Name', { x, y: yy, size: 8, font, color: DARK });
  const nf = form.createTextField(`sig_${fieldId++}`);
  nf.setText('');
  nf.addToPage(page, { x: x + 36, y: yy - 3, width: boxW - 36, height: 14, borderColor: LINE, borderWidth: 1 });
  yy -= 22;
  // Title
  page.drawText('Title', { x, y: yy, size: 8, font, color: DARK });
  const tf = form.createTextField(`sig_${fieldId++}`);
  tf.setText('');
  tf.addToPage(page, { x: x + 36, y: yy - 3, width: boxW - 36, height: 14, borderColor: LINE, borderWidth: 1 });
  yy -= 22;
  // Date
  page.drawText('Date', { x, y: yy, size: 8, font, color: DARK });
  const df = form.createTextField(`sig_${fieldId++}`);
  df.setText('');
  df.addToPage(page, { x: x + 36, y: yy - 3, width: boxW - 36, height: 14, borderColor: LINE, borderWidth: 1 });
});
y = topY - 130;

// page footers
const pages = pdf.getPages();
pages.forEach((p, i) => {
  p.drawText(`Page ${i + 1} of ${pages.length}`, { x: A4[0] - M - 70, y: 24, size: 8, font, color: GRAY });
  p.drawText('Prepared by Core Care Consultancy — Client Discovery Questionnaire', { x: M, y: 24, size: 8, font, color: GRAY });
});

form.updateFieldAppearances(font);
const bytes = await pdf.save();
writeFileSync(new URL('../docs/client-discovery-questionnaire.pdf', import.meta.url), bytes);
console.log(`Created docs/client-discovery-questionnaire.pdf (${pages.length} pages, ${fieldId} fields)`);
