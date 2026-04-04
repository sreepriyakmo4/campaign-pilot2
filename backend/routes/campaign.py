from fastapi import APIRouter, HTTPException
from models.schemas import CampaignResponse, RunCampaignRequest, RegenerateRequest
from services import orchestrator

router = APIRouter()

MAX_SOURCE_LENGTH = 8000  # characters


@router.post("/run-campaign", response_model=CampaignResponse)
async def run_campaign(req: RunCampaignRequest):
    if not req.source_text.strip():
        raise HTTPException(status_code=400, detail="source_text must not be empty.")
    # Trim source text if too long
    source = req.source_text.strip()
    if len(source) > MAX_SOURCE_LENGTH:
        source = source[:MAX_SOURCE_LENGTH]
    try:
        return await orchestrator.run_campaign(source, tone=req.tone or "professional")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regenerate", response_model=CampaignResponse)
async def regenerate(req: RegenerateRequest):
    if req.channel not in {"blog", "thread", "email"}:
        raise HTTPException(status_code=400, detail=f"Invalid channel '{req.channel}'.")
    try:
        return await orchestrator.regenerate_channel(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))