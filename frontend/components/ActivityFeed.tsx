"use client";
import type { ActivityLogItem } from "@/lib/types";

interface Props { items: ActivityLogItem[]; }

const cfg = {
  running: { sym: "○", color: "#C9A84C" },
  success: { sym: "●", color: "#4A8A4A" },
  error:   { sym: "✕", color: "#8A2A2A" },
  warning: { sym: "◐", color: "#8A6A2A" },
};

const agentColors: Record<string, string> = {
  "Orchestrator":    "#4A4540",
  "Research Agent":  "#7A9E9A",
  "Copywriter Agent":"#9A7E9A",
  "Editor-in-Chief": "#C9A84C",
};

export default function ActivityFeed({ items }: Props) {
  if (items.length === 0) return (
    <p className="text-[11px] text-[#2a2520] text-center py-4">Activity will appear here.</p>
  );
  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {items.map((item, i) => {
        const c = cfg[item.status as keyof typeof cfg] || cfg.success;
        const ac = agentColors[item.agent] || "#4A4540";
        return (
          <div key={i} className="flex gap-2 items-start animate-fade-in">
            <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: c.color }}>{c.sym}</span>
            <div className="min-w-0">
              <span className="text-[9px] tracking-widest uppercase mr-1.5" style={{ color: ac }}>{item.agent}</span>
              <p className="text-[11px] text-[#9A9080] leading-snug inline">{item.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
