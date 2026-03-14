// src/lib/analyzeRun.js

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
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          {
            type: "text",
            text: `Analyze this running workout screenshot (Garmin, Nike Run Club, Apple Watch, Strava, etc).

Return ONLY a raw JSON object, no markdown, no explanation:
{"distance":<km decimal>,"duration":<total seconds int>,"pace":<"M'SS\\"">,"calories":<total kcal int>,"date":<"YYYY-MM-DD" or null>,"appName":<app name or null>,"confidence":<"high"|"medium"|"low">,"error":<null or "not_running">}

RULES:
- distance: "러닝 거리" / "Distance" / km value. Miles → km (×1.609)
- duration: "총 시간" / "Elapsed Time" / "Duration". HH:MM:SS or MM:SS → seconds
- pace: "평균 페이스" / "Avg Pace" → format M'SS" e.g. 7'25"
- calories: "총 칼로리" / "Total Calories" — prefer total over active
- If not a running record: {"error":"not_running"}`,
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "AI 분석 실패");
  }

  const data = await res.json();
  const text = data.content?.map((c) => c.text || "").join("") || "";
  // JSON 블록 추출 - ```json ... ``` 또는 { ... } 찾기
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI 응답에서 JSON을 찾을 수 없어요.");
  return JSON.parse(match[0]);
}

export async function generateRunFeedback({ distance, duration, pace, calories }) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const paceMin = pace || (duration && distance ? `${Math.floor(duration / 60 / distance)}'${String(Math.round((duration / distance) % 60)).padStart(2,"0")}"` : null);

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
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `러닝 기록: 거리 ${distance}km, 시간 ${Math.floor(duration/60)}분 ${duration%60}초, 페이스 ${paceMin}/km, 칼로리 ${calories}kcal

위 기록을 보고 친근하고 재미있게 한국어로 피드백 3줄 해줘.
- 첫 줄: 이모지 + 기록에 대한 칭찬/평가 (페이스 수준 언급)
- 둘째 줄: 이모지 + 재미있는 칼로리/거리 비유 (예: "삼겹살 1인분 태웠어요!")
- 셋째 줄: 이모지 + 다음 러닝을 위한 짧은 조언이나 응원
딱 3줄만, 각 줄 앞에 이모지 포함해서 써줘.`,
      }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.map((c) => c.text || "").join("").trim() || null;
}
