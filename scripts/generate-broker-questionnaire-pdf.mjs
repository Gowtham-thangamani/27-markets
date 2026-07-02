// Generates a fillable PDF of the Broker / MT5 / Payments integration questionnaire.
// Run: node scripts/generate-broker-questionnaire-pdf.mjs
// (Same layout engine + branding as generate-questionnaire-pdf.mjs.)
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const LOGO_PATH = new URL('../assets/logo.png', import.meta.url);

// ---- Questionnaire content as structured data ------------------------------
// item types: 'text' | 'area' | 'checks' | 'note'
const sections = [
  {
    title: 'Section 1 — Broker Relationship & Licensing  (deal-breakers)',
    items: [
      { q: '1. Are you a licensed broker yourselves, or do you work through a partner broker?', type: 'checks',
        options: ['Yes — we are licensed (regulator + number)', 'No — we partner with a licensed broker', 'No — neither yet'] },
      { q: '2. If partnering, which broker, and under which regulator / jurisdiction?', type: 'text' },
      { q: '3. Whose company name is the "merchant of record" on the client\'s card statement / bank receipt?', type: 'checks',
        options: ['Ours', "The broker's", 'Not sure'] },
      { q: 'Note: If you are NOT the broker, you generally cannot collect and hold client deposits yourself without becoming a regulated payment intermediary. Q1-Q3 decide whether deposits flow through the broker or through you.', type: 'note' },
    ],
  },
  {
    title: 'Section 2 — MT5 Access & Trading',
    items: [
      { q: '4. How do we access MT5?', type: 'checks',
        options: ['Broker MT5 Manager / Admin API', 'MetaApi.cloud access', 'A white-label MT5 we control', "Clients' own MT5 logins", 'Not sure'] },
      { q: '5. Can we CREATE new MT5 accounts programmatically, or only LINK existing ones?', type: 'checks',
        options: ['Create new accounts via API', 'Link existing accounts only', 'Not sure'] },
      { q: '6. Can we place / close orders via API on the client\'s behalf, or is trading done only inside MT5?', type: 'checks',
        options: ['Place/close orders via API', 'View only — trading happens inside MT5', 'Not sure'] },
      { q: '7. Do we get live balance, equity, positions, and price feed via the broker API or MetaApi? (which?)', type: 'text' },
      { q: '8. Any leverage, instrument, or symbol restrictions the broker enforces?', type: 'area' },
    ],
  },
  {
    title: 'Section 3 — Deposits (money in)',
    items: [
      { q: '9. Does the broker provide a deposit / cashier page or API we can redirect to or embed?', type: 'checks',
        options: ['Yes — hosted cashier page', 'Yes — cashier API', 'No', 'Not sure'] },
      { q: '10. Which payment methods must be supported?', type: 'checks',
        options: ['Credit / debit card', 'Bank transfer', 'Netbanking', 'UPI', 'E-wallets', 'Crypto', 'Other'] },
      { q: '11. Which countries and currencies are the clients in?', type: 'text' },
      { q: '12. Is there an existing payment gateway / PSP account, and in whose name? Can it legally process trading-account funding?', type: 'area' },
      { q: '13. When a client deposits, who credits the MT5 account and how fast?', type: 'checks',
        options: ['Instant via API', 'Manual by the broker / finance team', 'Not sure'] },
      { q: '14. Is there a minimum deposit or any deposit fees?', type: 'text' },
    ],
  },
  {
    title: 'Section 4 — Withdrawals (money out)',
    items: [
      { q: '15. Who pays withdrawals back to the client\'s bank?', type: 'checks',
        options: ['You (our company)', 'The broker', 'Not sure'] },
      { q: '16. What is the withdrawal approval process (who approves, time, limits)?', type: 'area' },
      { q: '17. Must withdrawals go back to the same source the client deposited from?', type: 'checks',
        options: ['Yes — same source required', 'No', 'Not sure'] },
    ],
  },
  {
    title: 'Section 5 — KYC / AML / Compliance',
    items: [
      { q: '18. Who performs and stores KYC (ID, address, selfie)?', type: 'checks',
        options: ['Our platform', 'The broker', 'Shared / both', 'Not sure'] },
      { q: '19. Is trading blocked until KYC is approved, and who decides?', type: 'text' },
      { q: '20. Are there prohibited countries or client types we must block?', type: 'area' },
    ],
  },
  {
    title: 'Section 6 — Commercials',
    items: [
      { q: '21. How do you earn revenue?', type: 'checks',
        options: ['IB rebates / commission from the broker', 'A markup we add', 'Both', 'Not sure'] },
      { q: '22. Who calculates and pays your revenue, and how often?', type: 'text' },
    ],
  },
];

const attachments = [
  'Broker partnership / IB agreement (Q1 / Q2)',
  'Broker or MT5 API documentation + sandbox credentials (Q4 / Q7)',
  'Payment gateway / PSP account confirmation, with merchant name (Q3 / Q12)',
  'Brokerage license (only if you are the licensed broker — Q1)',
];

// ---- Layout engine (identical to generate-questionnaire-pdf.mjs) -----------
const A4 = [595.28, 841.89];
const M = 48;
const CW = A4[0] - M * 2;
const NAVY = rgb(0.16, 0.19, 0.29);
const BLUE = rgb(0.36, 0.56, 0.93);
const WARN = rgb(0.85, 0.18, 0.20);
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.8, 0.8, 0.8);

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const form = pdf.getForm();

let page = pdf.addPage(A4);
let y = A4[1] - M;
let fieldId = 0;

function newPage() { page = pdf.addPage(A4); y = A4[1] - M; }
function ensure(space) { if (y - space < M) newPage(); }
function wrap(text, f, size, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (f.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function drawWrapped(text, f, size, color, x, maxW, lineGap = 3) {
  for (const ln of wrap(text, f, size, maxW)) {
    ensure(size + lineGap);
    page.drawText(ln, { x, y: y - size, size, font: f, color });
    y -= size + lineGap;
  }
}

// ---- Logo / wordmark -------------------------------------------------------
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
page.drawText('Broker, MT5 & Payments', { x: M, y: y - 22, size: 22, font: bold, color: NAVY });
y -= 30;
page.drawText('Integration Questionnaire', { x: M, y: y - 16, size: 14, font: bold, color: BLUE });
y -= 30;
drawWrapped('To wire real-money deposits, withdrawals, and MT5 trading we need to know how your broker relationship and payments work. Please answer every question. Questions 1-4 are the most important — they decide the entire architecture.',
  font, 9.5, GRAY, M, CW);
y -= 6;

for (const [label, w] of [['Prepared for', 200]]) {
  ensure(34);
  page.drawText(label, { x: M, y: y - 9, size: 9, font: bold, color: DARK });
  const tf = form.createTextField(`meta_${fieldId++}`);
  tf.setText('');
  tf.addToPage(page, { x: M, y: y - 28, width: w, height: 16, borderColor: LINE, borderWidth: 1 });
  page.drawText('Date', { x: M + 230, y: y - 9, size: 9, font: bold, color: DARK });
  const tf2 = form.createTextField(`meta_${fieldId++}`);
  tf2.setText('');
  tf2.addToPage(page, { x: M + 230, y: y - 28, width: 150, height: 16, borderColor: LINE, borderWidth: 1 });
  y -= 36;
}
y -= 4;

// ---- Render sections -------------------------------------------------------
for (const sec of sections) {
  ensure(40);
  page.drawRectangle({ x: M, y: y - 22, width: CW, height: 20, color: rgb(0.94, 0.96, 0.99) });
  page.drawRectangle({ x: M, y: y - 22, width: 3, height: 20, color: BLUE });
  page.drawText(sec.title, { x: M + 10, y: y - 17, size: 11, font: bold, color: NAVY });
  y -= 32;

  for (const it of sec.items) {
    if (it.type === 'note') {
      const lines = wrap(it.q, font, 8.5, CW - 16);
      const boxH = lines.length * 11 + 12;
      ensure(boxH + 6);
      page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: rgb(0.99, 0.95, 0.95), borderColor: WARN, borderWidth: 0.7 });
      let ty = y - 12;
      for (const ln of lines) { page.drawText(ln, { x: M + 8, y: ty - 2, size: 8.5, font, color: rgb(0.55, 0.1, 0.13) }); ty -= 11; }
      y -= boxH + 8;
      continue;
    }

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
      const colTextW = colW - 18;
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
        const textW = CW - 18;
        for (const opt of it.options) {
          const lines = wrap(opt, font, 9, textW);
          const rowH = Math.max(16, lines.length * 11 + 4);
          ensure(rowH);
          const cb = form.createCheckBox(`f_${fieldId++}`);
          cb.addToPage(page, { x: M, y: y - 14, width: 11, height: 11, borderColor: LINE, borderWidth: 1 });
          let ty = y - 13;
          for (const ln of lines) { page.drawText(ln, { x: M + 16, y: ty, size: 9, font, color: DARK }); ty -= 11; }
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
page.drawText('Useful attachments (if available)', { x: M + 10, y: y - 17, size: 11, font: bold, color: NAVY });
y -= 34;
for (const a of attachments) {
  ensure(18);
  const cb = form.createCheckBox(`att_${fieldId++}`);
  cb.addToPage(page, { x: M, y: y - 14, width: 11, height: 11, borderColor: LINE, borderWidth: 1 });
  page.drawText(a, { x: M + 16, y: y - 13, size: 9.5, font, color: DARK });
  y -= 18;
}
y -= 8;
drawWrapped('Once these are answered, we lock the architecture: an IB/portal that links to the broker (never touches money), a front-end over the broker\'s cashier API, or a model that requires you to be licensed.',
  font, 8.5, GRAY, M, CW);

// ---- Sign-off block --------------------------------------------------------
ensure(180);
y -= 12;
page.drawRectangle({ x: M, y: y - 22, width: CW, height: 20, color: rgb(0.94, 0.96, 0.99) });
page.drawRectangle({ x: M, y: y - 22, width: 3, height: 20, color: BLUE });
page.drawText('Completed by', { x: M + 10, y: y - 17, size: 11, font: bold, color: NAVY });
y -= 40;

const halfW = CW / 2;
const boxW = halfW - 16;
const topY = y;
['Client', 'Core Care Consultancy'].forEach((party, idx) => {
  const x = M + idx * halfW;
  let yy = topY;
  page.drawText(party, { x, y: yy, size: 9.5, font: bold, color: NAVY });
  yy -= 12;
  page.drawRectangle({ x, y: yy - 36, width: boxW, height: 36, borderColor: LINE, borderWidth: 1, color: rgb(0.99, 0.995, 1) });
  page.drawText('Signature  (insert signature here)', { x, y: yy - 48, size: 7.5, font, color: GRAY });
  yy -= 64;
  page.drawText('Name', { x, y: yy, size: 8, font, color: DARK });
  const nf = form.createTextField(`sig_${fieldId++}`); nf.setText('');
  nf.addToPage(page, { x: x + 36, y: yy - 3, width: boxW - 36, height: 14, borderColor: LINE, borderWidth: 1 });
  yy -= 22;
  page.drawText('Title', { x, y: yy, size: 8, font, color: DARK });
  const tf = form.createTextField(`sig_${fieldId++}`); tf.setText('');
  tf.addToPage(page, { x: x + 36, y: yy - 3, width: boxW - 36, height: 14, borderColor: LINE, borderWidth: 1 });
  yy -= 22;
  page.drawText('Date', { x, y: yy, size: 8, font, color: DARK });
  const df = form.createTextField(`sig_${fieldId++}`); df.setText('');
  df.addToPage(page, { x: x + 36, y: yy - 3, width: boxW - 36, height: 14, borderColor: LINE, borderWidth: 1 });
});
y = topY - 130;

const pages = pdf.getPages();
pages.forEach((p, i) => {
  p.drawText(`Page ${i + 1} of ${pages.length}`, { x: A4[0] - M - 70, y: 24, size: 8, font, color: GRAY });
  p.drawText('Prepared by Core Care Consultancy — Broker / MT5 / Payments Questionnaire', { x: M, y: 24, size: 8, font, color: GRAY });
});

form.updateFieldAppearances(font);
const bytes = await pdf.save();
writeFileSync(new URL('../docs/broker-mt5-payments-questionnaire.pdf', import.meta.url), bytes);
console.log(`Created docs/broker-mt5-payments-questionnaire.pdf (${pages.length} pages, ${fieldId} fields)`);
