"use client";

import { useEffect, useRef, useState } from "react";
import { useDashboardStore, type DashboardSnapshot } from "@/lib/store";

type SyncStatus = "connecting" | "synced" | "local" | "saving" | "error";

const STATUS_LABEL: Record<SyncStatus, string> = {
  connecting: "جارٍ الاتصال بـ OneDrive",
  synced: "متزامن مع OneDrive",
  local: "حفظ محلي",
  saving: "جارٍ الحفظ في OneDrive",
  error: "تعذر مزامنة OneDrive",
};

export function OneDriveSyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: () => void = () => {};

    async function start() {
      try {
        const response = await fetch("/api/onedrive/state", { cache: "no-store" });
        const payload = (await response.json()) as { configured?: boolean; state?: DashboardSnapshot | null };
        if (!active) return;
        if (!payload.configured) {
          hydrated.current = true;
          setStatus("local");
          return;
        }
        if (response.ok && payload.state) useDashboardStore.getState().replaceFromCloud(payload.state);
        hydrated.current = true;
        setStatus(response.ok ? "synced" : "error");

        unsubscribe = useDashboardStore.subscribe((state) => {
          if (!hydrated.current) return;
          if (timer) clearTimeout(timer);
          setStatus("saving");
          timer = setTimeout(async () => {
            const snapshot = state.toSnapshot();
            try {
              const saveResponse = await fetch("/api/onedrive/state", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(snapshot),
              });
              if (active) setStatus(saveResponse.ok ? "synced" : "error");
            } catch {
              if (active) setStatus("error");
            }
          }, 1000);
        });
      } catch {
        if (active) setStatus("error");
      }
    }

    void start();
    return () => {
      active = false;
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {children}
      <div className="fixed bottom-3 left-3 z-50 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-navy shadow-sm backdrop-blur">
        {STATUS_LABEL[status]}
      </div>
    </>
  );
}
