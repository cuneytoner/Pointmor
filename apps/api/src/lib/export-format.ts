import PDFDocument from "pdfkit";
import { createRequire } from "node:module";

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildAuditCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

const require = createRequire(import.meta.url);

let cachedPdfFontPath: string | null | undefined;

function resolvePdfFontPath(): string | null {
  if (cachedPdfFontPath !== undefined) return cachedPdfFontPath;
  const candidates = [
    "dejavu-fonts-ttf/ttf/DejaVuSans.ttf",
    "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff",
    "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff2",
    "@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff",
    "@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2",
  ];
  for (const modulePath of candidates) {
    try {
      cachedPdfFontPath = require.resolve(modulePath);
      return cachedPdfFontPath;
    } catch {
      // Try next candidate.
    }
  }
  cachedPdfFontPath = null;
  return null;
}

function normalizePdfLine(line: string): string {
  // Keep Turkish characters, but remove invisible controls that may break layout in some readers.
  return line.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\t/g, "  ");
}

type PdfReportTable = {
  headers: string[];
  rows: string[][];
  columnFractions?: number[];
  alignments?: Array<"left" | "right" | "center">;
};

type PdfReportSpec = {
  title: string;
  subtitleLines?: string[];
  metaRows?: Array<{ label: string; value: string }>;
  table?: PdfReportTable;
  notes?: string[];
};

function pageTextWidth(doc: any): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: any, requiredHeight: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + requiredHeight > bottom) {
    doc.addPage();
  }
}

function normalizeCell(text: string): string {
  return normalizePdfLine(text).trim();
}

function drawTable(doc: any, table: PdfReportTable): void {
  if (table.headers.length === 0) return;
  const cols = table.headers.length;
  const fractions =
    table.columnFractions && table.columnFractions.length === cols
      ? table.columnFractions
      : Array.from({ length: cols }, () => 1);
  const sum = fractions.reduce((a, b) => a + Math.max(0.01, b), 0);
  const totalWidth = pageTextWidth(doc);
  const colWidths = fractions.map((f) => (Math.max(0.01, f) / sum) * totalWidth);
  const alignments =
    table.alignments && table.alignments.length === cols
      ? table.alignments
      : Array.from({ length: cols }, () => "left" as const);
  const cellPadX = 6;
  const cellPadY = 7;
  const minRowHeight = 24;
  const x0 = doc.page.margins.left;

  const drawRow = (cells: string[], isHeader: boolean) => {
    const normalized = cells.map(normalizeCell);
    const textHeights = normalized.map((cell, i) =>
      doc.heightOfString(cell, { width: Math.max(10, colWidths[i] - cellPadX * 2) }),
    );
    const rowHeight = Math.max(minRowHeight, ...textHeights.map((h) => h + cellPadY * 2));
    ensureSpace(doc, rowHeight + 1);
    const y = doc.y;

    let x = x0;
    for (let i = 0; i < cols; i += 1) {
      const w = colWidths[i];
      if (isHeader) {
        doc.save();
        doc.rect(x, y, w, rowHeight).fill("#f3f4f6");
        doc.restore();
      }
      doc.rect(x, y, w, rowHeight).stroke("#d1d5db");
      doc.fontSize(9);
      doc.text(normalized[i] ?? "", x + cellPadX, y + cellPadY, {
        width: Math.max(10, w - cellPadX * 2),
        align: alignments[i],
      });
      x += w;
    }
    doc.y = y + rowHeight;
  };

  drawRow(table.headers, true);
  for (const row of table.rows) {
    const cells = Array.from({ length: cols }, (_, i) => row[i] ?? "");
    drawRow(cells, false);
  }
}

export async function renderPdfReport(spec: PdfReportSpec): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => {
      chunks.push(c);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);
    const fontPath = resolvePdfFontPath();
    if (fontPath) {
      doc.font(fontPath);
    }

    const textWidth = pageTextWidth(doc);
    doc.fontSize(14).text(normalizePdfLine(spec.title), {
      width: textWidth,
    });
    doc.moveDown(0.5);

    doc.fontSize(10);
    for (const line of spec.subtitleLines ?? []) {
      doc.text(normalizePdfLine(line), { width: textWidth });
      doc.moveDown(0.2);
    }
    if ((spec.subtitleLines?.length ?? 0) > 0) {
      doc.moveDown(0.3);
    }

    if ((spec.metaRows?.length ?? 0) > 0) {
      for (const row of spec.metaRows ?? []) {
        doc.text(`${normalizeCell(row.label)}: `, { continued: true });
        doc.text(normalizeCell(row.value), { width: textWidth });
      }
      doc.moveDown(0.5);
    }

    if (spec.table) {
      drawTable(doc, spec.table);
      doc.moveDown(0.5);
    }

    doc.fontSize(9);
    for (const note of spec.notes ?? []) {
      ensureSpace(doc, 20);
      doc.text(normalizePdfLine(note), { width: textWidth });
      doc.moveDown(0.2);
    }
    doc.end();
  });
}

export async function renderPdfDocument(lines: string[]): Promise<Buffer> {
  return renderPdfReport({
    title: "Pointmor PDF",
    subtitleLines: lines,
  });
}
