// src/components/LoginScreen.js
import React, { useEffect, useRef } from "react";

function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /KAKAOTALK|Instagram|NAVER|Line|FB_IAB|FBAN|FBAV|Twitter|Snapchat|TikTok|wv\)/i.test(ua);
}

export default function LoginScreen({ onLogin }) {
  const inApp = isInAppBrowser();
  const canvasRef = useRef(null);

  // 배경 파티클 애니메이션
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: -Math.random() * 0.4 - 0.1,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,136,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < -5) p.x = W + 5;
        if (p.x > W + 5) p.x = -5;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 28px",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%,100% { text-shadow: 0 0 20px rgba(0,255,136,0.3); }
          50%      { text-shadow: 0 0 40px rgba(0,255,136,0.7), 0 0 80px rgba(0,255,136,0.2); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 30px rgba(0,255,136,0.25); }
          50%      { box-shadow: 0 0 50px rgba(0,255,136,0.5); }
        }
        .login-btn:hover { transform: scale(1.02); }
        .login-btn:active { transform: scale(0.98); }
        .login-btn { transition: transform 0.15s; }
      `}</style>

      {/* 배경 파티클 */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* 배경 그라디언트 원 */}
      <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,136,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>

        {/* 인앱 브라우저 경고 */}
        {inApp && (
          <div style={{ width: "100%", marginBottom: 24, background: "#1a1000", border: "1px solid #4d3300", borderRadius: 16, padding: "16px", animation: "fadeUp 0.4s ease both" }}>
            <div style={{ fontSize: 22, marginBottom: 8, textAlign: "center" }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#ffaa00", marginBottom: 6, textAlign: "center" }}>외부 브라우저에서 열어주세요</div>
            <div style={{ fontSize: 13, color: "#886600", lineHeight: 1.8, textAlign: "center" }}>카카오톡·인스타 앱 내 브라우저에서는<br />Google 로그인이 차단됩니다.</div>
            <div style={{ marginTop: 10, background: "#110d00", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#664400", marginBottom: 4, fontWeight: 700 }}>여는 방법</div>
              <div style={{ fontSize: 12, color: "#886600", lineHeight: 2 }}>
                📱 아이폰 → 우측 하단 <b style={{color:"#ffaa00"}}>⋯</b> → Safari로 열기<br />
                🤖 안드로이드 → 우측 상단 <b style={{color:"#ffaa00"}}>⋮</b> → 기본 브라우저로 열기
              </div>
            </div>
          </div>
        )}

        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeUp 0.5s ease both" }}>
          <div style={{ fontSize: 64, marginBottom: 20, lineHeight: 1 }}>🏃</div>
          <div style={{ fontSize: 11, color: "#2a2a2a", letterSpacing: 8, marginBottom: 8, fontWeight: 600 }}>WELCOME TO</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#00ff88", letterSpacing: -2, lineHeight: 1, animation: "glow 3s ease-in-out infinite" }}>RUNCREW</div>
          <div style={{ fontSize: 14, color: "#333", marginTop: 12, letterSpacing: 1 }}>AI 기반 러닝 크루 커뮤니티</div>
        </div>

        {/* 피처 리스트 */}
        <div style={{ width: "100%", marginBottom: 36, display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 0.6s ease both" }}>
          {[
            ["📸", "AI 러닝 분석", "스크린샷 업로드만 하면 자동 분석"],
            ["👥", "러닝 크루", "함께 달리고 랭킹으로 경쟁"],
            ["🏅", "배지 & 목표", "업적 배지와 주간 목표 달성"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: "flex", gap: 14, alignItems: "center", padding: "13px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid #141414", borderRadius: 14 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ccc", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#333" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 로그인 버튼 */}
        <button
          className="login-btn"
          onClick={onLogin}
          disabled={inApp}
          style={{
            width: "100%", padding: "17px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            background: inApp ? "#111" : "#00ff88",
            border: inApp ? "1px solid #222" : "none",
            borderRadius: 16,
            fontFamily: "inherit", fontSize: 17, fontWeight: 900,
            color: inApp ? "#333" : "#000",
            cursor: inApp ? "not-allowed" : "pointer",
            animation: inApp ? "none" : "fadeUp 0.7s ease both, pulse 2.5s ease-in-out 1s infinite",
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

        <div style={{ marginTop: 20, fontSize: 11, color: "#1e1e1e", textAlign: "center", lineHeight: 1.8, animation: "fadeUp 0.8s ease both" }}>
          가입하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다
        </div>
      </div>
    </div>
  );
}
