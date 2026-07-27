"use client";

import { PriceDisplay } from "./PriceDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PartInfo } from "@/lib/types";

const PART_LABELS: Record<string, { emoji: string; label: string }> = {
  cpu: { emoji: "🔲", label: "CPU 处理器" },
  motherboard: { emoji: "📟", label: "主板" },
  gpu: { emoji: "🎮", label: "显卡" },
  ram: { emoji: "🧮", label: "内存" },
  storage: { emoji: "💾", label: "硬盘" },
  psu: { emoji: "⚡", label: "电源" },
  case: { emoji: "🏗️", label: "机箱" },
  cooler: { emoji: "❄️", label: "散热器" },
};

interface ConfigCardProps {
  partKey: string;
  part: PartInfo;
  canAccessFull: boolean;
}

export function ConfigCard({ partKey, part, canAccessFull }: ConfigCardProps) {
  const meta = PART_LABELS[partKey] || { emoji: "📦", label: partKey };

  return (
    <Card className="group hover:border-hairline-strong transition-colors">
      <CardHeader className="pb-sm">
        <CardTitle className="flex items-center gap-sm text-base">
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <h4 className="font-display text-card-title text-ink mb-xs">
          {part.name}
        </h4>
        <p className="text-sm text-ink-muted mb-sm">{part.spec}</p>
        {part.notes && (
          <p className="text-xs text-ink-subtle mb-md border-l-2 border-hairline pl-sm">
            {part.notes}
          </p>
        )}
        <div className="flex items-center justify-between mt-md pt-sm border-t border-hairline">
          <PriceDisplay price={part.price} canAccess={canAccessFull} />
          {canAccessFull && part.shopLink && (
            <a
              href={part.shopLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              查看 &rarr;
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
