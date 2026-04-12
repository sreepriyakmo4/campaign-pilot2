"""
MongoDB connection using Motor (async MongoDB driver).
Fixed for Python 3.14 + MongoDB Atlas SSL compatibility.
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MONGODB_URL   = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("MONGODB_DB_NAME")

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db

    # tlsAllowInvalidCertificates=True fixes the SSL handshake error
    # on Python 3.14 with MongoDB Atlas
    client = AsyncIOMotorClient(
        MONGODB_URL,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=30000,
    )
    db = client[DATABASE_NAME]
    logger.info("Connected to MongoDB: %s / %s", MONGODB_URL, DATABASE_NAME)

    await _create_indexes()


async def _create_indexes():
    """Create indexes on startup — safe to run every time (idempotent)."""
    try:
        await db["users"].create_index("googleId", unique=True)
        await db["campaigns"].create_index("userId")
        await db["campaigns"].create_index([("userId", 1), ("createdAt", -1)])
        await db["conversations"].create_index("userId")
        await db["conversations"].create_index([("userId", 1), ("updatedAt", -1)])
        logger.info("MongoDB indexes ensured.")
    except Exception as e:
        logger.warning("Index creation warning (non-fatal): %s", e)


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")


def get_db():
    return db


def get_users_collection():
    return db["users"]


def get_campaigns_collection():
    return db["campaigns"]


def get_conversations_collection():
    return db["conversations"]