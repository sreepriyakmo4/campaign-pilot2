"""
Assistant Service
-----------------
Handles the AI assistant with memory:
1. Load/create conversation from MongoDB
2. Build context-aware system prompt (with optional campaign context)
3. Call LLM
4. Save both messages back to MongoDB
5. Return reply + conversationId
"""

import os
import logging
from datetime import datetime, timezone

import httpx
from bson import ObjectId

from database import get_campaigns_collection, get_conversations_collection

logger = logging.getLogger(__name__)

LLM_API_KEY  = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_MODEL    = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """You are CampaignPilot AI Assistant — an expert marketing copywriter and strategist.

{campaign_context}

You help users:
- Improve blog posts, social threads, and email drafts
- Rewrite content in different tones (professional, casual, bold, empathetic)
- Convert content for specific platforms (LinkedIn, Twitter/X, Instagram)
- Fix tone inconsistencies flagged by the editor
- Suggest headline and subject-line variants
- Explain review feedback in plain language

Rules:
- Be concise and practical — give copy the user can immediately use
- Label any rewritten content clearly (e.g. "Revised blog intro:")
- Never invent facts not present in the campaign context
- Keep responses under 400 words unless the user asks for a full rewrite
"""

CAMPAIGN_CONTEXT_BLOCK = """CURRENT CAMPAIGN:
Product: {product_name}
Value proposition: {value_proposition}
Target audience: {target_audience}

Blog title: {blog_title}
Blog (preview): {blog_preview}

Thread posts:
{thread_posts}

Email teaser (preview): {email_preview}

Editorial review:
- Blog: {blog_status} {blog_note}
- Thread: {thread_status} {thread_note}
- Email: {email_status} {email_note}
"""


async def _get_campaign_context(campaign_id: str) -> str:
    """Fetch a campaign from MongoDB and format it as context text."""
    try:
        campaigns = get_campaigns_collection()
        doc = await campaigns.find_one({"_id": ObjectId(campaign_id)})
        if not doc:
            return ""

        content = doc.get("generatedContent") or {}
        review  = doc.get("reviewResult") or {}
        fs      = doc.get("factSheet") or {}

        # Support V2 versioned campaigns: use currentVersionId content if available
        if doc.get("versions") and doc.get("currentVersionId"):
            for v in doc["versions"]:
                if v.get("versionId") == doc["currentVersionId"]:
                    content = v.get("generatedContent") or content
                    review  = v.get("reviewResult") or review
                    break

        br = review.get("blog_review", {})
        tr = review.get("thread_review", {})
        er = review.get("email_review", {})

        thread_posts = "\n".join(
            f"  {i+1}. {p}" for i, p in enumerate(content.get("thread", []))
        )

        return CAMPAIGN_CONTEXT_BLOCK.format(
            product_name      = fs.get("product_name") or "Unknown",
            value_proposition = fs.get("value_proposition") or "—",
            target_audience   = ", ".join(fs.get("target_audience", [])) or "—",
            blog_title        = content.get("blog_title") or "—",
            blog_preview      = (content.get("blog") or "")[:600],
            thread_posts      = thread_posts or "—",
            email_preview     = (content.get("email_teaser") or "")[:400],
            blog_status       = "✓ Approved" if br.get("approved") else "✗ Rejected",
            blog_note         = br.get("correction_note") or "",
            thread_status     = "✓ Approved" if tr.get("approved") else "✗ Rejected",
            thread_note       = tr.get("correction_note") or "",
            email_status      = "✓ Approved" if er.get("approved") else "✗ Rejected",
            email_note        = er.get("correction_note") or "",
        )
    except Exception as e:
        logger.warning("Could not build campaign context: %s", e)
        return ""


async def _call_llm(messages: list[dict]) -> str:
    if not LLM_API_KEY:
        raise ValueError("Missing LLM_API_KEY / OPENAI_API_KEY in environment.")

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{LLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 700,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def process_chat(
    user_id: str,
    user_message: str,
    campaign_id: str | None = None,
    conversation_id: str | None = None,
) -> dict:
    """
    Main assistant logic.
    Returns: { "reply": str, "conversationId": str, "role": "assistant" }
    """
    conversations = get_conversations_collection()
    now = datetime.now(timezone.utc)

    # ── 1. Load or create conversation ───────────────────────────────────────
    conv_doc = None
    if conversation_id:
        try:
            conv_doc = await conversations.find_one({"_id": ObjectId(conversation_id)})
        except Exception:
            pass

    if not conv_doc:
        result = await conversations.insert_one({
            "userId":     user_id,
            "campaignId": campaign_id,
            "messages":   [],
            "createdAt":  now,
            "updatedAt":  now,
        })
        conv_doc = await conversations.find_one({"_id": result.inserted_id})

    conv_id_str      = str(conv_doc["_id"])
    existing_messages: list[dict] = conv_doc.get("messages", [])

    # ── 2. Build system prompt ────────────────────────────────────────────────
    context_block = ""
    if campaign_id:
        context_block = await _get_campaign_context(campaign_id)

    system_content = SYSTEM_PROMPT.format(
        campaign_context=context_block if context_block
        else "No campaign selected — answer general marketing questions."
    )

    # ── 3. Build LLM messages array (last 10 turns for context window) ────────
    recent = existing_messages[-10:] if len(existing_messages) > 10 else existing_messages
    llm_messages = [{"role": "system", "content": system_content}]
    llm_messages += [{"role": m["role"], "content": m["content"]} for m in recent]
    llm_messages.append({"role": "user", "content": user_message})

    # ── 4. Call LLM ───────────────────────────────────────────────────────────
    assistant_reply = await _call_llm(llm_messages)

    # ── 5. Persist both messages ──────────────────────────────────────────────
    await conversations.update_one(
        {"_id": conv_doc["_id"]},
        {
            "$push": {"messages": {"$each": [
                {"role": "user",      "content": user_message,    "timestamp": now},
                {"role": "assistant", "content": assistant_reply, "timestamp": now},
            ]}},
            "$set": {"updatedAt": now, "campaignId": campaign_id},
        }
    )

    return {
        "reply":          assistant_reply,
        "conversationId": conv_id_str,
        "role":           "assistant",
    }