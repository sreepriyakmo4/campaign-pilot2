"""
Export Service — packages campaign assets into a downloadable ZIP.
Contents:
  - fact_sheet.json
  - blog.md
  - thread.txt
  - email.txt
  - review_report.json
"""

import io
import json
import zipfile
from models.schemas import FactSheet, GeneratedContent, ReviewResult


def build_zip(
    fact_sheet: FactSheet,
    content: GeneratedContent,
    review: ReviewResult
) -> bytes:
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # fact_sheet.json
        zf.writestr("fact_sheet.json", json.dumps(fact_sheet.model_dump(), indent=2))

        # blog.md
        blog_md = f"# {content.blog_title}\n\n{content.blog}"
        zf.writestr("blog.md", blog_md)

        # thread.txt
        thread_txt = "\n\n---\n\n".join(
            [f"Post {i+1}:\n{post}" for i, post in enumerate(content.thread)]
        )
        zf.writestr("thread.txt", thread_txt)

        # email.txt
        zf.writestr("email.txt", content.email_teaser)

        # review_report.json
        zf.writestr("review_report.json", json.dumps(review.model_dump(), indent=2))

    return buffer.getvalue()
