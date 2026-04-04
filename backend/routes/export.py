"""Export API route"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from models.schemas import ExportRequest
from services.export_service import build_zip

router = APIRouter()


@router.post("/export")
async def export_campaign(req: ExportRequest):
    """
    Package all campaign assets into a ZIP file for download.
    """
    try:
        zip_bytes = build_zip(req.fact_sheet, req.content, req.review)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=campaign.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
