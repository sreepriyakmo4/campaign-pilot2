"""Editor-in-Chief Agent"""

from models.schemas import FactSheet, GeneratedContent, ReviewResult, ActivityLogItem
from services.llm_service import LLMService


async def run(
    fact_sheet: FactSheet,
    content: GeneratedContent,
    llm: LLMService,
    log: list[ActivityLogItem]
) -> ReviewResult:
    log.append(ActivityLogItem(
        agent="Editor-in-Chief",
        message="Reviewing all outputs for factual accuracy, tone, and formatting...",
        status="running"
    ))
    try:
        raw = await llm.run_editor_agent(
            fact_sheet.model_dump(),
            content.model_dump()
        )
        review = ReviewResult(**raw)

        approved_count = sum([
            review.blog_review.approved,
            review.thread_review.approved,
            review.email_review.approved
        ])

        if approved_count == 3:
            log.append(ActivityLogItem(
                agent="Editor-in-Chief",
                message="✓ All 3 channel outputs approved. Campaign is ready.",
                status="success"
            ))
        else:
            rejected = []
            if not review.blog_review.approved:
                rejected.append("blog")
            if not review.thread_review.approved:
                rejected.append("social thread")
            if not review.email_review.approved:
                rejected.append("email teaser")
            log.append(ActivityLogItem(
                agent="Editor-in-Chief",
                message=f"⚠ {len(rejected)} output(s) need revision: {', '.join(rejected)}.",
                status="warning"
            ))

        return review
    except Exception as e:
        log.append(ActivityLogItem(
            agent="Editor-in-Chief",
            message=f"Error during review: {str(e)}",
            status="error"
        ))
        raise
