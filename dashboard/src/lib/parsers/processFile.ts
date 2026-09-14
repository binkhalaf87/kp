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
    const period = computePeriod(columns, rows as never);

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
