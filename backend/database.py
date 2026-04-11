"""
MongoDB connection using Motor (async MongoDB driver for Python).
Motor is the async version of PyMongo — perfect for FastAPI.
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGODB_DB_NAME", "campaignpilot")

# Single client instance shared across the app (Motor is thread/async safe)
client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Call this once when the FastAPI app starts."""
    global client, db
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    logger.info("Connected to MongoDB: %s / %s", MONGODB_URL, DATABASE_NAME)


async def close_db():
    """Call this once when the FastAPI app shuts down."""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")


def get_db():
    """Return the active database instance."""
    return db


# ---------------------------------------------------------------------------
# Collection helpers — call these anywhere in the app
# ---------------------------------------------------------------------------

def get_users_collection():
    return db["users"]


def get_campaigns_collection():
    return db["campaigns"]
