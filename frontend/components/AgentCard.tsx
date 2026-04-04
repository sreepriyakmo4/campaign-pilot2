"use client";

type AgentStatus = "idle" | "running" | "success" | "error" | "warning";

interface Props {
  name: string;
  description: string;
  icon: string;
  status: AgentStatus;
  stepNumber: number;
}

const statusConfig: Record<AgentStatus, { border: string; dot: string; label: string; bg: string }> = {
  idle:    { border: "#1a1a1a",           dot: "#2a2520",           label: "Idle",    bg: "transparent" },
  running: { border: "#C9A84C40",          dot: "#C9A84C",           label: "Running", bg: "#C9A84C05" },
  success: { border: "#2a4a2a",            dot: "#4A8A4A",           label: "Done",    bg: "#0a1a0a" },
  error:   { border: "#4a1a1a",            dot: "#8A2A2A",           label: "Error",   bg: "#1a0a0a" },
  warning: { border: "#4a3a1a",            dot: "#8A6A2A",           label: "Warning", bg: "#1a1505" },
};

export default function AgentCard({ name, description, icon, status, stepNumber }: Props) {
  const s = statusConfig[status];
  return (
    <div className="relative p-3.5 border transition-all duration-500" style={{ borderColor: s.border, background: s.bg }}>
      <div className="absolute -top-2.5 -left-1 text-[10px] font-bold text-[#2a2520]" style={{fontFamily:"'Playfair Display',serif"}}>
        {String(stepNumber).padStart(2, "0")}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-base text-[#C9A84C]/40">{icon}</span>
          <div>
            <div className="text-xs font-semibold text-[#F5F0E8]">{name}</div>
            <div className="text-[10px] text-[#4A4540] mt-0.5">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === "running" ? "animate-pulse" : ""}`} style={{ background: s.dot }} />
          <span className="text-[9px] tracking-widest uppercase text-[#4A4540]">{s.label}</span>
        </div>
      </div>
      {status === "running" && (
        <div className="absolute bottom-0 left-0 h-px w-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent animate-shimmer" />
        </div>
      )}
    </div>
  );
}
