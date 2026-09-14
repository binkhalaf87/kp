"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "حدث خطأ. حاول مرة أخرى.");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      window.location.href = next;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <form onSubmit={handleSubmit} className="kp-card w-full max-w-sm flex flex-col gap-4">
        <div className="text-center">
          <div className="font-black text-xl text-navy">كوكب الطفل</div>
          <div className="text-sm text-muted">لوحة المؤشرات التشغيلية</div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-navy">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm"
          />
        </div>
        {error && <div className="text-xs text-rose-600 font-bold">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-navy text-white font-bold text-sm px-5 py-2.5 hover:opacity-90 disabled:opacity-60 transition"
        >
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
