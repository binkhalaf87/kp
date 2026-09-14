import { REPORT_SCHEMAS, normalizeColumnName } from "./reportSchemas";
import type { DetectionResult } from "@/lib/types";

/** Below this confidence the file is routed to manual review, never guessed silently. */
export const DETECTION_CONFIDENCE_THRESHOLD = 0.6;

export function detectReportType(columns: string[]): DetectionResult {
  const normalizedColumns = columns.map(normalizeColumnName);

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
      const normalizedGroup = group.map(normalizeColumnName);
      const hit = normalizedColumns.some((col) =>
        normalizedGroup.some((hint) => col.includes(hint))
      );
      if (hit) {
        matched.push(group[0]);
      } else {
        missing.push(group[0]);
      }
    }

    const confidence = matched.length / schema.hintGroups.length;
    if (confidence > best.confidence) {
      best = {
        reportType: schema.reportType,
        confidence,
        matchedHints: matched,
        missingHints: missing,
      };
    }
  }

  return best;
}
