// Scrape diyzp.cn product prices and update fallback-prices.json
import { writeFileSync } from "fs";
import crypto from "crypto";

const BASE = "https://www.diyzp.cn";
const DATA_KEY = "d1y@p1#2025$ecur3K3yF0rD4t4!@#5678901234";

function decrypt(encryptedData, key) {
  const raw = Buffer.from(encryptedData, "base64");
  const iv = raw.slice(0, 16);
  const enc = raw.slice(16);
  // Key is 42 chars, truncated to first 32 per site's JS logic
  const keyBytes = Buffer.from(key.slice(0, 32), "utf-8");
  // 32 byte key = AES-256-CBC
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBytes, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf-8");
}

async function getToken() {
  const res = await fetch(`${BASE}/api/generate_token.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!data.success) throw new Error("Token failed: " + JSON.stringify(data));
  return data.token;
}

async function fetchGoods(token, category, page = 1) {
  const body = new URLSearchParams({
    category: String(category),
    page: String(page),
    sort: "popular",
    limit: "100",
  });
  const res = await fetch(`${BASE}/api/get_goods.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-API-Token": token,
    },
    body,
  });
  const data = await res.json();
  if (data.encrypted && data.data) {
    const decrypted = decrypt(data.data, DATA_KEY);
    return JSON.parse(decrypted);
  }
  return data;
}

// Category IDs from the site's JS
const CATEGORIES = [
  { name: "cpu", id: 11 },
  { name: "motherboard", id: 12 },
  { name: "ram", id: 13 },
  { name: "gpu", id: 14 },
  { name: "storage", id: 15 },
  { name: "psu", id: 16 },
  { name: "case", id: 17 },
  { name: "cooler", id: 18 },
];

async function main() {
  console.log("[1/3] Getting API token...");
  const token = await getToken();
  console.log("  Token: " + token.slice(0, 20) + "...");

  const allParts = [];

  for (const cat of CATEGORIES) {
    console.log(`[2/3] Fetching ${cat.name} (category ${cat.id})...`);
    try {
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const data = await fetchGoods(token, cat.id, page);
        if (data.success && data.goods) {
          totalPages = data.pagination?.totalPages || 1;
          if (data.goods.length > 0) {
            // Debug: show first item keys
            console.log(`  Sample keys: ${Object.keys(data.goods[0]).join(", ")}`);
            console.log(`  Sample: ${JSON.stringify(data.goods[0]).slice(0, 200)}`);
          }
          for (const g of data.goods) {
            const price = parseFloat(g.sale) || 0;
            const name = g.name || "";
            if (!name || price <= 0) continue;
            // Build spec from params
            const specParts = [];
            if (g.params) {
              for (const [k, v] of Object.entries(g.params)) {
                if (k !== "img" && v && typeof v === "string" && v.length < 80) {
                  specParts.push(v);
                }
              }
            }
            allParts.push({
              category: cat.name,
              name,
              spec: specParts.join(" / ") || "",
              price: Math.round(price),
            });
          }
          console.log(`  ${cat.name} page ${page}/${totalPages} — ${data.goods.length} items`);
        } else {
          console.log(`  ${cat.name}: no data returned`);
          break;
        }
        page++;
        // Rate limit
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (e) {
      console.error(`  Error fetching ${cat.name}:`, e.message);
    }
  }

  // Deduplicate by name
  const seen = new Set();
  const unique = allParts.filter((p) => {
    if (!p.name || !p.price || p.price <= 0) return false;
    // Normalize name for dedup
    const key = p.name.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[3/3] Total unique parts: ${unique.length}`);

  const output = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: "diyzp.cn 实时爬取，仅供参考",
    parts: unique,
  };

  writeFileSync("fallback-prices.json", JSON.stringify(output, null, 2), "utf-8");
  console.log("Done! Written to fallback-prices.json");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
