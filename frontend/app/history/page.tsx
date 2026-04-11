"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getUserCampaigns, getCampaignById, deleteCampaignFromDB, type DBCampaignSummary } from "@/lib/db-api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const toneColors: Record<string, string> = {
  professional: "#C9A84C",
  casual:       "#7A9E7E",
  bold:         "#C97A4C",
  empathetic:   "#9A7EC9",
};

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [entries, setEntries]         = useState<DBCampaignSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  // Get the user's DB id from the session
  const dbUserId = (session?.user as any)?.dbUserId as string | null;

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status === "authenticated" && dbUserId) {
      loadCampaigns();
    }
  }, [status, dbUserId]);

  const loadCampaigns = async () => {
    if (!dbUserId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserCampaigns(dbUserId);
      setEntries(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (entry: DBCampaignSummary) => {
    if (!dbUserId) return;
    try {
      // Fetch the full campaign from the database
      const full = await getCampaignById(entry.id, dbUserId);

      // Store in sessionStorage so dashboard/agent-room can read it
      const campaignResponse = {
        fact_sheet:   full.factSheet,
        content:      full.generatedContent,
        review:       full.reviewResult,
        activity_log: full.activityLogs || [],
      };
      sessionStorage.setItem("campaignResult", JSON.stringify(campaignResponse));
      sessionStorage.setItem("campaignSource",  full.sourceText);
      sessionStorage.setItem("campaignTone",    full.tone);
      sessionStorage.setItem("dbCampaignId",    full.id);
      sessionStorage.setItem("dbUserId",        dbUserId);

      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to open campaign");
    }
  };

  const handleDelete = async (id: string) => {
    if (!dbUserId) return;
    setDeletingId(id);
    try {
      await deleteCampaignFromDB(id, dbUserId);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!dbUserId) return;
    try {
      // Delete all campaigns one by one
      await Promise.all(entries.map(e => deleteCampaignFromDB(e.id, dbUserId)));
      setEntries([]);
      setConfirmClear(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to clear history");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] tracking-widest uppercase text-[#4A4540]">Loading history…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8]">
      {/* Nav */}
      <nav className="border-b border-[#141414] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-xs tracking-widest uppercase text-[#9A9080] hover:text-[#C9A84C] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            New Campaign
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-[#C9A84C]/40 rotate-45 flex items-center justify-center">
            <span className="text-[#C9A84C] text-xs font-bold rotate-[-45deg]" style={{ fontFamily: "'Playfair Display',serif" }}>CP</span>
          </div>
          <span className="font-semibold text-sm" style={{ fontFamily: "'Playfair Display',serif" }}>CampaignPilot</span>
        </div>
        {entries.length > 0 ? (
          <button onClick={() => setConfirmClear(true)} className="text-xs tracking-widest uppercase text-[#4A4540] hover:text-red-500 transition-colors">
            Clear All
          </button>
        ) : <div className="w-24" />}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-[#C9A84C]/40" />
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C]/60">Archive</span>
          </div>
          <h1 className="text-4xl font-bold text-[#F5F0E8]" style={{ fontFamily: "'Playfair Display',serif" }}>
            Campaign History
          </h1>
          <p className="text-[#4A4540] text-sm mt-2">
            {entries.length} campaign{entries.length !== 1 ? "s" : ""} saved
            {session?.user?.name ? ` for ${session.user.name}` : ""}
          </p>
        </div>

        {error && (
          <div className="mb-6 border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            ⚠ {error}
            <button onClick={loadCampaigns} className="ml-3 underline text-red-300 hover:text-red-100">Retry</button>
          </div>
        )}

        {/* Confirm clear modal */}
        {confirmClear && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
            <div className="bg-[#0e0e0e] border border-[#2a2520] p-8 max-w-sm w-full relative">
              {["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r", "-bottom-px -left-px border-b border-l", "-bottom-px -right-px border-b border-r"].map((cls, i) => (
                <div key={i} className={`absolute ${cls} w-4 h-4 border-[#C9A84C]/30`} />
              ))}
              <h3 className="text-lg font-bold text-[#F5F0E8] mb-2" style={{ fontFamily: "'Playfair Display',serif" }}>Clear all history?</h3>
              <p className="text-sm text-[#9A9080] mb-6">
                This will permanently delete all {entries.length} saved campaigns from the database. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={handleClearAll} className="flex-1 py-2.5 text-xs tracking-widest uppercase bg-red-950/40 border border-red-900/40 text-red-400 hover:bg-red-950/60 transition-colors">
                  Delete All
                </button>
                <button onClick={() => setConfirmClear(false)} className="flex-1 py-2.5 text-xs tracking-widest uppercase btn-ghost">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && !error && (
          <div className="text-center py-24 border border-[#141414]">
            <span className="text-5xl text-[#1a1a1a] block mb-4">◈</span>
            <p className="text-[#4A4540] text-sm mb-6">No campaigns generated yet.</p>
            <button onClick={() => router.push("/")} className="btn-gold px-6 py-2.5 text-xs">
              Create First Campaign
            </button>
          </div>
        )}

        {/* History list */}
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const toneColor = toneColors[entry.tone] || "#C9A84C";
            const isDeleting = deletingId === entry.id;

            return (
              <div key={entry.id} className="bg-[#0e0e0e] border border-[#1a1a1a] hover:border-[#2a2520] transition-all duration-200 group animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="p-5 flex items-start gap-4">
                  {/* Index */}
                  <div className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "'Playfair Display',serif", minWidth: "2rem", textAlign: "right" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-[#F5F0E8] truncate" style={{ fontFamily: "'Playfair Display',serif" }}>
                          {entry.productName || entry.blogTitle || "Untitled Campaign"}
                        </h3>
                        <p className="text-xs text-[#4A4540] mt-1 line-clamp-1">{entry.sourcePreview}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 border flex-shrink-0 ${entry.allApproved ? "border-emerald-900/50 text-emerald-500 bg-emerald-950/20" : "border-amber-900/50 text-amber-500 bg-amber-950/20"}`}>
                        {entry.allApproved ? "Approved" : "Review"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] text-[#4A4540]">{formatDate(entry.createdAt)}</span>
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: toneColor + "80" }}>{entry.tone}</span>
                    </div>

                    {/* Approval pills */}
                    <div className="flex gap-2 mt-3">
                      {/* We show a generic "approved" badge since summaries don't have per-channel data */}
                      <span className={`text-[10px] px-2 py-0.5 border ${entry.allApproved ? "border-[#1a2a1a] text-[#4A6A4A]" : "border-[#2a1a1a] text-[#6A4A4A]"}`}>
                        {entry.allApproved ? "✓ All channels" : "⚠ Needs review"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => handleOpen(entry)} className="btn-gold px-4 py-2 text-[10px] tracking-widest">
                      Open ↗
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={isDeleting}
                      className="btn-ghost px-4 py-2 text-[10px] tracking-widest hover:border-red-900/50 hover:text-red-500 disabled:opacity-40"
                    >
                      {isDeleting ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}