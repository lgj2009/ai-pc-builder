// 京东联盟 API — 实时价格查询
// https://union.jd.com/ → 注册 → 获取 app_key / app_secret

import crypto from "crypto";
import fs from "fs";
import path from "path";

let skuDB: { parts: Record<string, Record<string, number>> } | null = null;

function getSkuDB() {
  if (!skuDB) {
    const dbPath = path.join(process.cwd(), "sku-database.json");
    skuDB = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  }
  return skuDB!;
}

const API_URL = "https://router.jd.com/api";
const APP_KEY = process.env.JD_APP_KEY || "";
const APP_SECRET = process.env.JD_APP_SECRET || "";

/** Look up a part in the SKU database, returns SKU ID if found */
function findSkuId(name: string, category: string): number | null {
  const catParts = getSkuDB().parts[category];
  if (!catParts) return null;
  // Match: check if AI name contains DB key or vice versa
  const cleanName = name.toLowerCase().replace(/\s+/g, "");
  for (const [key, sku] of Object.entries(catParts)) {
    const cleanKey = key.toLowerCase().replace(/\s+/g, "");
    if (cleanName.includes(cleanKey) || cleanKey.includes(cleanName)) return sku;
  }
  return null;
}

interface JDGoods {
  skuId: number;
  skuName: string;
  price: number;       // 券后价
  priceOrig: number;   // 原价
  materialUrl: string; // 商品链接（含佣金）
  imageUrl: string;
  shopName: string;
  inOrderCount30Days: number; // 月销量
  comments: number;
  goodCommentsShare: number; // 好评率
}

/** Generate MD5 signature per JD API requirements */
function sign(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "sign")
    .sort()
    .map((k) => k + params[k])
    .join("");
  return crypto
    .createHash("md5")
    .update(APP_SECRET + sorted + APP_SECRET)
    .digest("hex")
    .toUpperCase();
}

/** Look up a specific SKU by ID — 100% accurate price */
async function searchJDSku(skuIds: number[]): Promise<JDGoods[]> {
  const paramJson = JSON.stringify({
    skuIds,
  });
  const sysParams: Record<string, string> = {
    method: "jd.union.open.goods.promotiongoodsinfo.query",
    app_key: APP_KEY,
    timestamp: (() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    })(),
    format: "json",
    v: "1.0",
    sign_method: "md5",
    param_json: paramJson,
  };
  sysParams.sign = sign(sysParams);

  const query = new URLSearchParams(sysParams).toString();
  const res = await fetch(`${API_URL}?${query}`);
  const data = await res.json();

  if (data.error_response) {
    console.error("JD SKU error:", JSON.stringify(data.error_response));
    return [];
  }

  const resultStr = data?.jd_union_open_goods_promotiongoodsinfo_query_response?.result;
  if (!resultStr) return [];
  const parsed = JSON.parse(resultStr);
  const goodsList: any[] = parsed?.data || [];
  return goodsList.map((g: any) => ({
    skuId: g.skuId,
    skuName: g.skuName || "",
    price: g.unitPrice || g.priceInfo?.price || 0,
    priceOrig: g.priceInfo?.price || 0,
    materialUrl: g.materialUrl || `https://item.jd.com/${g.skuId}.html`,
    imageUrl: g.imageInfo?.imageList?.[0]?.url || "",
    shopName: g.shopInfo?.shopName || "",
    inOrderCount30Days: g.inOrderCount30Days || 0,
    comments: g.comments || 0,
    goodCommentsShare: g.goodCommentsShare || 0,
  }));
}

/** Search JD goods by keyword, return all valid matches */
async function searchJD(keyword: string): Promise<JDGoods[]> {
  const paramJson = JSON.stringify({
    goodsReqDTO: {
      keyword,
      pageIndex: 1,
      pageSize: 5,
      sortName: "inOrderCount30Days",
      sort: "desc",
    },
  });

  const sysParams: Record<string, string> = {
    method: "jd.union.open.goods.query",
    app_key: APP_KEY,
    timestamp: (() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    })(),
    format: "json",
    v: "1.0",
    sign_method: "md5",
    param_json: paramJson,
  };
  sysParams.sign = sign(sysParams);

  const query = new URLSearchParams(sysParams).toString();
  const res = await fetch(`${API_URL}?${query}`);
  const data = await res.json();

  if (data.error_response) {
    console.error("JD API error:", data.error_response);
    return [];
  }

  const resultStr = data?.jd_union_open_goods_query_response?.result;
  if (!resultStr) return [];
  const parsed = JSON.parse(resultStr);
  const goodsList: any[] = parsed?.data || [];
  if (!goodsList.length) return [];

  return goodsList.map((best: any) => ({
    skuId: best.skuId,
    skuName: best.skuName || "",
    price: best.priceInfo?.lowestCouponPrice || best.priceInfo?.price || 0,
    priceOrig: best.priceInfo?.price || 0,
    materialUrl: best.materialUrl || "",
    imageUrl: best.imageInfo?.imageList?.[0]?.url || "",
    shopName: best.shopInfo?.shopName || "",
    inOrderCount30Days: best.inOrderCount30Days || 0,
    comments: best.comments || 0,
    goodCommentsShare: best.goodCommentsShare || 0,
  }));
}

// Simple in-memory cache (5 min TTL)
const cache = new Map<
  string,
  { goods: JDGoods; ts: number }
>();
const TTL = 5 * 60 * 1000;

/** Extract clean search keyword for JD API */
function extractSearchKeyword(name: string, category: string, spec: string): string {
  // Remove noise: brackets, CL timing, RPM speeds etc
  let cleaned = (name + " " + spec)
    .replace(/[\(\)（）]/g, " ")
    .replace(/\bC\d{2}\b/gi, "")       // CL36, etc
    .replace(/\b\d+rpm\b/gi, "")       // 5400rpm
    .replace(/\b\d+x\d+\b/g, "")       // 16G×2 etc
    .replace(/\bH\.D\.T\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Take first 30 chars + category suffix for precision
  return cleaned.slice(0, 30) + (CATEGORY_SUFFIX[category] || "");
}

/** Category-specific search suffixes for precision */
const CATEGORY_SUFFIX: Record<string, string> = {
  cpu: " CPU处理器",
  motherboard: " 主板",
  gpu: " 显卡",
  ram: " 内存条",
  storage: " 固态硬盘",
  psu: " 电源",
  case: " 机箱",
  cooler: " 散热器",
};

/** Price sanity ranges per category — reject obvious mismatches */
const PRICE_RANGES: Record<string, [number, number]> = {
  cpu: [300, 8000],
  motherboard: [300, 5000],
  gpu: [600, 20000],
  ram: [100, 4000],
  storage: [100, 5000],
  psu: [100, 2500],
  case: [50, 2000],
  cooler: [30, 1500],
};

/** Get JD price for a part, cached 5 minutes */
export async function getJDPrice(
  partName: string,
  category: string,
  partSpec?: string
): Promise<{ price: number; priceOrig: number; shopLink: string; skuName?: string } | null> {
  if (!APP_KEY || !APP_SECRET) {
    console.warn("JD_APP_KEY not set, skipping price lookup");
    return null;
  }

  const keyword = extractSearchKeyword(partName, category, partSpec || "");

  const cacheKey = keyword.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return {
      price: cached.goods.price,
      priceOrig: cached.goods.priceOrig,
      shopLink: cached.goods.materialUrl,
      skuName: cached.goods.skuName,
    };
  }

  const goodsList = await searchJD(keyword);
  if (!goodsList.length) return null;

  // Filter by price sanity AND capacity match for storage/ram
  const range = PRICE_RANGES[category] || [0, Infinity];
  let valid = goodsList.filter(
    (g) => g.price >= range[0] && g.price <= range[1]
  );

  // For storage & RAM: prefer results whose name contains the same capacity keyword
  if ((category === "storage" || category === "ram") && valid.length > 1) {
    const capMatch = keyword.match(/\b(\d+)(tb|gb)\b/i);
    if (capMatch) {
      const capStr = capMatch[0].toLowerCase();
      const exactCap = valid.filter((g) =>
        g.skuName.toLowerCase().includes(capStr)
      );
      if (exactCap.length > 0) valid = exactCap;
    }
  }

  // Pick best: prefer the one with most sales among valid results
  const best = valid.length > 0 ? valid[0] : null;
  if (!best) {
    console.log(`JD: no valid result for "${keyword}" in range ¥${range[0]}-${range[1]}, got:`, goodsList.map(g => g.skuName.slice(0,30) + ' ¥' + g.price));
    return null;
  }

  cache.set(cacheKey, { goods: best, ts: Date.now() });
  return {
    price: best.price,
    priceOrig: best.priceOrig,
    shopLink: best.materialUrl,
    skuName: best.skuName,  // for debug output
  };
}

/** Search JD and return multiple candidates for AI to pick from */
export async function searchJDCandidates(
  keyword: string,
  category: string,
  count: number = 3
): Promise<{ name: string; price: number; shopLink: string; source: "sku" | "keyword" }[]> {
  // Try SKU database first — 100% accurate
  const skuId = findSkuId(keyword, category);
  if (skuId) {
    console.log(`[JD] SKU hit: "${keyword}" → ${skuId}`);
    const skuResults = await searchJDSku([skuId]);
    if (skuResults.length > 0) {
      return skuResults.slice(0, count).map((g) => ({
        name: g.skuName,
        price: g.price,
        shopLink: g.materialUrl,
        source: "sku" as const,
      }));
    }
    console.log(`[JD] SKU ${skuId} returned no results`);
  }

  // Fallback to keyword search
  const fullKeyword = extractSearchKeyword(keyword, category, "");
  console.log(`[JD] Keyword search: "${fullKeyword}"`);
  const goodsList = await searchJD(fullKeyword);
  if (!goodsList.length) {
    console.log(`[JD] No results for "${fullKeyword}"`);
    return [];
  }

  const range = PRICE_RANGES[category] || [0, Infinity];
  const filtered = goodsList.filter((g) => g.price >= range[0] && g.price <= range[1]);
  console.log(`[JD] ${goodsList.length} results, ${filtered.length} in range ¥${range[0]}-${range[1]}`);
  return filtered.slice(0, count).map((g) => ({
    name: g.skuName,
    price: g.price,
    shopLink: g.materialUrl,
    source: "keyword" as const,
  }));
}

/** Batch lookup prices for all parts in a config */
export async function lookupConfigPrices(
  config: Record<string, { name: string; price: number; priceOrig?: number; shopLink: string; spec?: string }>
): Promise<{
  config: Record<string, { name: string; price: number; priceOrig?: number; shopLink: string }>;
  corrections: string[];
}> {
  const corrections: string[] = [];
  const updated = { ...config };

  for (const [key, part] of Object.entries(config)) {
    const jd = await getJDPrice(part.name, key, (part as { spec?: string }).spec);
    if (jd && jd.price > 0) {
      const oldPrice = part.price;
      updated[key] = {
        ...part,
        price: jd.price,
        priceOrig: jd.priceOrig,
        shopLink: jd.shopLink,
      };
      if (Math.abs(jd.price - oldPrice) > 30) {
        corrections.push(
          `${key}: AI ¥${oldPrice} → 京东 ¥${jd.price} [${(jd as { skuName?: string }).skuName?.slice(0, 40) || "?"}]`
        );
      }
    }
  }

  return { config: updated, corrections };
}
