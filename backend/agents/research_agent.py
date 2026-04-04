"""Research & Fact-Check Agent"""

from models.schemas import FactSheet, ActivityLogItem
from services.llm_service import LLMService


async def run(source_text: str, llm: LLMService, log: list[ActivityLogItem]) -> FactSheet:
    log.append(ActivityLogItem(
        agent="Research Agent",
        message="Analyzing source material and extracting facts...",
        status="running"
    ))
    try:
        raw = await llm.run_research_agent(source_text)
        fact_sheet = FactSheet(**raw)
        log.append(ActivityLogItem(
            agent="Research Agent",
            message=f"Fact sheet complete. Found {len(fact_sheet.core_features)} features, "
                    f"{len(fact_sheet.key_messages)} key messages.",
            status="success"
        ))
        if fact_sheet.ambiguous_statements:
            log.append(ActivityLogItem(
                agent="Research Agent",
                message=f"⚠ Flagged {len(fact_sheet.ambiguous_statements)} ambiguous statement(s) for review.",
                status="warning"
            ))
        return fact_sheet
    except Exception as e:
        log.append(ActivityLogItem(
            agent="Research Agent",
            message=f"Error during research: {str(e)}",
            status="error"
        ))
        raise
