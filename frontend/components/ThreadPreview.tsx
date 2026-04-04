"use client";
import type { GeneratedContent, ChannelReview } from "@/lib/types";

interface Props {
  content: GeneratedContent;
  review: ChannelReview;
  onRegenerate: () => void;
  regenerating: boolean;
  mobileView?: boolean;
}

export default function ThreadPreview({ content, review, onRegenerate, regenerating, mobileView = false }: Props) {
  return (
    <div className="space-y-4">
      {/* Review badge */}
      <div className={`flex items-center justify-between px-4 py-2.5 border ${review.approved ? "border-emerald-900/40 bg-emerald-950/10" : "border-red-900/40 bg-red-950/10"}`}>
        <span className={`text-[10px] tracking-widest uppercase font-semibold ${review.approved ? "text-emerald-500" : "text-red-500"}`}>
          {review.approved ? "✓ Approved" : "✗ Needs Revision"}
          {!review.approved && review.correction_note && <span className="font-normal ml-2 hidden sm:inline text-red-400/60">— {review.correction_note}</span>}
        </span>
        <button onClick={onRegenerate} disabled={regenerating}
          className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase disabled:opacity-40">
          {regenerating ? <div className="w-3 h-3 border border-[#4A4540] border-t-transparent rounded-full animate-spin" /> : "↺"}
          {regenerating ? "Regenerating" : "Regenerate"}
        </button>
      </div>

      {!review.approved && review.issues.length > 0 && (
        <div className="border border-red-900/30 p-3">
          {review.issues.map((issue, i) => <p key={i} className="text-xs text-red-400/70">• {issue}</p>)}
        </div>
      )}

      {/* Mobile phone frame view */}
      {mobileView ? (
        <div className="flex justify-center py-4">
          <div className="w-72 border-2 border-[#2a2520] rounded-3xl overflow-hidden bg-[#0a0a0a] shadow-2xl">
            {/* Phone notch */}
            <div className="bg-[#0a0a0a] py-3 px-5 flex items-center justify-between border-b border-[#141414]">
              <span className="text-[10px] text-[#4A4540]">9:41</span>
              <div className="w-16 h-4 bg-[#141414] rounded-full" />
              <div className="flex gap-1">
                <div className="w-3 h-3 border border-[#2a2520] rounded-full" />
                <div className="w-3 h-3 border border-[#2a2520] rounded-full" />
              </div>
            </div>
            {/* App bar */}
            <div className="bg-[#0e0e0e] px-4 py-2 border-b border-[#141414] flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
                <span className="text-[8px] text-[#C9A84C]">CP</span>
              </div>
              <span className="text-[10px] text-[#9A9080]">CampaignPilot · 5 posts</span>
            </div>
            {/* Posts */}
            <div className="overflow-y-auto max-h-96">
              {content.thread.map((post, i) => (
                <div key={i} className={`px-4 py-3 border-b border-[#0e0e0e] flex gap-2.5 ${i===0 ? "bg-[#0e0e0e]" : ""}`}>
                  <div className="w-7 h-7 rounded-full border border-[#C9A84C]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] text-[#C9A84C]/70">CP</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[9px] font-bold text-[#F5F0E8]">CampaignPilot</span>
                      <span className="text-[9px] text-[#4A4540]">· now</span>
                    </div>
                    <p className="text-[10px] text-[#9A9080] leading-snug">{post}</p>
                    <div className="flex gap-3 mt-1.5">
                      {["💬","🔁","❤️"].map((ic,j) => <span key={j} className="text-[9px] text-[#2a2520]">{ic}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop thread view */
        <div className="max-w-sm mx-auto space-y-0">
          {content.thread.map((post, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border border-[#C9A84C]/30 rotate-45 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-[9px] font-bold rotate-[-45deg]" style={{fontFamily:"'Playfair Display',serif"}}>CP</span>
                </div>
                {i < content.thread.length - 1 && <div className="w-px bg-[#1a1a1a] flex-1 my-1" style={{minHeight:"20px"}} />}
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-[#F5F0E8]" style={{fontFamily:"'Playfair Display',serif"}}>CampaignPilot</span>
                  <span className="text-[10px] text-[#4A4540]">@campaignpilot · now</span>
                </div>
                <p className="text-sm text-[#9A9080] leading-relaxed">{post}</p>
                <div className="flex gap-4 mt-2">
                  {["◻ Reply","⇄ Share","♡ Like"].map((a,j) => <span key={j} className="text-[10px] text-[#2a2520]">{a}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
