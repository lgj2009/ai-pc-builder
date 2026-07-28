import fallbackPrices from "@/../fallback-prices.json";
import type { PCConfig } from "./types";

interface FallbackPart {
  category: string;
  name: string;
  spec: string;
  price: number;
}

const parts = (fallbackPrices as { parts: FallbackPart[] }).parts;

/** Extract capacity in GB from text (RAM or storage) */
function extractCapacity(name: string, spec: string): number | null {
  const text = (name + " " + spec).toLowerCase();
  // TB → GB conversion
  const tbMatch = text.match(/(\d+)\s*tb/i);
  if (tbMatch) return parseInt(tbMatch[1]) * 1024;
  // GB
  const gbMatch = text.match(/(\d+)\s*gb/i);
  if (gbMatch) return parseInt(gbMatch[1]);
  // "1T" format
  const tMatch = text.match(/(\d+)\s*t\b/i);
  if (tMatch) return parseInt(tMatch[1]) * 1024;
  return null;
}

/** Check if storage is SSD (not HDD) */
function isSSD(name: string, spec: string): boolean {
  const text = (name + " " + spec).toLowerCase();
  if (text.includes("机械") || text.includes("5400转") || text.includes("7200转")) return false;
  return text.includes("ssd") || text.includes("固态") || text.includes("nvme") ||
         text.includes("m.2") || text.includes("m2") || text.includes("读速");
}

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
function findPrice(name: string, category: string, spec: string, aiPrice: number): number | null {
  const tokens = tokenize(name);
  if (tokens.length === 0) return null;

  // Extract capacity for RAM/storage matching
  const aiCap = extractCapacity(name, spec);
  const aiIsSSD = category === "storage" ? isSSD(name, spec) : null;

  let bestMatch: { price: number; score: number } | null = null;

  for (const p of parts) {
    if (p.category !== category) continue;

    // Capacity filter for RAM/storage
    if (aiCap && (category === "ram" || category === "storage")) {
      const dbCap = extractCapacity(p.name, p.spec);
      if (dbCap && aiCap > 0) {
        const ratio = Math.max(aiCap, dbCap) / Math.min(aiCap, dbCap);
        if (ratio > 2) continue; // Skip if capacity differs by >2x
      }
    }

    // SSD/HDD filter for storage
    if (category === "storage" && aiIsSSD !== null) {
      const dbIsSSD = isSSD(p.name, p.spec);
      if (dbIsSSD !== aiIsSSD) continue; // Don't match SSD with HDD
    }

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
    const part = (config as unknown as Record<string, { name: string; price: number; spec: string }>)[key];
    if (!part) continue;

    const aiPrice = part.price;
    const matched = findPrice(part.name, cat, part.spec || "", aiPrice);

    if (matched && Math.abs(matched - aiPrice) > 30) {
      corrections.push(
        `${key}: AI ¥${aiPrice} → 京东 ¥${matched}`
      );
      part.price = matched;
    }
  }

  return { config, corrections };
}
