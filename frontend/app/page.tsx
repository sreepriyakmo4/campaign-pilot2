"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import type { Tone } from "@/lib/types";

const TONES: { value: Tone; label: string; sub: string }[] = [
  { value: "professional", label: "Professional", sub: "Authoritative" },
  { value: "casual",       label: "Casual",       sub: "Conversational" },
  { value: "bold",         label: "Bold",         sub: "High-energy"    },
  { value: "empathetic",   label: "Empathetic",   sub: "Human-centered" },
];

const SAMPLE = `SmartFit Pro – AI Fitness Assistant

SmartFit Pro is an AI-powered fitness companion designed to create personalized workout and nutrition plans based on your goals, body type, and daily routine. Unlike generic fitness apps, SmartFit Pro adapts in real time as your schedule, energy levels, and results change.

Key Features:
- Personalized AI workout plans updated weekly
- Nutrition tracking with macro and calorie goals
- Progress analytics with visual charts
- Integration with Apple Health and Google Fit
- 24/7 AI coach available via chat

Target audience: fitness enthusiasts aged 18-45 who want data-driven results without a personal trainer. Available on iOS and Android.`;

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [text, setText]             = useState("");
  const [url, setUrl]               = useState("");
  const [tone, setTone]             = useState<Tone>("professional");
  const [scraping, setScraping]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<"text" | "url" | "file">("text");
  const [dragOver, setDragOver]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (status === "loading") return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-5 h-5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (status === "unauthenticated") { router.replace("/login"); return null; }

  const handleScrapeUrl = async () => {
    if (!url.trim()) return;
    setScraping(true); setError(null);
    try {
      const res  = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scrape failed");
      setText(data.text);
      setActiveInput("text");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setScraping(false); }
  };

  const handleFile = (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File too large. Max 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target?.result as string || "");
      setActiveInput("text");
    };
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    if (!text.trim()) { setError("Please add some source material first."); return; }
    sessionStorage.setItem("campaignSource", text.trim());
    sessionStorage.setItem("campaignTone", tone);
    router.push("/agent-room");
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8]">
      {/* Nav */}
      <nav className="border-b border-[#141414] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-[#C9A84C]/40 rotate-45 flex items-center justify-center">
            <span className="text-[#C9A84C] text-xs font-bold rotate-[-45deg]" style={{fontFamily:"'Playfair Display',serif"}}>CP</span>
          </div>
          <span className="font-semibold text-sm" style={{fontFamily:"'Playfair Display',serif"}}>CampaignPilot</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#4A4540] hidden sm:block">AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/history")} className="text-xs tracking-widest uppercase text-[#9A9080] hover:text-[#C9A84C] transition-colors flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            History
          </button>
          <div className="h-3 w-px bg-[#242424]" />
          <div className="flex items-center gap-2">
            {session?.user?.image && <Image src={session.user.image} alt="" width={24} height={24} className="rounded-full" />}
            <span className="text-xs text-[#9A9080] hidden sm:block">{session?.user?.name?.split(" ")[0]}</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs tracking-widest uppercase text-[#4A4540] hover:text-[#C9A84C] transition-colors ml-1">Exit</button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C9A84C]/30" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C]/60">Autonomous Content Factory</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C9A84C]/30" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-[#F5F0E8] mb-4 leading-none" style={{fontFamily:"'Playfair Display',serif"}}>
            One brief.<br />
            <span style={{background:"linear-gradient(135deg,#8B6E2E,#C9A84C,#E8C97A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Three channels.</span>
          </h1>
          <p className="text-[#9A9080] text-base max-w-lg mx-auto leading-relaxed">
            Three specialized AI agents collaborate live to produce a complete, fact-checked marketing campaign from any source document.
          </p>
          {/* Agent flow */}
          <div className="flex items-center justify-center mt-7">
            {[{icon:"◈",label:"Research"},{icon:"◇",label:"Copywriter"},{icon:"◉",label:"Editor"}].map((a,i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center px-4">
                  <span className="text-xl text-[#C9A84C]/30 mb-1">{a.icon}</span>
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[#4A4540]">{a.label}</span>
                </div>
                {i < 2 && <span className="text-[#C9A84C]/20 text-sm mx-1">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-7 relative">
          {["-top-px -left-px border-t border-l","-top-px -right-px border-t border-r","-bottom-px -left-px border-b border-l","-bottom-px -right-px border-b border-r"].map((cls,i) => (
            <div key={i} className={`absolute ${cls} w-5 h-5 border-[#C9A84C]/25`} />
          ))}

          {/* Input mode tabs */}
          <div className="flex gap-1 mb-5 bg-[#0a0a0a] border border-[#141414] p-1 w-fit">
            {[{id:"text" as const,label:"Paste Text",icon:"✎"},{id:"url" as const,label:"From URL",icon:"⊕"},{id:"file" as const,label:"Upload File",icon:"⊞"}].map(tab => (
              <button key={tab.id} onClick={() => setActiveInput(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase transition-all ${activeInput===tab.id ? "bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20" : "text-[#4A4540] hover:text-[#9A9080]"}`}>
                <span>{tab.icon}</span><span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* URL input */}
          {activeInput === "url" && (
            <div className="mb-5">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#4A4540] mb-2">Website URL</label>
              <div className="flex gap-2">
                <input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com/product-page"
                  className="flex-1 luxury-input px-4 py-3 text-sm" onKeyDown={e=>e.key==="Enter"&&handleScrapeUrl()} />
                <button onClick={handleScrapeUrl} disabled={scraping||!url.trim()} className="btn-gold px-5 py-3 text-[10px] tracking-widest disabled:opacity-50">
                  {scraping ? <div className="w-3.5 h-3.5 border border-black border-t-transparent rounded-full animate-spin" /> : "Fetch"}
                </button>
              </div>
            </div>
          )}

          {/* File drop zone */}
          {activeInput === "file" && (
            <div className="mb-5">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#4A4540] mb-2">Upload Document (.txt, .md)</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-none p-10 text-center cursor-pointer transition-all ${dragOver ? "border-[#C9A84C]/60 bg-[#C9A84C]/5" : "border-[#1a1a1a] hover:border-[#2a2520]"}`}
              >
                <div className="text-3xl text-[#2a2520] mb-2">⊞</div>
                <p className="text-xs text-[#4A4540]">Drop a .txt or .md file here, or click to browse</p>
                <p className="text-[10px] text-[#2a2520] mt-1">Max 5MB</p>
                <input ref={fileRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              {text && <p className="text-[10px] text-emerald-600 mt-2">✓ File loaded — {text.split(/\s+/).length} words</p>}
            </div>
          )}

          {/* Text area */}
          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <label className="text-[10px] tracking-[0.2em] uppercase text-[#4A4540]">
                {activeInput==="url"&&text ? "Extracted Content" : activeInput==="file"&&text ? "File Content" : "Source Material"}
              </label>
              <button onClick={() => setText(SAMPLE)} className="text-[10px] tracking-widest uppercase text-[#4A4540] hover:text-[#C9A84C] transition-colors">Load Sample ↗</button>
            </div>
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder="Paste your product brief, press release, blog post, or any source document here…"
              rows={9} className="w-full luxury-input px-4 py-3.5 text-sm leading-relaxed resize-none" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[#2a2520]">{text.length} chars</span>
              {text.trim() && <span className="text-[10px] text-[#2a2520]">~{text.trim().split(/\s+/).length} words</span>}
            </div>
          </div>

          {/* Tone */}
          <div className="mb-6">
            <label className="block text-[10px] tracking-[0.2em] uppercase text-[#4A4540] mb-3">Campaign Tone</label>
            <div className="grid grid-cols-4 gap-2">
              {TONES.map(t => (
                <button key={t.value} onClick={() => setTone(t.value)}
                  className={`relative p-3 border text-left transition-all ${tone===t.value ? "border-[#C9A84C]/50 bg-[#C9A84C]/5" : "border-[#1a1a1a] hover:border-[#2a2520]"}`}>
                  {tone===t.value && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />}
                  <div className={`text-xs font-semibold mb-0.5 ${tone===t.value ? "text-[#C9A84C]" : "text-[#F5F0E8]"}`}>{t.label}</div>
                  <div className="text-[10px] text-[#4A4540]">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="mb-4 border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">{error}</div>}

          <button onClick={handleGenerate} disabled={!text.trim()}
            className="btn-gold w-full py-4 flex items-center justify-center gap-3 text-xs tracking-widest uppercase disabled:opacity-40">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Launch Agent Room
          </button>
        </div>

        {/* Output types */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[{icon:"◈",label:"Blog Post",desc:"~500 words"},{icon:"◇",label:"Social Thread",desc:"5 posts"},{icon:"◉",label:"Email Draft",desc:"Full template"}].map(o => (
            <div key={o.label} className="border border-[#141414] p-3 text-center">
              <span className="text-[#C9A84C]/30 text-base block mb-1">{o.icon}</span>
              <div className="text-xs text-[#9A9080]">{o.label}</div>
              <div className="text-[10px] text-[#4A4540]">{o.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
