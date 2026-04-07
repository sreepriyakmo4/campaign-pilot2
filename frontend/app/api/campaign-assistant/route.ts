import { NextRequest, NextResponse } from "next/server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { messages, campaignContext } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const safeMessages: Message[] = Array.isArray(messages) ? messages : [];

    const systemPrompt = `You are a Campaign AI Assistant with full context of the user's marketing campaign.

FACT SHEET:
${JSON.stringify(campaignContext?.fact_sheet ?? {}, null, 2)}

GENERATED CONTENT:
Blog title: ${campaignContext?.content?.blog_title ?? ""}
Blog: ${(campaignContext?.content?.blog ?? "").slice(0, 1200)}
Thread posts: ${Array.isArray(campaignContext?.content?.thread) ? campaignContext.content.thread.join(" | ") : ""}
Email teaser: ${(campaignContext?.content?.email_teaser ?? "").slice(0, 800)}

EDITORIAL REVIEW:
Blog approved: ${campaignContext?.review?.blog_review?.approved ?? false}
Blog notes: ${campaignContext?.review?.blog_review?.correction_note ?? ""}
Thread approved: ${campaignContext?.review?.thread_review?.approved ?? false}
Thread notes: ${campaignContext?.review?.thread_review?.correction_note ?? ""}
Email approved: ${campaignContext?.review?.email_review?.approved ?? false}
Email notes: ${campaignContext?.review?.email_review?.correction_note ?? ""}
Overall summary: ${campaignContext?.review?.overall_summary ?? ""}

Your job:
1. Answer questions about the campaign
2. Suggest small copy edits
3. Rewrite specific lines on request
4. Generate headline or subject-line variants
5. Explain review feedback clearly

Rules:
- Be concise, practical, and copyable
- Do not invent facts not present in the campaign context
- When rewriting copy, clearly label it`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...safeMessages,
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Groq request failed" },
        { status: response.status }
      );
    }

    const reply = data?.choices?.[0]?.message?.content || "No response generated.";
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Campaign assistant route error:", error);
    return NextResponse.json(
      { error: "Something went wrong in campaign assistant route." },
      { status: 500 }
    );
  }
}