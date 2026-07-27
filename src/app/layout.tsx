import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI 装机顾问 — 智能 DIY 配置单生成",
  description:
    "输入预算和用途，AI 自动生成高性价比装机配置单。支持游戏、办公、剪辑等场景，免费试用。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-canvas text-ink font-body antialiased">
        <nav className="sticky top-0 z-50 h-14 border-b border-hairline bg-canvas/80 backdrop-blur">
          <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-lg">
            <Link
              href="/"
              className="flex items-center gap-sm font-display text-card-title text-ink hover:text-primary transition-colors"
            >
              <span className="text-primary text-xl">⬨</span>
              <span>装机顾问</span>
            </Link>
            <div className="flex items-center gap-md">
              <Link
                href="/profile"
                className="text-sm text-ink-muted hover:text-ink transition-colors"
              >
                我的
              </Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
