"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BASE_PATH } from "@/lib/basePath";

const NAV_ITEMS = [
  { href: BASE_PATH, label: "لوحة الإدارة" },
  { href: `${BASE_PATH}/sales`, label: "المبيعات" },
  { href: `${BASE_PATH}/children`, label: "الأطفال والتذاكر" },
  { href: `${BASE_PATH}/coffee`, label: "KP Coffee" },
  { href: `${BASE_PATH}/products`, label: "المنتجات" },
  { href: `${BASE_PATH}/cashiers`, label: "الكاشير" },
  { href: `${BASE_PATH}/payments`, label: "طرق الدفع" },
  { href: `${BASE_PATH}/expenses`, label: "المصروفات والربحية" },
  { href: `${BASE_PATH}/targets`, label: "الأهداف" },
  { href: `${BASE_PATH}/data-quality`, label: "جودة البيانات" },
  { href: `${BASE_PATH}/classification`, label: "تصنيف المنتجات" },
  { href: `${BASE_PATH}/import`, label: "استيراد تقارير رواء" },
  { href: `${BASE_PATH}/settings`, label: "الإعدادات" },
];

async function handleLogout() {
  await fetch(`${BASE_PATH}/api/logout`, { method: "POST" });
  window.location.href = `${BASE_PATH}/login`;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-navy text-white min-h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="font-black text-lg">كوكب الطفل</div>
        <div className="text-xs text-white/60 mt-1">لوحة المؤشرات التشغيلية</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block px-5 py-2.5 text-sm font-bold transition-colors",
                active
                  ? "bg-white/10 text-white border-r-4 border-sky"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-[11px] text-white/40">Kids Planet Entertainment</span>
        <button onClick={handleLogout} className="text-[11px] font-bold text-white/60 hover:text-white">
          تسجيل خروج
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="lg:hidden overflow-x-auto whitespace-nowrap bg-navy text-white px-3 py-2 sticky top-0 z-40 flex items-center">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "inline-block px-3 py-1.5 mx-0.5 rounded-full text-xs font-bold shrink-0",
              active ? "bg-white text-navy" : "text-white/70"
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <button onClick={handleLogout} className="inline-block px-3 py-1.5 mx-0.5 rounded-full text-xs font-bold shrink-0 text-white/60">
        خروج
      </button>
    </div>
  );
}
