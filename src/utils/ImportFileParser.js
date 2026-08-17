import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

// Shared by every bulk-import controller (medicines, medical procedures, ...).
// Maps normalized field names to the header spellings staff might use when
// preparing the file themselves (Indonesian or English, case-insensitive).
export function normalizeRowKeys(raw, headerAliasMap) {
  const normalized = {};
  const rawKeysByLower = Object.fromEntries(
    Object.keys(raw).map((key) => [key.trim().toLowerCase(), key])
  );

  for (const [field, aliases] of Object.entries(headerAliasMap)) {
    const matchedAlias = aliases.find((alias) => rawKeysByLower[alias] !== undefined);
    if (matchedAlias) {
      normalized[field] = String(raw[rawKeysByLower[matchedAlias]] ?? '').trim();
    }
  }

  return normalized;
}

// Don't blindly assume row 0 is the header — a stray line above it (a title,
// a filename accidentally pasted in, a blank row) is an easy mistake to make
// when preparing the file by hand, and would otherwise silently shift every
// row down and fail all of them. Scan the first few rows for the one that
// actually looks like our header (at least 2 cells match a known alias).
function detectHeaderRowIndex(matrix, allHeaderAliases) {
  for (let i = 0; i < Math.min(matrix.length, 10); i += 1) {
    const cells = (matrix[i] || []).map((cell) => String(cell ?? '').trim().toLowerCase());
    const matchCount = cells.filter((cell) => allHeaderAliases.includes(cell)).length;
    if (matchCount >= 2) return i;
  }
  return 0;
}

function matrixToRowObjects(matrix, headerIndex) {
  const headerRow = (matrix[headerIndex] || []).map((cell) => String(cell ?? '').trim());
  return matrix
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => Object.fromEntries(headerRow.map((header, index) => [header, row[index] ?? ''])));
}

// `allHeaderAliases` is the flat list of every alias across all fields, used
// only for header-row detection (see detectHeaderRowIndex above).
export function parseImportFile(file, allHeaderAliases) {
  const isExcel = /\.(xlsx|xls)$/i.test(file.originalname);
  let matrix;

  if (isExcel) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  } else {
    // Excel's "Save As CSV" is inconsistent across locales/platforms — it may
    // use ';' instead of ',' (common on id-ID Windows), and it may write a
    // UTF-8 BOM. Sniff the delimiter from the first line instead of assuming
    // ',', and let csv-parse strip the BOM itself.
    const firstLine = file.buffer.toString('utf8').split(/\r?\n/, 1)[0] || '';
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    matrix = parseCsv(file.buffer, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter,
      // A stray unquoted comma/semicolon in one field (e.g. a price typed as
      // "2,000") shouldn't hard-fail the whole file — let that row just come
      // back with missing/empty fields, which the caller's row validator
      // already reports as a normal per-row error.
      relax_column_count: true,
    });
  }

  const headerIndex = detectHeaderRowIndex(matrix, allHeaderAliases);
  return matrixToRowObjects(matrix, headerIndex);
}
