import { supabaseServer } from "@/lib/supabase/server";
import { ConfigCard } from "@/components/ConfigCard";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { SavedConfig, PCConfig } from "@/lib/types";

async function getConfig(id: string): Promise<SavedConfig | null> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("saved_configs")
    .select("*")
    .or(`id.eq.${id},share_token.eq.${id}`)
    .single();
  return data ?? null;
}

export default async function ConfigPage({
  params,
}: {
  params: { id: string };
}) {
  const config = await getConfig(params.id);

  if (!config) {
    return (
      <div className="max-w-2xl mx-auto px-lg py-xxl text-center">
        <h1 className="text-display-md font-display text-ink mb-lg">
          配置单不存在
        </h1>
        <p className="text-ink-muted mb-xl">
          该配置单可能已被删除或链接无效
        </p>
        <Link href="/">
          <Button variant="primary">返回首页</Button>
        </Link>
      </div>
    );
  }

  const parts = [
    "cpu", "motherboard", "gpu", "ram",
    "storage", "psu", "case", "cooler",
  ] as const;

  const data = config.config_json as unknown as PCConfig;

  return (
    <div className="max-w-4xl mx-auto px-lg py-xxl">
      <Link
        href="/"
        className="text-sm text-ink-muted hover:text-ink transition-colors mb-md inline-block"
      >
        &larr; 返回重新生成
      </Link>

      <h1 className="text-display-md font-display text-ink mb-sm">
        📋 你的 ¥{config.budget.toLocaleString()} 配置单
      </h1>

      <div className="flex items-center gap-md flex-wrap mb-sm">
        <Badge variant="default">{config.purpose}</Badge>
        {config.total_price > 0 && (
          <span className="text-headline font-display text-primary">
            💰 ¥{config.total_price.toLocaleString()}
          </span>
        )}
      </div>

      <p className="text-xs text-ink-tertiary mb-xl">
        生成于{" "}
        {new Date(config.created_at).toLocaleString("zh-CN")}{" "}
        · 价格仅供参考，以电商实际为准
      </p>

      {config.total_price === 0 && (
        <div className="mb-lg p-md rounded-md border border-hairline bg-surface-2 text-sm text-ink-muted text-center">
          🔒 这是免费版配置单（不含价格）。使用兑换码解锁实时价格和购买链接。
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-xl">
        {parts.map((key) => {
          const part = data[key];
          if (!part) return null;
          return (
            <ConfigCard
              key={key}
              partKey={key}
              part={part}
              canAccessFull={config.total_price > 0}
            />
          );
        })}
      </div>

      <div className="flex gap-md justify-center">
        <CopyButton
          config={data}
          totalPrice={config.total_price > 0 ? config.total_price : null}
        />
        <Link href="/">
          <Button variant="secondary" className="rounded-md">
            🔄 重新生成
          </Button>
        </Link>
      </div>
    </div>
  );
}
