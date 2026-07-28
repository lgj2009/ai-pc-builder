import fallbackPrices from "@/../fallback-prices.json";
import type { PCConfig } from "./types";

interface FallbackPart {
  category: string;
  name: string;
  spec: string;
  price: number;
}

const parts = (fallbackPrices as { parts: FallbackPart[] }).parts;

/** Match a part name against the fallback price database */
function findPrice(name: string, category: string): number | null {
  const key = name.toLowerCase().replace(/\s+/g, " ");
  // Exact match
  for (const p of parts) {
    if (p.category === category && p.name.toLowerCase() === key) {
      return p.price;
    }
  }
  // Partial match — product name contains our search key
  for (const p of parts) {
    if (
      p.category === category &&
      (key.includes(p.name.toLowerCase().split(" ")[0]) ||
        p.name.toLowerCase().includes(key.substring(0, 8)))
    ) {
      return p.price;
    }
  }
  return null;
}

/** Apply fallback prices to AI-generated config */
export function applyFallbackPrices(config: PCConfig): {
  config: PCConfig;
  corrections: string[];
} {
  const corrections: string[] = [];
  const categories: Record<string, string> = {
    cpu: "cpu",
    motherboard: "motherboard",
    gpu: "gpu",
    ram: "ram",
    storage: "storage",
    psu: "psu",
    case: "case",
    cooler: "cooler",
  };

  for (const [key, cat] of Object.entries(categories)) {
    const part = (config as unknown as Record<string, { name: string; price: number }>)[key];
    if (!part) continue;

    const matched = findPrice(part.name, cat);
    if (matched && Math.abs(matched - part.price) > 50) {
      corrections.push(
        `${key}: AI 估价 ¥${part.price} → 参考价 ¥${matched} (差 ¥${matched - part.price})`
      );
      part.price = matched;
    }
  }

  return { config, corrections };
}

/** Format corrections for display */
export function formatCorrections(corrections: string[]): string {
  if (corrections.length === 0) return "";
  return "价格已根据参考库校准：\n" + corrections.join("\n");
}
