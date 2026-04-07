"use client";

import { useState, useRef, useEffect } from "react";
import type { CampaignResponse } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  campaign: CampaignResponse;
}

function getSmartChips(campaign: CampaignResponse): string[] {
  const chips: string[] = [];

  if (!campaign?.review?.blog_review?.approved) {
    chips.push("Fix the blog issue");
  }

  if (!campaign?.review?.thread_review?.approved) {
    chips.push("Fix the thread issue");
  }

  if (!campaign?.review?.email_review?.approved) {
    chips.push("Fix the email issue");
  }

  chips.push("Summarize key messages");
  chips.push("Write 3 headline variants for the blog");
  chips.push("Make the email subject punchier");

  return chips.slice(0, 5);
}

export default function CampaignAssistant({ campaign }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    if (!campaign) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/campaign-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          campaignContext: campaign,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data?.error || "Request failed. Please try again.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.reply || "No response generated.",
        },
      ]);
    } catch (error) {
      console.error("Assistant request error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Request failed. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  if (!campaign) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 text-sm text-red-400">
        Campaign data is missing.
      </div>
    );
  }

  const chips = getSmartChips(campaign);

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Intro */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#C9A84C] text-base">✦</span>
          <span className="text-xs tracking-widest uppercase text-[#4A4540]">
            Campaign AI Assistant
          </span>
        </div>
        <p className="text-xs text-[#9A9080] leading-relaxed">
          I have full context of your campaign — fact sheet, all 3 channel drafts,
          and the editorial review. Ask anything or request micro-edits on any
          specific section.
        </p>
      </div>

      {/* Smart chips */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.map((chip, i) => (
            <button
              key={i}
              onClick={() => sendMessage(chip)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1a1a1a] hover:border-[#C9A84C]/40 text-[11px] text-[#4A4540] hover:text-[#C9A84C] transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[400px] pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
            <div className="max-w-[85%]">
              {msg.role === "assistant" && (
                <div className="text-[9px] tracking-widest uppercase text-[#C9A84C]/50 mb-1 flex items-center gap-1">
                  <span>✦</span>
                  <span>Assistant</span>
                </div>
              )}

              <div
                className={
                  msg.role === "user"
                    ? "bg-[#C9A84C]/10 border border-[#C9A84C]/20 p-3 text-xs text-[#F5F0E8]"
                    : "bg-[#0a0a0a] border border-[#1a1a1a] p-4 text-xs text-[#9A9080] leading-relaxed"
                }
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyText(msg.content, i)}
                    className="mt-2 text-[10px] tracking-widest uppercase text-[#4A4540] hover:text-[#C9A84C] transition-colors"
                  >
                    {copied === i ? "✓ Copied" : "⊕ Copy"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 w-fit">
            <div className="flex gap-1">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/40 animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          placeholder="Ask about your campaign or request a micro-edit…"
          className="flex-1 luxury-input px-4 py-3 text-sm"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="btn-gold px-5 py-3 text-[10px] tracking-widest disabled:opacity-40"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}