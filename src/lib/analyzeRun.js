// src/lib/analyzeRun.js
// Claude AI로 러닝 이미지 분석

export async function analyzeRunImage(base64Data, mediaType) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: `This is a running app screenshot. Extract stats and return ONLY valid JSON (no markdown):
{"distance":<km number>,"duration":<seconds number>,"pace":<"M'SS\\"" string>,"calories":<number>,"date":<"YYYY-MM-DD" or null>,"appName":<string or null>,"confidence":<"high"|"medium"|"low">,"error":<null or "not_running">}
Convert all distances to km and durations to seconds. If not a running image: {"error":"not_running"}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "AI 분석 실패");
  }

  const data = await res.json();
  const text = data.content?.map((c) => c.text || "").join("") || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
