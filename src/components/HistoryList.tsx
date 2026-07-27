"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SavedConfig } from "@/lib/types";

interface HistoryListProps {
  configs: SavedConfig[];
}

export function HistoryList({ configs }: HistoryListProps) {
  if (configs.length === 0) {
    return (
      <Card>
        <CardContent className="py-xl text-center text-ink-muted">
          还没有生成过配置单，去首页试试吧
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-sm">
      {configs.map((c) => (
        <Link key={c.id} href={`/config/${c.id}`}>
          <Card className="hover:border-hairline-strong transition-colors cursor-pointer">
            <CardHeader className="pb-sm">
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  ¥{c.budget.toLocaleString()} · {c.purpose}
                </span>
                <span className="text-sm font-normal text-ink-subtle">
                  {new Date(c.created_at).toLocaleDateString("zh-CN")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-ink-tertiary">
                {c.total_price > 0
                  ? `💰 总价 ¥${c.total_price.toLocaleString()}`
                  : "🔒 免费版"}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
