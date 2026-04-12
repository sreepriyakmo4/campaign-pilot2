"""
Conversation models for the AI Assistant with memory.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConversationMessage(BaseModel):
    role: str                                # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=utcnow)


class ConversationPublic(BaseModel):
    id: str
    userId: str
    campaignId: Optional[str] = None
    messages: list[ConversationMessage]
    createdAt: datetime
    updatedAt: datetime


class ConversationSummary(BaseModel):
    id: str
    campaignId: Optional[str] = None
    lastMessage: Optional[str] = None
    messageCount: int
    createdAt: datetime
    updatedAt: datetime


class ChatRequest(BaseModel):
    userId: str
    message: str
    campaignId: Optional[str] = None
    conversationId: Optional[str] = None