import type { CampaignResponse } from "./types";

export interface HistoryEntry {
  id: string;
  createdAt: string;
  sourcePreview: string;
  tone: string;
  productName: string | null;
  campaign: CampaignResponse;
}

const STORAGE_KEY = "campaignpilot_history";
const MAX_ENTRIES = 20;

export function saveToHistory(
  campaign: CampaignResponse,
  sourceText: string,
  tone: string
): HistoryEntry {
  const entry: HistoryEntry = {
    id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    sourcePreview: sourceText.slice(0, 120) + (sourceText.length > 120 ? "…" : ""),
    tone,
    productName: campaign.fact_sheet.product_name,
    campaign,
  };

  const existing = loadHistory();
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full — drop oldest
    const trimmed = updated.slice(0, MAX_ENTRIES - 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
  return entry;
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteHistoryEntry(id: string): void {
  const updated = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
