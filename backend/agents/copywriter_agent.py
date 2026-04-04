"""Creative Copywriter Agent"""

from models.schemas import FactSheet, GeneratedContent, ActivityLogItem
from services.llm_service import LLMService


async def run(
    fact_sheet: FactSheet,
    llm: LLMService,
    log: list[ActivityLogItem],
    tone: str = "professional"
) -> GeneratedContent:
    log.append(ActivityLogItem(
        agent="Copywriter Agent",
        message=f"Writing blog post, social thread, and email teaser (tone: {tone})...",
        status="running"
    ))
    try:
        raw = await llm.run_copywriter_agent(fact_sheet.model_dump(), tone=tone)
        content = GeneratedContent(**raw)
        log.append(ActivityLogItem(
            agent="Copywriter Agent",
            message=f"Content drafted: blog '{content.blog_title}', "
                    f"{len(content.thread)} social posts, email teaser ready.",
            status="success"
        ))
        return content
    except Exception as e:
        log.append(ActivityLogItem(
            agent="Copywriter Agent",
            message=f"Error during content generation: {str(e)}",
            status="error"
        ))
        raise
