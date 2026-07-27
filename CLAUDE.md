# AI-PC-Builder

国内 DIY 装机配置顾问 —— AI 自动生成高性价比配置单。

## 设计系统

本项目使用 [Linear 设计系统](DESIGN.md)（暗色主题）。

- 画布：`#010102`，文字：`#f7f8f8`
- 强调色：`#5e6ad2`（薰衣草蓝），仅用于品牌标记和主 CTA
- 所有 UI 组件遵循 DESIGN.md 定义的 tokens（颜色、字体、圆角、间距、层级）

## 技术栈

- **前端**：Next.js 14 App Router + Tailwind CSS + shadcn/ui
- **AI**：DeepSeek V4 Flash（OpenAI SDK 兼容，`base_url` → `https://api.deepseek.com`）
- **数据库**：Supabase PostgreSQL（匿名登录）
- **缓存**：Upstash Redis（限流 + 免费次数）
- **部署**：Render Free Web Service + node-cron 自保活

## 项目结构

```
/
├── DESIGN.md              # Linear 暗色设计系统
├── render.yaml            # Render 部署配置
├── fallback-prices.json   # 100 款热门配件兜底价格
├── supabase/
│   └── migrations/        # 数据库建表 SQL
└── src/
    ├── app/               # Next.js App Router 页面
    │   ├── page.tsx       # 首页
    │   ├── config/[id]/   # 结果页
    │   ├── profile/       # 个人中心
    │   └── api/           # API Routes
    │       ├── generate/  # SSE 流式生成
    │       ├── ping/      # 健康检查
    │       ├── auth/      # me + redeem
    │       └── config/    # 配置单 CRUD
    ├── lib/               # 工具库
    │   ├── deepseek.ts    # DeepSeek Agent
    │   ├── supabase.ts    # Supabase 客户端
    │   ├── redis.ts       # Upstash 客户端
    │   └── subscription.ts # 订阅中间件
    └── components/        # shadcn/ui 组件
```

## 关键规则

### 订阅与免费策略
- 匿名登录零摩擦，Supabase `signInAnonymously()`
- 免费 3 次完整功能 → 降级（隐藏价格/链接，仍可看配置）
- 兑换码格式 `PC-XXXX-YYYY-ZZZZ`，激活后恢复完整功能
- 所有 `/api/generate` 请求须经过订阅中间件

### AI 生成
- System Prompt：专业装机顾问，10 年 DIY 经验
- 价格：AI 直接从训练数据估算，标注"参考价"
- 兼容性：纯 AI 判断（CPU 插槽、内存代际、电源功率、机箱尺寸）
- 输出：合法 JSON，总价不超过预算 15%，内存双通道，电源 ≥ 功耗 × 1.3
- 失败降级：调 fallback-prices.json 兜底

### 部署
- 健康检查：`GET /api/ping` 返回 200，响应 < 500ms
- 保活：node-cron 每 14 分钟自 ping
- Render 免费层：750h/月，休眠不影响保活效果

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥（前端） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role（后端操作） |
| `UPSTASH_REDIS_URL` | Upstash Redis 连接字符串 |
