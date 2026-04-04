"use client";

import { useState } from "react";
import type { Tone } from "@/lib/types";

interface Props {
  onSubmit: (sourceText: string, tone: Tone) => void;
  loading: boolean;
}

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Polished & authoritative" },
  { value: "casual", label: "Casual", desc: "Friendly & conversational" },
  { value: "bold", label: "Bold", desc: "Direct & high-energy" },
  { value: "empathetic", label: "Empathetic", desc: "Warm & human-centered" },
];

const SAMPLE_TEXT = `CampaignPilot AI is a multi-agent content generation platform built for marketing teams. It takes a source document and autonomously produces a coordinated multi-channel campaign through a three-stage AI pipeline.

The system uses three specialized agents:
1. A Research & Fact-Check Agent that extracts verified facts from source material
2. A Creative Copywriter Agent that generates a blog post, social media thread, and email teaser
3. An Editor-in-Chief Agent that reviews all outputs for accuracy, tone, and formatting

Key features include:
- Simultaneous generation of blog, social, and email content
- AI-powered editorial review with per-channel correction notes
- One-click ZIP export of all campaign assets
- Per-channel regeneration when outputs need revision

Built on Next.js 14 and FastAPI with an OpenAI-compatible API integration. Target users are marketing teams, content strategists, and growth marketers who need to move fast without sacrificing quality.`;

export default function SourceInput({ onSubmit, loading }: Props) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Tone>("professional");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), tone);
  };

  const loadSample = () => setText(SAMPLE_TEXT);

  return (
    <div className="space-y-6">
      {/* Tone selector */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide uppercase">
          Campaign Tone
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`relative p-3 rounded-xl border text-left transition-all duration-200 ${
                tone === t.value
                  ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
            >
              {tone === t.value && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-400" />
              )}
              <div className="font-semibold text-sm text-white">{t.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Source text */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-slate-300 tracking-wide uppercase">
            Source Material
          </label>
          <button
            onClick={loadSample}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
          >
            Load sample
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your product brief, press release, landing page copy, or any source material here..."
          rows={10}
          className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-sm leading-relaxed resize-none focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">{text.length} characters</span>
          <span className="text-xs text-slate-500">
            {text.trim() ? `~${Math.ceil(text.split(/\s+/).filter(Boolean).length)} words` : ""}
          </span>
        </div>
      </div>

      {/* URL placeholder */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">
          Or Scrape from URL{" "}
          <span className="text-xs font-normal text-slate-500 normal-case tracking-normal ml-1">
            (coming soon)
          </span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <input
            type="url"
            disabled
            placeholder="https://example.com/product-page"
            className="w-full bg-slate-900/40 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-500 placeholder-slate-600 text-sm cursor-not-allowed"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className={`w-full relative py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-300 ${
          loading || !text.trim()
            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
            : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Agents working...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Campaign
          </span>
        )}
      </button>
    </div>
  );
}
