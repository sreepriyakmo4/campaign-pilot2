"""
Campaign database API routes.

POST   /api/db/campaigns                    — Save a new campaign
GET    /api/db/campaigns?userId=xxx         — Get all campaigns for a user
GET    /api/db/campaigns/:id?userId=xxx     — Get one campaign (with ownership check)
PUT    /api/db/campaigns/:id               — Update a campaign (regenerate channel)
DELETE /api/db/campaigns/:id?userId=xxx    — Delete a campaign

All write/read operations include an ownership check:
the userId in the request must match the campaign's userId in the database.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from bson.errors import InvalidId

from database import get_campaigns_collection
from models.campaign_db import (
    CreateCampaignRequest,
    UpdateCampaignRequest,
    CampaignPublic,
    CampaignSummary,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_public(doc: dict) -> CampaignPublic:
    """Convert a raw MongoDB campaign document to CampaignPublic."""
    return CampaignPublic(
        id=str(doc["_id"]),
        userId=doc["userId"],
        sourceText=doc.get("sourceText", ""),
        tone=doc.get("tone", "professional"),
        status=doc.get("status", "complete"),
        factSheet=doc.get("factSheet"),
        generatedContent=doc.get("generatedContent"),
        reviewResult=doc.get("reviewResult"),
        activityLogs=doc.get("activityLogs"),
        createdAt=doc["createdAt"],
        updatedAt=doc["updatedAt"],
    )


def _to_summary(doc: dict) -> CampaignSummary:
    """Build a lightweight summary from a campaign document."""
    fact_sheet = doc.get("factSheet") or {}
    content = doc.get("generatedContent") or {}
    review = doc.get("reviewResult") or {}

    # Derive allApproved from reviewResult
    blog_ok = (review.get("blog_review") or {}).get("approved", False)
    thread_ok = (review.get("thread_review") or {}).get("approved", False)
    email_ok = (review.get("email_review") or {}).get("approved", False)

    source = doc.get("sourceText", "")
    preview = source[:120] + ("…" if len(source) > 120 else "")

    return CampaignSummary(
        id=str(doc["_id"]),
        userId=doc["userId"],
        tone=doc.get("tone", "professional"),
        status=doc.get("status", "complete"),
        productName=fact_sheet.get("product_name"),
        blogTitle=content.get("blog_title"),
        sourcePreview=preview,
        allApproved=blog_ok and thread_ok and email_ok,
        createdAt=doc["createdAt"],
        updatedAt=doc["updatedAt"],
    )


def _parse_object_id(id_str: str) -> ObjectId:
    """Parse a string into a MongoDB ObjectId, raising 400 on bad format."""
    try:
        return ObjectId(id_str)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail=f"Invalid campaign ID: {id_str}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/campaigns", response_model=CampaignPublic)
async def save_campaign(req: CreateCampaignRequest):
    """
    Save a newly generated campaign to MongoDB.
    Called automatically after agents finish in the Agent Room.
    """
    campaigns = get_campaigns_collection()
    now = datetime.now(timezone.utc)

    doc = {
        "userId": req.userId,
        "sourceText": req.sourceText,
        "tone": req.tone,
        "status": "complete",
        "factSheet": req.factSheet,
        "generatedContent": req.generatedContent,
        "reviewResult": req.reviewResult,
        "activityLogs": req.activityLogs or [],
        "createdAt": now,
        "updatedAt": now,
    }

    result = await campaigns.insert_one(doc)
    created = await campaigns.find_one({"_id": result.inserted_id})
    logger.info("Saved campaign %s for user %s", result.inserted_id, req.userId)
    return _to_public(created)


@router.get("/campaigns", response_model=list[CampaignSummary])
async def get_user_campaigns(userId: str = Query(..., description="User's database ID")):
    """
    Return all campaigns belonging to a user, newest first.
    Returns lightweight summaries (no full content) to keep the response small.
    """
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required.")

    campaigns = get_campaigns_collection()
    cursor = campaigns.find({"userId": userId}).sort("createdAt", -1)
    docs = await cursor.to_list(length=100)   # max 100 campaigns per user

    return [_to_summary(d) for d in docs]


@router.get("/campaigns/{campaign_id}", response_model=CampaignPublic)
async def get_campaign(campaign_id: str, userId: str = Query(...)):
    """
    Get a single campaign by its ID.
    Ownership check: the userId must match the campaign's userId.
    """
    campaigns = get_campaigns_collection()
    oid = _parse_object_id(campaign_id)
    doc = await campaigns.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    # Ownership check — users can only read their own campaigns
    if doc["userId"] != userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    return _to_public(doc)


@router.put("/campaigns/{campaign_id}", response_model=CampaignPublic)
async def update_campaign(
    campaign_id: str,
    req: UpdateCampaignRequest,
    userId: str = Query(...),
):
    """
    Update a campaign — used after regenerating a channel.
    Only updates the fields provided (partial update).
    Ownership check included.
    """
    campaigns = get_campaigns_collection()
    oid = _parse_object_id(campaign_id)
    doc = await campaigns.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if doc["userId"] != userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Build update payload — only include fields that were actually provided
    update_fields: dict = {"updatedAt": datetime.now(timezone.utc)}

    if req.generatedContent is not None:
        update_fields["generatedContent"] = req.generatedContent
    if req.reviewResult is not None:
        update_fields["reviewResult"] = req.reviewResult
    if req.activityLogs is not None:
        update_fields["activityLogs"] = req.activityLogs
    if req.status is not None:
        update_fields["status"] = req.status

    await campaigns.update_one({"_id": oid}, {"$set": update_fields})
    updated = await campaigns.find_one({"_id": oid})
    logger.info("Updated campaign %s for user %s", campaign_id, userId)
    return _to_public(updated)


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, userId: str = Query(...)):
    """
    Delete a campaign.
    Ownership check: only the owner can delete their campaign.
    """
    campaigns = get_campaigns_collection()
    oid = _parse_object_id(campaign_id)
    doc = await campaigns.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if doc["userId"] != userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    await campaigns.delete_one({"_id": oid})
    logger.info("Deleted campaign %s for user %s", campaign_id, userId)
    return {"success": True, "deletedId": campaign_id}