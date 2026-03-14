import React, { useState } from "react";

const safeTop = "env(safe-area-inset-top, 0px)";
const safeBottom = "env(safe-area-inset-bottom, 0px)";

// 각 스텝: 화면에 오버레이로 보여줄 내용
const STEPS = [
  {
    id: "welcome",
    spotlight: null, // 전체 화면
    emoji: "🏃",
    title: "RUNTRACK에\n오신 걸 환영해요!",
    desc: "AI가 러닝 기록을 자동 분석하고\n크루와 함께 성장하는 러닝 앱이에요",
    position: "center",
  },
  {
    id: "upload",
    spotlight: "bottom-center", // + 버튼 위치
    emoji: "📸",
    title: "러닝 기록 올리기",
    desc: "하단 + 버튼을 눌러\n러닝앱 스크린샷을 올리면\nAI가 자동으로 분석해줘요",
    position: "top",
    arrow: "down",
    highlightStyle: {
      bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
      left: "50%",
      transform: "translateX(-50%)",
      width: 56, height: 56, borderRadius: 28,
    },
  },
  {
    id: "crew",
    spotlight: "top-left",
    emoji: "👥",
    title: "크루 만들기",
    desc: "← 버튼으로 홈에서\n크루를 만들거나 참여해요\n초대 링크로 친구를 불러보세요!",
    position: "bottom",
    arrow: "up",
    highlightStyle: {
      top: "calc(14px + env(safe-area-inset-top, 0px))",
      left: 18,
      width: 36, height: 36, borderRadius: 18,
    },
  },
  {
    id: "feed",
    spotlight: "bottom-left",
    emoji: "📊",
    title: "피드 · 랭킹 · 통계",
    desc: "크루원들의 러닝을 피드에서 보고\n랭킹으로 경쟁하고\n통계로 내 성장을 확인해요",
    position: "top",
    arrow: "down",
    highlightStyle: {
      bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
      left: 0,
      width: "40%", height: 58, borderRadius: 0,
    },
  },
  {
    id: "pro",
    spotlight: null,
    emoji: "⚡",
    title: "PRO로 더 강력하게",
    desc: "AI 코치 피드백 · 월간 리포트\n배지 시스템 · 상세 통계 · 전체 랭킹\n프로필에서 PRO로 업그레이드하세요",
    position: "center",
    proHighlight: true,
  },
  {
    id: "done",
    spotlight: null,
    emoji: "🚀",
    title: "이제 달릴 준비\n완료!",
    desc: "크루를 만들고\n첫 번째 러닝 기록을 올려보세요",
    position: "center",
    isLast: true,
  },
];

export default function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => isLast ? onDone() : setStep(i => i + 1);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, fontFamily: "'Pretendard',-apple-system,sans-serif" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* 배경 오버레이 */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(2px)" }} />

      {/* 하이라이트 구멍 - spotlight 있을 때 */}
      {s.highlightStyle && (
        <div style={{
          position: "absolute",
          ...s.highlightStyle,
          background: "transparent",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)",
          border: "2.5px solid #00ff88",
          animation: "pulse 1.5s ease-in-out infinite",
          zIndex: 1,
          pointerEvents: "none",
        }} />
      )}

      {/* 콘텐츠 카드 */}
      <div style={{
        position: "absolute",
        ...(s.position === "center" ? {
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "calc(100% - 48px)", maxWidth: 380,
        } : s.position === "top" ? {
          top: `calc(${s.highlightStyle?.height || 60}px + 100px)`,
          left: 24, right: 24,
        } : {
          bottom: `calc(${s.highlightStyle?.height || 60}px + 80px + env(safe-area-inset-bottom, 0px))`,
          left: 24, right: 24,
        }),
        background: "#0f0f0f",
        border: "1px solid #1e1e1e",
        borderRadius: 22,
        padding: "24px 22px",
        zIndex: 2,
        animation: "fadeIn 0.25s ease",
      }}>
        {/* 화살표 */}
        {s.arrow === "down" && (
          <div style={{ position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "12px solid #1e1e1e" }} />
        )}
        {s.arrow === "up" && (
          <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: "12px solid #1e1e1e" }} />
        )}

        {/* 스텝 인디케이터 */}
        <div style={{ display: "flex", gap: 5, marginBottom: 18, justifyContent: "center" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? "#00ff88" : i < step ? "#1a3d28" : "#1a1a1a",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* 이모지 */}
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 14 }}>{s.emoji}</div>

        {/* 타이틀 */}
        <div style={{ fontSize: 21, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.35, marginBottom: 10, whiteSpace: "pre-line" }}>
          {s.title}
        </div>

        {/* 설명 */}
        <div style={{ fontSize: 14, color: "#555", textAlign: "center", lineHeight: 1.8, marginBottom: 20, whiteSpace: "pre-line" }}>
          {s.desc}
        </div>

        {/* PRO 기능 하이라이트 */}
        {s.proHighlight && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 18 }}>
            {["🤖 AI 코치", "📊 상세 통계", "🏅 배지", "🏆 전체 랭킹", "📝 월간 리포트"].map(f => (
              <span key={f} style={{ background: "#0a1a0a", border: "1px solid #1a3028", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#00cc66" }}>{f}</span>
            ))}
          </div>
        )}

        {/* 버튼 */}
        <button onClick={next} style={{
          width: "100%", padding: "14px",
          borderRadius: 14, border: "none",
          background: "#00ff88", color: "#000",
          fontFamily: "inherit", fontSize: 16, fontWeight: 900,
        }}>
          {isLast ? "🚀 시작하기!" : "다음 →"}
        </button>

        {/* 건너뛰기 */}
        {!isLast && (
          <button onClick={onDone} style={{
            width: "100%", marginTop: 8, padding: "10px",
            background: "none", border: "none",
            color: "#2a2a2a", fontFamily: "inherit", fontSize: 14,
          }}>
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
