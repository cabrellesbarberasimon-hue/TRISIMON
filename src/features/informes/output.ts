import { downloadBlob } from '../datos/excel';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Alternativa para navegadores sin API de portapapeles
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported';

/** Comparte el informe (Web Share API): primero como texto y, si no se puede, como archivo .md */
export async function shareReport(markdown: string, filename: string): Promise<ShareResult> {
  if (!navigator.share) return 'unsupported';
  try {
    await navigator.share({ title: 'Informe TriSimon', text: markdown });
    return 'shared';
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return 'cancelled';
  }
  const file = new File([markdown], filename, { type: 'text/markdown' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Informe TriSimon' });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  return 'unsupported';
}

export function downloadMarkdown(markdown: string, filename: string): void {
  downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), filename);
}

/** Las fuentes estándar de PDF solo cubren Latin-1: se sustituyen los símbolos que no caben */
export function pdfSafe(text: string): string {
  const map: Record<string, string> = { 'Σ': 'Sum', '≥': '>=', '≤': '<=', '−': '-', '→': '->', '⚠': '(!)', '≈': '~', '✓': 'OK', '²': '2', '…': '...', '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '•': '-' };
  return [...text].map((c) => map[c] ?? (c.charCodeAt(0) > 255 ? '?' : c)).join('');
}

/** PDF sencillo del Markdown: títulos en negrita, tablas y JSON en fuente monoespaciada */
export async function downloadPdf(markdown: string, filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  let y = margin;

  const write = (text: string, opts: { size: number; bold?: boolean; mono?: boolean; gap?: number }) => {
    doc.setFont(opts.mono ? 'courier' : 'helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size);
    const lineH = opts.size * 0.42;
    for (const line of doc.splitTextToSize(pdfSafe(text), width) as string[]) {
      if (y + lineH > bottom) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineH;
    }
    y += opts.gap ?? 1;
  };

  let inCode = false;
  let tableRows: string[][] = [];
  const flushTable = () => {
    if (!tableRows.length) return;
    for (const line of alignTable(tableRows)) write(line, { size: 7.5, mono: true, gap: 0.3 });
    tableRows = [];
    y += 1.5;
  };
  for (const raw of markdown.split('\n')) {
    if (!inCode && raw.startsWith('|')) {
      if (!/^\|[-| ]+\|$/.test(raw)) tableRows.push(raw.slice(1, -1).split('|').map((c) => c.trim()));
      continue;
    }
    flushTable();
    if (raw.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) write(raw, { size: 7, mono: true, gap: 0 });
    else if (raw.startsWith('# ')) write(raw.slice(2), { size: 16, bold: true, gap: 3 });
    else if (raw.startsWith('## ')) write(raw.slice(3), { size: 13, bold: true, gap: 2 });
    else if (raw.startsWith('### ')) write(raw.slice(4), { size: 11, bold: true, gap: 1.5 });
    else if (raw.trim() === '') y += 2;
    else write(raw.replace(/\*\*/g, '').replace(/_([^_]+)_/g, '$1'), { size: 9.5 });
  }
  flushTable();
  doc.save(filename);
}

/** Tabla en texto monoespaciado con columnas alineadas (la cabecera subrayada) */
export function alignTable(rows: string[][]): string[] {
  const cols = Math.max(...rows.map((r) => r.length));
  const widths = Array.from({ length: cols }, (_, c) => Math.max(...rows.map((r) => (r[c] ?? '').length)));
  const line = (r: string[]) => widths.map((w, c) => (r[c] ?? '').padEnd(w)).join('  ').trimEnd();
  return [line(rows[0]!), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.slice(1).map(line)];
}
