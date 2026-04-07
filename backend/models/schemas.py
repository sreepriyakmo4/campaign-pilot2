from pydantic import BaseModel, Field, field_validator
from typing import Optional


class FactSheet(BaseModel):
    product_name: Optional[str] = None
    target_audience: list[str] = Field(default_factory=list)
    core_features: list[str] = Field(default_factory=list)
    technical_specs: list[str] = Field(default_factory=list)
    value_proposition: Optional[str] = None
    key_messages: list[str] = Field(default_factory=list)
    ambiguous_statements: list[str] = Field(default_factory=list)
    source_summary: str = ""

    @field_validator(
        "target_audience",
        "core_features",
        "technical_specs",
        "key_messages",
        "ambiguous_statements",
        mode="before",
    )
    @classmethod
    def none_to_list(cls, v):
        return [] if v is None else v


class GeneratedContent(BaseModel):
    blog_title: str
    blog: str
    thread: list[str]
    email_teaser: str


class ChannelReview(BaseModel):
    approved: bool
    issues: list[str]
    correction_note: str


class ReviewResult(BaseModel):
    blog_review: ChannelReview
    thread_review: ChannelReview
    email_review: ChannelReview
    overall_summary: str


class ActivityLogItem(BaseModel):
    agent: str
    message: str
    status: str  # "running" | "success" | "error" | "warning"


class CampaignResponse(BaseModel):
    fact_sheet: FactSheet
    content: GeneratedContent
    review: ReviewResult
    activity_log: list[ActivityLogItem]


class RegenerateRequest(BaseModel):
    channel: str  # "blog" | "thread" | "email"
    source_text: str
    fact_sheet: FactSheet
    current_content: GeneratedContent
    review: ReviewResult
    tone: Optional[str] = "professional"


class RunCampaignRequest(BaseModel):
    source_text: str
    tone: Optional[str] = "professional"


class ExportRequest(BaseModel):
    fact_sheet: FactSheet
    content: GeneratedContent
    review: ReviewResult