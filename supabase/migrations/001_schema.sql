-- 匿名用户设备表
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_user_id TEXT UNIQUE NOT NULL,
  subscription_expires_at TIMESTAMPTZ,
  free_uses_remaining INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 兑换码表
CREATE TABLE IF NOT EXISTS redeem_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (30, 90, 365)),
  is_used BOOLEAN DEFAULT FALSE,
  used_by TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 配置单存档表
CREATE TABLE IF NOT EXISTS saved_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_user_id TEXT NOT NULL,
  budget INTEGER,
  purpose TEXT,
  config_json JSONB NOT NULL,
  total_price INTEGER,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_devices_anon_user_id ON devices(anon_user_id);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON redeem_codes(code) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_saved_configs_anon_user_id ON saved_configs(anon_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_configs_share_token ON saved_configs(share_token);

-- 种子兑换码（开发测试用）
INSERT INTO redeem_codes (code, duration_days)
VALUES
  ('PC-TEST-0000-0001', 30),
  ('PC-TEST-0000-0002', 90),
  ('PC-TEST-0000-0003', 365)
ON CONFLICT (code) DO NOTHING;

-- 扣减免费次数函数
CREATE OR REPLACE FUNCTION decrement_free_uses(user_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE devices
  SET free_uses_remaining = GREATEST(free_uses_remaining - 1, 0)
  WHERE anon_user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;
