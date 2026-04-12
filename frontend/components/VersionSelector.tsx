"use client";

import { useState } from "react";

interface Version {
  versionId: string;
  tone: string;
  label: string | null;
  createdAt: string;
}

interface Props {
  versions: Version[];
  currentVersionId: string | null;
  campaignId: string;
  userId: string;
  onVersionSwitch: (versionId: string) => void;
  onCreateVersion: (tone: string, label: string) => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", sub: "Authoritative" },
  { value: "casual",       label: "Casual",       sub: "Conversational" },
  { value: "bold",         label: "Bold",         sub: "High-energy" },
  { value: "empathetic",   label: "Empathetic",   sub: "Human-centered" },
];

const TONE_COLORS: Record<string, string> = {
  professional: "#C9A84C",
  casual:       "#7A9E7E",
  bold:         "#C97A4C",
  empathetic:   "#9A7EC9",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function VersionSelector({
  versions, currentVersionId, campaignId, userId, onVersionSwitch, onCreateVersion,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTone, setNewTone]       = useState("professional");
  const [newLabel, setNewLabel]     = useState("");
  const [switching, setSwitching]   = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSwitch = async (versionId: string) => {
    if (versionId === currentVersionId) return;
    setSwitching(versionId);
    try {
      const res = await fetch(`${API_BASE}/api/db/campaigns/${campaignId}/set-version`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, versionId }),
      });
      if (!res.ok) throw new Error("Switch failed");
      onVersionSwitch(versionId);
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(null);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const label = newLabel.trim() || `${newTone.charAt(0).toUpperCase() + newTone.slice(1)} draft`;
      await onCreateVersion(newTone, label);
      setShowCreate(false);
      setNewLabel("");
      setNewTone("professional");
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create version");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-px w-4 bg-[#C9A84C]/40" />
          <span className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540]">
            Versions ({versions.length})
          </span>
        </div>
        <button onClick={() => setShowCreate(s => !s)}
          className="text-[10px] tracking-widest uppercase btn-ghost px-3 py-1.5 flex items-center gap-1.5">
          {showCreate ? "✕ Cancel" : "+ New Version"}
        </button>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/3 p-4 space-y-3 animate-fade-in">
          <div className="text-[10px] tracking-widest uppercase text-[#C9A84C]/60 mb-2">
            Generate with a different tone
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map(t => (
              <button key={t.value} onClick={() => setNewTone(t.value)}
                className={`relative p-2.5 border text-left transition-all ${
                  newTone === t.value ? "border-[#C9A84C]/50 bg-[#C9A84C]/5" : "border-[#1a1a1a] hover:border-[#2a2520]"
                }`}>
                {newTone === t.value && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />}
                <div className={`text-xs font-semibold ${newTone === t.value ? "text-[#C9A84C]" : "text-[#F5F0E8]"}`}>{t.label}</div>
                <div className="text-[10px] text-[#4A4540]">{t.sub}</div>
              </button>
            ))}
          </div>
          <input type="text" placeholder={`Label (e.g. "Bold for LinkedIn")`} value={newLabel}
            onChange={e => setNewLabel(e.target.value)} className="w-full luxury-input px-3 py-2 text-xs" />
          {createError && <p className="text-[10px] text-red-400">⚠ {createError}</p>}
          <button onClick={handleCreate} disabled={creating}
            className="w-full btn-gold py-3 text-[10px] tracking-widest uppercase disabled:opacity-40 flex items-center justify-center gap-2">
            {creating ? (
              <><div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Generating…</>
            ) : "⊕ Generate New Version"}
          </button>
          <p className="text-[9px] text-[#4A4540] text-center">This runs the full copywriter + editor pipeline (~15 seconds)</p>
        </div>
      )}

      {/* Version list */}
      <div className="space-y-2">
        {versions.length === 0 && (
          <div className="text-center py-8 border border-[#141414]">
            <p className="text-[11px] text-[#2a2520]">No versions yet. Click "+ New Version" to create one.</p>
          </div>
        )}
        {versions.map((v, i) => {
          const isCurrent   = v.versionId === currentVersionId;
          const isSwitching = switching === v.versionId;
          const toneColor   = TONE_COLORS[v.tone] || "#C9A84C";
          return (
            <div key={v.versionId} className={`border p-3 transition-all ${
              isCurrent ? "border-[#C9A84C]/30 bg-[#C9A84C]/3" : "border-[#1a1a1a] hover:border-[#2a2520]"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] font-bold text-[#2a2520]" style={{ fontFamily: "'Playfair Display',serif" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="text-xs text-[#F5F0E8] font-medium">{v.label || `Version ${i + 1}`}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: toneColor + "80" }}>{v.tone}</span>
                      <span className="text-[10px] text-[#2a2520]">{formatDate(v.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {isCurrent ? (
                  <span className="text-[10px] tracking-widest uppercase text-[#C9A84C]">● Active</span>
                ) : (
                  <button onClick={() => handleSwitch(v.versionId)} disabled={!!switching}
                    className="btn-ghost px-3 py-1 text-[10px] tracking-widest uppercase disabled:opacity-40">
                    {isSwitching ? <div className="w-3 h-3 border border-[#4A4540] border-t-transparent rounded-full animate-spin" /> : "Switch"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}