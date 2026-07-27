"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FreeUsesBadge } from "@/components/FreeUsesBadge";
import { RedeemInput } from "@/components/RedeemInput";
import { HistoryList } from "@/components/HistoryList";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import type { SubscriptionStatus, SavedConfig } from "@/lib/types";

export default function ProfilePage() {
  const [anonUserId, setAnonUserId] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [configs, setConfigs] = useState<SavedConfig[]>([]);

  const fetchStatus = useCallback(async (uid: string) => {
    const res = await fetch("/api/auth/me", {
      headers: { "x-anon-user-id": uid },
    });
    setStatus(await res.json());
  }, []);

  useEffect(() => {
    const init = async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        await sb.auth.signInAnonymously();
      }
      const { data: sessionData } = await sb.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) {
        setAnonUserId(uid);
        await fetchStatus(uid);

        const { data: history } = await sb
          .from("saved_configs")
          .select("*")
          .eq("anon_user_id", uid)
          .order("created_at", { ascending: false })
          .limit(20);
        setConfigs(history || []);
      }
    };
    init();
  }, [fetchStatus]);

  return (
    <div className="max-w-2xl mx-auto px-lg py-xxl">
      <div className="flex items-center justify-between mb-xl">
        <h1 className="text-display-md font-display text-ink">📱 我的</h1>
        <Link href="/">
          <Button variant="tertiary" size="sm" className="rounded-md">
            &larr; 返回首页
          </Button>
        </Link>
      </div>

      {status && (
        <div className="mb-lg">
          <FreeUsesBadge
            remaining={status.freeUsesRemaining}
            isSubscribed={status.isSubscribed}
          />
        </div>
      )}

      <div className="mb-xl">
        <RedeemInput
          anonUserId={anonUserId}
          isSubscribed={status?.isSubscribed ?? false}
          expiresAt={status?.expiresAt ?? null}
          onRedeemed={() => fetchStatus(anonUserId)}
        />
      </div>

      <div>
        <h2 className="text-headline font-display text-ink mb-md">
          历史配置单
        </h2>
        <HistoryList configs={configs} />
      </div>
    </div>
  );
}
