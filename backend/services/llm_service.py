import os
import json
import re
import logging

logger = logging.getLogger(__name__)

RESEARCH_PROMPT = """You are the Lead Research & Fact-Check Agent in an autonomous marketing content pipeline.
Read the source material and extract only explicitly supported facts. Do not infer or invent anything.

Tasks:
1. Identify the product or solution name
2. Identify the target audience
3. Extract core product features
4. Extract technical specifications
5. Identify the primary value proposition
6. Extract key marketing messages
7. Flag ambiguous or unclear statements
8. Write a concise source summary

Rules:
- Do not invent facts
- Return empty array or null if info is missing
- Return valid JSON only, no extra text

Output schema:
{{
  "product_name": "string or null",
  "target_audience": ["string"],
  "core_features": ["string"],
  "technical_specs": ["string"],
  "value_proposition": "string or null",
  "key_messages": ["string"],
  "ambiguous_statements": ["string"],
  "source_summary": "string"
}}

Source material:
{source_text}"""

COPYWRITER_PROMPT = """You are the Creative Copywriter Agent in an autonomous content factory.
Create marketing content for three channels based on the fact sheet below.

IMPORTANT: Return ONLY valid JSON. No text before or after. No markdown fences.

Rules:
- Use ONLY information from the fact sheet
- Do not invent features, numbers, prices, or capabilities
- Blog: {tone} tone, exactly 5 short paragraphs, max 350 words total
- Thread: exactly 5 posts, each post max 20 words
- Email: subject line, greeting, 3 short body paragraphs, sign-off, P.S.

Return this exact JSON:
{{
  "blog_title": "string",
  "blog": "Para1.\\n\\nPara2.\\n\\nPara3.\\n\\nPara4.\\n\\nPara5.",
  "thread": ["post1", "post2", "post3", "post4", "post5"],
  "email_teaser": "Subject: ...\\n\\nHi [First Name],\\n\\nParagraph one.\\n\\nParagraph two.\\n\\nParagraph three.\\n\\nWarm regards,\\n[Your Name]\\n[Company]\\n\\nP.S. One sentence."
}}

Fact sheet:
{fact_sheet_json}"""

EDITOR_PROMPT = """You are the Editor-in-Chief Agent. Review the content against the fact sheet.

IMPORTANT: Return ONLY valid JSON. No text before or after. No markdown fences.

Check:
1. No hallucinations or unsupported claims
2. Value proposition is represented
3. Blog has 5 paragraphs
4. Thread has exactly 5 posts
5. Email has subject, greeting, body, sign-off

Return this exact JSON:
{{
  "blog_review": {{"approved": true, "issues": [], "correction_note": ""}},
  "thread_review": {{"approved": true, "issues": [], "correction_note": ""}},
  "email_review": {{"approved": true, "issues": [], "correction_note": ""}},
  "overall_summary": "string"
}}

Fact sheet:
{fact_sheet_json}

Generated outputs:
{generated_outputs_json}"""

REGENERATE_PROMPT = """You are the Creative Copywriter Agent revising a rejected draft.
Regenerate only the requested channel.

IMPORTANT: Return ONLY valid JSON. No text before or after. No markdown fences.

For blog return: {{"blog_title": "...", "blog": "para1\\n\\npara2\\n\\npara3\\n\\npara4\\n\\npara5"}}
For thread return: {{"thread": ["post1","post2","post3","post4","post5"]}}
For email return: {{"email_teaser": "Subject: ...\\n\\nHi [First Name],\\n\\nbody...\\n\\nWarm regards,\\n[Name]\\n[Company]\\n\\nP.S. ..."}}

Channel: {channel}

Fact sheet:
{fact_sheet_json}

Previous output:
{previous_output}

Editor correction note:
{correction_note}"""


class LLMService:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        self.api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
        self.model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

        # General default
        self.max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1200"))

        # Per-agent safer limits
        self.research_max_tokens = int(os.getenv("RESEARCH_MAX_TOKENS", "700"))
        self.copywriter_max_tokens = int(os.getenv("COPYWRITER_MAX_TOKENS", "1200"))
        self.editor_max_tokens = int(os.getenv("EDITOR_MAX_TOKENS", "500"))
        self.regenerate_max_tokens = int(os.getenv("REGENERATE_MAX_TOKENS", "900"))

        logger.info(
            "LLM initialized: provider=%s model=%s max_tokens=%s",
            self.provider, self.model, self.max_tokens
        )

    def _parse_json(self, text: str) -> dict:
        if not text or not text.strip():
            raise ValueError("Empty response from LLM.")

        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        try:
            fixed = text
            if fixed.count('"') % 2 != 0:
                fixed += '"'
            fixed += "]" * max(0, fixed.count("[") - fixed.count("]"))
            fixed += "}" * max(0, fixed.count("{") - fixed.count("}"))
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

        raise ValueError(f"Could not parse JSON: {text[:200]}")

    async def _call_llm(self, prompt: str, max_tokens: int | None = None) -> str:
        import httpx

        if not self.api_key:
            raise ValueError("Missing API key. Set OPENAI_API_KEY in backend/.env")

        logger.info("Calling LLM: %s model=%s", self.base_url, self.model)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": max_tokens if max_tokens is not None else self.max_tokens,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise ValueError(f"LLM API error: {resp.status_code} - {resp.text}") from e

            data = resp.json()
            try:
                return data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as e:
                raise ValueError(f"Unexpected LLM response: {data}") from e

    async def run_research_agent(self, source_text: str) -> dict:
        if self.provider == "mock":
            logger.info("[MOCK] Research agent")
            return {
                "product_name": "Sample Product",
                "target_audience": ["Marketing teams", "Content strategists"],
                "core_features": ["Feature 1", "Feature 2", "Feature 3"],
                "technical_specs": ["Built with modern tech stack"],
                "value_proposition": "Save time and produce better content faster.",
                "key_messages": ["Speed", "Quality", "Consistency"],
                "ambiguous_statements": [],
                "source_summary": "A sample product for demonstration purposes.",
            }

        source_text = source_text[:3000]
        prompt = RESEARCH_PROMPT.format(source_text=source_text)
        raw = await self._call_llm(prompt, max_tokens=self.research_max_tokens)
        return self._parse_json(raw)

    async def run_copywriter_agent(self, fact_sheet: dict, tone: str = "professional") -> dict:
        if self.provider == "mock":
            logger.info("[MOCK] Copywriter agent")
            product = fact_sheet.get("product_name") or "Our Product"
            return {
                "blog_title": f"Introducing {product}: A Smarter Way Forward",
                "blog": (
                    f"Meet {product}, built for teams who need speed without sacrificing quality.\n\n"
                    f"Most teams struggle with fragmented workflows and inconsistent messaging.\n\n"
                    f"{product} brings everything together — automated, structured, and reliable.\n\n"
                    f"Whether solo or a full team, {product} adapts to your workflow seamlessly.\n\n"
                    f"Try {product} today and discover a faster, smarter way to work."
                ),
                "thread": [
                    f"Introducing {product} — speed and consistency for marketing teams.",
                    "The old way: fragmented tools, inconsistent output, wasted hours.",
                    f"{product} brings everything together, fact-checked from day one.",
                    "Built for teams who cannot afford to slow down.",
                    f"Try {product} today and transform your workflow.",
                ],
                "email_teaser": (
                    f"Subject: Meet {product} — your team's new secret weapon\n\n"
                    f"Hi [First Name],\n\n"
                    f"Introducing {product}, built for teams tired of slow, inconsistent workflows.\n\n"
                    f"Without the right system, content gets diluted and deadlines get missed.\n\n"
                    f"{product} automates the heavy lifting — structured, fact-checked outputs from a single source.\n\n"
                    f"Warm regards,\n[Your Name]\n[Company Name]\n\n"
                    f"P.S. Every output is reviewed before it reaches you."
                ),
            }

        slim_fact_sheet = {
            "product_name": fact_sheet.get("product_name"),
            "value_proposition": fact_sheet.get("value_proposition"),
            "core_features": fact_sheet.get("core_features", [])[:5],
            "target_audience": fact_sheet.get("target_audience", [])[:3],
            "key_messages": fact_sheet.get("key_messages", [])[:4],
            "source_summary": fact_sheet.get("source_summary", "")[:400],
        }

        prompt = COPYWRITER_PROMPT.format(
            tone=tone,
            fact_sheet_json=json.dumps(slim_fact_sheet, indent=2),
        )
        raw = await self._call_llm(prompt, max_tokens=self.copywriter_max_tokens)
        return self._parse_json(raw)

    async def run_editor_agent(self, fact_sheet: dict, generated_content: dict) -> dict:
        if self.provider == "mock":
            logger.info("[MOCK] Editor agent")
            return {
                "blog_review": {"approved": True, "issues": [], "correction_note": ""},
                "thread_review": {"approved": True, "issues": [], "correction_note": ""},
                "email_review": {"approved": True, "issues": [], "correction_note": ""},
                "overall_summary": "All outputs approved. Content is factually grounded.",
            }

        slim_fact_sheet = {
            "product_name": fact_sheet.get("product_name"),
            "value_proposition": fact_sheet.get("value_proposition"),
            "core_features": fact_sheet.get("core_features", [])[:5],
            "key_messages": fact_sheet.get("key_messages", [])[:4],
        }
        slim_content = {
            "blog_title": generated_content.get("blog_title", ""),
            "blog": generated_content.get("blog", "")[:600],
            "thread": generated_content.get("thread", []),
            "email_teaser": generated_content.get("email_teaser", "")[:300],
        }

        prompt = EDITOR_PROMPT.format(
            fact_sheet_json=json.dumps(slim_fact_sheet, indent=2),
            generated_outputs_json=json.dumps(slim_content, indent=2),
        )
        raw = await self._call_llm(prompt, max_tokens=self.editor_max_tokens)
        return self._parse_json(raw)

    async def run_regenerate_agent(
        self, channel: str, fact_sheet: dict,
        previous_output: dict, correction_note: str,
    ) -> dict:
        if self.provider == "mock":
            logger.info("[MOCK] Regenerating %s", channel)
            if channel == "blog":
                return {
                    "blog_title": "Revised Blog Post",
                    "blog": "Revised intro.\n\nRevised problem.\n\nRevised features.\n\nRevised audience.\n\nRevised conclusion."
                }
            elif channel == "thread":
                return {"thread": [
                    "Revised post 1 with stronger hook.",
                    "Revised post 2 with clearer problem.",
                    "Revised post 3 highlighting features.",
                    "Revised post 4 for target audience.",
                    "Revised post 5 with call to action."
                ]}
            else:
                return {"email_teaser": (
                    "Subject: Revised subject\n\n"
                    "Hi [First Name],\n\n"
                    "Revised opening paragraph.\n\n"
                    "Revised features paragraph.\n\n"
                    "Revised CTA paragraph.\n\n"
                    "Warm regards,\n[Your Name]\n[Company]\n\n"
                    "P.S. Revised postscript."
                )}

        if channel not in {"blog", "thread", "email"}:
            raise ValueError(f"Invalid channel: {channel}")

        slim_fact_sheet = {
            "product_name": fact_sheet.get("product_name"),
            "value_proposition": fact_sheet.get("value_proposition"),
            "core_features": fact_sheet.get("core_features", [])[:5],
            "key_messages": fact_sheet.get("key_messages", [])[:4],
        }

        slim_previous_output = previous_output
        if channel == "blog":
            slim_previous_output = {
                "blog_title": previous_output.get("blog_title", ""),
                "blog": previous_output.get("blog", "")[:500],
            }
        elif channel == "email":
            slim_previous_output = {
                "email_teaser": previous_output.get("email_teaser", "")[:400],
            }

        prompt = REGENERATE_PROMPT.format(
            channel=channel,
            fact_sheet_json=json.dumps(slim_fact_sheet, indent=2),
            previous_output=json.dumps(slim_previous_output, indent=2),
            correction_note=correction_note[:300],
        )
        raw = await self._call_llm(prompt, max_tokens=self.regenerate_max_tokens)
        return self._parse_json(raw)