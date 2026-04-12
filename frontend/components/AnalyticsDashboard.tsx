"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  readabilityScore: number;
  seoScore: number;
  sentimentScore: number;
  sentimentLabel: string;
  toneConsistency: number;
  wordCount: number;
  blogWordCount: number;
  emailWordCount: number;
  threadPostCount: number;
  topKeywords: string[];
}

interface Props {
  campaignId: string;
  userId: string;
  versionId?: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SCORE_CARDS = [
  { key: "readabilityScore" as const, label: "Readability",       icon: "◈", desc: "How easy the content is to read",           good: 60, warn: 40 },
  { key: "seoScore"         as const, label: "SEO Score",         icon: "◇", desc: "Presence of power words and structure",     good: 60, warn: 40 },
  { key: "toneConsistency"  as const, label: "Tone Consistency",  icon: "◉", desc: "How well tone matches your selection",      good: 60, warn: 40 },
  { key: "sentimentScore"   as const, label: "Sentiment",         icon: "◆", desc: "Overall emotional tone of the content",     good: 60, warn: 35 },
];

function scoreColor(score: number, good: number, warn: number) {
  if (score >= good) return "#4A8A4A";
  if (score >= warn) return "#C9A84C";
  return "#8A2A2A";
}

function scoreLabel(score: number, good: number, warn: number) {
  if (score >= good) return "Good";
  if (score >= warn) return "Fair";
  return "Needs work";
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function SentimentBadge({ label }: { label: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    positive: { color: "#4A8A4A", bg: "#0a1a0a" },
    neutral:  { color: "#C9A84C", bg: "#1a1505" },
    negative: { color: "#8A2A2A", bg: "#1a0a0a" },
  };
  const c = config[label] || config.neutral;
  return (
    <span className="text-[9px] tracking-widest uppercase px-2 py-0.5 border"
      style={{ color: c.color, background: c.bg, borderColor: c.color + "40" }}>
      {label}
    </span>
  );
}

export default function AnalyticsDashboard({ campaignId, userId, versionId }: Props) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (campaignId && userId) fetchAnalytics();
  }, [campaignId, userId, versionId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ userId });
      if (versionId) params.set("versionId", versionId);
      const res = await fetch(`${API_BASE}/api/db/campaigns/${campaignId}/analytics?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnalytics(data.analytics);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] tracking-widest uppercase text-[#4A4540]">Analyzing content…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="border border-red-900/40 bg-red-950/10 p-4 text-sm text-red-400">
      ⚠ {error}
      <button onClick={fetchAnalytics} className="ml-3 underline text-red-300 text-xs">Retry</button>
    </div>
  );

  if (!analytics) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[#141414]" />
        <span className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540]">Content Analytics</span>
        <div className="h-px flex-1 bg-[#141414]" />
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-3">
        {SCORE_CARDS.map(card => {
          const score  = analytics[card.key];
          const color  = scoreColor(score, card.good, card.warn);
          const status = scoreLabel(score, card.good, card.warn);
          return (
            <div key={card.key} className="bg-[#0a0a0a] border border-[#1a1a1a] p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-[#C9A84C]/40 text-base">{card.icon}</span>
                  <div className="text-xs font-semibold text-[#F5F0E8] mt-1">{card.label}</div>
                  <div className="text-[10px] text-[#4A4540]">{card.desc}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color, fontFamily: "'Playfair Display',serif" }}>{score}</div>
                  <div className="text-[9px] tracking-widest uppercase" style={{ color }}>{status}</div>
                </div>
              </div>
              <ProgressBar value={score} color={color} />
              {card.key === "sentimentScore" && (
                <div className="mt-2"><SentimentBadge label={analytics.sentimentLabel} /></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Word counts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Words",  value: analytics.wordCount },
          { label: "Blog Words",   value: analytics.blogWordCount },
          { label: "Email Words",  value: analytics.emailWordCount },
        ].map(stat => (
          <div key={stat.label} className="border border-[#1a1a1a] p-3 text-center">
            <div className="text-xl font-bold text-[#C9A84C]" style={{ fontFamily: "'Playfair Display',serif" }}>{stat.value}</div>
            <div className="text-[10px] tracking-widest uppercase text-[#4A4540] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Top keywords */}
      {analytics.topKeywords.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4">
          <div className="text-[9px] tracking-[0.2em] uppercase text-[#4A4540] mb-3">Top Keywords</div>
          <div className="flex flex-wrap gap-2">
            {analytics.topKeywords.map((kw, i) => (
              <span key={i} className="text-[11px] px-2 py-1 border border-[#C9A84C]/20 text-[#C9A84C]/70">{kw}</span>
            ))}
          </div>
        </div>
      )}

      <button onClick={fetchAnalytics} className="w-full py-2.5 btn-ghost text-[10px] tracking-widest uppercase flex items-center justify-center gap-2">
        ↺ Refresh Analytics
      </button>
    </div>
  );
}