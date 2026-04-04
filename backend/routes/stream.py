"""
SSE Streaming route — sends real-time agent status events to the frontend
during campaign generation so the Agent Room can animate live.
"""
import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

MAX_SOURCE_LENGTH = 8000


class StreamRequest(BaseModel):
    source_text: str
    tone: Optional[str] = "professional"


async def campaign_stream(source_text: str, tone: str):
    """Run the full pipeline and yield SSE events at each stage."""

    # Trim source if too large
    source_text = source_text[:MAX_SOURCE_LENGTH]

    from services.llm_service import LLMService
    from agents import research_agent, copywriter_agent, editor_agent
    from models.schemas import ActivityLogItem

    llm = LLMService()
    log = []

    def event(type_: str, data: dict):
        return f"data: {json.dumps({'type': type_, **data})}\n\n"

    try:
        # Stage 1 — Research
        yield event("agent_status", {"agent": "research", "status": "thinking", "message": "Analyzing source material..."})
        await asyncio.sleep(0.3)

        log.append(ActivityLogItem(agent="Research Agent", message="Analyzing source material and extracting facts...", status="running"))
        fact_sheet = await research_agent.run(source_text, llm, log)

        yield event("agent_status", {"agent": "research", "status": "done", "message": f"Extracted {len(fact_sheet.core_features)} features"})
        yield event("fact_sheet", {"data": fact_sheet.model_dump()})
        yield event("chat", {"from": "Research Agent", "to": "Copywriter Agent", "message": f"Fact sheet ready. Found {len(fact_sheet.core_features)} features, {len(fact_sheet.key_messages)} key messages. Passing to Copywriter."})
        await asyncio.sleep(0.3)

        # Stage 2 — Copywriter
        yield event("agent_status", {"agent": "copywriter", "status": "thinking", "message": "Writing blog, thread, and email..."})
        await asyncio.sleep(0.3)

        content = await copywriter_agent.run(fact_sheet, llm, log, tone=tone)

        yield event("agent_status", {"agent": "copywriter", "status": "done", "message": "All drafts written"})
        yield event("content", {"data": content.model_dump()})
        yield event("chat", {"from": "Copywriter Agent", "to": "Editor-in-Chief", "message": f"Drafted '{content.blog_title}'. Blog, thread, and email ready for review."})
        await asyncio.sleep(0.3)

        # Stage 3 — Editor
        yield event("agent_status", {"agent": "editor", "status": "thinking", "message": "Reviewing all outputs..."})
        await asyncio.sleep(0.3)

        review = await editor_agent.run(fact_sheet, content, llm, log)

        approved_count = sum([
            review.blog_review.approved,
            review.thread_review.approved,
            review.email_review.approved
        ])

        yield event("agent_status", {"agent": "editor", "status": "done", "message": f"{approved_count}/3 outputs approved"})
        yield event("review", {"data": review.model_dump()})

        if approved_count == 3:
            yield event("chat", {"from": "Editor-in-Chief", "to": "Dashboard", "message": "All 3 outputs approved. Campaign is ready to publish."})
        else:
            rejected = []
            if not review.blog_review.approved:
                rejected.append("blog")
            if not review.thread_review.approved:
                rejected.append("thread")
            if not review.email_review.approved:
                rejected.append("email")
            yield event("chat", {"from": "Editor-in-Chief", "to": "Copywriter Agent", "message": f"Rejected: {', '.join(rejected)}. Correction notes sent. Please revise."})

        yield event("activity_log", {"data": [item.model_dump() for item in log]})
        yield event("complete", {
            "fact_sheet": fact_sheet.model_dump(),
            "content": content.model_dump(),
            "review": review.model_dump(),
            "activity_log": [item.model_dump() for item in log]
        })

    except Exception as e:
        yield event("error", {"message": str(e)})


@router.post("/stream-campaign")
async def stream_campaign(req: StreamRequest):
    async def generator():
        async for chunk in campaign_stream(req.source_text, req.tone or "professional"):
            yield chunk
    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )