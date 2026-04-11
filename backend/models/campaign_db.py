"""
Campaign models for MongoDB storage.

CampaignInDB  : full document stored in MongoDB
CampaignPublic: what the frontend receives
CreateCampaignRequest: payload to create a new campaign
UpdateCampaignRequest: payload to update an existing campaign
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CampaignInDB(BaseModel):
    """Mirrors a MongoDB campaign document."""
    id: Optional[str] = Field(None, alias="_id")
    userId: str                          # References users._id (as string)
    sourceText: str
    tone: str = "professional"
    status: str = "complete"             # "complete" | "error"

    # These match your existing Pydantic schemas from schemas.py
    factSheet: Optional[dict] = None
    generatedContent: Optional[dict] = None
    reviewResult: Optional[dict] = None
    activityLogs: Optional[list] = None

    createdAt: datetime = Field(default_factory=utcnow)
    updatedAt: datetime = Field(default_factory=utcnow)

    model_config = {"populate_by_name": True}


class CampaignPublic(BaseModel):
    """Campaign data returned to the frontend."""
    id: str
    userId: str
    sourceText: str
    tone: str
    status: str
    factSheet: Optional[dict] = None
    generatedContent: Optional[dict] = None
    reviewResult: Optional[dict] = None
    activityLogs: Optional[list] = None
    createdAt: datetime
    updatedAt: datetime


class CampaignSummary(BaseModel):
    """Lightweight campaign info for the history list (no full content)."""
    id: str
    userId: str
    tone: str
    status: str
    productName: Optional[str] = None    # Pulled from factSheet.product_name
    blogTitle: Optional[str] = None      # Pulled from generatedContent.blog_title
    sourcePreview: str                   # First 120 chars of sourceText
    allApproved: bool = False
    createdAt: datetime
    updatedAt: datetime


class CreateCampaignRequest(BaseModel):
    """Frontend sends this to save a newly generated campaign."""
    userId: str
    sourceText: str
    tone: str = "professional"
    factSheet: Optional[dict] = None
    generatedContent: Optional[dict] = None
    reviewResult: Optional[dict] = None
    activityLogs: Optional[list] = None


class UpdateCampaignRequest(BaseModel):
    """Frontend sends this after regenerating a channel."""
    generatedContent: Optional[dict] = None
    reviewResult: Optional[dict] = None
    activityLogs: Optional[list] = None
    status: Optional[str] = None
