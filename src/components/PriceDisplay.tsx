"use client";

interface PriceDisplayProps {
  price: number | null;
  canAccess: boolean;
}

export function PriceDisplay({ price, canAccess }: PriceDisplayProps) {
  if (!canAccess) {
    return (
      <div className="flex items-center gap-xs text-ink-tertiary text-sm">
        <span>🔒</span>
        <span>兑换码解锁价格</span>
      </div>
    );
  }
  return (
    <span className="text-primary font-display text-lg font-semibold">
      ¥{price?.toLocaleString() ?? "—"}
    </span>
  );
}
