"use client";
import type { GeneratedContent, ChannelReview } from "@/lib/types";

interface Props {
  content: GeneratedContent;
  review: ChannelReview;
  onRegenerate: () => void;
  regenerating: boolean;
}

function renderBlog(text: string) {
  return text.split(/\n\n+/).map((para, i) => {
    const html = para.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
    return <p key={i} className="text-[#9A9080] leading-relaxed text-sm mb-4 last:mb-0" dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

function RegenButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase disabled:opacity-40">
      {loading ? <div className="w-3 h-3 border border-[#4A4540] border-t-transparent rounded-full animate-spin" /> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
      {loading ? "Regenerating" : "Regenerate"}
    </button>
  );
}

export default function BlogPreview({ content, review, onRegenerate, regenerating }: Props) {
  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between px-4 py-2.5 border ${review.approved ? "border-emerald-900/40 bg-emerald-950/10" : "border-red-900/40 bg-red-950/10"}`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] tracking-widest uppercase font-semibold ${review.approved ? "text-emerald-500" : "text-red-500"}`}>
            {review.approved ? "✓ Approved" : "✗ Needs Revision"}
          </span>
          {!review.approved && review.correction_note && (
            <span className="text-[10px] text-red-400/60 hidden sm:block">— {review.correction_note}</span>
          )}
        </div>
        <RegenButton onClick={onRegenerate} loading={regenerating} />
      </div>

      {!review.approved && review.issues.length > 0 && (
        <div className="border border-red-900/30 bg-red-950/10 p-3">
          <div className="text-[9px] tracking-widest uppercase text-red-500 mb-2">Editor Issues</div>
          {review.issues.map((issue, i) => <p key={i} className="text-xs text-red-400/70">• {issue}</p>)}
        </div>
      )}

      <div className="border border-[#141414] p-8">
        <div className="max-w-prose mx-auto">
          <h1 className="text-xl font-bold text-[#F5F0E8] mb-2 leading-tight" style={{fontFamily:"'Playfair Display',serif"}}>{content.blog_title}</h1>
          <div className="h-px w-12 bg-[#C9A84C]/40 mb-6" />
          {renderBlog(content.blog)}
        </div>
      </div>
    </div>
  );
}
