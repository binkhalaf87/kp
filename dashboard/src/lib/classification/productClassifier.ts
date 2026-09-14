import type { ProductCategory, ProductMapping } from "@/lib/types";
import {
  KNOWN_TICKET_PRODUCTS,
  KNOWN_SECOND_VISIT_PRODUCTS,
  KNOWN_CAFE_KEYWORDS,
  KNOWN_FACE_PAINTING_KEYWORDS,
  KNOWN_MEMBERSHIP_KEYWORDS,
  KNOWN_TOY_KEYWORDS,
  KNOWN_ACTIVITY_KEYWORDS,
  PRODUCT_CATEGORY_CHILD_ENTRY_DEFAULTS,
} from "./defaultMappings";

/** Ticket name pattern: "<price tier> - <duration>", e.g. "مجموعة - ساعة". */
const TICKET_TIER_WORDS = ["فردي", "مجموعة", "للصغار", "مخفضة"];
const TICKET_DURATION_WORDS = ["ساعة", "ساعتين", "مفتوح"];

export const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.6;

function includesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

/**
 * Rule-based product classifier. Returns a category + confidence so the UI
 * can route low-confidence products to "منتجات تحتاج تصنيف" instead of
 * silently guessing (per the no-invented-data rule).
 */
export function classifyProduct(productName: string): { category: ProductCategory; confidence: number } {
  const name = productName.trim();

  if (KNOWN_SECOND_VISIT_PRODUCTS.some((p) => p === name)) {
    return { category: "SECOND_VISIT", confidence: 1 };
  }
  if (KNOWN_TICKET_PRODUCTS.some((p) => p === name)) {
    return { category: "TICKET", confidence: 1 };
  }
  if (
    TICKET_TIER_WORDS.some((tier) => name.includes(tier)) &&
    TICKET_DURATION_WORDS.some((dur) => name.includes(dur))
  ) {
    return { category: "TICKET", confidence: 0.85 };
  }
  if (includesAny(name, KNOWN_MEMBERSHIP_KEYWORDS)) {
    return { category: "MEMBERSHIP", confidence: 0.85 };
  }
  if (includesAny(name, KNOWN_FACE_PAINTING_KEYWORDS)) {
    return { category: "FACE_PAINTING", confidence: 0.9 };
  }
  if (includesAny(name, KNOWN_CAFE_KEYWORDS)) {
    return { category: "CAFE", confidence: 0.8 };
  }
  if (includesAny(name, KNOWN_TOY_KEYWORDS)) {
    return { category: "TOY", confidence: 0.7 };
  }
  if (includesAny(name, KNOWN_ACTIVITY_KEYWORDS)) {
    return { category: "ACTIVITY", confidence: 0.7 };
  }

  return { category: "OTHER", confidence: 0.3 };
}

export function buildProductMapping(productName: string): ProductMapping {
  const { category, confidence } = classifyProduct(productName);
  const defaults = PRODUCT_CATEGORY_CHILD_ENTRY_DEFAULTS[category];
  return {
    productName,
    detectedCategory: category,
    manualCategory: null,
    countsAsChildEntry: defaults.countsAsChildEntry,
    countsAsSecondVisit: defaults.countsAsSecondVisit,
    department: category === "CAFE" ? "Cafe" : category === "TICKET" ? "Tickets/Reception" : "Other",
    confidence,
    needsReview: confidence < CLASSIFICATION_CONFIDENCE_THRESHOLD,
  };
}

export function effectiveCategory(mapping: ProductMapping): ProductCategory {
  return mapping.manualCategory ?? mapping.detectedCategory;
}
