import { createRequire } from 'node:module';
import { formatVnd } from '@pc/shared';
import PDFDocument from 'pdfkit';

const require = createRequire(import.meta.url);
/** DejaVu covers the full Vietnamese range; pdfkit's built-in Helvetica would drop the diacritics. */
const FONT_REGULAR = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const FONT_BOLD = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');

export interface QuoteLine {
  category: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface QuoteData {
  /** Second header line, e.g. the build name. */
  subtitle?: string;
  /** Extra header lines such as estimated power draw. */
  details?: string[];
  date: Date;
  lines: QuoteLine[];
  assemblyFee: number;
}

export const QUOTE_TITLE = 'PC BUILDER — BÁO GIÁ CẤU HÌNH';
export const QUOTE_NOTE = 'Giá tham khảo, có hiệu lực 7 ngày kể từ ngày báo giá.';

const dateVn = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const MARGIN = 40;
const COLUMNS = [
  { title: 'Linh kiện', width: 90, align: 'left' },
  { title: 'Sản phẩm', width: 215, align: 'left' },
  { title: 'SL', width: 30, align: 'center' },
  { title: 'Đơn giá', width: 90, align: 'right' },
  { title: 'Thành tiền', width: 90, align: 'right' },
] as const;
const TABLE_WIDTH = COLUMNS.reduce((s, c) => s + c.width, 0);
const CELL_PAD = 4;

export function renderQuotePdf(data: QuoteData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    info: { Title: 'Báo giá cấu hình PC', Author: 'PC Builder' },
  });
  doc.registerFont('regular', FONT_REGULAR);
  doc.registerFont('bold', FONT_BOLD);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.font('bold').fontSize(16).text(QUOTE_TITLE, MARGIN, MARGIN);
  doc.moveDown(0.3);
  doc
    .font('regular')
    .fontSize(10)
    .text(`Ngày báo giá: ${dateVn.format(data.date)}`);
  if (data.subtitle) doc.text(data.subtitle);
  for (const line of data.details ?? []) doc.text(line);
  doc.moveDown(0.8);

  const bottom = doc.page.height - MARGIN;
  let y = doc.y;

  const row = (cells: string[], opts: { bold?: boolean; fill?: string } = {}) => {
    doc.font(opts.bold ? 'bold' : 'regular').fontSize(9.5);
    const height =
      Math.max(
        ...cells.map((text, i) => doc.heightOfString(text, { width: COLUMNS[i]!.width - CELL_PAD * 2 })),
      ) +
      CELL_PAD * 2;
    if (y + height > bottom) {
      doc.addPage();
      y = MARGIN;
    }
    if (opts.fill) doc.rect(MARGIN, y, TABLE_WIDTH, height).fill(opts.fill).fillColor('black');
    let x = MARGIN;
    cells.forEach((text, i) => {
      const col = COLUMNS[i]!;
      doc.text(text, x + CELL_PAD, y + CELL_PAD, { width: col.width - CELL_PAD * 2, align: col.align });
      x += col.width;
    });
    y += height;
    doc
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + TABLE_WIDTH, y)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke();
  };

  row(
    COLUMNS.map((c) => c.title),
    { bold: true, fill: '#eeeeee' },
  );
  let subtotal = 0;
  for (const line of data.lines) {
    const total = line.unitPrice * line.qty;
    subtotal += total;
    row([line.category, line.name, String(line.qty), formatVnd(line.unitPrice), formatVnd(total)]);
  }

  const summary = (label: string, amount: number, bold = false) => {
    doc.font(bold ? 'bold' : 'regular').fontSize(bold ? 11 : 10);
    const h = doc.heightOfString(label) + 6;
    if (y + h > bottom) {
      doc.addPage();
      y = MARGIN;
    }
    const labelWidth = TABLE_WIDTH - 140;
    doc.text(label, MARGIN, y + 3, { width: labelWidth - CELL_PAD, align: 'right' });
    doc.text(formatVnd(amount), MARGIN + labelWidth, y + 3, { width: 140 - CELL_PAD, align: 'right' });
    y += h;
  };
  y += 6;
  summary('Tạm tính', subtotal);
  if (data.assemblyFee > 0) summary('Phí lắp ráp', data.assemblyFee);
  summary('Tổng cộng', subtotal + data.assemblyFee, true);

  doc
    .font('regular')
    .fontSize(9)
    .fillColor('#555555')
    .text(QUOTE_NOTE, MARGIN, y + 16, { width: TABLE_WIDTH });
  doc.end();
  return done;
}
