"use client";
import type { GeneratedContent, ChannelReview } from "@/lib/types";

interface Props {
  content: GeneratedContent;
  review: ChannelReview;
  onRegenerate: () => void;
  regenerating: boolean;
}

function renderEmail(text: string) {
  const sections = text.split(/\n\n+/);
  return sections.map((section, i) => {
    const trimmed = section.trim();
    if (!trimmed) return null;

    // Subject line
    if (trimmed.startsWith("Subject:")) {
      return (
        <div key={i} className="mb-5 pb-4 border-b border-[#1a1a1a]">
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#4A4540] block mb-1">
            Subject Line
          </span>
          <span
            className="text-sm font-semibold text-[#F5F0E8]"
            style={{ fontFamily: "'Playfair Display',serif" }}
          >
            {trimmed.replace("Subject:", "").trim()}
          </span>
        </div>
      );
    }

    // Salutation
    if (
      trimmed.startsWith("Hi ") ||
      trimmed.startsWith("Dear ") ||
      trimmed.startsWith("Hello ")
    ) {
      return (
        <p key={i} className="text-sm text-[#C9A84C]/80 font-medium mb-4">
          {trimmed}
        </p>
      );
    }

    // Sign-off
    if (
      trimmed.startsWith("Warm regards") ||
      trimmed.startsWith("Best regards") ||
      trimmed.startsWith("Sincerely") ||
      trimmed.startsWith("Kind regards")
    ) {
      return (
        <div key={i} className="mt-5 pt-4 border-t border-[#1a1a1a]">
          <p className="text-sm text-[#9A9080] whitespace-pre-line leading-relaxed">
            {trimmed}
          </p>
        </div>
      );
    }

    // P.S.
    if (
      trimmed.startsWith("P.S.") ||
      trimmed.startsWith("PS:") ||
      trimmed.startsWith("P.S:")
    ) {
      return (
        <div key={i} className="mt-4 bg-[#C9A84C]/5 border-l-2 border-[#C9A84C]/30 px-4 py-3">
          <p className="text-xs text-[#C9A84C]/70 italic leading-relaxed">
            {trimmed}
          </p>
        </div>
      );
    }

    // CTA
    const isCtaParagraph =
      trimmed.toLowerCase().includes("click") ||
      trimmed.toLowerCase().includes("sign up") ||
      trimmed.toLowerCase().includes("get started") ||
      trimmed.toLowerCase().includes("try it") ||
      trimmed.toLowerCase().includes("learn more") ||
      trimmed.toLowerCase().includes("book a") ||
      trimmed.toLowerCase().includes("schedule");

    if (isCtaParagraph) {
      return (
        <div key={i} className="my-5 bg-[#0a0a0a] border border-[#1a1a1a] p-5">
          <p className="text-sm text-[#9A9080] leading-relaxed mb-4">
            {trimmed}
          </p>
          <button className="btn-gold px-6 py-2.5 text-[10px] tracking-widest uppercase">
            Get Started →
          </button>
        </div>
      );
    }

    // Normal paragraph
    return (
      <p key={i} className="text-sm text-[#9A9080] leading-relaxed mb-4">
        {trimmed}
      </p>
    );
  });
}

export default function EmailPreview({
  content,
  review,
  onRegenerate,
  regenerating,
}: Props) {
  const wordCount = content.email_teaser.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Review badge */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border ${
          review.approved
            ? "border-emerald-900/40 bg-emerald-950/10"
            : "border-red-900/40 bg-red-950/10"
        }`}
      >
        <span
          className={`text-[10px] tracking-widest uppercase font-semibold ${
            review.approved ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {review.approved ? "✓ Approved" : "✗ Needs Revision"}
          {!review.approved && review.correction_note && (
            <span className="font-normal text-red-400/60 ml-2 hidden sm:inline">
              — {review.correction_note}
            </span>
          )}
        </span>

        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase disabled:opacity-40"
        >
          {regenerating ? (
            <div className="w-3 h-3 border border-[#4A4540] border-t-transparent rounded-full animate-spin" />
          ) : (
            "↺"
          )}
          {regenerating ? "Regenerating" : "Regenerate"}
        </button>
      </div>

      {/* ✅ NEW: Correction Note Block */}
      {!review.approved && review.correction_note && (
        <div className="border-l-2 border-red-900/60 pl-4 py-2 bg-red-950/10">
          <div className="text-[9px] tracking-widest uppercase text-red-500 mb-1">
            Editor Correction Note
          </div>
          <p className="text-xs text-red-400/80">
            {review.correction_note}
          </p>
        </div>
      )}

      {/* Issues */}
      {!review.approved && review.issues.length > 0 && (
        <div className="border border-red-900/30 p-3">
          {review.issues.map((issue, i) => (
            <p key={i} className="text-xs text-red-400/70">
              • {issue}
            </p>
          ))}
        </div>
      )}

      {/* Email UI */}
      <div className="border border-[#1a1a1a]">
        {/* Header */}
        <div className="bg-[#0a0a0a] border-b border-[#141414] px-5 py-3 space-y-1.5">
          {[
            { label: "From", val: "CampaignPilot AI <hello@campaignpilot.ai>" },
            { label: "To", val: "your-subscriber-list@company.com" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-[9px] tracking-widest uppercase text-[#2a2520] w-6">
                {row.label}
              </span>
              <span className="text-xs text-[#4A4540] truncate">
                {row.val}
              </span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-[#080808] border-b border-[#0e0e0e] px-5 py-2 flex gap-4">
          {["↩ Reply", "→ Forward", "⊘ Archive", "★ Star"].map((a) => (
            <button key={a} className="text-[9px] text-[#2a2520]">
              {a}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="bg-[#0e0e0e] px-8 py-7">
          <div>{renderEmail(content.email_teaser)}</div>
        </div>
      </div>

      {/* Word count */}
      <p className="text-center text-[10px] text-[#2a2520]">
        {wordCount} words
      </p>
    </div>
  );
}