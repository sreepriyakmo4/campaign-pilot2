/**
 * db-api.ts
 * -----------
 * All frontend functions for talking to the new MongoDB-backed API endpoints.
 * Import these wherever you need to read/write campaigns or users.
 */

import type { CampaignResponse, FactSheet, GeneratedContent, ReviewResult, Channel } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types that mirror the backend models
// ---------------------------------------------------------------------------

export interface DBCampaignSummary {
  id: string;
  userId: string;
  tone: string;
  status: string;
  productName: string | null;
  blogTitle: string | null;
  sourcePreview: string;
  allApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DBCampaign {
  id: string;
  userId: string;
  sourceText: string;
  tone: string;
  status: string;
  factSheet: FactSheet | null;
  generatedContent: GeneratedContent | null;
  reviewResult: any | null;
  activityLogs: any[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface DBUser {
  id: string;
  googleId: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  lastLoginAt: string;
}

// ---------------------------------------------------------------------------
// User functions
// ---------------------------------------------------------------------------

/**
 * Upsert a user on Google login.
 * Called from the NextAuth callbacks — returns the user's DB id.
 */
export async function upsertUser(payload: {
  googleId: string;
  name: string;
  email: string;
  image?: string | null;
}): Promise<DBUser> {
  const res = await fetch(`${API_BASE}/api/users/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, provider: "google" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `upsertUser failed: HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Campaign functions
// ---------------------------------------------------------------------------

/**
 * Save a newly generated campaign to MongoDB.
 * Call this after agents finish in the Agent Room.
 */
export async function saveCampaignToDB(payload: {
  userId: string;
  sourceText: string;
  tone: string;
  campaign: CampaignResponse;
}): Promise<DBCampaign> {
  const res = await fetch(`${API_BASE}/api/db/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: payload.userId,
      sourceText: payload.sourceText,
      tone: payload.tone,
      factSheet: payload.campaign.fact_sheet,
      generatedContent: payload.campaign.content,
      reviewResult: payload.campaign.review,
      activityLogs: payload.campaign.activity_log,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `saveCampaign failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Get all campaigns for a user (summary list for the history page).
 */
export async function getUserCampaigns(userId: string): Promise<DBCampaignSummary[]> {
  const res = await fetch(
    `${API_BASE}/api/db/campaigns?userId=${encodeURIComponent(userId)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `getUserCampaigns failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Get a single full campaign by its DB id.
 */
export async function getCampaignById(campaignId: string, userId: string): Promise<DBCampaign> {
  const res = await fetch(
    `${API_BASE}/api/db/campaigns/${campaignId}?userId=${encodeURIComponent(userId)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `getCampaign failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Update a campaign after regenerating a channel.
 */
export async function updateCampaignInDB(
  campaignId: string,
  userId: string,
  updates: {
    generatedContent?: GeneratedContent;
    reviewResult?: any;
    activityLogs?: any[];
  }
): Promise<DBCampaign> {
  const res = await fetch(
    `${API_BASE}/api/db/campaigns/${campaignId}?userId=${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `updateCampaign failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Delete a campaign.
 */
export async function deleteCampaignFromDB(
  campaignId: string,
  userId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/db/campaigns/${campaignId}?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `deleteCampaign failed: HTTP ${res.status}`);
  }
}