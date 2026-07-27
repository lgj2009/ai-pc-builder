"use client";

import { Badge } from "@/components/ui/badge";

interface FreeUsesBadgeProps {
  remaining: number;
  isSubscribed: boolean;
}

export function FreeUsesBadge({ remaining, isSubscribed }: FreeUsesBadgeProps) {
  if (isSubscribed) {
    return <Badge variant="success">✅ 已激活</Badge>;
  }
  if (remaining > 0) {
    return <Badge variant="primary">🆓 剩余 {remaining} 次免费</Badge>;
  }
  return <Badge variant="default">🔒 免费次数用完</Badge>;
}
