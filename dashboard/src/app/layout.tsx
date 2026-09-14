import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const font = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "لوحة مؤشرات كوكب الطفل",
  description: "لوحة مؤشرات الأداء التشغيلي والمالي لمركز كوكب الطفل للترفيه",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${font.className} antialiased`}>{children}</body>
    </html>
  );
}
