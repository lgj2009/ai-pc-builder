import fallbackPrices from "@/../fallback-prices.json";
import type { PCConfig } from "./types";

interface FallbackPart {
  category: string;
  name: string;
  spec: string;
  price: number;
}

const parts = (fallbackPrices as { parts: FallbackPart[] }).parts;

/** Extract model keywords from a product name */
function tokenize(name: string): string[] {
  // Normalize: spaces, split camelCase and Chinese-English boundaries
  let s = name
    .toLowerCase()
    .replace(/[()（）,，/]/g, " ")
    // Split at Chinese-English or digit-letter boundaries
    .replace(/([一-鿿])([a-z0-9])/gi, "$1 $2")
    .replace(/([a-z0-9])([一-鿿])/gi, "$1 $2")
    // Split model numbers from brands
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return s
    .split(" ")
    .filter((t) => t.length >= 2)
    .filter((t) => !["系列", "主板", "显卡", "处理器", "的", "和", "及"].includes(t));
}

/** Check if two tokens match (allowing minor variations) */
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // Ignore dashes and dots for comparison
  const clean = (s: string) =>
    s.replace(/[-_.]/g, "").replace(/^(oc|w|gaming|pro|plus)$/i, "");
  const ca = clean(a);
  const cb = clean(b);
  if (ca === cb) return true;
  // Partial match for longer model numbers like "14600kf" vs "14600"
  if (ca.length >= 4 && cb.length >= 4) {
    if (ca.includes(cb) || cb.includes(ca)) return true;
  }
  return false;
}

/** Match a part name against the fallback price database */
function findPrice(name: string, category: string): number | null {
  const tokens = tokenize(name);
  if (tokens.length === 0) return null;

  let bestMatch: { price: number; score: number } | null = null;

  for (const p of parts) {
    if (p.category !== category) continue;

    const pTokens = tokenize(p.name);

    // Count matching tokens
    let matchCount = 0;
    for (const pt of pTokens) {
      for (const t of tokens) {
        if (tokensMatch(t, pt)) {
          matchCount++;
          break;
        }
      }
    }

    // Require at least 2 tokens matching, or exact model number match
    const hasModelMatch = tokens.some(
      (t) => {
        // Model numbers: 7500F, RTX4060, B650M, i5-14600KF
        const isModel = /^[a-z]?\d{3,5}[a-z]*\d*[a-z]*$/i.test(t) ||
                        /^[a-z]+\d{2,4}[a-z]*$/i.test(t) ||
                        /^[a-z]\d-\d{4,5}[a-z]*$/i.test(t);
        if (!isModel) return false;
        return pTokens.some((pt) => {
          const ct = t.replace(/[-_]/g, "");
          const cpt = pt.replace(/[-_]/g, "");
          return cpt.includes(ct) || ct.includes(cpt);
        });
      }
    );

    const score = hasModelMatch ? matchCount + 5 : matchCount;

    if (score >= 3 && (!bestMatch || score > bestMatch.score)) {
      // Don't match partial model numbers (e.g., "4070" should not match "4070 SUPER")
      const hasConflict =
        hasModelMatch &&
        tokens.some((t) => {
          const num = t.match(/^(\d{3,5})/);
          if (!num) return false;
          return pTokens.some(
            (pt) => pt !== t && pt.includes(num[1]) && pt.length > t.length
          );
        });

      if (!hasConflict) {
        bestMatch = { price: p.price, score };
      }
    }
  }

  return bestMatch?.price ?? null;
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

    const aiPrice = part.price;
    const matched = findPrice(part.name, cat);

    if (matched && Math.abs(matched - aiPrice) > 30) {
      corrections.push(
        `${key}: AI ¥${aiPrice} → 京东 ¥${matched}`
      );
      part.price = matched;
    }
  }

  return { config, corrections };
}
