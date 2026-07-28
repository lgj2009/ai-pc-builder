// 京东联盟 API — 实时价格查询
// https://union.jd.com/ → 注册 → 获取 app_key / app_secret

import crypto from "crypto";

const API_URL = "https://router.jd.com/api";
const APP_KEY = process.env.JD_APP_KEY || "";
const APP_SECRET = process.env.JD_APP_SECRET || "";

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

/** Search JD goods by keyword, return best match */
async function searchJD(keyword: string): Promise<JDGoods | null> {
  const paramJson = JSON.stringify({
    goodsReqDTO: {
      keyword,
      pageIndex: 1,
      pageSize: 3,
      sortName: "inOrderCount30Days",
      sort: "desc",
    },
  });

  const sysParams: Record<string, string> = {
    method: "jd.union.open.goods.query",
    app_key: APP_KEY,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "+0800"),
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
    return null;
  }

  const resultStr = data?.jd_union_open_goods_query_response?.result;
  if (!resultStr) return null;
  const parsed = JSON.parse(resultStr);
  const goodsList = parsed?.data || [];
  if (!goodsList.length) return null;

  const best = goodsList[0];
  return {
    skuId: best.skuId,
    skuName: best.skuName || "",
    price: best.priceInfo?.lowestCouponPrice || best.priceInfo?.price || 0,
    priceOrig: best.priceInfo?.price || 0,
    materialUrl: best.materialUrl || best.commissionInfo?.couponLink || "",
    imageUrl: best.imageInfo?.imageList?.[0]?.url || "",
    shopName: best.shopInfo?.shopName || "",
    inOrderCount30Days: best.inOrderCount30Days || 0,
    comments: best.comments || 0,
    goodCommentsShare: best.goodCommentsShare || 0,
  };
}

// Simple in-memory cache (5 min TTL)
const cache = new Map<
  string,
  { goods: JDGoods; ts: number }
>();
const TTL = 5 * 60 * 1000;

/** Get JD price for a part, cached 5 minutes */
export async function getJDPrice(
  partName: string
): Promise<{ price: number; priceOrig: number; shopLink: string } | null> {
  if (!APP_KEY || !APP_SECRET) {
    console.warn("JD_APP_KEY not set, skipping price lookup");
    return null;
  }

  const cacheKey = partName.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return {
      price: cached.goods.price,
      priceOrig: cached.goods.priceOrig,
      shopLink: cached.goods.materialUrl,
    };
  }

  const goods = await searchJD(partName);
  if (!goods) return null;

  cache.set(cacheKey, { goods, ts: Date.now() });
  return {
    price: goods.price,
    priceOrig: goods.priceOrig,
    shopLink: goods.materialUrl,
  };
}

/** Batch lookup prices for all parts in a config */
export async function lookupConfigPrices(
  config: Record<string, { name: string; price: number; priceOrig?: number; shopLink: string }>
): Promise<{
  config: Record<string, { name: string; price: number; priceOrig?: number; shopLink: string }>;
  corrections: string[];
}> {
  const corrections: string[] = [];
  const updated = { ...config };

  for (const [key, part] of Object.entries(config)) {
    const jd = await getJDPrice(part.name);
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
          `${key}: AI ¥${oldPrice} → 京东 ¥${jd.price}`
        );
      }
    }
  }

  return { config: updated, corrections };
}
