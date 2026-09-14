import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ImportedFile,
  ProductMapping,
  Expense,
  Targets,
  AppSettings,
} from "./types";
import { DEFAULT_TARGETS, DEFAULT_SETTINGS } from "./types";
import { DEFAULT_CASHIER_DEPARTMENTS } from "./classification/defaultMappings";

interface DashboardState {
  imports: ImportedFile[];
  productMappings: Record<string, ProductMapping>;
  cashierDepartments: Record<string, string>;
  expenses: Expense[];
  targets: Targets;
  settings: AppSettings;

  addImports: (files: ImportedFile[]) => void;
  removeImport: (id: string) => void;
  clearImports: () => void;

  upsertProductMapping: (mapping: ProductMapping) => void;
  setCashierDepartment: (cashierName: string, department: string) => void;

  addExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;

  updateTargets: (targets: Partial<Targets>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      imports: [],
      productMappings: {},
      cashierDepartments: { ...DEFAULT_CASHIER_DEPARTMENTS },
      expenses: [],
      targets: { ...DEFAULT_TARGETS },
      settings: { ...DEFAULT_SETTINGS },

      addImports: (files) =>
        set((state) => ({ imports: [...state.imports, ...files] })),
      removeImport: (id) =>
        set((state) => ({ imports: state.imports.filter((f) => f.id !== id) })),
      clearImports: () => set({ imports: [] }),

      upsertProductMapping: (mapping) =>
        set((state) => ({
          productMappings: { ...state.productMappings, [mapping.productName]: mapping },
        })),
      setCashierDepartment: (cashierName, department) =>
        set((state) => ({
          cashierDepartments: { ...state.cashierDepartments, [cashierName]: department },
        })),

      addExpense: (expense) =>
        set((state) => ({ expenses: [...state.expenses, expense] })),
      removeExpense: (id) =>
        set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),

      updateTargets: (targets) =>
        set((state) => ({ targets: { ...state.targets, ...targets } })),
      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),
    }),
    {
      name: "kp-dashboard-storage",
      // NOTE: V1 persists to localStorage only (per the privacy requirement
      // that Rewaa files stay local). The shape below is intentionally
      // Supabase-friendly (flat, serializable, keyed by stable ids) so a
      // later migration can swap this storage layer without touching the
      // UI or calculation code.
    }
  )
);
