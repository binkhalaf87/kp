import { v4 as uuidv4 } from "uuid";
import type { ImportedFile } from "@/lib/types";
import { readSpreadsheetFile, hashFile } from "./readFile";
import { detectReportType, DETECTION_CONFIDENCE_THRESHOLD } from "./detectReportType";
import { resolveColumn, toText } from "@/lib/kpi/columnResolver";
import { isDuplicateHash } from "@/lib/utils/dedupe";

function computePeriod(columns: string[], rows: Record<string, unknown>[]): { start: string | null; end: string | null } {
  const dateCol = resolveColumn(columns, "date");
  if (!dateCol) return { start: null, end: null };

  const dates = rows
    .map((r) => toText(r[dateCol] as never))
    .filter((v): v is string => !!v)
    .map((v) => new Date(v))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return { start: null, end: null };
  return {
    start: dates[0].toISOString().slice(0, 10),
    end: dates[dates.length - 1].toISOString().slice(0, 10),
  };
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, يناير: 0,
  feb: 1, february: 1, فبراير: 1,
  mar: 2, march: 2, مارس: 2,
  apr: 3, april: 3, أبريل: 3, ابريل: 3,
  may: 4, مايو: 4,
  jun: 5, june: 5, يونيو: 5,
  jul: 6, july: 6, يوليو: 6,
  aug: 7, august: 7, أغسطس: 7, اغسطس: 7,
  sep: 8, sept: 8, september: 8, سبتمبر: 8,
  oct: 9, october: 9, أكتوبر: 9, اكتوبر: 9,
  nov: 10, november: 10, نوفمبر: 10,
  dec: 11, december: 11, ديسمبر: 11,
};

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** Rewaa aggregate exports often carry their date range only in the filename. */
function computePeriodFromFilename(fileName: string): { start: string | null; end: string | null } {
  const normalized = fileName.replace(/[–—]/g, "-");
  const found: string[] = [];
  const wordPattern = /(\d{1,2})\s+([A-Za-z\u0600-\u06FF]+)\s+(\d{4})/g;
  for (const match of normalized.matchAll(wordPattern)) {
    const month = MONTHS[match[2].toLowerCase()];
    const value = month === undefined ? null : isoDate(Number(match[3]), month, Number(match[1]));
    if (value) found.push(value);
  }
  const numericPattern = /(\d{4})[-_/](\d{1,2})[-_/](\d{1,2})|(\d{1,2})[-_/](\d{1,2})[-_/](\d{4})/g;
  for (const match of normalized.matchAll(numericPattern)) {
    const value = match[1]
      ? isoDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : isoDate(Number(match[6]), Number(match[5]) - 1, Number(match[4]));
    if (value) found.push(value);
  }
  found.sort();
  return { start: found[0] ?? null, end: found[found.length - 1] ?? null };
}

export async function processUploadedFile(
  file: File,
  existingImports: ImportedFile[]
): Promise<ImportedFile> {
  const name = file.name.toLowerCase();
  const isSupported = name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls");

  const hash = await hashFile(file);

  if (!isSupported) {
    return {
      id: uuidv4(),
      fileName: file.name,
      fileHash: hash,
      importedAt: new Date().toISOString(),
      reportType: "UNKNOWN",
      confidence: 0,
      status: "UNSUPPORTED",
      rowCount: 0,
      columns: [],
      periodStart: null,
      periodEnd: null,
      rows: [],
    };
  }

  if (isDuplicateHash(hash, existingImports)) {
    return {
      id: uuidv4(),
      fileName: file.name,
      fileHash: hash,
      importedAt: new Date().toISOString(),
      reportType: "UNKNOWN",
      confidence: 0,
      status: "DUPLICATE",
      rowCount: 0,
      columns: [],
      periodStart: null,
      periodEnd: null,
      rows: [],
    };
  }

  try {
    const { columns, rows } = await readSpreadsheetFile(file);
    const detection = detectReportType(columns);
    const rowPeriod = computePeriod(columns, rows as never);
    const filePeriod = computePeriodFromFilename(file.name);
    const period = {
      start: rowPeriod.start ?? filePeriod.start,
      end: rowPeriod.end ?? filePeriod.end,
    };

    return {
      id: uuidv4(),
      fileName: file.name,
      fileHash: hash,
      importedAt: new Date().toISOString(),
      reportType: detection.reportType,
      confidence: detection.confidence,
      status: detection.confidence >= DETECTION_CONFIDENCE_THRESHOLD ? "RECOGNIZED" : "NEEDS_REVIEW",
      rowCount: rows.length,
      columns,
      periodStart: period.start,
      periodEnd: period.end,
      rows,
    };
  } catch {
    // Covers legacy binary .xls files (unsupported by the exceljs reader —
    // ask the user to re-save as .xlsx) and any other unreadable file.
    return {
      id: uuidv4(),
      fileName: file.name,
      fileHash: hash,
      importedAt: new Date().toISOString(),
      reportType: "UNKNOWN",
      confidence: 0,
      status: "UNSUPPORTED",
      rowCount: 0,
      columns: [],
      periodStart: null,
      periodEnd: null,
      rows: [],
    };
  }
}
