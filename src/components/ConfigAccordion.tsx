"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PartInfo } from "@/lib/types";

const PART_META: Record<string, { emoji: string; label: string }> = {
  cpu: { emoji: "🔲", label: "CPU 处理器" },
  motherboard: { emoji: "📟", label: "主板" },
  gpu: { emoji: "🎮", label: "显卡" },
  ram: { emoji: "🧮", label: "内存" },
  storage: { emoji: "💾", label: "硬盘" },
  psu: { emoji: "⚡", label: "电源" },
  case: { emoji: "🏗️", label: "机箱" },
  cooler: { emoji: "❄️", label: "散热器" },
};

interface Props {
  parts: Record<string, PartInfo>;
  canAccessFull: boolean;
}

export function ConfigAccordion({ parts, canAccessFull }: Props) {
  const entries = Object.entries(parts);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {entries.map(([key, part]) => {
        const meta = PART_META[key] || { emoji: "📦", label: key };
        const open = expanded === key;

        return (
          <div
            key={key}
            className="border border-hairline rounded-lg bg-surface-1 overflow-hidden transition-colors hover:border-hairline-strong"
          >
            {/* Header row — always visible */}
            <button
              onClick={() => setExpanded(open ? null : key)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">{meta.emoji}</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-display font-medium text-ink truncate">
                    {part.name}
                  </h3>
                  <p className="text-xs text-ink-muted truncate mt-0.5">
                    {part.spec}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                {canAccessFull && part.price > 0 ? (
                  <span className="text-sm font-display font-semibold text-primary tabular-nums">
                    ¥{part.price.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs text-ink-tertiary">🔒 解锁价格</span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-ink-subtle transition-transform duration-200 ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Expanded detail */}
            <div
              className={`grid transition-all duration-200 ${
                open
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-4 pt-0 border-t border-hairline mx-5 space-y-2">
                  {part.notes && (
                    <p className="text-xs text-ink-subtle leading-relaxed">
                      💡 {part.notes}
                    </p>
                  )}
                  {canAccessFull && part.shopLink && (
                    <a
                      href={part.shopLink}
                      target="_blank"
                      rel="noopener"
                      className="inline-block text-xs text-primary hover:text-primary-hover transition-colors"
                    >
                      京东搜索比价 →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
