import type {
  CampaignResponse,
  FactSheet,
  GeneratedContent,
  ReviewResult,
  Channel,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function runCampaign(
  sourceText: string,
  tone: string
): Promise<CampaignResponse> {
  const res = await fetch(`${API_BASE}/api/run-campaign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_text: sourceText, tone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function regenerateChannel(
  channel: Channel,
  sourceText: string,
  factSheet: FactSheet,
  currentContent: GeneratedContent,
  review: ReviewResult,
  tone: string
): Promise<CampaignResponse> {
  const res = await fetch(`${API_BASE}/api/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel,
      source_text: sourceText,
      fact_sheet: factSheet,
      current_content: currentContent,
      review,
      tone,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function exportCampaign(
  factSheet: FactSheet,
  content: GeneratedContent,
  review: ReviewResult
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fact_sheet: factSheet, content, review }),
  });
  if (!res.ok) {
    throw new Error(`Export failed: HTTP ${res.status}`);
  }
  return res.blob();
}
