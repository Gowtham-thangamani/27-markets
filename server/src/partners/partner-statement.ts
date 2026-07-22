import PDFDocument from 'pdfkit';

export interface StatementRow { date: string; client: string; level: number; amount: number }
export interface StatementInput {
  partnerName: string;
  referralCode: string;
  periodLabel: string;
  generatedAt: Date;
  rows: StatementRow[];
  totals: { total: number; direct: number; indirect: number; paid: number; available: number };
  /** Simulation watermark, or null when live. */
  footerNote: string | null;
}

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Render a partner commission statement to a PDF buffer. Pure: no Nest/Prisma/IO.
 * A simple fixed-column table — pdfkit has no table primitive, so columns are
 * placed by x-offset and rows advance by a fixed line height with page breaks.
 */
export function renderStatement(input: StatementInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    // Header
    doc.fontSize(20).fillColor('#111111').text('27 Markets');
    doc.fontSize(13).fillColor('#333333').text('Commission statement');
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#555555')
      .text(`Partner: ${input.partnerName}   ·   Code: ${input.referralCode}`)
      .text(`Period: ${input.periodLabel}`)
      .text(`Generated: ${input.generatedAt.toISOString().slice(0, 10)}`);
    doc.moveDown(1);

    // Summary band
    const summary = [
      ['Total earned', money(input.totals.total)],
      ['Direct', money(input.totals.direct)],
      ['Indirect', money(input.totals.indirect)],
      ['Paid out', money(input.totals.paid)],
      ['Available', money(input.totals.available)],
    ];
    const cellW = (right - left) / summary.length;
    summary.forEach(([label, value], i) => {
      const x = left + i * cellW;
      doc.fontSize(8).fillColor('#888888').text(label, x, doc.y, { width: cellW });
    });
    const valueY = doc.y;
    summary.forEach(([, value], i) => {
      const x = left + i * cellW;
      doc.fontSize(12).fillColor('#111111').text(value, x, valueY, { width: cellW });
    });
    doc.moveDown(1.5);

    // Table header
    const cols = [
      { key: 'date', label: 'Date', x: left, w: 90 },
      { key: 'client', label: 'Client', x: left + 95, w: 220 },
      { key: 'tier', label: 'Tier', x: left + 320, w: 70 },
      { key: 'amount', label: 'Amount', x: right - 90, w: 90 },
    ];
    const drawHeader = () => {
      doc.fontSize(9).fillColor('#888888');
      cols.forEach((c) => doc.text(c.label, c.x, doc.y, { width: c.w, continued: false, lineBreak: false }));
      doc.moveDown(0.4);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#DDDDDD').stroke();
      doc.moveDown(0.3);
    };
    drawHeader();

    doc.fontSize(9).fillColor('#111111');
    for (const r of input.rows) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
        drawHeader();
        doc.fontSize(9).fillColor('#111111');
      }
      const y = doc.y;
      doc.fillColor('#111111').text(r.date.slice(0, 10), cols[0].x, y, { width: cols[0].w, lineBreak: false });
      doc.text(r.client, cols[1].x, y, { width: cols[1].w, lineBreak: false });
      doc.fillColor(r.level === 1 ? '#1f6feb' : '#b8860b').text(r.level === 1 ? 'Direct' : `Level ${r.level}`, cols[2].x, y, { width: cols[2].w, lineBreak: false });
      doc.fillColor('#111111').text(money(r.amount), cols[3].x, y, { width: cols[3].w, align: 'left', lineBreak: false });
      doc.moveDown(0.6);
    }

    if (input.rows.length === 0) {
      doc.moveDown(0.5).fillColor('#888888').text('No commission in this period.', left, doc.y);
    }

    if (input.footerNote) {
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#B00020').text(input.footerNote, left, doc.y, { align: 'center', width: right - left });
    }

    doc.end();
  });
}
