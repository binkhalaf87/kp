import { REPORT_SCHEMAS, normalizeColumnName } from "./reportSchemas";
import type { DetectionResult } from "@/lib/types";

/** Below this confidence the file is routed to manual review, never guessed silently. */
export const DETECTION_CONFIDENCE_THRESHOLD = 0.6;

const SIGNATURE_CONFIDENCE = 0.95;

export function detectReportType(columns: string[]): DetectionResult {
  const normalizedColumns = columns.map(normalizeColumnName);
  const colContains = (needle: string) => {
    const n = normalizeColumnName(needle);
    return normalizedColumns.some((col) => col.includes(n));
  };

  // Pass 1: exact confirmed signatures, most-specific schema first (as
  // ordered in REPORT_SCHEMAS) — e.g. CUSTOMER_PRODUCTS is checked before
  // SALES_BY_CUSTOMER since both have "اسم العميل" but only one also has
  // "اسم المنتج".
  for (const schema of REPORT_SCHEMAS) {
    if (schema.signature.length === 0) continue;
    if (schema.signature.every((s) => colContains(s))) {
      return {
        reportType: schema.reportType,
        confidence: SIGNATURE_CONFIDENCE,
        matchedHints: schema.signature,
        missingHints: [],
      };
    }
  }

  // Pass 2: fuzzy hint-group scoring fallback, for report types without a
  // confirmed real-file signature yet (payment method, period summary).
  let best: DetectionResult = {
    reportType: "UNKNOWN",
    confidence: 0,
    matchedHints: [],
    missingHints: [],
  };

  for (const schema of REPORT_SCHEMAS) {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const group of schema.hintGroups) {
      const hit = group.some((hint) => colContains(hint));
      if (hit) matched.push(group[0]);
      else missing.push(group[0]);
    }

    const confidence = schema.hintGroups.length > 0 ? matched.length / schema.hintGroups.length : 0;
    if (confidence > best.confidence) {
      best = { reportType: schema.reportType, confidence, matchedHints: matched, missingHints: missing };
    }
  }

  return best;
}
