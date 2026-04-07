<<<<<<< HEAD
# CampaignPilot AI

> **Autonomous Multi-Agent Marketing Content Factory**

---

## Project Title

**CampaignPilot AI** — An autonomous multi-agent system that transforms any source document into a complete, fact-checked, multi-channel marketing campaign in minutes.

---

## The Problem

Marketing teams waste hours producing content across blogs, social media, and email — only to end up with inconsistent messaging that drifts from the original brief. Coordinating writers across channels is slow, error-prone, and expensive. There is no reliable way to ensure every piece of content stays factually grounded and tonally consistent across all platforms simultaneously.

---

## The Solution

CampaignPilot AI solves this by running three specialized AI agents in sequence — automatically, from a single source document:

1. **Research & Fact-Check Agent** — Reads the source material and extracts only explicitly supported facts into a structured fact sheet. Nothing is invented.
2. **Creative Copywriter Agent** — Uses the fact sheet (never the raw source) to generate a 500-word blog post, a 5-post social media thread, and a full email draft — all in one pass.
3. **Editor-in-Chief Agent** — Reviews every output for hallucinations, tone issues, and formatting errors. Approves or rejects each channel with specific correction notes.

If any channel is rejected, users can regenerate just that channel with one click. Every campaign is saved to local history. All assets can be exported as a ZIP file containing structured JSON, Markdown, and text files ready for any CMS or email platform.

---

## Tech Stack

### Languages
- **Python 3.11+** — Backend logic and agent orchestration
- **TypeScript** — Frontend application
- **CSS** — Styling via Tailwind CSS

### Frameworks
- **FastAPI** — Backend REST API server
- **Next.js 14** — Frontend React framework (App Router)
- **Tailwind CSS** — Utility-first CSS framework
- **NextAuth.js** — Google OAuth authentication

### APIs & Third-Party Tools
- **Groq API** (free) — LLM provider using `llama-3.3-70b-versatile` model
- **OpenAI-compatible API format** — Pluggable: works with OpenAI, Groq, Together AI, Ollama
- **Google OAuth 2.0** — User authentication via Google Sign-In

### Storage
- **Browser localStorage** — Campaign history stored client-side (no database required)
- **sessionStorage** — Active campaign state between pages

### Other
- **Python zipfile** — Campaign asset export
- **httpx** — Async HTTP client for LLM API calls
- **Pydantic v2** — Data validation and schema enforcement

---

## Setup Instructions

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- A free Groq API key from [console.groq.com](https://console.groq.com)
- Google OAuth credentials from [console.cloud.google.com](https://console.cloud.google.com)

---

### 1. Clone or Extract the Project

```bash
cd campaign-pilot
```

---

### 2. Backend Setup

```bash
cd backend
```

**Create and activate a virtual environment:**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

**Install dependencies:**

```bash
pip install fastapi uvicorn[standard] pydantic httpx python-dotenv
```

**Create the environment file:**

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

**Edit `backend/.env` with your credentials:**

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=gsk_your_groq_api_key_here
LLM_MODEL=llama-3.3-70b-versatile
LLM_BASE_URL=https://api.groq.com/openai/v1
```

> **Demo mode (no API key needed):** Set `LLM_PROVIDER=mock` to run with sample data instantly.

**Start the backend server:**

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend runs at: [http://localhost:8000](http://localhost:8000)
API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Frontend Setup

Open a **new terminal** and navigate to the frontend:

```bash
cd frontend
```

**Install dependencies:**

```bash
npm install
```

**Create the environment file:**

```bash
# Windows
copy .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

**Edit `frontend/.env.local` with your credentials:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=any-long-random-string-here
NEXTAUTH_URL=http://localhost:3000
```

> **Getting Google OAuth credentials:**
> 1. Go to [console.cloud.google.com](https://console.cloud.google.com)
> 2. Create a project → APIs & Services → Credentials
> 3. Create OAuth 2.0 Client ID (Web application)
> 4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
> 5. Copy the Client ID and Client Secret

**Start the frontend dev server:**

```bash
npm run dev
```

Frontend runs at: [http://localhost:3000](http://localhost:3000)

---

### 4. Using the App

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Sign in with your Google account
3. Paste your product brief, press release, or any source material
4. Select a campaign tone
5. Click **Generate Campaign**
6. Review the blog post, social thread, and email draft
7. Regenerate any channel individually if needed
8. Export everything as a ZIP file

---

### 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/run-campaign` | Run the full 3-agent pipeline |
| POST | `/api/regenerate` | Regenerate a single channel |
| POST | `/api/export` | Download campaign as ZIP |

---

### Project Structure

```
campaign-pilot/
├── README.md
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── agents/
│   │   ├── research_agent.py      # Stage 1: fact extraction
│   │   ├── copywriter_agent.py    # Stage 2: content generation
│   │   └── editor_agent.py        # Stage 3: editorial review
│   ├── services/
│   │   ├── llm_service.py         # LLM provider + all prompts
│   │   ├── orchestrator.py        # Pipeline coordination
│   │   └── export_service.py      # ZIP packaging
│   ├── models/
│   │   └── schemas.py             # Pydantic data models
│   └── routes/
│       ├── campaign.py            # Campaign API routes
│       └── export.py              # Export API route
└── frontend/
    ├── app/
    │   ├── page.tsx               # Home / campaign start
    │   ├── dashboard/page.tsx     # Campaign results dashboard
    │   ├── history/page.tsx       # Past campaigns archive
    │   ├── login/page.tsx         # Google sign-in page
    │   └── api/
    │       ├── auth/              # NextAuth handler
    │       └── scrape/            # URL text extraction
    ├── components/                # All UI components
    └── lib/
        ├── api.ts                 # Backend API client
        ├── types.ts               # TypeScript interfaces
        └── history.ts             # localStorage history manager
```

---

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `uvicorn not found` | Run `pip install uvicorn` inside the activated venv |
| `[MOCK]` in terminal logs | Set `LLM_PROVIDER=openai` in `backend/.env` |
| `invalid_client` Google error | Remove `your-` prefix from `GOOGLE_CLIENT_ID` in `.env.local` |
| JSON parse error from LLM | Add `"max_tokens": 4096` to the payload in `llm_service.py` |
| Frontend shows blank page | Ensure backend is running on port 8000 before starting frontend |
| `npm` not found | Install Node.js LTS from [nodejs.org](https://nodejs.org) |
=======
# campaign-pilot2
>>>>>>> 90bf8508528a2e14f0c9e72d07b27d0823ca32ad
