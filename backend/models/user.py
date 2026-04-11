"""
User models for MongoDB.

We use two separate models:
- UserInDB  : what gets stored in MongoDB (includes _id as string)
- UserPublic: what we return to the frontend (safe subset)
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserInDB(BaseModel):
    """Mirrors a MongoDB user document."""
    id: Optional[str] = Field(None, alias="_id")   # MongoDB ObjectId as string
    googleId: str                                    # Google's unique user ID
    name: str
    email: str
    image: Optional[str] = None                     # Google profile picture URL
    provider: str = "google"
    createdAt: datetime = Field(default_factory=utcnow)
    updatedAt: datetime = Field(default_factory=utcnow)
    lastLoginAt: datetime = Field(default_factory=utcnow)

    model_config = {"populate_by_name": True}


class UserPublic(BaseModel):
    """Safe user data returned to the frontend."""
    id: str
    googleId: str
    name: str
    email: str
    image: Optional[str] = None
    createdAt: datetime
    lastLoginAt: datetime


class UpsertUserRequest(BaseModel):
    """Payload sent from NextAuth when a user signs in."""
    googleId: str
    name: str
    email: str
    image: Optional[str] = None
    provider: str = "google"
