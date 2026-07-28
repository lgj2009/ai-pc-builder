import OpenAI from "openai";
import type { GenerateRequest, GenerateResponse } from "./types";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
  return openaiClient;
}

const SYSTEM_PROMPT = `你是一个专业PC装机顾问，拥有10年DIY经验。

## 任务
根据用户预算和用途，生成完整配置单，包含8个配件：CPU、主板、显卡、内存、硬盘、电源、机箱、散热器。

## 规则
1. 总价不超过预算 15%
2. 内存必须双通道（2条）
3. 电源功率 ≥ 整机功耗 × 1.3 倍
4. 自动检查兼容性（CPU插槽与主板、内存代际、机箱尺寸与显卡/散热器）
5. 标注每个配件的预估价格（国内电商参考价）
6. 优先推荐主流型号、性价比高的产品

## 输出格式
只输出合法 JSON，不要任何其他文字。格式如下：
{
  "config": {
    "cpu": { "name": "型号", "spec": "规格参数", "price": 价格(数字), "shopLink": "京东搜索URL", "notes": "选择理由" },
    "motherboard": { "name": "...", "spec": "...", "price": 0, "shopLink": "...", "notes": "..." },
    "gpu": { "name": "...", "spec": "...", "price": 0, "shopLink": "...", "notes": "..." },
    "ram": { "name": "...", "spec": "...", "price": 0, "shopLink": "...", "notes": "..." },
    "storage": { "name": "...", "spec": "...", "price": 0, "shopLink": "...", "notes": "..." },
    "psu": { "name": "...", "spec": "...", "price": 0, "shopLink": "...", "notes": "..." },
    "case": { "name": "...", "spec": "...", "price": 0, "shopLink": "...", "notes": "..." },
    "cooler": { "name": "...", "spec": "...", "price": 0, "shopLink": "...", "notes": "..." }
  },
  "totalPrice": 总价数字,
  "compatibilityNotes": ["兼容性说明1", "兼容性说明2"]
}

## 预算参考（2025年国内市场价）
- 3000-4000：入门办公/轻游戏（核显/i3+二手显卡）
- 5000-7000：中端游戏（R5/i5 + RTX 4060/RTX 5060）
- 8000-12000：高端游戏（R7/i7 + RTX 4070 Super/5070）
- 13000-20000：旗舰（R9/i9 + RTX 4080/5080+）
- 20000+：无上限`;

export async function generatePCConfig(
  request: GenerateRequest
): Promise<GenerateResponse> {
  const purposeText = request.purpose.join("、");
  const cpuPref =
    request.cpuPreference === "any"
      ? "不限品牌"
      : request.cpuPreference.toUpperCase();

  const userMessage = `预算：${request.budget}元
用途：${purposeText}
CPU偏好：${cpuPref}

请生成配置单。`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create(
    {
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    },
    { timeout: 25000 }
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned empty response");
  }

  // Extract JSON — DeepSeek may wrap it in markdown code blocks
  let jsonStr = content.trim();
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();

  const parsed = JSON.parse(jsonStr);

  const requiredParts = [
    "cpu", "motherboard", "gpu", "ram", "storage", "psu", "case", "cooler",
  ] as const;
  for (const part of requiredParts) {
    if (!parsed.config?.[part]) {
      throw new Error(`Missing required part: ${part}`);
    }
    const p = parsed.config[part];
    if (!p.name || typeof p.price !== "number") {
      throw new Error(`Invalid part data for: ${part}`);
    }
    if (!p.shopLink) {
      p.shopLink = `https://search.jd.com/Search?keyword=${encodeURIComponent(p.name)}`;
    }
  }

  if (typeof parsed.totalPrice !== "number") {
    parsed.totalPrice = Object.values(parsed.config).reduce(
      (sum: number, p: unknown) => sum + ((p as { price: number }).price || 0),
      0
    );
  }

  return {
    config: parsed.config,
    totalPrice: parsed.totalPrice,
    compatibilityNotes: parsed.compatibilityNotes || [],
  };
}
