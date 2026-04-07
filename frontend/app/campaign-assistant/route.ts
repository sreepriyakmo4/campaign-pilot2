import { NextRequest, NextResponse } from "next/server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { messages, campaignContext } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const safeMessages: Message[] = Array.isArray(messages) ? messages : [];

    const conversationText = safeMessages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    const systemPrompt = `
You are a Campaign AI Assistant with full context of the user's marketing campaign.

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

Overall summary:
${campaignContext?.review?.overall_summary ?? ""}

Your job:
1. Answer questions about the campaign
2. Suggest small copy edits
3. Rewrite specific lines on request
4. Generate headline or subject-line variants
5. Explain review feedback clearly

Rules:
- Be concise, practical, and copyable
- Do not invent facts not present in the campaign context
- When rewriting copy, clearly label it
- Keep tone useful for a marketing workflow
`;

    const prompt = `
${systemPrompt}

Conversation so far:
${conversationText}

Now respond to the latest user message.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 700,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return NextResponse.json(
        {
          error:
            data?.error?.message || "Gemini request failed",
        },
        { status: response.status }
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
      "No response generated.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Campaign assistant route error:", error);
    return NextResponse.json(
      { error: "Something went wrong in campaign assistant route." },
      { status: 500 }
    );
  }
}