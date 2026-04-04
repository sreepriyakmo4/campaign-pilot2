"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AgentCard from "@/components/AgentCard";
import ActivityFeed from "@/components/ActivityFeed";
import FactSheetPanel from "@/components/FactSheetPanel";
import BlogPreview from "@/components/BlogPreview";
import ThreadPreview from "@/components/ThreadPreview";
import EmailPreview from "@/components/EmailPreview";
import ReviewPanel from "@/components/ReviewPanel";
import ExportPanel from "@/components/ExportPanel";
import type { CampaignResponse, Channel, ActivityLogItem } from "@/lib/types";
import { regenerateChannel } from "@/lib/api";
import { saveToHistory } from "@/lib/history";

type Tab = "blog" | "thread" | "email" | "facts" | "review" | "export";

function getAgentStatus(log: ActivityLogItem[], agentName: string) {
  const items = log.filter(l => l.agent === agentName);
  if (!items.length) return "idle" as const;
  return items[items.length - 1].status as "idle"|"running"|"success"|"error"|"warning";
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  const [campaign, setCampaign]       = useState<CampaignResponse | null>(null);
  const [sourceText, setSourceText]   = useState("");
  const [tone, setTone]               = useState("professional");
  const [activeTab, setActiveTab]     = useState<Tab>("blog");
  const [regenerating, setRegenerating] = useState<Channel | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [approvedChannels, setApprovedChannels] = useState<Set<string>>(new Set());
  const [mobilePreview, setMobilePreview] = useState(false);
  const [showSideBySide, setShowSideBySide] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    const stored = sessionStorage.getItem("campaignResult");
    const src = sessionStorage.getItem("campaignSource");
    const t   = sessionStorage.getItem("campaignTone");
    if (!stored) { router.replace("/"); return; }
    const parsed = JSON.parse(stored) as CampaignResponse;
    setCampaign(parsed);
    if (src) setSourceText(src);
    if (t) setTone(t);
    // Auto-approve channels that editor approved
    const autoApproved = new Set<string>();
    const r = parsed.review;
    if (r.blog_review.approved)   autoApproved.add("blog");
    if (r.thread_review.approved) autoApproved.add("thread");
    if (r.email_review.approved)  autoApproved.add("email");
    setApprovedChannels(autoApproved);
  }, [router, status]);

  const handleRegenerate = async (channel: Channel) => {
    if (!campaign) return;
    setRegenerating(channel);
    setError(null);
    try {
      const result = await regenerateChannel(channel, sourceText, campaign.fact_sheet, campaign.content, campaign.review, tone);
      setCampaign(result);
      saveToHistory(result, sourceText, tone);
      sessionStorage.setItem("campaignResult", JSON.stringify(result));
      setActiveTab(channel);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
    } finally { setRegenerating(null); }
  };

  const handleApprove = (channel: string) => {
    setApprovedChannels(prev => { const n = new Set(prev); n.add(channel); return n; });
  };

  if (status === "loading" || !campaign) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border border-[#C9A84C]/30 rotate-45 flex items-center justify-center">
          <div className="w-3 h-3 border border-[#C9A84C] border-t-transparent rounded-full animate-spin rotate-[-45deg]" />
        </div>
        <span className="text-[10px] tracking-widest uppercase text-[#4A4540]">Loading…</span>
      </div>
    </div>
  );

  const allApproved = approvedChannels.has("blog") && approvedChannels.has("thread") && approvedChannels.has("email");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "blog",   label: "Blog",       icon: "◈" },
    { id: "thread", label: "Thread",     icon: "◇" },
    { id: "email",  label: "Email",      icon: "◉" },
    { id: "facts",  label: "Fact Sheet", icon: "◆" },
    { id: "review", label: "Review",     icon: "◎" },
    { id: "export", label: "Export",     icon: "⊞" },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8]">
      {/* Nav */}
      <nav className="border-b border-[#141414] px-4 py-3 flex items-center justify-between sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-[10px] tracking-widest uppercase text-[#9A9080] hover:text-[#C9A84C] transition-colors flex items-center gap-1.5">← New</button>
          <div className="h-3 w-px bg-[#242424]" />
          <button onClick={() => router.push("/agent-room")} className="text-[10px] tracking-widest uppercase text-[#9A9080] hover:text-[#C9A84C] transition-colors hidden sm:block">Agent Room</button>
          <div className="h-3 w-px bg-[#242424] hidden sm:block" />
          <button onClick={() => router.push("/history")} className="text-[10px] tracking-widest uppercase text-[#9A9080] hover:text-[#C9A84C] transition-colors">History</button>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-[#C9A84C]/40 rotate-45 flex items-center justify-center">
            <span className="text-[#C9A84C] text-[9px] rotate-[-45deg]" style={{fontFamily:"'Playfair Display',serif"}}>CP</span>
          </div>
          <span className="text-sm font-semibold hidden md:block" style={{fontFamily:"'Playfair Display',serif"}}>
            {campaign.fact_sheet.product_name || "Campaign Dashboard"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowSideBySide(s => !s)}
            className={`text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-all hidden sm:block ${showSideBySide ? "border-[#C9A84C]/40 text-[#C9A84C]" : "border-[#1a1a1a] text-[#4A4540] hover:border-[#2a2520]"}`}>
            ⊟ Side-by-Side
          </button>
          <div className={`flex items-center gap-2 px-3 py-1 border text-[10px] tracking-widest uppercase ${allApproved ? "border-emerald-900/50 text-emerald-500" : "border-amber-900/50 text-amber-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${allApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            {allApproved ? "Ready" : `${approvedChannels.size}/3`}
          </div>
        </div>
      </nav>

      {error && <div className="border-b border-red-900/40 bg-red-950/20 px-6 py-2 text-xs text-red-400">⚠ {error}</div>}

      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">

          {/* Sidebar */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-[#141414]" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540]">Pipeline</span>
                <div className="h-px flex-1 bg-[#141414]" />
              </div>
              <div className="space-y-2">
                <AgentCard name="Research Agent"   description="Extracts verified facts"          icon="◈" status={getAgentStatus(campaign.activity_log,"Research Agent")}   stepNumber={1} />
                <AgentCard name="Copywriter Agent" description="Generates all channel content"    icon="◇" status={getAgentStatus(campaign.activity_log,"Copywriter Agent")} stepNumber={2} />
                <AgentCard name="Editor-in-Chief"  description="Reviews for accuracy & tone"      icon="◉" status={getAgentStatus(campaign.activity_log,"Editor-in-Chief")}  stepNumber={3} />
              </div>
            </div>

            {/* Channel approval status */}
            <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-[#141414]" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540]">Approvals</span>
                <div className="h-px flex-1 bg-[#141414]" />
              </div>
              <div className="space-y-2">
                {[
                  { label: "Blog Post",      key: "blog",   tab: "blog" as Tab   },
                  { label: "Social Thread",  key: "thread", tab: "thread" as Tab },
                  { label: "Email Draft",    key: "email",  tab: "email" as Tab  },
                ].map(ch => (
                  <div key={ch.key} className="flex items-center justify-between">
                    <button onClick={() => setActiveTab(ch.tab)} className="text-xs text-[#9A9080] hover:text-[#F5F0E8] transition-colors">{ch.label}</button>
                    {approvedChannels.has(ch.key) ? (
                      <span className="text-[10px] text-emerald-500 tracking-widest">✓ Approved</span>
                    ) : (
                      <button onClick={() => handleApprove(ch.key)}
                        className="text-[10px] tracking-widest uppercase btn-ghost px-2 py-1 hover:border-emerald-900/50 hover:text-emerald-500">
                        Approve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-[#141414]" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-[#4A4540]">Activity</span>
                <div className="h-px flex-1 bg-[#141414]" />
              </div>
              <ActivityFeed items={campaign.activity_log} />
            </div>
          </div>

          {/* Main content */}
          <div>
            {/* Tabs */}
            <div className="flex gap-0 mb-4 border border-[#1a1a1a] bg-[#0a0a0a] p-1 overflow-x-auto">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-widest uppercase flex-shrink-0 transition-all ${
                    activeTab === tab.id ? "bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20" : "text-[#4A4540] hover:text-[#9A9080]"
                  }`}>
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
              {/* Mobile toggle for thread */}
              {activeTab === "thread" && (
                <button onClick={() => setMobilePreview(s => !s)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-widest uppercase flex-shrink-0 transition-all ml-auto ${mobilePreview ? "text-[#C9A84C]" : "text-[#4A4540]"}`}>
                  {mobilePreview ? "📱 Mobile" : "🖥 Desktop"}
                </button>
              )}
            </div>

            {/* Side-by-side layout */}
            {showSideBySide && (activeTab === "blog" || activeTab === "thread" || activeTab === "email") ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Source */}
                <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-[#141414]" />
                    <span className="text-[9px] tracking-widest uppercase text-[#4A4540]">Source Material</span>
                    <div className="h-px flex-1 bg-[#141414]" />
                  </div>
                  <p className="text-xs text-[#4A4540] leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">{sourceText}</p>
                </div>
                {/* Output */}
                <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-[#141414]" />
                    <span className="text-[9px] tracking-widest uppercase text-[#C9A84C]/60">Generated Output</span>
                    <div className="h-px flex-1 bg-[#141414]" />
                  </div>
                  {activeTab === "blog"   && <BlogPreview   content={campaign.content} review={campaign.review.blog_review}   onRegenerate={() => handleRegenerate("blog")}   regenerating={regenerating==="blog"}   />}
                  {activeTab === "thread" && <ThreadPreview content={campaign.content} review={campaign.review.thread_review} onRegenerate={() => handleRegenerate("thread")} regenerating={regenerating==="thread"} mobileView={mobilePreview} />}
                  {activeTab === "email"  && <EmailPreview  content={campaign.content} review={campaign.review.email_review}  onRegenerate={() => handleRegenerate("email")}  regenerating={regenerating==="email"}  />}
                </div>
              </div>
            ) : (
              <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-5">
                {activeTab === "blog"   && <BlogPreview   content={campaign.content} review={campaign.review.blog_review}   onRegenerate={() => handleRegenerate("blog")}   regenerating={regenerating==="blog"}   />}
                {activeTab === "thread" && <ThreadPreview content={campaign.content} review={campaign.review.thread_review} onRegenerate={() => handleRegenerate("thread")} regenerating={regenerating==="thread"} mobileView={mobilePreview} />}
                {activeTab === "email"  && <EmailPreview  content={campaign.content} review={campaign.review.email_review}  onRegenerate={() => handleRegenerate("email")}  regenerating={regenerating==="email"}  />}
                {activeTab === "facts"  && <FactSheetPanel factSheet={campaign.fact_sheet} />}
                {activeTab === "review" && <ReviewPanel review={campaign.review} />}
                {activeTab === "export" && <ExportPanel factSheet={campaign.fact_sheet} content={campaign.content} review={campaign.review} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
