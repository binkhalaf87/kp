import type { ProductCategory } from "@/lib/types";

/**
 * Known real product/cashier names supplied for this project. These are
 * genuine domain facts (not invented sample business KPIs) used to seed the
 * classification engine. Everything here remains editable from Settings /
 * "تصنيف المنتجات" — nothing here is hardcoded into the KPI business logic
 * itself, only used as a starting default mapping.
 */

// Known ticket products. "مجموعة" (group) here is a PRICE TIER, not a
// grouping of multiple children — every unit sold equals exactly one child
// entry. See src/lib/classification/productClassifier.ts.
export const KNOWN_TICKET_PRODUCTS = [
  "فردي - ساعة",
  "مجموعة - ساعة",
  "للصغار - ساعة",
  "فردي - ساعتين",
  "مجموعة - ساعتين",
  "فردي - مفتوح",
  "مجموعة - مفتوح",
  "للصغار - مفتوح",
  "مخفضة - ساعة",
];

export const KNOWN_SECOND_VISIT_PRODUCTS = ["الزيارة الثانية"];

export const KNOWN_CAFE_KEYWORDS = [
  "v60",
  "matcha",
  "ماتشا",
  "karkadeh",
  "كركديه",
  "popcorn",
  "بوبكورن",
  "فيشار",
  "waffle",
  "وافل",
  "قهوة",
  "coffee",
  "شاي",
  "tea",
  "عصير",
  "juice",
  "مشروب",
  "drink",
  "كيك",
  "cake",
];

export const KNOWN_FACE_PAINTING_KEYWORDS = ["رسم على الوجه", "رسم الوجه", "face paint", "face painting"];

export const KNOWN_MEMBERSHIP_KEYWORDS = ["اشتراك", "membership", "عضوية"];

export const KNOWN_TOY_KEYWORDS = ["لعبة", "لعب ", "toy", "toys"];

export const KNOWN_ACTIVITY_KEYWORDS = ["فعالية", "ورشة", "activity", "workshop"];

/** Cashier → Department starting map. Editable in Settings. */
export const DEFAULT_CASHIER_DEPARTMENTS: Record<string, string> = {
  "Saiful Islam": "Cafe",
  "مرهبه العتيبي": "Tickets/Reception",
  "Super Admin": "Other",
};

export const PRODUCT_CATEGORY_CHILD_ENTRY_DEFAULTS: Record<ProductCategory, { countsAsChildEntry: boolean; countsAsSecondVisit: boolean }> = {
  TICKET: { countsAsChildEntry: true, countsAsSecondVisit: false },
  SECOND_VISIT: { countsAsChildEntry: false, countsAsSecondVisit: true },
  MEMBERSHIP: { countsAsChildEntry: false, countsAsSecondVisit: false },
  FACE_PAINTING: { countsAsChildEntry: false, countsAsSecondVisit: false },
  CAFE: { countsAsChildEntry: false, countsAsSecondVisit: false },
  TOY: { countsAsChildEntry: false, countsAsSecondVisit: false },
  ACTIVITY: { countsAsChildEntry: false, countsAsSecondVisit: false },
  OTHER: { countsAsChildEntry: false, countsAsSecondVisit: false },
};
