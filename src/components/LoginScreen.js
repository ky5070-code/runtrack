// src/components/LoginScreen.js
import React from "react";

// 인앱 브라우저 감지
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /KAKAOTALK|Instagram|NAVER|Line|FB_IAB|FBAN|FBAV|Twitter|Snapchat|TikTok|wv\)/i.test(ua);
}

export default function LoginScreen({ onLogin }) {
  const inApp = isInAppBrowser();

  return (
    <div style={{
      minHeight: "100vh", background: "#060606", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "0 32px",
      fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif", maxWidth: 420, margin: "0 auto",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&display=swap'); @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* 인앱 브라우저 경고 */}
      {inApp && (
        <div style={{
          width: "100%", marginBottom: 24,
          background: "#1a1000", border: "1px solid #4d3300",
          borderRadius: 14, padding: "16px",
        }}>
          <div style={{ fontSize: 22, marginBottom: 8, textAlign: "center" }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#ffaa00", marginBottom: 6, textAlign: "center" }}>
            외부 브라우저에서 열어주세요
          </div>
          <div style={{ fontSize: 14, color: "#886600", lineHeight: 1.8, textAlign: "center" }}>
            카카오톡·인스타 등 앱 내 브라우저에서는<br />
            Google 로그인이 차단됩니다.
          </div>
          <div style={{ marginTop: 12, background: "#110d00", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 13, color: "#664400", marginBottom: 6, fontWeight: 700 }}>여는 방법</div>
            <div style={{ fontSize: 13, color: "#886600", lineHeight: 2 }}>
              📱 아이폰 → 우측 하단 <b style={{color:"#ffaa00"}}>⋯</b> → Safari로 열기<br />
              🤖 안드로이드 → 우측 상단 <b style={{color:"#ffaa00"}}>⋮</b> → 기본 브라우저로 열기
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 58, marginBottom: 16 }}>🏃</div>
        <div style={{ fontSize: 12, color: "#2a2a2a", letterSpacing: 6, marginBottom: 6 }}>WELCOME TO</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: "#00ff88", letterSpacing: -1, lineHeight: 1 }}>RUNTRACK</div>
        <div style={{ fontSize: 15, color: "#444", marginTop: 10 }}>AI 기반 러닝 커뮤니티</div>
      </div>

      {/* Features */}
      <div style={{ width: "100%", marginBottom: 36, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          ["📸", "AI가 러닝 스크린샷 자동 분석"],
          ["🏆", "친구들과 랭킹 경쟁"],
          ["🔥", "커뮤니티 피드 & 반응"],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", background: "#0a0a0a", border: "1px solid #161616", borderRadius: 12 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 15, color: "#888" }}>{text}</span>
          </div>
        ))}
      </div>

      {/* Google Login Button */}
      <button
        onClick={onLogin}
        disabled={inApp}
        style={{
          width: "100%", padding: "16px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 12,
          background: inApp ? "#111" : "#00ff88",
          border: inApp ? "1px solid #222" : "none",
          borderRadius: 14,
          fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif", fontSize: 17, fontWeight: 800,
          color: inApp ? "#333" : "#000",
          cursor: inApp ? "not-allowed" : "pointer",
          letterSpacing: 0.5,
          boxShadow: inApp ? "none" : "0 0 30px rgba(0,255,136,0.2)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill={inApp ? "#333" : "#000"} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill={inApp ? "#333" : "#000"} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill={inApp ? "#333" : "#000"} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill={inApp ? "#333" : "#000"} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {inApp ? "외부 브라우저에서 로그인 가능" : "Google로 시작하기"}
      </button>

      <div style={{ marginTop: 20, fontSize: 12, color: "#1e1e1e", textAlign: "center", lineHeight: 1.8 }}>
        가입하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다
      </div>
    </div>
  );
}
