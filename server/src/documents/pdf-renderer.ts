import PDFDocument from 'pdfkit';

export interface PdfDocumentInput {
  title: string;
  body: string;
  /** Printed at the foot of the page; omitted entirely when null. */
  footerNote: string | null;
  generatedAt: Date;
}

const SIMULATION_NOTE = 'SIMULATION — not a valid financial document';

/**
 * The watermark line for a generated document, or null when the platform is
 * live. Anything other than an explicit 'LIVE' keeps the watermark, so a
 * missing or malformed TRADING_MODE fails safe rather than silently issuing a
 * document that looks real.
 */
export function simulationFooter(tradingMode: string | undefined): string | null {
  return tradingMode === 'LIVE' ? null : SIMULATION_NOTE;
}

/** Render a document to a PDF buffer. Pure: no Nest, Prisma, or I/O. */
export function renderPdf(input: PdfDocumentInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#111111').text('27 Markets');
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#333333').text(input.title);
    doc.fontSize(9).fillColor('#777777').text(`Generated ${input.generatedAt.toISOString().slice(0, 10)}`);
    doc.moveDown(1.2);

    doc.fontSize(11).fillColor('#111111');
    if (input.body) doc.text(input.body, { align: 'left' });

    if (input.footerNote) {
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#B00020').text(input.footerNote, { align: 'center' });
    }

    doc.end();
  });
}
