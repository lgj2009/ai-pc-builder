"use client";

import type { PartInfo } from "@/lib/types";

const PART_LABELS: Record<string, string> = {
  cpu: "CPU",
  motherboard: "主板",
  gpu: "显卡",
  ram: "内存",
  storage: "硬盘",
  psu: "电源",
  case: "机箱",
  cooler: "散热",
};

interface ConfigAccordionProps {
  parts: Record<string, PartInfo>;
  canAccessFull: boolean;
}

export function ConfigAccordion({ parts, canAccessFull }: ConfigAccordionProps) {
  return (
    <div
      className="flex gap-1 p-1 rounded-sm w-full"
      style={{
        height: "280px",
        background: "#212121",
      }}
    >
      {Object.entries(parts).map(([key, part]) => (
        <div
          key={key}
          className="overflow-hidden cursor-pointer rounded-sm flex justify-center items-center relative"
          style={{
            height: "100%",
            flex: 1,
            background: "#212121",
            border: "1px solid #ff5a91",
            transition: "all 0.5s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.flex = "4";
            const span = e.currentTarget.querySelector("span") as HTMLElement;
            if (span) {
              span.style.transform = "rotate(0deg)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.flex = "1";
            const span = e.currentTarget.querySelector("span") as HTMLElement;
            if (span) {
              span.style.transform = "rotate(-90deg)";
            }
          }}
        >
          {/* Vertical label */}
          <span
            className="text-center uppercase px-2"
            style={{
              minWidth: "14em",
              color: "#ff568e",
              letterSpacing: "0.1em",
              transform: "rotate(-90deg)",
              transition: "all 0.5s",
              whiteSpace: "nowrap",
            }}
          >
            {PART_LABELS[key] || key}
          </span>

          {/* Expanded detail — shown below the label when hovered */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 opacity-0 pointer-events-none"
            style={{ transition: "opacity 0.5s" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0";
            }}
          >
            <p className="text-white font-bold text-sm mb-1 leading-tight">
              {part.name}
            </p>
            <p className="text-gray-400 text-xs mb-2 leading-tight">
              {part.spec}
            </p>
            {canAccessFull && part.price > 0 ? (
              <p
                className="font-bold text-lg"
                style={{ color: "#ff568e" }}
              >
                ¥{part.price.toLocaleString()}
              </p>
            ) : (
              <p className="text-gray-500 text-xs">🔒 兑换码解锁价格</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
