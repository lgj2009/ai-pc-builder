import { generatePCConfig } from "@/lib/deepseek";
import {
  ensureDevice,
  checkSubscription,
  decrementFreeUses,
} from "@/lib/subscription";
import { getRedis } from "@/lib/redis";
import { applyFallbackPrices } from "@/lib/price-matcher";
import { searchJDCandidates } from "@/lib/jd-price";
import type { GenerateRequest } from "@/lib/types";

const RATE_LIMIT_WINDOW = 30;
const MAX_REQUESTS_PER_WINDOW = 3;

export async function POST(request: Request) {
  const anonUserId = request.headers.get("x-anon-user-id");
  if (!anonUserId) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "无法识别设备" },
      { status: 401 }
    );
  }

  // Rate limiting via Redis
  try {
    const redis = getRedis();
    const rateKey = `rate:${anonUserId}`;
    const current = await redis.incr(rateKey);
    if (current === 1) {
      await redis.expire(rateKey, RATE_LIMIT_WINDOW);
    }
    if (current > MAX_REQUESTS_PER_WINDOW) {
      return Response.json(
        {
          error: "RATE_LIMITED",
          message: `请求太频繁，请${RATE_LIMIT_WINDOW}秒后重试`,
        },
        { status: 429 }
      );
    }
  } catch {
    console.warn("[generate] Redis unavailable, skipping rate limit");
  }

  // Parse request body
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "INVALID_REQUEST", message: "请求格式错误" },
      { status: 400 }
    );
  }

  if (!body.budget || body.budget < 3000 || body.budget > 50000) {
    return Response.json(
      { error: "INVALID_BUDGET", message: "预算范围 3000-50000 元" },
      { status: 400 }
    );
  }

  // Check subscription
  const device = await ensureDevice(anonUserId);
  const status = checkSubscription(device);

  // Stream response as SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send("status", { phase: "generating", message: "正在分析需求..." });

        const result = await generatePCConfig(body);

        // Apply JD prices: search each part, replace price + link
        send("status", { phase: "pricing", message: "京东比价中..." });
        if (process.env.JD_APP_KEY) {
          const cats = ["cpu", "motherboard", "gpu", "ram", "storage", "psu", "case", "cooler"];
          let replaced = 0; let skuHits = 0;
          for (const cat of cats) {
            const part = result.config[cat as keyof typeof result.config];
            if (!part) continue;
            const candidates = await searchJDCandidates(part.name, cat, 3);
            if (candidates.length > 0) {
              const best = candidates[0];
              part.price = best.price;
              part.shopLink = best.shopLink;
              if (best.source === "sku") skuHits++;
              replaced++;
            }
          }
          result.totalPrice = Object.values(result.config).reduce((s, p) => s + (p.price || 0), 0);
          // If JD failed (< 3 items calibrated), fall back to local DB
          if (replaced < 3) {
            const fb = applyFallbackPrices(result.config);
            result.config = fb.config;
            result.totalPrice = Object.values(result.config).reduce((s, p) => s + (p.price || 0), 0);
            send("status", { phase: "pricing", message: `京东异常，使用本地库校准 ${fb.corrections.length} 项` });
          } else {
            send("status", { phase: "pricing", message: `京东校准 ${replaced}/8 项 (${skuHits} SKU精确 + ${replaced - skuHits} 搜索)` });
          }
        } else {
          const fb = applyFallbackPrices(result.config);
          result.config = fb.config;
          result.totalPrice = Object.values(result.config).reduce((s, p) => s + (p.price || 0), 0);
          send("status", { phase: "pricing", message: `本地库校准 ${fb.corrections.length} 项` });
        }

        send("status", { phase: "done", message: "配置单生成完成" });

        // Decrement free uses only for non-subscribed users
        if (!status.isSubscribed) {
          await decrementFreeUses(anonUserId);
        }

        const showPrices = status.canAccessFull;

        const response = {
          config: result.config,
          totalPrice: showPrices ? result.totalPrice : null,
          compatibilityNotes: result.compatibilityNotes,
          canAccessFull: showPrices,
          freeUsesRemaining: status.isSubscribed
            ? null
            : Math.max(0, status.freeUsesRemaining - 1),
        };

        send("complete", response);
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "未知错误";
        console.error("[generate] Error:", message);
        send("error", {
          message: "生成失败，请稍后重试",
          detail: message,
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
