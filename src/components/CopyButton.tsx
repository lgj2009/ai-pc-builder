"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PCConfig } from "@/lib/types";

interface CopyButtonProps {
  config: PCConfig;
  totalPrice: number | null;
}

export function CopyButton({ config, totalPrice }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const parts = [
      "cpu", "motherboard", "gpu", "ram",
      "storage", "psu", "case", "cooler",
    ];
    const labels: Record<string, string> = {
      cpu: "CPU", motherboard: "主板", gpu: "显卡", ram: "内存",
      storage: "硬盘", psu: "电源", case: "机箱", cooler: "散热器",
    };

    const lines = ["📋 AI 装机配置单", "━━━━━━━━━━━━━━", ""];
    parts.forEach((key) => {
      const part = (config as unknown as Record<string, { name?: string; spec?: string; price?: number }>)[key];
      if (part) {
        lines.push(`【${labels[key]}】${part.name}`);
        lines.push(`  规格：${part.spec}`);
        if (part.price) lines.push(`  价格：¥${part.price.toLocaleString()}`);
        lines.push("");
      }
    });
    if (totalPrice) {
      lines.push("━━━━━━━━━━━━━━");
      lines.push(`💰 总价：¥${totalPrice.toLocaleString()}`);
    }
    lines.push("");
    lines.push("由 AI 装机顾问生成 · 价格仅供参考");

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="secondary"
      size="default"
      onClick={handleCopy}
      className="rounded-md"
    >
      {copied ? "✅ 已复制" : "📋 一键复制"}
    </Button>
  );
}
