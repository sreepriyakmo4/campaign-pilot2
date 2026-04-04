"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { loadHistory, deleteHistoryEntry, clearHistory, formatDate, type HistoryEntry } from "@/lib/history";

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    setEntries(loadHistory());
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    setEntries(loadHistory());
  };

  const handleClear = () => {
    clearHistory();
    setEntries([]);
    setConfirmClear(false);
  };

  const handleOpen = (entry: HistoryEntry) => {
    sessionStorage.setItem("campaignResult", JSON.stringify(entry.campaign));
    sessionStorage.setItem("campaignSource", entry.sourcePreview);
    sessionStorage.setItem("campaignTone", entry.tone);
    router.push("/dashboard");
  };

  const toneColors: Record<string, string> = {
    professional: "#C9A84C",
    casual: "#7A9E7E",
    bold: "#C97A4C",
    empathetic: "#9A7EC9",
  };

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
            <span className="text-[#C9A84C] text-xs font-bold rotate-[-45deg]" style={{fontFamily:"'Playfair Display',serif"}}>CP</span>
          </div>
          <span className="font-semibold text-sm" style={{fontFamily:"'Playfair Display',serif"}}>CampaignPilot</span>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs tracking-widest uppercase text-[#4A4540] hover:text-red-500 transition-colors"
          >
            Clear All
          </button>
        )}
        {entries.length === 0 && <div className="w-24" />}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-[#C9A84C]/40" />
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C]/60">Archive</span>
          </div>
          <h1 className="text-4xl font-bold text-[#F5F0E8]" style={{fontFamily:"'Playfair Display',serif"}}>
            Campaign History
          </h1>
          <p className="text-[#4A4540] text-sm mt-2">
            {entries.length} campaign{entries.length !== 1 ? "s" : ""} saved on this device
          </p>
        </div>

        {/* Confirm clear modal */}
        {confirmClear && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
            <div className="bg-[#0e0e0e] border border-[#2a2520] p-8 max-w-sm w-full relative">
              {["-top-px -left-px border-t border-l","-top-px -right-px border-t border-r","-bottom-px -left-px border-b border-l","-bottom-px -right-px border-b border-r"].map((cls,i)=>(
                <div key={i} className={`absolute ${cls} w-4 h-4 border-[#C9A84C]/30`} />
              ))}
              <h3 className="font-display text-lg font-bold text-[#F5F0E8] mb-2">Clear all history?</h3>
              <p className="text-sm text-[#9A9080] mb-6">This will permanently delete all {entries.length} saved campaigns from your device. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={handleClear} className="flex-1 py-2.5 text-xs tracking-widest uppercase bg-red-950/40 border border-red-900/40 text-red-400 hover:bg-red-950/60 transition-colors">
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
        {entries.length === 0 && (
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
            const allApproved =
              entry.campaign.review.blog_review.approved &&
              entry.campaign.review.thread_review.approved &&
              entry.campaign.review.email_review.approved;
            const toneColor = toneColors[entry.tone] || "#C9A84C";

            return (
              <div
                key={entry.id}
                className="bg-[#0e0e0e] border border-[#1a1a1a] hover:border-[#2a2520] transition-all duration-200 group animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="p-5 flex items-start gap-4">
                  {/* Index */}
                  <div className="text-2xl font-bold text-[#1a1a1a] font-display flex-shrink-0 w-8 text-right">
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-[#F5F0E8] truncate" style={{fontFamily:"'Playfair Display',serif"}}>
                          {entry.productName || entry.campaign.content.blog_title || "Untitled Campaign"}
                        </h3>
                        <p className="text-xs text-[#4A4540] mt-1 line-clamp-1">{entry.sourcePreview}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 border ${allApproved ? "border-emerald-900/50 text-emerald-500 bg-emerald-950/20" : "border-amber-900/50 text-amber-500 bg-amber-950/20"}`}
                        >
                          {allApproved ? "Approved" : "Review"}
                        </span>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] text-[#4A4540]">{formatDate(entry.createdAt)}</span>
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: toneColor + "80" }}>
                        {entry.tone}
                      </span>
                      <span className="text-[10px] text-[#4A4540]">
                        {entry.campaign.fact_sheet.core_features.length} features extracted
                      </span>
                    </div>

                    {/* Channel pills */}
                    <div className="flex gap-2 mt-3">
                      {[
                        { label: "Blog", approved: entry.campaign.review.blog_review.approved },
                        { label: "Thread", approved: entry.campaign.review.thread_review.approved },
                        { label: "Email", approved: entry.campaign.review.email_review.approved },
                      ].map(ch => (
                        <span key={ch.label} className={`text-[10px] px-2 py-0.5 border ${ch.approved ? "border-[#1a2a1a] text-[#4A6A4A]" : "border-[#2a1a1a] text-[#6A4A4A]"}`}>
                          {ch.approved ? "✓" : "✗"} {ch.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpen(entry)}
                      className="btn-gold px-4 py-2 text-[10px] tracking-widest"
                    >
                      Open ↗
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="btn-ghost px-4 py-2 text-[10px] tracking-widest hover:border-red-900/50 hover:text-red-500"
                    >
                      Delete
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
