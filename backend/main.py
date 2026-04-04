from dotenv import load_dotenv
load_dotenv()

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.campaign import router as campaign_router
from routes.export import router as export_router
from routes.stream import router as stream_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="CampaignPilot AI",
    description="Multi-agent autonomous content factory for marketing teams.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaign_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(stream_router, prefix="/api")

@app.exception_handler(413)
async def request_too_large(request: Request, exc: Exception):
    return JSONResponse(
        status_code=413,
        content={"detail": "Source text is too large. Please paste less than 8000 characters."}
    )

@app.get("/")
def root():
    return {"status": "ok", "message": "CampaignPilot AI v2 running"}