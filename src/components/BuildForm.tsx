"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FreeUsesBadge } from "./FreeUsesBadge";
import { StreamingLoader } from "./StreamingLoader";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { SubscriptionStatus, GenerateRequest } from "@/lib/types";

const PURPOSES = [
  { key: "gaming", label: "🎮 游戏" },
  { key: "office", label: "💼 办公" },
  { key: "editing", label: "🎬 剪辑" },
  { key: "general", label: "🖥️ 通用" },
];

const CPU_OPTIONS = [
  { key: "any", label: "不限" },
  { key: "intel", label: "Intel" },
  { key: "amd", label: "AMD" },
];

export function BuildForm() {
  const router = useRouter();
  const [budget, setBudget] = useState(8000);
  const [purpose, setPurpose] = useState<string[]>(["gaming"]);
  const [cpuPref, setCpuPref] = useState("any");
  const [loading, setLoading] = useState(false);
  const [streamPhase, setStreamPhase] = useState("");
  const [streamMessage, setStreamMessage] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [anonUserId, setAnonUserId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        await sb.auth.signInAnonymously();
      }
      const { data: sessionData } = await sb.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) {
        setAnonUserId(uid);
        const res = await fetch("/api/auth/me", {
          headers: { "x-anon-user-id": uid },
        });
        const s = await res.json();
        setStatus(s);
      }
    };
    init();
  }, []);

  const togglePurpose = (key: string) => {
    setPurpose((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const doGenerate = useCallback(async () => {
    if (purpose.length === 0) return;
    setLoading(true);
    setStreamPhase("generating");
    setStreamMessage("正在分析需求...");

    const req: GenerateRequest = {
      budget,
      purpose,
      cpuPreference: cpuPref as "any" | "intel" | "amd",
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anon-user-id": anonUserId,
        },
        body: JSON.stringify(req),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.message || "生成失败");
        setLoading(false);
        return;
      }

      const text = await response.text();
      const events = text.split("\n\n").filter(Boolean);

      let finalData: Record<string, unknown> | null = null;
      for (const block of events) {
        const eventMatch = block.match(/^event: (.+)$/m);
        const dataMatch = block.match(/^data: (.+)$/m);
        if (!eventMatch || !dataMatch) continue;

        const event = eventMatch[1];
        const data = JSON.parse(dataMatch[1]);

        if (event === "status") {
          setStreamPhase(data.phase);
          setStreamMessage(data.message);
        } else if (event === "complete") {
          finalData = data as Record<string, unknown>;
        } else if (event === "error") {
          alert(data.message);
          setLoading(false);
          return;
        }
      }

      if (finalData) {
        const sb = supabaseBrowser();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sbAny = sb as any;
        const { data: saved } = await sbAny
          .from("saved_configs")
          .insert({
            anon_user_id: anonUserId,
            budget,
            purpose: purpose.join(","),
            config_json: finalData.config,
            total_price: finalData.totalPrice || 0,
            share_token: crypto.randomUUID(),
          })
          .select()
          .single();

        if (saved) {
          router.push(`/config/${saved.id}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "未知错误";
      alert("网络错误: " + msg);
    } finally {
      setLoading(false);
    }
  }, [budget, purpose, cpuPref, anonUserId, router]);

  return (
    <div className="max-w-2xl mx-auto px-lg py-xxl">
      {/* Header */}
      <div className="text-center mb-xxl">
        <h1 className="text-display-md font-display text-ink mb-md">
          🤖 AI 装机顾问
        </h1>
        <p className="text-ink-muted text-lg">
          输入预算和用途，3 秒出高性价比配置单
        </p>
        {status && (
          <div className="mt-lg inline-block">
            <FreeUsesBadge
              remaining={status.freeUsesRemaining}
              isSubscribed={status.isSubscribed}
            />
          </div>
        )}
      </div>

      {/* Budget Slider */}
      <Card className="mb-lg">
        <CardHeader>
          <CardTitle>💰 预算</CardTitle>
          <CardDescription>拖动滑块设置预算范围</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-md">
            <span className="text-display-md font-display text-primary">
              ¥{budget.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={3000}
            max={50000}
            step={500}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2 bg-surface-2 rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-ink-tertiary mt-xs">
            <span>¥3,000</span>
            <span>¥50,000</span>
          </div>
        </CardContent>
      </Card>

      {/* Purpose Selector */}
      <Card className="mb-lg">
        <CardHeader>
          <CardTitle>🎯 用途</CardTitle>
          <CardDescription>可多选，我们会综合优化</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-sm">
            {PURPOSES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => togglePurpose(key)}
                className={`py-3 px-4 rounded-md text-sm font-medium border transition-colors ${
                  purpose.includes(key)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-hairline bg-surface-1 text-ink-muted hover:border-hairline-strong"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CPU Preference */}
      <Card className="mb-xl">
        <CardHeader>
          <CardTitle>🔧 CPU 偏好</CardTitle>
          <CardDescription>对品牌有要求的话可以选</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-sm">
            {CPU_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCpuPref(key)}
                className={`flex-1 py-3 rounded-md text-sm font-medium border transition-colors ${
                  cpuPref === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-hairline bg-surface-1 text-ink-muted hover:border-hairline-strong"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate / Loading */}
      {loading ? (
        <StreamingLoader phase={streamPhase} message={streamMessage} />
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="w-full rounded-md text-base h-12"
          onClick={doGenerate}
          disabled={purpose.length === 0}
        >
          {status && !status.canAccessFull
            ? "生成配置单（免费版不含价格）"
            : "生成我的配置单"}
        </Button>
      )}

      {status && !status.canAccessFull && (
        <p className="text-center text-ink-tertiary text-xs mt-md">
          🔒 免费次数用完后，配置单将隐藏价格和购买链接。
          <br />
          使用兑换码解锁完整版。
        </p>
      )}
    </div>
  );
}
