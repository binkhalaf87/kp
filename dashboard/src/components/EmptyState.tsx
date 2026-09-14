import Link from "next/link";

export function EmptyState({
  title = "لم يتم رفع تقارير رواء بعد",
  description = "ابدأ برفع تقارير المبيعات المُصدَّرة من رواء لعرض المؤشرات هنا.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="kp-card flex flex-col items-center justify-center text-center py-16 gap-4">
      <div className="w-16 h-16 rounded-full bg-[#f1f5ff] grid place-items-center text-3xl">📊</div>
      <div>
        <h3 className="text-lg font-black text-navy">{title}</h3>
        <p className="text-sm text-muted mt-1 max-w-md">{description}</p>
      </div>
      <Link
        href="/import"
        className="inline-flex items-center gap-2 rounded-full bg-navy text-white font-bold text-sm px-5 py-2.5 hover:opacity-90 transition"
      >
        رفع التقارير
      </Link>
    </div>
  );
}
