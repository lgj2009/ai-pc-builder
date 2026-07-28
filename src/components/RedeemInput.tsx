"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RedeemInputProps {
  anonUserId: string;
  isSubscribed: boolean;
  expiresAt: string | null;
  onRedeemed: () => void;
}

export function RedeemInput({
  anonUserId,
  isSubscribed,
  expiresAt,
  onRedeemed,
}: RedeemInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setMessage("");
    setError(false);

    const res = await fetch("/api/auth/redeem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-anon-user-id": anonUserId,
      },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();
    setMessage(data.message);
    setError(!data.success);
    setLoading(false);

    if (data.success) {
      setCode("");
      onRedeemed();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎫 兑换码</CardTitle>
        <CardDescription>
          {isSubscribed
            ? `订阅有效期至 ${new Date(expiresAt!).toLocaleDateString("zh-CN")}`
            : "输入兑换码激活会员，解锁完整价格和购买链接"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSubscribed ? (
          <Badge variant="success" className="text-sm px-3 py-1">
            ✅ 已激活
          </Badge>
        ) : (
          <div className="flex gap-sm">
            <Input
              placeholder="PC-XXXX-YYYY-ZZZZ"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              maxLength={19}
            />
            <Button
              variant="primary"
              onClick={handleRedeem}
              disabled={loading || code.length < 15}
              className="shrink-0 rounded-md"
            >
              {loading ? "激活中..." : "激活"}
            </Button>
          </div>
        )}
        {message && (
          <p
            className={`text-sm mt-sm ${
              error ? "text-red-400" : "text-success"
            }`}
          >
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
