"""
Analytics Service
-----------------
Computes content quality scores using rule-based heuristics.
No extra API calls needed — instant results.
All scores are 0-100 integers for easy progress bar display.
"""

import re
from collections import Counter
from models.campaign_v2 import AnalyticsResult


SEO_POSITIVE_WORDS = {
    "you", "your", "free", "new", "now", "how", "why", "best", "top",
    "easy", "fast", "save", "boost", "grow", "start", "today", "result",
    "proven", "simple", "powerful", "effective", "exclusive", "discover",
    "learn", "improve", "increase", "reduce", "transform",
}

NEGATIVE_SENTIMENT_WORDS = {
    "bad", "fail", "worse", "poor", "weak", "slow", "difficult", "hard",
    "expensive", "confusing", "complex", "broken", "wrong", "never",
    "impossible", "terrible", "awful", "horrible", "useless",
}

POSITIVE_SENTIMENT_WORDS = {
    "great", "excellent", "amazing", "wonderful", "fantastic", "perfect",
    "outstanding", "superb", "brilliant", "innovative", "revolutionary",
    "seamless", "powerful", "efficient", "reliable", "smart", "easy",
    "fast", "simple", "beautiful", "elegant", "intuitive", "proven",
}

TONE_PROFESSIONAL_MARKERS = {
    "therefore", "however", "furthermore", "additionally", "consequently",
    "solution", "platform", "enterprise", "streamline", "optimize",
    "leverage", "implement", "strategic", "comprehensive", "robust",
}

TONE_CASUAL_MARKERS = {
    "hey", "cool", "awesome", "super", "really", "totally", "actually",
    "basically", "literally", "pretty",
}


def _words(text: str) -> list[str]:
    return re.findall(r"\b[a-z]+\b", text.lower())


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]


def _syllable_count(word: str) -> int:
    word = word.lower()
    count = len(re.findall(r"[aeiou]+", word))
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)


def _readability_score(text: str) -> int:
    words = _words(text)
    sentences = _sentences(text)
    if not words or not sentences:
        return 50
    avg_sentence_length = len(words) / len(sentences)
    avg_syllables = sum(_syllable_count(w) for w in words) / len(words)
    flesch = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables)
    return max(0, min(100, int(flesch)))


def _seo_score(blog_text: str, email_text: str, thread_posts: list[str]) -> int:
    all_text = blog_text + " " + email_text + " ".join(thread_posts)
    words = _words(all_text)
    if not words:
        return 0
    score = 0
    power_hits = sum(1 for w in words if w in SEO_POSITIVE_WORDS)
    score += min(30, int((power_hits / len(words)) * 1000))
    blog_words = len(_words(blog_text))
    if 400 <= blog_words <= 600:
        score += 30
    elif 300 <= blog_words < 400 or 600 < blog_words <= 800:
        score += 20
    elif blog_words > 100:
        score += 10
    blog_lines = [l.strip() for l in blog_text.split("\n") if l.strip()]
    if blog_lines and len(blog_lines[0].split()) <= 10:
        score += 20
    if "subject:" in email_text.lower():
        score += 20
    return min(100, score)


def _sentiment_score(text: str) -> tuple[int, str]:
    words = _words(text)
    if not words:
        return 50, "neutral"
    positive_hits = sum(1 for w in words if w in POSITIVE_SENTIMENT_WORDS)
    negative_hits = sum(1 for w in words if w in NEGATIVE_SENTIMENT_WORDS)
    total = len(words)
    score = 50 + int((positive_hits / total) * 500) - int((negative_hits / total) * 500)
    score = max(0, min(100, score))
    if score >= 65:
        label = "positive"
    elif score <= 35:
        label = "negative"
    else:
        label = "neutral"
    return score, label


def _tone_consistency_score(text: str, tone: str) -> int:
    words = set(_words(text))
    if tone in ("professional", "bold"):
        marker_set = TONE_PROFESSIONAL_MARKERS
    else:
        marker_set = TONE_CASUAL_MARKERS
    hits = len(words & marker_set)
    return min(100, hits * 20)


def _top_keywords(text: str, n: int = 5) -> list[str]:
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
        "for", "of", "with", "by", "from", "as", "is", "was", "are",
        "were", "be", "been", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "it", "its",
        "this", "that", "these", "those", "i", "you", "we", "they",
        "my", "your", "our", "their",
    }
    words = [w for w in _words(text) if w not in stop_words and len(w) > 3]
    most_common = Counter(words).most_common(n)
    return [word for word, _ in most_common]


def analyze_content(generated_content: dict, tone: str = "professional") -> AnalyticsResult:
    """
    Main entry point. Pass a generatedContent dict and get back AnalyticsResult.
    Usage: result = analyze_content(campaign_doc["generatedContent"], tone="professional")
    """
    blog_text    = generated_content.get("blog", "")
    blog_title   = generated_content.get("blog_title", "")
    email_text   = generated_content.get("email_teaser", "")
    thread_posts = generated_content.get("thread", [])

    full_text = f"{blog_title}\n{blog_text}\n{email_text}\n{' '.join(thread_posts)}"

    readability          = _readability_score(blog_text)
    seo                  = _seo_score(blog_text, email_text, thread_posts)
    sentiment, label     = _sentiment_score(full_text)
    tone_consistency     = _tone_consistency_score(full_text, tone)
    keywords             = _top_keywords(full_text)

    blog_wc  = len(_words(blog_text))
    email_wc = len(_words(email_text))
    total_wc = len(_words(full_text))

    return AnalyticsResult(
        readabilityScore  = readability,
        seoScore          = seo,
        sentimentScore    = sentiment,
        sentimentLabel    = label,
        toneConsistency   = tone_consistency,
        wordCount         = total_wc,
        blogWordCount     = blog_wc,
        emailWordCount    = email_wc,
        threadPostCount   = len(thread_posts),
        topKeywords       = keywords,
    )