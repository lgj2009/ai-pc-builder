"use client";

interface StreamingLoaderProps {
  phase: string;
  message: string;
}

export function StreamingLoader({ phase, message }: StreamingLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-xxl">
      <div className="relative mb-lg">
        <div className="w-16 h-16 border-2 border-hairline rounded-full animate-spin border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">🖥️</span>
        </div>
      </div>
      <p className="text-ink-muted text-sm animate-pulse">{message}</p>
      {phase === "generating" && (
        <div className="mt-lg space-y-2 w-64">
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
          </div>
          <p className="text-ink-tertiary text-xs text-center">
            AI 正在挑选最佳配件...
          </p>
        </div>
      )}
    </div>
  );
}
