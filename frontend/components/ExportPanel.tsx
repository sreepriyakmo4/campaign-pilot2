"use client";
import { useState } from "react";
import type { FactSheet, GeneratedContent, ReviewResult } from "@/lib/types";
import { exportCampaign } from "@/lib/api";

interface Props { factSheet: FactSheet; content: GeneratedContent; review: ReviewResult; }

const FILES = [
  { icon: "◆", name: "fact_sheet.json",   desc: "Extracted facts & key messages" },
  { icon: "◈", name: "blog.md",            desc: "Full blog post in Markdown" },
  { icon: "◇", name: "thread.txt",         desc: "5-post social thread" },
  { icon: "◉", name: "email.txt",          desc: "Email teaser copy" },
  { icon: "◎", name: "review_report.json", desc: "Editorial review & notes" },
];

export default function ExportPanel({ factSheet, content, review }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW STATE
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    setLoading(true); setError(null); setDone(false);
    try {
      const blob = await exportCampaign(factSheet, content, review);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "campaign.zip"; a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW FUNCTION
  const handleCopyAll = async () => {
    try {
      const text = `
BLOG: ${content.blog_title}

${content.blog}

SOCIAL THREAD:
${content.thread.map((p, i) => `${i + 1}. ${p}`).join("\n")}

EMAIL:
${content.email_teaser}
      `.trim();

      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Clipboard failed:", err);
      setError("Copy failed");
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#9A9080] leading-relaxed">
        Download your complete campaign as a ZIP archive. All assets are structured and ready for your CMS, email platform, or social scheduler.
      </p>

      {/* File list */}
      <div className="border border-[#1a1a1a] divide-y divide-[#141414]">
        {FILES.map((f) => (
          <div key={f.name} className="flex items-center gap-4 px-5 py-3.5">
            <span className="text-[#C9A84C]/30 text-base">{f.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-[#9A9080]">{f.name}</div>
              <div className="text-[10px] text-[#4A4540]">{f.desc}</div>
            </div>
            <span className="text-[10px] text-emerald-600">✓ Ready</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="border border-red-900/40 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ✅ EXPORT BUTTON */}
      <button
        onClick={handleExport}
        disabled={loading}
        className={`w-full py-4 flex items-center justify-center gap-3 text-xs tracking-widest uppercase transition-all ${
          done
            ? "bg-emerald-950/40 border border-emerald-900/40 text-emerald-500"
            : "btn-gold"
        }`}
      >
        {done ? (
          <>✓ Downloaded</>
        ) : loading ? (
          <>
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Packaging…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Campaign ZIP
          </>
        )}
      </button>

      {/* ✅ NEW COPY BUTTON */}
      <button
        onClick={handleCopyAll}
        className={`w-full py-3 flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase border transition-all ${
          copied
            ? "border-emerald-900/40 text-emerald-500"
            : "btn-ghost"
        }`}
      >
        {copied ? "✓ Copied to Clipboard" : "⊕ Copy All to Clipboard"}
      </button>
    </div>
  );
}