"""
Campaign V2 Routes — versioning + analytics

POST  /api/db/campaigns/:id/version         → create new version (different tone)
PUT   /api/db/campaigns/:id/set-version     → switch active version
GET   /api/db/campaigns/:id/analytics       → get analytics for a version
POST  /api/db/campaigns/:id/analytics/run  → force-recompute analytics
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from bson.errors import InvalidId

from database import get_campaigns_collection
from models.campaign_v2 import (
    CampaignV2Public, CampaignVersionPublic,
    CreateVersionRequest, SetVersionRequest, AnalyticsResult,
)
from services.analytics_service import analyze_content
from services.llm_service import LLMService

logger = logging.getLogger(__name__)
router = APIRouter()
llm = LLMService()


def _parse_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail=f"Invalid campaign ID: {id_str}")


def _new_version_id() -> str:
    return str(uuid.uuid4())[:8]


def _doc_to_v2_public(doc: dict) -> CampaignV2Public:
    raw_versions = doc.get("versions", [])
    versions = []
    for v in raw_versions:
        analytics_raw = v.get("analytics")
        analytics = AnalyticsResult(**analytics_raw) if analytics_raw else None
        versions.append(CampaignVersionPublic(
            versionId        = v["versionId"],
            tone             = v.get("tone", "professional"),
            label            = v.get("label"),
            generatedContent = v.get("generatedContent"),
            reviewResult     = v.get("reviewResult"),
            analytics        = analytics,
            createdAt        = v["createdAt"],
        ))
    return CampaignV2Public(
        id               = str(doc["_id"]),
        userId           = doc["userId"],
        sourceText       = doc.get("sourceText", ""),
        factSheet        = doc.get("factSheet"),
        activityLogs     = doc.get("activityLogs"),
        versions         = versions,
        currentVersionId = doc.get("currentVersionId"),
        tone             = doc.get("tone", "professional"),
        status           = doc.get("status", "complete"),
        createdAt        = doc["createdAt"],
        updatedAt        = doc["updatedAt"],
    )


@router.post("/campaigns/{campaign_id}/version", response_model=CampaignV2Public)
async def create_version(campaign_id: str, req: CreateVersionRequest):
    """
    Generate a brand-new version with a different tone.
    Re-runs the copywriter + editor agents using the existing fact sheet.

    Request: { "userId": "abc123", "tone": "casual", "label": "Casual draft" }
    """
    campaigns = get_campaigns_collection()
    oid = _parse_oid(campaign_id)
    doc = await campaigns.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if doc["userId"] != req.userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    fact_sheet = doc.get("factSheet")
    if not fact_sheet:
        raise HTTPException(status_code=400, detail="Campaign has no fact sheet.")

    # Run copywriter + editor with the new tone
    from models.schemas import FactSheet, ActivityLogItem
    from agents import copywriter_agent, editor_agent

    log: list[ActivityLogItem] = []
    try:
        fs_obj  = FactSheet(**fact_sheet)
        content = await copywriter_agent.run(fs_obj, llm, log, tone=req.tone)
        review  = await editor_agent.run(fs_obj, content, llm, log)
    except Exception as e:
        logger.error("Version generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    analytics = analyze_content(content.model_dump(), tone=req.tone)

    now        = datetime.now(timezone.utc)
    version_id = _new_version_id()
    version_count = len(doc.get("versions", []))
    label = req.label or f"Version {version_count + 1} — {req.tone.capitalize()}"

    new_version = {
        "versionId":        version_id,
        "tone":             req.tone,
        "label":            label,
        "generatedContent": content.model_dump(),
        "reviewResult":     review.model_dump(),
        "analytics":        analytics.model_dump(),
        "createdAt":        now,
    }

    await campaigns.update_one(
        {"_id": oid},
        {
            "$push": {"versions": new_version},
            "$set":  {"currentVersionId": version_id, "updatedAt": now},
        }
    )

    updated = await campaigns.find_one({"_id": oid})
    logger.info("Created version %s for campaign %s", version_id, campaign_id)
    return _doc_to_v2_public(updated)


@router.put("/campaigns/{campaign_id}/set-version", response_model=CampaignV2Public)
async def set_version(campaign_id: str, req: SetVersionRequest):
    """Switch the active version of a campaign."""
    campaigns = get_campaigns_collection()
    oid = _parse_oid(campaign_id)
    doc = await campaigns.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if doc["userId"] != req.userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    version_ids = [v["versionId"] for v in doc.get("versions", [])]
    if req.versionId not in version_ids:
        raise HTTPException(status_code=404, detail=f"Version '{req.versionId}' not found.")

    await campaigns.update_one(
        {"_id": oid},
        {"$set": {"currentVersionId": req.versionId, "updatedAt": datetime.now(timezone.utc)}}
    )

    updated = await campaigns.find_one({"_id": oid})
    return _doc_to_v2_public(updated)


@router.get("/campaigns/{campaign_id}/analytics")
async def get_analytics(
    campaign_id: str,
    userId: str = Query(...),
    versionId: str = Query(None),
):
    """
    Get analytics for a version (or current version if versionId omitted).
    Works on both V1 campaigns (no versions array) and V2.
    """
    campaigns = get_campaigns_collection()
    oid = _parse_oid(campaign_id)
    doc = await campaigns.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if doc["userId"] != userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    versions = doc.get("versions", [])

    # V1 campaign — no versions array
    if not versions:
        content = doc.get("generatedContent")
        if not content:
            raise HTTPException(status_code=404, detail="No content found to analyze.")
        analytics = analyze_content(content, tone=doc.get("tone", "professional"))
        return {"versionId": None, "analytics": analytics.model_dump()}

    target_id = versionId or doc.get("currentVersionId")
    target = next((v for v in versions if v["versionId"] == target_id), versions[-1])

    analytics_raw = target.get("analytics")
    if analytics_raw:
        return {"versionId": target["versionId"], "analytics": analytics_raw}

    # Compute on the fly and cache
    content = target.get("generatedContent")
    if not content:
        raise HTTPException(status_code=404, detail="Version has no content.")

    analytics = analyze_content(content, tone=target.get("tone", "professional"))
    await campaigns.update_one(
        {"_id": oid, "versions.versionId": target["versionId"]},
        {"$set": {"versions.$.analytics": analytics.model_dump()}}
    )
    return {"versionId": target["versionId"], "analytics": analytics.model_dump()}


@router.post("/campaigns/{campaign_id}/analytics/run")
async def run_analytics(
    campaign_id: str,
    userId: str = Query(...),
    versionId: str = Query(None),
):
    """Force-recompute and store analytics for a version."""
    campaigns = get_campaigns_collection()
    oid = _parse_oid(campaign_id)
    doc = await campaigns.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if doc["userId"] != userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    versions = doc.get("versions", [])
    if not versions:
        content = doc.get("generatedContent")
        if not content:
            raise HTTPException(status_code=404, detail="No content found.")
        analytics = analyze_content(content, tone=doc.get("tone", "professional"))
        return {"versionId": None, "analytics": analytics.model_dump()}

    target_id = versionId or doc.get("currentVersionId")
    target = next((v for v in versions if v["versionId"] == target_id), versions[-1])
    content = target.get("generatedContent")
    if not content:
        raise HTTPException(status_code=404, detail="No content in this version.")

    analytics = analyze_content(content, tone=target.get("tone", "professional"))
    await campaigns.update_one(
        {"_id": oid, "versions.versionId": target["versionId"]},
        {"$set": {"versions.$.analytics": analytics.model_dump()}}
    )
    return {"versionId": target["versionId"], "analytics": analytics.model_dump()}