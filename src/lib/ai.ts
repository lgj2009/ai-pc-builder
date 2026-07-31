// ============================================================
// AI 配置生成 — DeepSeek V4
// 职责：根据预算和用途输出最优配置，不参与价格校准
// ============================================================

import OpenAI from "openai";
import type { GenerateRequest, GenerateResponse } from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
  return client;
}

const SYSTEM_PROMPT = `你是京东装机顾问，拥有10年DIY经验。

## 任务
根据用户预算和用途，从京东在售产品中挑选最佳配置。

## 规则
1. 总价不超过预算 15%
2. 内存必须双通道，name 写总容量（如"32GB(16G×2)"，禁止"16GB×2"歧义写法）
3. 硬盘 name 写清容量（如"1TB"或"2TB"）
4. 电源功率 ≥ 整机功耗 × 1.3 倍
5. 自动检查兼容性（CPU插槽与主板、内存代际、机箱尺寸与显卡/散热器）
6. price 填写京东市场价，不要猜测
7. shopLink 填写 https://search.jd.com/Search?keyword=型号 格式
8. 优先推荐京东在售主流型号

## 输出格式
只输出合法 JSON：
{
  "config": {
    "cpu":    { "name": "Intel i5-14600KF 盒装", "spec": "14核20线程...", "price": 2100, "shopLink": "https://search.jd.com/Search?keyword=...", "notes": "..." },
    "motherboard": { ... },
    "gpu":    { ... },
    "ram":    { "name": "金士顿 FURY Beast 32GB(16G×2) DDR5 6000MHz", ... },
    "storage": { "name": "致态 TiPlus7100 1TB", ... },
    "psu":    { ... },
    "case":   { ... },
    "cooler": { ... }
  },
  "totalPrice": 8000,
  "compatibilityNotes": ["CPU与主板插槽兼容..."]
}

## 预算参考
- 3000-4000：入门办公/轻游戏
- 5000-7000：中端游戏（i5/R5 + RTX 4060）
- 8000-12000：高端游戏（i7/R7 + RTX 4070 Super/5070）
- 13000-20000：旗舰（i9/R9 + RTX 4080/5080+）
- 20000+：无上限`;

export async function generateConfig(
  request: GenerateRequest
): Promise<GenerateResponse> {
  const purposeText = request.purpose.join("、");
  const cpuPref =
    request.cpuPreference === "any"
      ? "不限品牌"
      : request.cpuPreference.toUpperCase();

  const prompt = `预算：${request.budget}元\n用途：${purposeText}\nCPU偏好：${cpuPref}\n\n请生成配置单。`;

  const openai = getClient();
  const response = await openai.chat.completions.create(
    {
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    },
    { timeout: 25000 }
  );

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI 返回为空");

  // Extract JSON
  let json = content.trim();
  const m = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) json = m[1].trim();

  const parsed = JSON.parse(json);

  // Validate required parts
  const parts = ["cpu", "motherboard", "gpu", "ram", "storage", "psu", "case", "cooler"] as const;
  for (const p of parts) {
    if (!parsed.config?.[p]) throw new Error(`缺少配件: ${p}`);
    const part = parsed.config[p];
    if (!part.name || typeof part.price !== "number") throw new Error(`${p} 数据不完整`);
    if (!part.shopLink) {
      part.shopLink = `https://search.jd.com/Search?keyword=${encodeURIComponent(part.name)}`;
    }
  }

  if (typeof parsed.totalPrice !== "number") {
    parsed.totalPrice = Object.values(parsed.config).reduce(
      (s: number, p: unknown) => s + ((p as { price: number }).price || 0), 0
    );
  }

  return {
    config: parsed.config,
    totalPrice: parsed.totalPrice,
    compatibilityNotes: parsed.compatibilityNotes || [],
  };
}
