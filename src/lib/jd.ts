// ============================================================
// 京东联盟 API — 智能价格查询
// 3 层策略：SKU 精确 → 多页共识 → 单页关键词
// ============================================================

import crypto from "crypto";
import fs from "fs";
import path from "path";

const API = "https://router.jd.com/api";
const APP_KEY = process.env.JD_APP_KEY || "";
const APP_SECRET = process.env.JD_APP_SECRET || "";

// ============================================================
// 签名 & 请求
// ============================================================

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

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function call(method: string, paramJson: string) {
  const sysParams: Record<string, string> = {
    method,
    app_key: APP_KEY,
    timestamp: timestamp(),
    format: "json",
    v: "1.0",
    sign_method: "md5",
    param_json: paramJson,
  };
  sysParams.sign = sign(sysParams);
  const query = new URLSearchParams(sysParams).toString();
  const res = await fetch(`${API}?${query}`);
  return res.json();
}

// ============================================================
// SKU 数据库
// ============================================================

interface SkuDB {
  parts: Record<string, Record<string, number>>;
}

let _skuDB: SkuDB | null = null;
function getSkuDB(): SkuDB {
  if (!_skuDB) {
    const dbPath = path.join(process.cwd(), "sku-database.json");
    const raw = fs.readFileSync(dbPath, "utf-8");
    _skuDB = JSON.parse(raw) as SkuDB;
  }
  return _skuDB;
}

/** Look up a part in the SKU database */
function matchSku(name: string, category: string): number | null {
  const catParts = getSkuDB().parts[category];
  if (!catParts) return null;
  const clean = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const cn = clean(name);
  for (const [key, sku] of Object.entries(catParts)) {
    const ck = clean(key);
    if (cn.includes(ck) || ck.includes(cn)) return sku;
  }
  return null;
}

// ============================================================
// SKU 精确查价
// ============================================================

async function searchBySku(skuIds: number[]) {
  const data = await call(
    "jd.union.open.goods.promotiongoodsinfo.query",
    JSON.stringify({ skuIds })
  );
  const resultStr = data?.jd_union_open_goods_promotiongoodsinfo_query_response?.result;
  if (!resultStr) return [];
  const goods = JSON.parse(resultStr).data || [];
  return goods.map((g: any) => ({
    skuId: g.skuId,
    price: g.unitPrice || g.priceInfo?.price || 0,
    priceOrig: g.priceInfo?.price || 0,
    shopLink: g.materialUrl || `https://item.jd.com/${g.skuId}.html`,
    skuName: g.skuName || "",
  }));
}

// ============================================================
// 关键词搜索（单页）
// ============================================================

async function searchByKeyword(keyword: string, page: number) {
  const data = await call(
    "jd.union.open.goods.query",
    JSON.stringify({
      goodsReqDTO: { keyword, pageIndex: page, pageSize: 5, sortName: "inOrderCount30Days", sort: "desc" },
    })
  );
  const resultStr = data?.jd_union_open_goods_query_response?.result;
  if (!resultStr) return [];
  const goods = JSON.parse(resultStr).data || [];
  return goods.map((g: any) => ({
    skuId: g.skuId,
    price: g.priceInfo?.lowestCouponPrice || g.priceInfo?.price || 0,
    priceOrig: g.priceInfo?.price || 0,
    shopLink: g.materialUrl || "",
    skuName: g.skuName || "",
  }));
}

// ============================================================
// 共识聚类 — 核心算法
// ============================================================

interface PricePoint {
  price: number;
  name: string;
  link: string;
}

/**
 * 多页并发搜索 + 价格聚类 + 众数中位数
 *
 * 1. 并发拉 3 页 × 5 条 = 最多 15 条结果
 * 2. 按价格排序，10% 滑动窗口找最大密度簇
 * 3. 最大簇 ≥ 5 条 → 取中位数，高置信度
 * 4. 最大簇 3-4 条 → 取中位数，中置信度
 * 5. 最大簇 < 3 条 → 走单页兜底
 */
async function consensusSearch(
  keyword: string,
  category: string
): Promise<{ price: number; link: string; name: string; confidence: "high" | "medium" | "low" } | null> {
  const suffix: Record<string, string> = {
    cpu: " CPU处理器", motherboard: " 主板", gpu: " 显卡",
    ram: " 内存条", storage: " 固态硬盘", psu: " 电源",
    case: " 机箱", cooler: " 散热器",
  };
  const cleanKw = keyword.replace(/[\(\)（）]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);

  // 并发 3 页
  const pages = await Promise.all([
    searchByKeyword(cleanKw + (suffix[category] || ""), 1),
    searchByKeyword(cleanKw + (suffix[category] || ""), 2),
    searchByKeyword(cleanKw + (suffix[category] || ""), 3),
  ]);

  const all = pages.flat();
  if (all.length < 3) return null; // 结果太少，放弃

  // 去重 + 价格过滤
  const seen = new Set<string>();
  const points: PricePoint[] = [];
  for (const g of all) {
    const k = g.skuName.slice(0, 30);
    if (seen.has(k)) continue;
    seen.add(k);
    const range = PRICE_RANGE[category] || [0, Infinity];
    if (g.price >= range[0] && g.price <= range[1]) {
      points.push({ price: g.price, name: g.skuName, link: g.shopLink });
    }
  }

  if (points.length < 3) return null;

  // 按价格排序
  points.sort((a, b) => a.price - b.price);

  // 10% 滑动窗口找最大簇
  let bestCluster: PricePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const base = points[i].price;
    const cluster = points.filter(
      (p) => Math.abs(p.price - base) / base < 0.1
    );
    if (cluster.length > bestCluster.length) {
      bestCluster = cluster;
    }
  }

  // 中位数
  const mid = Math.floor(bestCluster.length / 2);
  const median = bestCluster.length % 2 === 0
    ? Math.round((bestCluster[mid - 1].price + bestCluster[mid].price) / 2)
    : bestCluster[mid].price;

  const confidence =
    bestCluster.length >= 5 ? "high" :
    bestCluster.length >= 3 ? "medium" : "low";

  // 从簇中找一个靠谱的商品链接（优先用中位数对应的商品）
  const best = bestCluster.reduce((prev, curr) =>
    Math.abs(curr.price - median) < Math.abs(prev.price - median) ? curr : prev
  );

  return {
    price: median,
    link: best.link,
    name: best.name,
    confidence: confidence as "high" | "medium" | "low",
  };
}

// ============================================================
// 价格合理区间
// ============================================================

const PRICE_RANGE: Record<string, [number, number]> = {
  cpu: [300, 8000],
  motherboard: [300, 5000],
  gpu: [600, 20000],
  ram: [100, 4000],
  storage: [100, 5000],
  psu: [100, 2500],
  case: [50, 2000],
  cooler: [30, 1500],
};

// ============================================================
// 对外接口：查一个配件的京东价
// ============================================================

/** 5 分钟缓存 */
type Cached = { price: number; priceOrig: number; shopLink: string; name: string; source: string; confidence: string; ts: number };
const cache = new Map<string, Cached>();
const TTL = 5 * 60 * 1000;

export async function getJDPrice(
  partName: string,
  category: string
): Promise<{ price: number; priceOrig: number; shopLink: string; source: string; confidence: string } | null> {
  if (!APP_KEY) return null;

  const cacheKey = `${category}:${partName.toLowerCase().trim()}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL) {
    return { price: hit.price, priceOrig: hit.priceOrig, shopLink: hit.shopLink, source: hit.source, confidence: hit.confidence };
  }

  // 第1层：SKU 精确
  const skuId = matchSku(partName, category);
  if (skuId) {
    const goods = await searchBySku([skuId]);
    if (goods.length > 0) {
      const result: Cached = { price: goods[0].price, priceOrig: goods[0].priceOrig, shopLink: goods[0].shopLink, name: goods[0].skuName, source: "sku", confidence: "high", ts: Date.now() };
      cache.set(cacheKey, result);
      return result;
    }
  }

  // 第2层：多页共识
  const consensus = await consensusSearch(partName, category);
  if (consensus && consensus.confidence !== "low") {
    const result: Cached = { price: consensus.price, priceOrig: consensus.price, shopLink: consensus.link, name: consensus.name, source: "consensus", confidence: consensus.confidence, ts: Date.now() };
    cache.set(cacheKey, result);
    return result;
  }

  // 第3层：单页关键词兜底
  const single = await searchByKeyword(partName, 1);
  if (single.length > 0) {
    const range = PRICE_RANGE[category] || [0, Infinity];
    const valid = single.find((g: { price: number }) => g.price >= range[0] && g.price <= range[1]);
    if (valid) {
      const result: Cached = { price: valid.price, priceOrig: valid.priceOrig, shopLink: valid.shopLink, name: valid.skuName, source: "keyword", confidence: "low", ts: Date.now() };
      cache.set(cacheKey, result);
      return result;
    }
  }

  return null;
}
