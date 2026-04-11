"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import CampaignAssistant from "@/components/CampaignAssistant";
import { saveCampaignToDB } from "@/lib/db-api";   // ← NEW
import type {
  CampaignResponse,
  FactSheet,
  GeneratedContent,
  ReviewResult,
} from "@/lib/types";

type AgentStatus = "idle" | "thinking" | "done" | "error";
type DataTab = "facts" | "blog" | "thread" | "email" | "assistant";

interface ChatMessage {
  from: string;
  to: string;
  message: string;
  timestamp: string;
}

interface AgentState {
  research: AgentStatus;
  copywriter: AgentStatus;
  editor: AgentStatus;
}

const AGENT_META = {
  research:   { label: "Research Agent",   icon: "◈", role: "Analytical Brain",    color: "#7A9E9A" },
  copywriter: { label: "Copywriter Agent", icon: "◇", role: "Creative Voice",      color: "#9A7E9A" },
  editor:     { label: "Editor-in-Chief",  icon: "◉", role: "Quality Gatekeeper",  color: "#C9A84C" },
};

export default function AgentRoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sourceText, setSourceText]         = useState("");
  const [tone, setTone]                     = useState("professional");
  const [agentStatus, setAgentStatus]       = useState<AgentState>({ research: "idle", copywriter: "idle", editor: "idle" });
  const [agentMessages, setAgentMessages]   = useState<Record<string, string>>({ research: "", copywriter: "", editor: "" });
  const [chatLog, setChatLog]               = useState<ChatMessage[]>([]);
  const [running, setRunning]               = useState(false);
  const [done, setDone]                     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [result, setResult]                 = useState<CampaignResponse | null>(null);
  const [activeDataTab, setActiveDataTab]   = useState<DataTab>("facts");
  const [factSheet, setFactSheet]           = useState<FactSheet | null>(null);
  const [content, setContent]               = useState<GeneratedContent | null>(null);
  const [review, setReview]                 = useState<ReviewResult | null>(null);
  const [dbCampaignId, setDbCampaignId]     = useState<string | null>(null); // ← NEW

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    const src = sessionStorage.getItem("campaignSource");
    const t   = sessionStorage.getItem("campaignTone");
    if (src) setSourceText(src);
    if (t)   setTone(t);
  }, [status, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  const runAgents = async () => {
    const src = sourceText || sessionStorage.getItem("campaignSource") || "";
    if (!src.trim()) { router.replace("/"); return; }

    setRunning(true); setDone(false); setError(null);
    setChatLog([]); setFactSheet(null); setContent(null);
    setReview(null); setResult(null); setDbCampaignId(null);
    setActiveDataTab("facts");
    setAgentStatus({ research: "idle", copywriter: "idle", editor: "idle" });
    setAgentMessages({ research: "", copywriter: "", editor: "" });

    abortRef.current = new AbortController();

    try {
      const res = await fetch("http://localhost:8000/api/stream-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_text: src, tone }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            handleEvent(evt);
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Stream failed");
      }
    } finally {
      setRunning(false);
    }
  };

  // ------------------------------------------------------------------
  // NEW: save campaign to MongoDB once agents are done
  // ------------------------------------------------------------------
  const persistCampaign = async (full: CampaignResponse, src: string, t: string) => {
    const dbUserId = (session?.user as any)?.dbUserId;
    if (!dbUserId) {
      // Not logged in yet or session hasn't loaded — skip DB save
      console.warn("[AgentRoom] No dbUserId in session, skipping DB save.");
      return;
    }
    try {
      const saved = await saveCampaignToDB({ userId: dbUserId, sourceText: src, tone: t, campaign: full });
      setDbCampaignId(saved.id);
      // Store the DB id so dashboard can use it for future updates
      sessionStorage.setItem("dbCampaignId", saved.id);
      sessionStorage.setItem("dbUserId", dbUserId);
      console.info("[AgentRoom] Campaign saved to DB:", saved.id);
    } catch (err) {
      console.error("[AgentRoom] Failed to save campaign to DB:", err);
      // Non-fatal — the campaign still works locally
    }
  };

  const handleEvent = (evt: Record<string, unknown>) => {
    switch (evt.type) {
      case "agent_status": {
        const agent = evt.agent as string;
        const s     = evt.status as AgentStatus;
        const msg   = evt.message as string;
        setAgentStatus(prev  => ({ ...prev, [agent]: s }));
        setAgentMessages(prev => ({ ...prev, [agent]: msg }));
        break;
      }
      case "chat": {
        const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setChatLog(prev => [...prev, { from: evt.from as string, to: evt.to as string, message: evt.message as string, timestamp: ts }]);
        break;
      }
      case "fact_sheet":
        setFactSheet(evt.data as FactSheet);
        setActiveDataTab("facts");
        break;
      case "content":
        setContent(evt.data as GeneratedContent);
        setActiveDataTab("blog");
        break;
      case "review":
        setReview(evt.data as ReviewResult);
        break;
      case "complete": {
        const r = evt as unknown as CampaignResponse & { type: string };
        const full: CampaignResponse = {
          fact_sheet:   r.fact_sheet,
          content:      r.content,
          review:       r.review,
          activity_log: r.activity_log,
        };
        setResult(full);
        const src = sourceText || sessionStorage.getItem("campaignSource") || "";
        const t   = tone || sessionStorage.getItem("campaignTone") || "professional";
        sessionStorage.setItem("campaignResult", JSON.stringify(full));
        sessionStorage.setItem("campaignSource", src);
        sessionStorage.setItem("campaignTone", t);
        setDone(true);
        // ← Save to MongoDB
        persistCampaign(full, src, t);
        break;
      }
      case "error":
        setError(evt.message as string);
        break;
    }
  };

  useEffect(() => {
    runAgents();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusDot   = (s: AgentStatus) => s === "idle" ? "bg-[#2a2520]" : s === "thinking" ? "bg-[#C9A84C] animate-pulse" : s === "done" ? "bg-emerald-500" : "bg-red-500";
  const statusLabel = (s: AgentStatus) => s === "idle" ? "Idle" : s === "thinking" ? "Thinking…" : s === "done" ? "Done" : "Error";

  const campaignForAssistant = result || (factSheet && content && review ? { fact_sheet: factSheet, content, review, activity_log: [] } : null);

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8]">
      {/* Nav */}
      <nav className="border-b border-[#141414] px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-sm">
        <button onClick={() => router.push("/")} className="text-xs tracking-widest uppercase text-[#9A9080] hover:text-[#C9A84C] transition-colors flex items-center gap-2">
          ← New Campaign
        </button>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border border-[#C9A84C]/40 rotate-45 flex items-center justify-center">
            <span className="text-[#C9A84C] text-[9px] font-bold rotate-[-45deg]" style={{ fontFamily: "'Playfair Display',serif" }}>CP</span>
          </div>
          <span className="text-sm font-semibold hidden sm:block" style={{ fontFamily: "'Playfair Display',serif" }}>Agent Room</span>
        </div>
        {done ? (
          <button onClick={() => router.push("/dashboard")} className="btn-gold px-4 py-2 text-[10px] tracking-widest uppercase">
            View Campaign →
          </button>
        ) : (
          <div className="w-32" />
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Agent pipeline */}
            <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px flex-1 bg-[#141414]" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540]">Agent Pipeline</span>
                <div className="h-px flex-1 bg-[#141414]" />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-0">
                {(["research", "copywriter", "editor"] as const).map((key, i) => {
                  const meta = AGENT_META[key];
                  const st   = agentStatus[key];
                  const msg  = agentMessages[key];
                  return (
                    <div key={key} className="flex flex-col sm:flex-row items-center">
                      <div className={`relative w-52 p-5 border transition-all duration-700 ${st === "thinking" ? "border-[#C9A84C]/40 bg-[#C9A84C]/3 shadow-lg shadow-[#C9A84C]/5" : st === "done" ? "border-emerald-900/40 bg-emerald-950/10" : st === "error" ? "border-red-900/40 bg-red-950/10" : "border-[#1a1a1a]"}`}>
                        {st === "thinking" && (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9A84C]/5 to-transparent animate-shimmer" />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl" style={{ color: meta.color + (st === "idle" ? "30" : "80") }}>{meta.icon}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${statusDot(st)}`} />
                            <span className="text-[9px] tracking-widest uppercase text-[#4A4540]">{statusLabel(st)}</span>
                          </div>
                        </div>
                        <div className="font-semibold text-sm text-[#F5F0E8] mb-0.5" style={{ fontFamily: "'Playfair Display',serif" }}>{meta.label}</div>
                        <div className="text-[10px] text-[#4A4540] mb-2">{meta.role}</div>
                        {msg && <div className="text-[10px] text-[#9A9080] italic leading-snug">{msg}</div>}
                        {st === "thinking" && (
                          <div className="flex gap-1 mt-2">
                            {[0,1,2].map(d => <span key={d} className="w-1 h-1 rounded-full bg-[#C9A84C]/60 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
                          </div>
                        )}
                      </div>
                      {i < 2 && (
                        <div className="flex sm:flex-row flex-col items-center mx-3 my-2 sm:my-0">
                          <div className={`transition-all duration-500 ${(i === 0 && (agentStatus.copywriter !== "idle" || agentStatus.editor !== "idle")) || (i === 1 && agentStatus.editor !== "idle") ? "text-[#C9A84C]/60" : "text-[#1a1a1a]"} text-lg sm:text-base`}>
                            <span className="hidden sm:block">→</span>
                            <span className="block sm:hidden">↓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {done && (
                <div className="mt-5 border border-emerald-900/40 bg-emerald-950/10 p-3 text-center animate-fade-in">
                  <span className="text-xs tracking-widest uppercase text-emerald-500">
                    ✓ Campaign complete{dbCampaignId ? " — saved to database" : " — agents finished"}
                  </span>
                </div>
              )}
              {error && (
                <div className="mt-5 border border-red-900/40 bg-red-950/10 p-3 text-center">
                  <span className="text-xs text-red-400">⚠ {error}</span>
                </div>
              )}
            </div>

            {/* Live data tabs */}
            {(factSheet || content || campaignForAssistant) && (
              <div className="bg-[#0e0e0e] border border-[#1a1a1a]">
                <div className="flex border-b border-[#141414] bg-[#0a0a0a] flex-wrap">
                  {[
                    { id: "facts" as const,     label: "Fact Sheet",     icon: "◆", show: !!factSheet },
                    { id: "blog" as const,      label: "Blog",           icon: "◈", show: !!content },
                    { id: "thread" as const,    label: "Thread",         icon: "◇", show: !!content },
                    { id: "email" as const,     label: "Email",          icon: "◉", show: !!content },
                    { id: "assistant" as const, label: "AI Assistant ✦", icon: "✦", show: !!campaignForAssistant },
                  ].filter(t => t.show).map(tab => (
                    <button key={tab.id} onClick={() => setActiveDataTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-[10px] tracking-widest uppercase transition-all ${activeDataTab === tab.id ? "text-[#C9A84C] border-b border-[#C9A84C]" : "text-[#4A4540] hover:text-[#9A9080]"}`}>
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
                <div className="p-5 max-h-[32rem] overflow-y-auto">
                  {activeDataTab === "facts" && factSheet && (
                    <div className="space-y-3">
                      {factSheet.product_name && (
                        <div>
                          <span className="text-[9px] tracking-widest uppercase text-[#4A4540]">Product</span>
                          <p className="text-sm text-[#C9A84C] mt-1" style={{ fontFamily: "'Playfair Display',serif" }}>{factSheet.product_name}</p>
                        </div>
                      )}
                      {factSheet.value_proposition && (
                        <div>
                          <span className="text-[9px] tracking-widest uppercase text-[#4A4540]">Value Proposition</span>
                          <p className="text-xs text-[#9A9080] mt-1 italic">"{factSheet.value_proposition}"</p>
                        </div>
                      )}
                      {factSheet.core_features.length > 0 && (
                        <div>
                          <span className="text-[9px] tracking-widest uppercase text-[#4A4540]">Core Features</span>
                          <ul className="mt-1 space-y-1">
                            {factSheet.core_features.map((f, i) => (
                              <li key={i} className="text-xs text-[#9A9080] flex gap-2"><span className="text-[#C9A84C]/40">•</span>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {activeDataTab === "blog" && content && (
                    <div>
                      <h3 className="text-base font-bold text-[#F5F0E8] mb-3" style={{ fontFamily: "'Playfair Display',serif" }}>{content.blog_title}</h3>
                      <div className="text-xs text-[#9A9080] leading-relaxed whitespace-pre-wrap">{content.blog.slice(0, 600)}…</div>
                    </div>
                  )}
                  {activeDataTab === "thread" && content && (
                    <div className="space-y-3">
                      {content.thread.map((post, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-[10px] text-[#C9A84C]/40 font-mono mt-0.5">{i + 1}</span>
                          <p className="text-xs text-[#9A9080] leading-relaxed">{post}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeDataTab === "email" && content && (
                    <div className="text-xs text-[#9A9080] leading-relaxed whitespace-pre-wrap">{content.email_teaser.slice(0, 500)}</div>
                  )}
                  {activeDataTab === "assistant" && campaignForAssistant && (
                    <CampaignAssistant campaign={campaignForAssistant} />
                  )}
                </div>
              </div>
            )}

            {/* Review results */}
            {review && (
              <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-5 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-[#141414]" />
                  <span className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540]">Editorial Review</span>
                  <div className="h-px flex-1 bg-[#141414]" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Blog",   r: review.blog_review },
                    { label: "Thread", r: review.thread_review },
                    { label: "Email",  r: review.email_review },
                  ].map(({ label, r }) => (
                    <div key={label} className={`p-3 border text-center ${r.approved ? "border-emerald-900/40 bg-emerald-950/10" : "border-red-900/40 bg-red-950/10"}`}>
                      <div className={`text-sm mb-1 ${r.approved ? "text-emerald-500" : "text-red-500"}`}>{r.approved ? "✓" : "✗"}</div>
                      <div className="text-[10px] tracking-widest uppercase text-[#4A4540]">{label}</div>
                      {!r.approved && r.correction_note && (
                        <p className="text-[9px] text-red-400/60 mt-1 leading-snug">{r.correction_note.slice(0, 60)}…</p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#9A9080] mt-3 text-center">{review.overall_summary}</p>
              </div>
            )}
          </div>

          {/* RIGHT — Live feed */}
          <div className="bg-[#0e0e0e] border border-[#1a1a1a] flex flex-col" style={{ height: "calc(100vh - 120px)", position: "sticky", top: "80px" }}>
            <div className="px-4 py-3 border-b border-[#141414] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#4A4540]">Live Agent Feed</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatLog.length === 0 && !running && (
                <div className="text-center py-8">
                  <div className="text-3xl text-[#1a1a1a] mb-2">◈</div>
                  <p className="text-[11px] text-[#2a2520]">Agent conversation will appear here.</p>
                </div>
              )}
              {running && chatLog.length === 0 && (
                <div className="flex items-center gap-2 text-[11px] text-[#4A4540]">
                  <div className="flex gap-1">{[0,1,2].map(d => <span key={d} className="w-1 h-1 rounded-full bg-[#C9A84C]/40 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>
                  Initializing agents…
                </div>
              )}
              {chatLog.map((msg, i) => {
                const fromColor = Object.values(AGENT_META).find(a => a.label === msg.from)?.color || "#4A4540";
                const isSystem  = msg.to === "Dashboard";
                return (
                  <div key={i} className={`animate-fade-in border-l-2 pl-3 py-1 ${isSystem ? "border-[#C9A84C]/40" : "border-[#2a2520]"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold tracking-wide" style={{ color: fromColor }}>{msg.from}</span>
                      <span className="text-[9px] text-[#2a2520]">→</span>
                      <span className="text-[9px] text-[#4A4540]">{msg.to}</span>
                      <span className="text-[9px] text-[#2a2520] ml-auto">{msg.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#9A9080] leading-snug">{msg.message}</p>
                  </div>
                );
              })}
              {running && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">{[0,1,2].map(d => <span key={d} className="w-1 h-1 rounded-full bg-[#C9A84C]/30 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>
                  <span className="text-[10px] text-[#2a2520]">
                    {agentStatus.editor === "thinking" ? "Editor reviewing…" : agentStatus.copywriter === "thinking" ? "Copywriter writing…" : agentStatus.research === "thinking" ? "Research agent working…" : "Processing…"}
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-[#141414] p-4">
              <div className="text-[9px] tracking-widest uppercase text-[#2a2520] mb-2">Source Material</div>
              <p className="text-[10px] text-[#4A4540] line-clamp-3 leading-relaxed">{sourceText}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}