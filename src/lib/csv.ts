export interface CsvColumn {
  key: string;
  label: string;
}

/**
 * Escapes one CSV cell. Text that a spreadsheet would read as a formula
 * (starts with = + - @ or a control character) is prefixed with an apostrophe.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Builds a UTF-8 CSV (with BOM so Excel reads accents correctly) using CRLF line breaks. */
export function toCsv(columns: CsvColumn[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(','));
  return `﻿${[header, ...lines].join('\r\n')}\r\n`;
}

export function csvFileName(base: string, date = new Date()): string {
  const slug = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'export';
  return `${slug}-${date.toISOString().slice(0, 10)}.csv`;
}
