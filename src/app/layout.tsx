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
  title: "AI 装机顾问",
  description:
    "输入预算和用途，AI 自动生成高性价比装机配置单。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-canvas text-ink font-body antialiased min-h-screen">
        <nav className="fixed top-0 inset-x-0 z-50 h-14 border-b border-hairline bg-canvas/80 backdrop-blur-md">
          <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-display text-card-title text-ink tracking-tight hover:text-primary transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-primary"
              >
                <rect
                  x="2"
                  y="2"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                />
                <rect
                  x="11"
                  y="2"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                  opacity="0.65"
                />
                <rect
                  x="2"
                  y="11"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                  opacity="0.65"
                />
                <rect
                  x="11"
                  y="11"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="currentColor"
                  opacity="0.35"
                />
              </svg>
              <span className="text-ink">装机顾问</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="text-sm text-ink-subtle hover:text-ink transition-colors"
              >
                我的配置
              </Link>
            </div>
          </div>
        </nav>
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
