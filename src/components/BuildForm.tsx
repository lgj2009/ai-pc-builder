"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FreeUsesBadge,
} from "./FreeUsesBadge";
import {
  StreamingLoader,
} from "./StreamingLoader";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { SubscriptionStatus, GenerateRequest } from "@/lib/types";

const PURPOSES = [
  { key: "gaming", label: "游戏", emoji: "🎮", desc: "3A 大作高帧率" },
  { key: "office", label: "办公", emoji: "💼", desc: "多任务流畅运行" },
  { key: "editing", label: "剪辑", emoji: "🎬", desc: "4K 视频渲染" },
  { key: "general", label: "通用", emoji: "🖥️", desc: "日常全能主机" },
];

const CPU_OPTIONS = ["any", "intel", "amd"] as const;

export function BuildForm() {
  const router = useRouter();
  const [budget, setBudget] = useState(8000);
  const [purpose, setPurpose] = useState<string[]>(["gaming"]);
  const [cpuPref, setCpuPref] = useState<string>("any");
  const [loading, setLoading] = useState(false);
  const [streamPhase, setStreamPhase] = useState("");
  const [streamMessage, setStreamMessage] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [anonUserId, setAnonUserId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getSession();
      if (!data.session) await sb.auth.signInAnonymously();
      const { data: sd } = await sb.auth.getSession();
      const uid = sd.session?.user?.id;
      if (uid) {
        setAnonUserId(uid);
        const res = await fetch("/api/auth/me", { headers: { "x-anon-user-id": uid } });
        setStatus(await res.json());
      }
    };
    init();
  }, []);

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
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anon-user-id": anonUserId,
        },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "生成失败");
        setLoading(false);
        return;
      }

      const text = await res.text();
      const blocks = text.split("\n\n").filter(Boolean);
      let finalData: Record<string, unknown> | null = null;

      for (const block of blocks) {
        const em = block.match(/^event: (.+)$/m);
        const dm = block.match(/^data: (.+)$/m);
        if (!em || !dm) continue;
        const d = JSON.parse(dm[1]);
        if (em[1] === "status") {
          setStreamPhase(d.phase);
          setStreamMessage(d.message);
        } else if (em[1] === "complete") {
          finalData = d as Record<string, unknown>;
        } else if (em[1] === "error") {
          alert(d.message);
          setLoading(false);
          return;
        }
      }

      if (finalData) {
        const sb = supabaseBrowser();
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

        if (saved?.id) router.push(`/config/${saved.id}`);
      }
    } catch (e: unknown) {
      alert("网络错误: " + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setLoading(false);
    }
  }, [budget, purpose, cpuPref, anonUserId, router]);

  const budgetPercent = ((budget - 3000) / (50000 - 3000)) * 100;

  return (
    <div className="max-w-[960px] mx-auto px-6 pb-section">
      {/* ── Hero ── */}
      <section className="pt-section pb-xxl text-center">
        <h1 className="text-display-md font-display text-ink mb-4 tracking-tight">
          你的 AI 装机顾问
        </h1>
        <p className="text-ink-muted text-body-lg max-w-lg mx-auto mb-8">
          输入预算和用途，DeepSeek AI 在几秒内生成高性价比配置单。
          每个配件都附带参考价格和购买链接。
        </p>
        {status && (
          <div className="mb-0 inline-flex">
            <FreeUsesBadge
              remaining={status.freeUsesRemaining}
              isSubscribed={status.isSubscribed}
            />
          </div>
        )}
      </section>

      {/* ── Config Builder Card ── */}
      <div className="border border-hairline rounded-lg bg-surface-1 p-8 mb-8">
        {/* ── Budget ── */}
        <div className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <label className="text-sm font-medium text-ink-muted uppercase tracking-wider">
              预算
            </label>
            <span className="text-ink-tertiary text-xs tabular-nums">
              ¥3,000 – ¥50,000
            </span>
          </div>
          <div className="text-center mb-6">
            <span className="text-[56px] font-display font-semibold text-ink tracking-tight">
              ¥{budget.toLocaleString()}
            </span>
          </div>

          {/* Slider track */}
          <div className="relative h-1.5 bg-surface-2 rounded-full mb-4">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-150"
              style={{ width: `${budgetPercent}%` }}
            />
            <input
              type="range"
              min={3000}
              max={50000}
              step={500}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex justify-between gap-2">
            {[3000, 10000, 20000, 35000, 50000].map((v) => (
              <button
                key={v}
                onClick={() => setBudget(v)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  Math.abs(budget - v) <= 1000
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-ink-tertiary hover:text-ink-muted"
                }`}
              >
                {v >= 10000 ? `${v / 1000}K` : v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Purpose ── */}
        <div className="mb-10">
          <label className="block text-sm font-medium text-ink-muted uppercase tracking-wider mb-4">
            用途
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 card-group">
            {PURPOSES.map(({ key, label, emoji, desc }) => {
              const active = purpose.includes(key);
              return (
                <button
                  key={key}
                  onClick={() =>
                    setPurpose((p) =>
                      p.includes(key) ? p.filter((x) => x !== key) : [...p, key]
                    )
                  }
                  className={`card-item text-left p-4 rounded-lg border ${
                    active
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-hairline bg-surface-1 hover:border-hairline-strong"
                  }`}
                >
                  <div className="text-xl mb-1.5">{emoji}</div>
                  <div
                    className={`text-sm font-medium mb-0.5 ${
                      active ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {label}
                  </div>
                  <div className="text-xs text-ink-tertiary">{desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CPU preference ── */}
        <div className="mb-10">
          <label className="block text-sm font-medium text-ink-muted uppercase tracking-wider mb-4">
            CPU 偏好
          </label>
          <div className="flex flex-wrap justify-center mt-2 cpu-pick">
            {[
              { key: "any", label: "不限" },
              { key: "intel", label: "Intel" },
              { key: "amd", label: "AMD" },
            ].map(({ key, label }, i) => (
              <label key={key}>
                <input
                  type="radio"
                  name="cpu-pref"
                  value={key}
                  checked={cpuPref === key}
                  onChange={() => setCpuPref(key)}
                  className="sr-only"
                />
                <span
                  className={`block cursor-pointer px-5 py-2 text-sm tracking-wider text-center transition-colors duration-500 select-none
                    ${i === 0 ? "rounded-l-md" : ""}
                    ${i === 2 ? "rounded-r-md" : ""}
                    ${
                      cpuPref === key
                        ? "shadow-[0_0_0_0.0625em_#5e6ad2] bg-primary/10 text-primary z-[1]"
                        : "shadow-[0_0_0_0.0625em_#23252a] bg-surface-1 text-ink-muted hover:text-ink"
                    }`}
                  style={{ position: "relative", marginLeft: i > 0 ? "0.0625em" : 0 }}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Generate ── */}
        {loading ? (
          <StreamingLoader phase={streamPhase} message={streamMessage} />
        ) : (
          <button
            onClick={doGenerate}
            disabled={purpose.length === 0}
            className="w-full h-12 rounded-md bg-primary text-on-primary font-medium text-sm tracking-tight
                       hover:bg-primary-hover active:bg-primary-focus
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors duration-150"
          >
            {status && !status.canAccessFull
              ? "生成配置单（免费版不含价格）"
              : "生成我的配置单"}
          </button>
        )}

        {status && !status.canAccessFull && (
          <p className="text-center text-ink-tertiary text-xs mt-4">
            免费版可用 3 次完整功能。使用兑换码解锁完整价格服务。
          </p>
        )}
      </div>

      {/* ── Bottom info ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {[
          { emoji: "🧠", title: "AI 驱动", desc: "DeepSeek V4 Flash 分析需求，匹配最优配件组合" },
          { emoji: "💰", title: "参考价格", desc: "所有配件标注国内电商报价，一键跳转购买" },
          { emoji: "✅", title: "自动兼容", desc: "CPU/主板/内存/电源自动校验，避免踩坑" },
        ].map(({ emoji, title, desc }) => (
          <div key={title} className="px-4 py-6 rounded-lg border border-hairline bg-surface-1">
            <div className="text-2xl mb-3">{emoji}</div>
            <h3 className="text-sm font-display font-medium text-ink mb-1.5 tracking-tight">{title}</h3>
            <p className="text-xs text-ink-subtle leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
