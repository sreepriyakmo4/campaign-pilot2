"use client";
import type { ReviewResult } from "@/lib/types";

interface Props { review: ReviewResult; }

export default function ReviewPanel({ review }: Props) {
  const allApproved = review.blog_review.approved && review.thread_review.approved && review.email_review.approved;
  const channels = [
    { label: "Blog",         r: review.blog_review },
    { label: "Social Thread",r: review.thread_review },
    { label: "Email Teaser", r: review.email_review },
  ];

  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className={`border p-5 ${allApproved ? "border-emerald-900/40 bg-emerald-950/10" : "border-[#4a3a1a] bg-[#1a1505]"}`}>
        <div className={`text-[9px] tracking-[0.25em] uppercase mb-2 font-semibold ${allApproved ? "text-emerald-500" : "text-[#8A6A2A]"}`}>
          {allApproved ? "✓ All Outputs Approved" : "⚠ Review Required"}
        </div>
        <p className={`text-sm leading-relaxed ${allApproved ? "text-emerald-400/60" : "text-[#8A6A2A]/70"}`}>
          {review.overall_summary}
        </p>
      </div>

      {/* Channel badges */}
      <div className="flex gap-2 flex-wrap">
        {channels.map(({ label, r }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-1.5 border text-xs ${r.approved ? "border-emerald-900/40 text-emerald-500 bg-emerald-950/10" : "border-red-900/40 text-red-500 bg-red-950/10"}`}>
            <span>{r.approved ? "✓" : "✗"}</span>
            <span className="tracking-widest uppercase text-[10px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Rejected details */}
      {channels.filter(({ r }) => !r.approved).map(({ label, r }) => (
        <div key={label} className="border border-red-900/30 bg-red-950/10 p-4">
          <div className="text-[9px] tracking-[0.25em] uppercase text-red-500 mb-3">✗ {label} — Rejected</div>
          {r.issues.length > 0 && (
            <ul className="space-y-1 mb-3">
              {r.issues.map((issue, i) => (
                <li key={i} className="text-xs text-[#9A9080] flex gap-2">
                  <span className="text-[#2a2520]">•</span>{issue}
                </li>
              ))}
            </ul>
          )}
          {r.correction_note && (
            <div className="border-t border-red-900/20 pt-3 mt-3">
              <div className="text-[9px] tracking-widest uppercase text-[#4A4540] mb-1">Correction Note</div>
              <p className="text-xs text-[#9A9080]">{r.correction_note}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
