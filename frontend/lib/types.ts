// Shared TypeScript types mirroring backend Pydantic schemas

export interface FactSheet {
  product_name: string | null;
  target_audience: string[];
  core_features: string[];
  technical_specs: string[];
  value_proposition: string | null;
  key_messages: string[];
  ambiguous_statements: string[];
  source_summary: string;
}

export interface GeneratedContent {
  blog_title: string;
  blog: string;
  thread: string[];
  email_teaser: string;
}

export interface ChannelReview {
  approved: boolean;
  issues: string[];
  correction_note: string;
}

export interface ReviewResult {
  blog_review: ChannelReview;
  thread_review: ChannelReview;
  email_review: ChannelReview;
  overall_summary: string;
}

export interface ActivityLogItem {
  agent: string;
  message: string;
  status: "running" | "success" | "error" | "warning";
}

export interface CampaignResponse {
  fact_sheet: FactSheet;
  content: GeneratedContent;
  review: ReviewResult;
  activity_log: ActivityLogItem[];
}

export type Channel = "blog" | "thread" | "email";
export type Tone = "professional" | "casual" | "bold" | "empathetic";
