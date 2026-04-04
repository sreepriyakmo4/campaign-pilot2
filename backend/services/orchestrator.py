"""
Orchestrator — sequences the three agents and coordinates the campaign pipeline.
"""

from models.schemas import (
    FactSheet, GeneratedContent, ReviewResult,
    ActivityLogItem, CampaignResponse, RegenerateRequest
)
from services.llm_service import LLMService
from agents import research_agent, copywriter_agent, editor_agent

llm = LLMService()


async def run_campaign(source_text: str, tone: str = "professional") -> CampaignResponse:
    """Full pipeline: Research → Copywriter → Editor"""
    log: list[ActivityLogItem] = []

    log.append(ActivityLogItem(
        agent="Orchestrator",
        message="Campaign pipeline started. Initializing agents...",
        status="running"
    ))

    # Stage 1: Research
    fact_sheet = await research_agent.run(source_text, llm, log)

    # Stage 2: Copywriter
    content = await copywriter_agent.run(fact_sheet, llm, log, tone=tone)

    # Stage 3: Editor
    review = await editor_agent.run(fact_sheet, content, llm, log)

    log.append(ActivityLogItem(
        agent="Orchestrator",
        message="Pipeline complete. Campaign ready for review.",
        status="success"
    ))

    return CampaignResponse(
        fact_sheet=fact_sheet,
        content=content,
        review=review,
        activity_log=log
    )


async def regenerate_channel(req: RegenerateRequest) -> CampaignResponse:
    """Regenerate a single channel, then re-run the editor for that channel."""
    log: list[ActivityLogItem] = []

    channel = req.channel
    fact_sheet = req.fact_sheet
    current_content = req.current_content
    review = req.review

    # Get the correction note for the requested channel
    correction_note = ""
    if channel == "blog":
        correction_note = review.blog_review.correction_note
        previous_output = {"blog_title": current_content.blog_title, "blog": current_content.blog}
    elif channel == "thread":
        correction_note = review.thread_review.correction_note
        previous_output = {"thread": current_content.thread}
    else:
        correction_note = review.email_review.correction_note
        previous_output = {"email_teaser": current_content.email_teaser}

    log.append(ActivityLogItem(
        agent="Orchestrator",
        message=f"Regenerating '{channel}' channel based on editor feedback...",
        status="running"
    ))

    # Regenerate
    log.append(ActivityLogItem(
        agent="Copywriter Agent",
        message=f"Rewriting {channel} with correction: {correction_note or 'general improvement'}",
        status="running"
    ))

    try:
        patched = await llm.run_regenerate_agent(
            channel=channel,
            fact_sheet=fact_sheet.model_dump(),
            previous_output=previous_output,
            correction_note=correction_note
        )

        # Merge the regenerated channel back into the content object
        content_dict = current_content.model_dump()
        if channel == "blog":
            content_dict["blog_title"] = patched.get("blog_title", current_content.blog_title)
            content_dict["blog"] = patched.get("blog", current_content.blog)
        elif channel == "thread":
            content_dict["thread"] = patched.get("thread", current_content.thread)
        else:
            content_dict["email_teaser"] = patched.get("email_teaser", current_content.email_teaser)

        new_content = GeneratedContent(**content_dict)

        log.append(ActivityLogItem(
            agent="Copywriter Agent",
            message=f"'{channel}' channel rewritten successfully.",
            status="success"
        ))

    except Exception as e:
        log.append(ActivityLogItem(
            agent="Copywriter Agent",
            message=f"Regeneration error: {str(e)}",
            status="error"
        ))
        raise

    # Re-run editor only for the affected channel
    log.append(ActivityLogItem(
        agent="Editor-in-Chief",
        message=f"Re-reviewing the regenerated '{channel}' output...",
        status="running"
    ))

    new_review = await editor_agent.run(fact_sheet, new_content, llm, log)

    log.append(ActivityLogItem(
        agent="Orchestrator",
        message=f"Regeneration complete for '{channel}'.",
        status="success"
    ))

    return CampaignResponse(
        fact_sheet=fact_sheet,
        content=new_content,
        review=new_review,
        activity_log=log
    )
