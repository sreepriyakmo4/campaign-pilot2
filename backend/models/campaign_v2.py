"""
Campaign V2 models — adds versioning + analytics to the campaign schema.
Fully backward-compatible with the existing V1 campaigns.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_version_id() -> str:
    return str(uuid.uuid4())[:8]


class AnalyticsResult(BaseModel):
    readabilityScore: int = 0
    seoScore: int = 0
    sentimentScore: int = 0
    sentimentLabel: str = "neutral"
    toneConsistency: int = 0
    wordCount: int = 0
    blogWordCount: int = 0
    emailWordCount: int = 0
    threadPostCount: int = 0
    topKeywords: list[str] = Field(default_factory=list)


class CampaignVersionPublic(BaseModel):
    versionId: str
    tone: str
    label: Optional[str] = None
    generatedContent: Optional[dict] = None
    reviewResult: Optional[dict] = None
    analytics: Optional[AnalyticsResult] = None
    createdAt: datetime


class CampaignV2Public(BaseModel):
    id: str
    userId: str
    sourceText: str
    factSheet: Optional[dict] = None
    activityLogs: Optional[list] = None
    versions: list[CampaignVersionPublic]
    currentVersionId: Optional[str] = None
    tone: str
    status: str
    createdAt: datetime
    updatedAt: datetime


class CreateVersionRequest(BaseModel):
    userId: str
    tone: str = "professional"
    label: Optional[str] = None


class SetVersionRequest(BaseModel):
    userId: str
    versionId: str