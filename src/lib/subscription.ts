import { supabaseServer } from "./supabase/server";
import type { Device, SubscriptionStatus } from "./types";

export async function getDevice(anonUserId: string): Promise<Device | null> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("devices")
    .select("*")
    .eq("anon_user_id", anonUserId)
    .single();
  return data ?? null;
}

export async function ensureDevice(anonUserId: string): Promise<Device> {
  const existing = await getDevice(anonUserId);
  if (existing) return existing;

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("devices")
    .insert({ anon_user_id: anonUserId, free_uses_remaining: 3 })
    .select()
    .single();

  if (error) throw new Error(`Failed to create device: ${error.message}`);
  return data!;
}

export function checkSubscription(device: Device): SubscriptionStatus {
  const now = new Date();
  const expiresAt = device.subscription_expires_at
    ? new Date(device.subscription_expires_at)
    : null;
  const isSubscribed = expiresAt !== null && expiresAt > now;
  const canAccessFull = isSubscribed || device.free_uses_remaining > 0;

  return {
    isSubscribed,
    expiresAt: device.subscription_expires_at,
    freeUsesRemaining: device.free_uses_remaining,
    canAccessFull,
  };
}

export async function decrementFreeUses(anonUserId: string): Promise<void> {
  const supabase = supabaseServer();
  await supabase.rpc("decrement_free_uses", { user_id_param: anonUserId });
}

export async function redeemCode(
  anonUserId: string,
  code: string
): Promise<{ success: boolean; expiresAt?: string; message: string }> {
  const supabase = supabaseServer();

  const { data: codeData, error: codeError } = await supabase
    .from("redeem_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (codeError || !codeData) {
    return { success: false, message: "兑换码无效" };
  }
  if (codeData.is_used) {
    return { success: false, message: "兑换码已被使用" };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + codeData.duration_days * 86400_000);

  const { error: updateCodeErr } = await supabase
    .from("redeem_codes")
    .update({ is_used: true, used_by: anonUserId, used_at: now.toISOString() })
    .eq("id", codeData.id);

  if (updateCodeErr) {
    return { success: false, message: "激活失败，请重试" };
  }

  const device = await getDevice(anonUserId);
  if (device) {
    await supabase
      .from("devices")
      .update({ subscription_expires_at: expiresAt.toISOString() })
      .eq("anon_user_id", anonUserId);
  } else {
    await supabase
      .from("devices")
      .insert({
        anon_user_id: anonUserId,
        subscription_expires_at: expiresAt.toISOString(),
        free_uses_remaining: 0,
      });
  }

  return {
    success: true,
    expiresAt: expiresAt.toISOString(),
    message: `激活成功！有效期至 ${expiresAt.toLocaleDateString("zh-CN")}`,
  };
}
