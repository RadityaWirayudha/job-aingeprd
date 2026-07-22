const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function streamChat(messages: ChatMessage[]) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aingeprd.app",
      "X-Title": "AiNgePRD",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.statusText}`);
  }

  return response;
}
