"use client";

interface StreamingLoaderProps {
  phase: string;
  message: string;
}

export function StreamingLoader({ phase, message }: StreamingLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-xxl">
      <div className="banter-loader mb-lg">
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
      </div>
      <p className="text-ink-muted text-sm animate-pulse">{message}</p>
      {phase === "generating" && (
        <p className="text-ink-tertiary text-xs mt-2">
          AI 正在挑选最佳配件...
        </p>
      )}
    </div>
  );
}
