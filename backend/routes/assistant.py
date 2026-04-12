"""
AI Assistant API Routes

POST   /api/assistant/chat
GET    /api/assistant/history?userId=xxx
GET    /api/assistant/history/:id?userId=xxx
DELETE /api/assistant/history/:id?userId=xxx
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from bson.errors import InvalidId

from database import get_conversations_collection
from models.conversation import ChatRequest, ConversationPublic, ConversationSummary
from services.assistant_service import process_chat

logger = logging.getLogger(__name__)
router = APIRouter()


def _parse_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail=f"Invalid ID: {id_str}")


@router.post("/assistant/chat")
async def chat(req: ChatRequest):
    """
    Send a message, get a reply. Conversation stored automatically.

    Request:
    {
      "userId": "abc123",
      "message": "Improve the blog intro",
      "campaignId": "665f...",        ← optional
      "conversationId": "665g..."     ← optional, omit to start new chat
    }

    Response:
    {
      "reply": "Here's a revised intro...",
      "conversationId": "665g...",
      "role": "assistant"
    }
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if not req.userId.strip():
        raise HTTPException(status_code=400, detail="userId is required.")

    try:
        result = await process_chat(
            user_id         = req.userId,
            user_message    = req.message.strip(),
            campaign_id     = req.campaignId,
            conversation_id = req.conversationId,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Assistant chat error: %s", e)
        raise HTTPException(status_code=500, detail="Assistant request failed.")


@router.get("/assistant/history", response_model=list[ConversationSummary])
async def get_history(userId: str = Query(...)):
    """Return all conversations for a user, newest first."""
    convs = get_conversations_collection()
    cursor = convs.find({"userId": userId}).sort("updatedAt", -1).limit(50)
    docs = await cursor.to_list(length=50)

    summaries = []
    for doc in docs:
        messages = doc.get("messages", [])
        last_assistant = next(
            (m["content"][:100] for m in reversed(messages) if m["role"] == "assistant"),
            None,
        )
        summaries.append(ConversationSummary(
            id           = str(doc["_id"]),
            campaignId   = doc.get("campaignId"),
            lastMessage  = last_assistant,
            messageCount = len(messages),
            createdAt    = doc["createdAt"],
            updatedAt    = doc["updatedAt"],
        ))
    return summaries


@router.get("/assistant/history/{conversation_id}", response_model=ConversationPublic)
async def get_conversation(conversation_id: str, userId: str = Query(...)):
    """Get the full message history of one conversation."""
    convs = get_conversations_collection()
    oid = _parse_oid(conversation_id)
    doc = await convs.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if doc["userId"] != userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    return ConversationPublic(
        id         = str(doc["_id"]),
        userId     = doc["userId"],
        campaignId = doc.get("campaignId"),
        messages   = doc.get("messages", []),
        createdAt  = doc["createdAt"],
        updatedAt  = doc["updatedAt"],
    )


@router.delete("/assistant/history/{conversation_id}")
async def delete_conversation(conversation_id: str, userId: str = Query(...)):
    """Delete a conversation (ownership check included)."""
    convs = get_conversations_collection()
    oid = _parse_oid(conversation_id)
    doc = await convs.find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if doc["userId"] != userId:
        raise HTTPException(status_code=403, detail="Access denied.")

    await convs.delete_one({"_id": oid})
    return {"success": True, "deletedId": conversation_id}