# AI-PC-Builder 设计方案

## 项目概述

**定位**：国内 DIY 装机配置顾问  
**目标用户**：装机小白  
**核心流程**：输入预算 + 用途 → AI 自动生成高性价比配置单 → 展示参考价格 → 一键复制  
**商业模式**：兑换码付费订阅（3 次完整免费试用 → 降级体验）  
**技术路线**：DeepSeek V4 Flash + Next.js 14 全栈 + Render 免费部署

---

## 系统架构

```
用户浏览器
    │ HTTPS
    ▼
Render Web Service (免费层)
    │
    └── Next.js 14 (前端 SSR + API Routes)
         ├── DeepSeek V4 Flash (AI 引擎，OpenAI SDK 兼容)
         ├── Supabase (匿名用户 / 兑换码 / 配置存档)
         └── Upstash Redis (限流 / 免费次数)
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | 遵循 Linear DESIGN.md 暗色主题 |
| 后端 | Next.js API Routes | 替代 Express，统一部署 |
| AI | DeepSeek V4 Flash，OpenAI SDK 兼容模式 | `base_url` 指向 DeepSeek |
| 数据库 | Supabase PostgreSQL | 免费 500MB |
| 缓存 | Upstash Redis | 免费 256MB，仅限流 + 免费次数 |
| 设计 | Linear DESIGN.md | `#010102` 画布 + `#5e6ad2` 薰衣草蓝 |
| 部署 | Render Free Web Service + node-cron 自保活 | |

---

## 前端页面

### 首页 `/`
- 预算滑块（3000-50000，步长 500）
- 用途多选（游戏/办公/剪辑/通用）
- CPU 偏好（不限/Intel/AMD）
- 剩余免费次数显示
- SSE 流式生成动画

### 结果页 `/config/[id]`
- 8 个配件卡片（CPU/主板/显卡/内存/硬盘/电源/机箱/散热器）
- 免费用户：3 次内显示价格和购买链接；次数用完后显示 `🔒 兑换码解锁`
- 一键复制、分享链接

### 个人中心 `/profile`
- 免费/已激活状态
- 兑换码输入框
- 历史配置单列表

---

## 后端 API

| 端点 | 方法 | 功能 | 订阅要求 |
|------|------|------|---------|
| `/api/generate` | POST | SSE 流式生成配置单 | 免费 3 次/降级 |
| `/api/ping` | GET | 健康检查 + 保活 | 无 |
| `/api/auth/me` | GET | 获取订阅状态 | 无 |
| `/api/auth/redeem` | POST | 兑换码激活 | 无 |
| `/api/config/[id]` | GET | 获取已保存配置 | 无 |

---

## DeepSeek Agent 设计

### System Prompt 核心指令
- 专业装机顾问角色，10 年 DIY 经验
- 根据预算和用途生成 CPU/主板/显卡/内存/硬盘/电源/机箱/散热器
- 每选一个配件输出估算价格
- 自动检查兼容性（CPU 插槽、内存代际、电源功率、机箱尺寸等）
- 最终输出为合法 JSON 格式
- 总价不超过预算 15%
- 内存必须双通道
- 电源功率 ≥ 整机功耗 × 1.3

### 价格策略
- AI 直接从训练数据估算价格（覆盖京东/天猫主流定价）
- 兜底 JSON 文件（100 款热门配件）用于 AI 失败降级
- 页面标注"参考价，以电商实际为准"

### 兼容性策略
- 纯 AI 判断，不维护硬编码规则表
- DeepSeek V4 训练数据覆盖主流装机论坛/评测/兼容性列表

---

## 数据库表结构（Supabase SQL）

```sql
-- 匿名用户表
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_user_id TEXT UNIQUE NOT NULL,
  subscription_expires_at TIMESTAMPTZ,
  free_uses_remaining INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 兑换码表
CREATE TABLE redeem_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 配置单存档
CREATE TABLE saved_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_user_id TEXT NOT NULL,
  budget INTEGER,
  purpose TEXT,
  config_json JSONB NOT NULL,
  total_price INTEGER,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 免费试用与订阅策略

| 状态 | 权限 | 判断逻辑 |
|------|------|---------|
| 免费（有剩余次数） | 完整功能：价格 + 购买链接 + 兼容性检查 | `free_uses_remaining > 0` |
| 免费（次数用尽） | 降级：隐藏价格/链接，可看配置 | `free_uses_remaining = 0 AND subscription_expires_at IS NULL` |
| 已激活 | 完整功能 | `subscription_expires_at > NOW()` |
| 已过期 | 降级 | `subscription_expires_at < NOW()` |

---

## 部署配置

### Render (render.yaml)

```yaml
services:
  - type: web
    name: ai-pc-builder
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start
    healthCheckPath: /api/ping
    envVars:
      - key: DEEPSEEK_API_KEY
      - key: NEXT_PUBLIC_SUPABASE_URL
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
      - key: SUPABASE_SERVICE_ROLE_KEY
      - key: UPSTASH_REDIS_URL
```

### 保活机制
- node-cron 每 14 分钟自 ping `/api/ping`
- `/api/ping` 返回 200 状态码，响应时间 < 500ms

---

## 月度成本

| 项目 | 100 用户 | 500 用户 | 2000 用户 |
|------|---------|---------|----------|
| Render | ¥0 | ¥0 | ¥0 |
| Supabase | ¥0 | ¥0 | ¥0 |
| Upstash | ¥0 | ¥0 | ¥0 |
| DeepSeek API | ≈ ¥5 | ≈ ¥25 | ≈ ¥100 |
| **总计** | **≈ ¥5** | **≈ ¥25** | **≈ ¥100** |

---

## 开发路线图（MVP ~4 周）

| 阶段 | 内容 | 验证点 |
|------|------|--------|
| 第 1 周 | 项目初始化、Supabase 建表、Render Hello World | Render 健康检查通过 |
| 第 2 周 | DeepSeek API 连通、System Prompt 调优、JSON 解析 | 生成合理配置单 |
| 第 3 周 | 前端 3 页面 + SSE 流式 + 兑换码激活 | 完整闭环 |
| 第 4 周 | 限流、降级、错误处理、兜底价格库 | 边界场景通过 |

---

## 风险清单

| 风险 | 应对 |
|------|------|
| `deepseek-chat` 别名 2026/7/24 已废弃 | 已使用 `deepseek-v4-flash` 显式模型名 |
| Render 免费服务休眠 | node-cron 自保活 |
| 价格仅为 AI 估算 | 页面标注"参考价"，加更新时间戳 |
| DeepSeek 并发限制 | Redis 限流排队 + 前端等待提示 |
| Supabase 免费层超限 | 监控 Dashboard，提前配置升级 |
