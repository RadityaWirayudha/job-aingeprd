import { NextRequest } from "next/server";
import { streamChat, ChatMessage } from "@/lib/openrouter";
import { SYSTEM_PROMPT } from "@/lib/prd-prompt";

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: ChatMessage[] };

  const fullMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    const response = await streamChat(fullMessages);

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
