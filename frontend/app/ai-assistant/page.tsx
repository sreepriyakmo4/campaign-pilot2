"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getUserCampaigns, type DBCampaignSummary } from "@/lib/db-api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ConvSummary {
  id: string;
  campaignId: string | null;
  lastMessage: string | null;
  messageCount: number;
  updatedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const QUICK_PROMPTS = [
  "Improve the blog intro",
  "Make this more casual",
  "Convert thread to LinkedIn",
  "Fix tone inconsistencies",
  "Write 3 headline variants",
  "Make the email subject punchier",
  "Summarize the key messages",
  "What are the SEO strengths?",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function AIAssistantPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages]             = useState<Message[]>([]);
  const [input, setInput]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaigns, setCampaigns]           = useState<DBCampaignSummary[]>([]);
  const [history, setHistory]               = useState<ConvSummary[]>([]);
  const [showHistory, setShowHistory]       = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [copied, setCopied]                 = useState<number | null>(null);

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const dbUserId = (session?.user as any)?.dbUserId as string | null;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (dbUserId) {
      loadCampaigns();
      loadHistory();
    }
  }, [dbUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadCampaigns = async () => {
    if (!dbUserId) return;
    try {
      const data = await getUserCampaigns(dbUserId);
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaign) setSelectedCampaign(data[0].id);
    } catch (e) { console.error("Failed to load campaigns:", e); }
  };

  const loadHistory = async () => {
    if (!dbUserId) return;
    try {
      const res = await fetch(`${API_BASE}/api/assistant/history?userId=${dbUserId}`);
      if (res.ok) setHistory(await res.json());
    } catch (e) { console.error("Failed to load history:", e); }
  };

  const loadConversation = async (convId: string) => {
    if (!dbUserId) return;
    try {
      const res = await fetch(`${API_BASE}/api/assistant/history/${convId}?userId=${dbUserId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages.map((m: any) => ({
        role: m.role, content: m.content, timestamp: m.timestamp,
      })));
      setConversationId(convId);
      if (data.campaignId) setSelectedCampaign(data.campaignId);
      setShowHistory(false);
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !dbUserId) return;

    const userMsg: Message = { role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:         dbUserId,
          message:        text.trim(),
          campaignId:     selectedCampaign,
          conversationId: conversationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");

      setConversationId(data.conversationId);
      setMessages(prev => [...prev, {
        role: "assistant", content: data.reply, timestamp: new Date().toISOString(),
      }]);
      loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get response");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  const copyMessage = async (content: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const deleteConversation = async (convId: string) => {
    if (!dbUserId) return;
    try {
      await fetch(`${API_BASE}/api/assistant/history/${convId}?userId=${dbUserId}`, { method: "DELETE" });
      setHistory(prev => prev.filter(h => h.id !== convId));
      if (conversationId === convId) startNewChat();
    } catch (e) { console.error(e); }
  };

  if (status === "loading") return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-5 h-5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const selectedCampaignName =
    campaigns.find(c => c.id === selectedCampaign)?.productName ||
    campaigns.find(c => c.id === selectedCampaign)?.blogTitle ||
    "Campaign";

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#141414] px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-sm flex-shrink-0">
        <button onClick={() => router.push("/")} className="text-xs tracking-widest uppercase text-[#9A9080] hover:text-[#C9A84C] transition-colors flex items-center gap-2">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border border-[#C9A84C]/40 rotate-45 flex items-center justify-center">
            <span className="text-[#C9A84C] text-[9px] font-bold rotate-[-45deg]" style={{ fontFamily: "'Playfair Display',serif" }}>CP</span>
          </div>
          <span className="text-sm font-semibold" style={{ fontFamily: "'Playfair Display',serif" }}>AI Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(s => !s)}
            className={`text-[10px] tracking-widest uppercase btn-ghost px-3 py-1.5 ${showHistory ? "border-[#C9A84C]/40 text-[#C9A84C]" : ""}`}>
            History
          </button>
          <button onClick={() => router.push("/dashboard")} className="text-[10px] tracking-widest uppercase btn-ghost px-3 py-1.5">
            Dashboard
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 py-4 gap-4" style={{ height: "calc(100vh - 65px)" }}>
        {/* History sidebar */}
        {showHistory && (
          <div className="w-72 flex-shrink-0 bg-[#0e0e0e] border border-[#1a1a1a] flex flex-col animate-fade-in">
            <div className="px-4 py-3 border-b border-[#141414] flex items-center justify-between">
              <span className="text-[10px] tracking-widest uppercase text-[#4A4540]">Past Conversations</span>
              <button onClick={startNewChat} className="text-[10px] tracking-widest uppercase text-[#C9A84C] hover:text-[#C9A84C]/70">
                + New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {history.length === 0 && <p className="text-[11px] text-[#2a2520] text-center py-6">No conversations yet.</p>}
              {history.map(h => (
                <div key={h.id}
                  className={`group p-3 border cursor-pointer transition-all ${conversationId === h.id ? "border-[#C9A84C]/30 bg-[#C9A84C]/3" : "border-transparent hover:border-[#1a1a1a]"}`}
                  onClick={() => loadConversation(h.id)}>
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[11px] text-[#9A9080] leading-snug line-clamp-2 flex-1">
                      {h.lastMessage || "Empty conversation"}
                    </p>
                    <button onClick={e => { e.stopPropagation(); deleteConversation(h.id); }}
                      className="text-[10px] text-[#2a2520] hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-[#2a2520]">{h.messageCount} messages</span>
                    <span className="text-[9px] text-[#2a2520]">{new Date(h.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main chat */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0e0e0e] border border-[#1a1a1a]">
          {/* Campaign context selector */}
          <div className="px-5 py-3 border-b border-[#141414] flex items-center gap-3 flex-wrap flex-shrink-0">
            <span className="text-[9px] tracking-widest uppercase text-[#4A4540]">Context:</span>
            <select value={selectedCampaign || ""} onChange={e => setSelectedCampaign(e.target.value || null)}
              className="flex-1 max-w-xs bg-[#0a0a0a] border border-[#1a1a1a] text-[#9A9080] text-xs px-3 py-1.5 focus:outline-none focus:border-[#C9A84C]/40">
              <option value="">No campaign (general mode)</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.productName || c.blogTitle || `Campaign ${c.id.slice(-6)}`}
                </option>
              ))}
            </select>
            {selectedCampaign && (
              <span className="text-[10px] text-[#C9A84C]/60 tracking-widest">✦ {selectedCampaignName}</span>
            )}
            <button onClick={startNewChat} className="ml-auto text-[10px] tracking-widest uppercase text-[#4A4540] hover:text-[#C9A84C] transition-colors">
              + New Chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center py-8">
                  <div className="text-4xl text-[#C9A84C]/20 mb-3">✦</div>
                  <h2 className="text-lg font-bold text-[#F5F0E8] mb-1" style={{ fontFamily: "'Playfair Display',serif" }}>
                    Campaign AI Assistant
                  </h2>
                  <p className="text-xs text-[#4A4540] max-w-sm mx-auto leading-relaxed">
                    I have full context of your campaigns. Ask me to improve copy, change tone, suggest headlines, or analyze content.
                  </p>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540] text-center mb-3">Quick prompts</div>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((p, i) => (
                      <button key={i} onClick={() => sendMessage(p)}
                        className="text-left px-3 py-2 border border-[#1a1a1a] hover:border-[#C9A84C]/30 text-[11px] text-[#4A4540] hover:text-[#C9A84C] transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={`max-w-[80%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="text-[9px] tracking-widest uppercase text-[#C9A84C]/50 mb-1 flex items-center gap-1">
                      <span>✦</span><span>Assistant</span>
                    </div>
                  )}
                  <div className={`px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#F5F0E8]"
                      : "bg-[#0a0a0a] border border-[#1a1a1a] text-[#9A9080]"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {msg.timestamp && <span className="text-[9px] text-[#2a2520]">{formatTime(msg.timestamp)}</span>}
                    {msg.role === "assistant" && (
                      <button onClick={() => copyMessage(msg.content, i)}
                        className="text-[9px] tracking-widest uppercase text-[#2a2520] hover:text-[#C9A84C] transition-colors">
                        {copied === i ? "✓ Copied" : "⊕ Copy"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/40 animate-bounce"
                        style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="border border-red-900/40 bg-red-950/10 px-4 py-2 text-xs text-red-400 animate-fade-in">
                ⚠ {error}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#141414] p-4 flex-shrink-0">
            <div className="flex gap-3 items-end">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask anything about your campaign… (Enter to send, Shift+Enter for newline)"
                rows={2} className="flex-1 luxury-input px-4 py-3 text-sm resize-none" />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                className="btn-gold px-5 py-3 text-[10px] tracking-widest uppercase disabled:opacity-40 flex-shrink-0">
                {loading ? <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : "Send"}
              </button>
            </div>
            <p className="text-[9px] text-[#2a2520] mt-2 text-center">
              Conversations are saved automatically · Select a campaign above for context-aware answers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}