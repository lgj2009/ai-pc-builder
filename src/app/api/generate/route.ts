// ============================================================
// POST /api/generate — SSE 流式生成配置单
// 流程：AI 出配置 → 京东查价 → 返回
// ============================================================

import { generateConfig } from "@/lib/ai";
import { getJDPrice } from "@/lib/jd";
import {
  ensureDevice,
  checkSubscription,
  decrementFreeUses,
} from "@/lib/subscription";
import { getRedis } from "@/lib/redis";
import type { GenerateRequest } from "@/lib/types";

const FREE_LIMIT = 3;
const RATE_LIMIT_WINDOW = 30; // 秒
const RATE_LIMIT_MAX = 5; // 每窗口最多 5 次

const CATEGORIES = [
  "cpu", "motherboard", "gpu", "ram",
  "storage", "psu", "case", "cooler",
] as const;

function send(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const anonUserId = request.headers.get("x-anon-user-id") || "unknown";

  // 限流
  try {
    const redis = getRedis();
    const key = `ratelimit:generate:${anonUserId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW);
    if (count > RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "请求太频繁，请稍后再试" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    // Redis 不可用，跳过限流
  }

  // 订阅检查
  const device = await ensureDevice(anonUserId);
  const status = await checkSubscription(device);

  if (!status.canAccessFull && status.freeUsesRemaining <= 0) {
    return new Response(
      JSON.stringify({
        error: "免费次数已用完",
        canAccessFull: false,
        freeUsesRemaining: 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const body: GenerateRequest = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Phase 1: AI 生成配置
        send(controller, "status", { phase: "generating", message: "AI 正在分析需求..." });
        const result = await generateConfig(body);

        // Phase 2: 京东查价（8 个配件并发）
        send(controller, "status", { phase: "pricing", message: "京东比价中..." });
        const jdResults = await Promise.all(
          CATEGORIES.map(async (cat) => {
            const part = result.config[cat];
            if (!part) return { cat, found: false };
            const jd = await getJDPrice(part.name, cat);
            return { cat, part, jd };
          })
        );

        // 应用京东价
        let calibrated = 0;
        let skuHits = 0;
        let consensusHits = 0;
        for (const { cat, part, jd } of jdResults) {
          if (jd && part) {
            part.price = jd.price;
            part.shopLink = jd.shopLink;
            part.source = jd.source as PartInfo["source"];
            calibrated++;
            if (jd.source === "sku") skuHits++;
            else if (jd.source === "consensus") consensusHits++;
          }
        }

        result.totalPrice = Object.values(result.config).reduce(
          (s, p) => s + (p.price || 0), 0
        );

        send(controller, "status", {
          phase: "pricing",
          message: `京东校准 ${calibrated}/8 (${skuHits} SKU + ${consensusHits} 共识)`,
        });

        // Phase 3: 完成
        send(controller, "status", { phase: "done", message: "配置单生成完成" });

        if (!status.isSubscribed) {
          await decrementFreeUses(device.id);
        }

        const response = {
          config: result.config,
          totalPrice: status.canAccessFull ? result.totalPrice : null,
          compatibilityNotes: result.compatibilityNotes,
          canAccessFull: status.canAccessFull,
          freeUsesRemaining: status.isSubscribed
            ? null
            : Math.max(0, status.freeUsesRemaining - 1),
        };

        send(controller, "complete", response);
        controller.close();
      } catch (error) {
        console.error("[generate]", error);
        send(controller, "error", {
          message: error instanceof Error ? error.message : "生成失败",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// 导入 PartInfo 用于类型标注
import type { PartInfo } from "@/lib/types";
