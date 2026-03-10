// src/components/LoginScreen.js
import React from "react";

export default function LoginScreen({ onLogin }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#060606", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "0 32px",
      fontFamily: "'Nanum Gothic', sans-serif", maxWidth: 420, margin: "0 auto",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap'); @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏃</div>
        <div style={{ fontSize: 10, color: "#2a2a2a", letterSpacing: 6, marginBottom: 6 }}>WELCOME TO</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#00ff88", letterSpacing: -1, lineHeight: 1 }}>RUNTRACK</div>
        <div style={{ fontSize: 13, color: "#444", marginTop: 10 }}>AI 기반 러닝 커뮤니티</div>
      </div>

      {/* Features */}
      <div style={{ width: "100%", marginBottom: 40, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          ["📸", "AI가 러닝 스크린샷 자동 분석"],
          ["🏆", "친구들과 랭킹 경쟁"],
          ["🔥", "커뮤니티 피드 & 반응"],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", background: "#0a0a0a", border: "1px solid #161616", borderRadius: 12 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 13, color: "#888" }}>{text}</span>
          </div>
        ))}
      </div>

      {/* Google Login Button */}
      <button
        onClick={onLogin}
        style={{
          width: "100%", padding: "16px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 12,
          background: "#00ff88", border: "none", borderRadius: 14,
          fontFamily: "'Nanum Gothic', sans-serif", fontSize: 15, fontWeight: 800,
          color: "#000", cursor: "pointer", letterSpacing: 0.5,
          boxShadow: "0 0 30px rgba(0,255,136,0.2)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google로 시작하기
      </button>

      <div style={{ marginTop: 20, fontSize: 10, color: "#1e1e1e", textAlign: "center", lineHeight: 1.8 }}>
        가입하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다
      </div>
    </div>
  );
}
