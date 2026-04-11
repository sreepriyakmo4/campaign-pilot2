from dotenv import load_dotenv
load_dotenv()

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import connect_db, close_db
from routes.campaign import router as campaign_router
from routes.export import router as export_router
from routes.stream import router as stream_router
from routes.users import router as users_router
from routes.campaigns_db import router as campaigns_db_router

logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# Lifespan — connects/disconnects MongoDB when the server starts/stops
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    yield
    # Shutdown
    await close_db()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CampaignPilot AI",
    description="Multi-agent autonomous content factory for marketing teams.",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing agent pipeline routes
app.include_router(campaign_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(stream_router, prefix="/api")

# New database routes
app.include_router(users_router, prefix="/api")          # /api/users/...
app.include_router(campaigns_db_router, prefix="/api/db") # /api/db/campaigns/...


@app.exception_handler(413)
async def request_too_large(request: Request, exc: Exception):
    return JSONResponse(
        status_code=413,
        content={"detail": "Source text is too large. Please paste less than 8000 characters."}
    )


@app.get("/")
def root():
    return {"status": "ok", "message": "CampaignPilot AI v3 running"}