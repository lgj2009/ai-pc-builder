import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 装机顾问",
  description: "AI-powered PC builder advisor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-canvas">{children}</body>
    </html>
  );
}
