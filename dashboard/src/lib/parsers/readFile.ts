import Papa from "papaparse";
import ExcelJS from "exceljs";
import type { ParsedRow } from "@/lib/types";

export interface RawParseResult {
  columns: string[];
  rows: ParsedRow[];
}

/**
 * Decodes a CSV ArrayBuffer to text, trying UTF-8 first and falling back to
 * Windows-1256 (common for Arabic exports from older/Windows-origin systems)
 * when the UTF-8 decode produces replacement characters.
 */
function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const replacementCount = (utf8.match(/�/g) || []).length;
  if (replacementCount === 0 || replacementCount / Math.max(utf8.length, 1) < 0.02) {
    // Strip BOM if present.
    return utf8.replace(/^﻿/, "");
  }
  try {
    return new TextDecoder("windows-1256", { fatal: false }).decode(buffer);
  } catch {
    return utf8;
  }
}

async function parseCsv(file: File): Promise<RawParseResult> {
  const buffer = await file.arrayBuffer();
  const text = decodeCsvBuffer(buffer);

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        const columns = result.meta.fields ?? [];
        const rows: ParsedRow[] = result.data.map((r) => {
          const row: ParsedRow = {};
          for (const col of columns) {
            row[col] = normalizeCell(r[col]);
          }
          return row;
        });
        resolve({ columns, rows });
      },
      error: (err: Error) => reject(err),
    });
  });
}

/**
 * Uses exceljs (actively maintained, no known ReDoS/prototype-pollution
 * advisories) rather than the SheetJS `xlsx` npm package, which has
 * unpatched high-severity advisories on the npm registry. exceljs only
 * reads modern .xlsx (OOXML) files — legacy binary .xls files are not
 * supported; ask the user to re-save those as .xlsx first.
 */
async function parseExcel(file: File): Promise<RawParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { columns: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const columns: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    columns.push(String(cell.value ?? "").trim());
  });

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const parsed: ParsedRow = {};
    let hasValue = false;
    columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      let value = cell.value;
      if (value && typeof value === "object" && "text" in value) {
        value = (value as { text: string }).text;
      }
      if (value instanceof Date) {
        value = value.toISOString();
      }
      const normalized = normalizeCell(value as string | number | null);
      if (normalized !== null) hasValue = true;
      parsed[col] = normalized;
    });
    if (hasValue) rows.push(parsed);
  });

  return { columns, rows };
}

function normalizeCell(value: string | number | null | undefined): string | number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  // Convert Arabic-Indic digits to Western digits so numeric parsing works.
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const normalized = trimmed.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
  const numeric = Number(normalized.replace(/,/g, ""));
  if (!Number.isNaN(numeric) && /^[\d,.\s]+$/.test(normalized)) {
    return numeric;
  }
  return trimmed;
}

export async function readSpreadsheetFile(file: File): Promise<RawParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseExcel(file);
  throw new Error("UNSUPPORTED_FILE_TYPE");
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
