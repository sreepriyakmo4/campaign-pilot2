"""
User API routes.

POST /api/users/upsert   — Create or update user on Google login (called by NextAuth)
GET  /api/users/:googleId — Get user details by Google ID
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId

from database import get_users_collection
from models.user import UpsertUserRequest, UserPublic

logger = logging.getLogger(__name__)
router = APIRouter()


def _user_to_public(doc: dict) -> UserPublic:
    """Convert a raw MongoDB document to UserPublic."""
    return UserPublic(
        id=str(doc["_id"]),
        googleId=doc["googleId"],
        name=doc["name"],
        email=doc["email"],
        image=doc.get("image"),
        createdAt=doc["createdAt"],
        lastLoginAt=doc["lastLoginAt"],
    )


@router.post("/users/upsert", response_model=UserPublic)
async def upsert_user(req: UpsertUserRequest):
    """
    Called automatically by NextAuth when a user signs in with Google.
    - If the user doesn't exist: creates a new document.
    - If the user exists: updates name, image, and lastLoginAt.
    Returns the user's database ID so the frontend can store it in the session.
    """
    users = get_users_collection()
    now = datetime.now(timezone.utc)

    # Try to find existing user by their Google ID
    existing = await users.find_one({"googleId": req.googleId})

    if existing:
        # Update login info
        await users.update_one(
            {"googleId": req.googleId},
            {"$set": {
                "name": req.name,
                "image": req.image,
                "lastLoginAt": now,
                "updatedAt": now,
            }}
        )
        updated = await users.find_one({"googleId": req.googleId})
        logger.info("Updated existing user: %s", req.email)
        return _user_to_public(updated)
    else:
        # Create new user
        new_user = {
            "googleId": req.googleId,
            "name": req.name,
            "email": req.email,
            "image": req.image,
            "provider": req.provider,
            "createdAt": now,
            "updatedAt": now,
            "lastLoginAt": now,
        }
        result = await users.insert_one(new_user)
        created = await users.find_one({"_id": result.inserted_id})
        logger.info("Created new user: %s", req.email)
        return _user_to_public(created)


@router.get("/users/{google_id}", response_model=UserPublic)
async def get_user(google_id: str):
    """Get a user's profile by their Google ID."""
    users = get_users_collection()
    doc = await users.find_one({"googleId": google_id})

    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")

    return _user_to_public(doc)