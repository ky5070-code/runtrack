// src/components/CommunityApp.js
import React, { useState, useRef, useEffect } from "react";
import { usePosts, resizeToBase64 } from "../hooks/usePosts";
import { useNotifications } from "../hooks/useNotifications";
import { useSets } from "../hooks/useSets";
import { useChat } from "../hooks/useChat";
import { analyzeRunImage, generateRunFeedback } from "../lib/analyzeRun";

/* ─── helpers ─── */
const pad = (n) => String(n).padStart(2, "0");
const fmtTime = (s) => {
  if (!s && s !== 0) return "--:--";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
};
const relTime = (val) => {
  const ts = val?.toDate ? val.toDate() : new Date(val || 0);
  const d = Date.now() - ts.getTime();
  if (isNaN(d) || d < 0) return "방금";
  if (d < 60000) return "방금";
  if (d < 3600000) return `${Math.floor(d / 60000)}분 전`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}시간 전`;
  return `${Math.floor(d / 86400000)}일 전`;
};
const EMOJIS = ["🔥", "⚡", "👏", "💪", "🏆", "❤️"];
const safeBottom = "env(safe-area-inset-bottom, 0px)";
const safeTop = "env(safe-area-inset-top, 0px)";
const FREE_MONTHLY_LIMIT = 5;

/* ══ TOAST & CONFIRM ══ */
function Toast({ message, type }) {
  const bg = type === "success" ? "#00ff88" : type === "error" ? "#ff4444" : "#ffaa00";
  const color = type === "success" ? "#000" : "#fff";
  return (
    <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: bg, color, borderRadius: 14, padding: "12px 22px", fontSize: 15, fontWeight: 700, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap", maxWidth: "85vw", textAlign: "center" }}>
      {message}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel, confirmColor }) {
  const btnColor = confirmColor || "#00ff88";
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 320, background: "#111", borderRadius: 20, padding: "24px 20px", border: "1px solid #222" }}>
        <div style={{ fontSize: 15, color: "#e0e0e0", textAlign: "center", lineHeight: 1.7, marginBottom: 20, whiteSpace: "pre-line" }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid #2a2a2a", background: "transparent", color: "#555", fontFamily: "inherit", fontSize: 15, fontWeight: 700 }}>취소</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: btnColor, color: btnColor === "#ff4444" ? "#fff" : "#000", fontFamily: "inherit", fontSize: 15, fontWeight: 700 }}>{confirmLabel || "확인"}</button>
        </div>
      </div>
    </div>
  );
}


const Avatar = ({ user, size = 38 }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2,
    background: "linear-gradient(135deg,#111,#1a1a1a)",
    border: "1.5px solid #222", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: size * 0.44, flexShrink: 0,
  }}>{user?.avatar || "🏃"}</div>
);

/* ══ POST CARD ══ */
function PostCard({ post, currentUser, onReact, onComment, onDelete, isAdmin = false }) {
  const author = post.author || {};
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const myReaction = post[`myReaction_${currentUser?.uid}`];
  const isMyPost = post.userId === currentUser?.uid;
  const canDelete = isMyPost || isAdmin;

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div style={{ background: isMyPost ? "#0a0f0a" : "#0b0b0b", border: isMyPost ? "1.5px solid #00cc55" : "1px solid #181818", borderRadius: 18, marginBottom: 12, boxShadow: isMyPost ? "0 2px 20px rgba(0,255,136,0.08)" : "none" }}>

      {/* 상단 컬러 바 - 남의 게시물만 */}
      {!isMyPost && <div style={{ height: 3, background: post.source === "ai" ? "linear-gradient(90deg,#00ff88,#009944)" : "#1e1e1e" }} />}

      <div style={{ padding: "14px 14px 12px" }}>
        {/* 이름/아바타 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ position: "relative" }}>
            <Avatar user={isMyPost ? currentUser : author} size={42} />
            {isMyPost && <div style={{ position: "absolute", inset: -2, borderRadius: 23, border: "2px solid #00ff88", pointerEvents: "none" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: isMyPost ? "#fff" : "#e0e0e0" }}>{isMyPost ? (currentUser?.name || "나") : (author.name || "러너")}</div>
              {isMyPost && <span style={{ background: "#00ff88", color: "#000", borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>나</span>}
              {(isMyPost ? currentUser?.isPro : author?.isPro) && <span style={{ background: "transparent", border: "1px solid #555", color: "#888", borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>PRO</span>}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#383838" }}>{relTime(post.createdAt)}</span>
              {post.source === "ai" && <span style={{ background: "#0d1f14", border: "1px solid #1a3d28", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: "#00cc66" }}>AI</span>}
              {post.appName && <span style={{ fontSize: 12, color: "#2a2a2a" }}>{post.appName}</span>}
            </div>
          </div>
          {canDelete && (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ background: "none", border: "none", color: "#333", fontSize: 20, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
          )}
        </div>

        {/* 이미지 - 이름 아래 */}
        {post.imageUrl && (
          <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 12, lineHeight: 0 }}>
            <img src={post.imageUrl} alt="" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 220 }} />
          </div>
        )}

        {/* 삭제 확인 */}
        {showDeleteConfirm && (
          <div style={{ background: "#1a0808", border: "1px solid #3d1010", borderRadius: 12, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#ff7070" }}>이 기록을 삭제할까요?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", border: "1px solid #333", color: "#666", fontFamily: "inherit", fontSize: 14, minHeight: 34 }}>취소</button>
              <button onClick={() => { onDelete(post.id); setShowDeleteConfirm(false); }} style={{ padding: "6px 12px", borderRadius: 8, background: "#ff3b3b", border: "none", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, minHeight: 34 }}>삭제</button>
            </div>
          </div>
        )}

        <div style={{ background: isMyPost ? "#080f08" : "#070707", border: isMyPost ? "1px solid #1a3020" : "1px solid #141414", borderRadius: 14, padding: "12px 14px", marginBottom: 12, display: "flex" }}>
          {[[Number(post.dist).toFixed(2) + "km", "거리", true], [fmtTime(post.duration), "시간", false], [post.pace || "--", "페이스", false], [post.calories || "--", "칼로리", false]].map(([v, l, accent], i) => (
            <div key={l} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #141414" : "none", paddingLeft: i > 0 ? 10 : 0 }}>
              <div style={{ fontSize: 11, color: "#2e2e2e", marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: i === 0 ? 17 : 13, fontWeight: 800, color: accent ? "#00ff88" : "#d0d0d0" }}>{v}</div>
            </div>
          ))}
        </div>

        {post.caption && <div style={{ fontSize: 15, color: "#aaa", marginBottom: 12, lineHeight: 1.6 }}>{post.caption}</div>}

        {/* AI 코치 피드백 */}
        {post.aiFeedback && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setShowFeedback(s => !s)} style={{ width: "100%", background: "#060e09", border: "1px solid #1a3028", borderRadius: showFeedback ? "12px 12px 0 0" : 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 13 }}>✨</span>
              <span style={{ fontSize: 12, color: "#00cc66", fontWeight: 700, letterSpacing: 1 }}>AI 코치 피드백</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#1a5c38", transform: showFeedback ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
            </button>
            {showFeedback && (
              <div style={{ background: "#060e09", border: "1px solid #1a3028", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px" }}>
                {post.aiFeedback.split("\n").filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ fontSize: 14, color: "#7a9e87", lineHeight: 1.8 }}>{line}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", gap: 5, flex: 1, flexWrap: "wrap" }}>
            {EMOJIS.map(e => {
              const count = post.reactions?.[e] || 0;
              const active = myReaction === e;
              return (
                <button key={e} onClick={() => onReact(post.id, e)} style={{
                  padding: "5px 10px", borderRadius: 20, minHeight: 34,
                  border: active ? "1px solid #00ff88" : "1px solid #1e1e1e",
                  background: active ? "#0d1f14" : "#0d0d0d",
                  fontSize: 15, display: "flex", alignItems: "center", gap: 3
                }}>
                  {e}{count > 0 && <span style={{ fontSize: 13, color: active ? "#00ff88" : "#555" }}>{count}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowComments(s => !s)} style={{ background: "none", border: "none", color: "#555", fontSize: 16, minWidth: 40, minHeight: 40, display: "flex", alignItems: "center", gap: 3 }}>
            💬{post.comments?.length > 0 && <span style={{ fontSize: 13 }}>{post.comments.length}</span>}
          </button>
        </div>

        {showComments && (
          <div style={{ borderTop: "1px solid #111", paddingTop: 12, marginTop: 10 }}>
            {(post.comments || []).map(c => (
              <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{c.userAvatar || "🏃"}</div>
                <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 10, padding: "8px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#666", marginBottom: 2 }}>{c.userName}</div>
                  <div style={{ fontSize: 15, color: "#aaa", lineHeight: 1.5 }}>{c.text}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Avatar user={currentUser} size={30} />
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="댓글 달기..."
                style={{ flex: 1, background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 20, padding: "8px 14px", color: "#ccc", fontFamily: "inherit", fontSize: 15, outline: "none" }}
                onFocus={e => {
                  const el = e.target;
                  setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    window.scrollTo(0, 0);
                  }, 400);
                }}
              />
              <button onClick={submitComment} style={{ width: 38, height: 38, borderRadius: 19, background: commentText ? "#00ff88" : "#111", border: "none", color: commentText ? "#000" : "#333", fontSize: 18, fontWeight: 800 }}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ UPLOAD MODAL ══ */
function UploadModal({ onClose, onPost, currentUser, isPro }) {
  const [step, setStep] = useState("pick");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [edited, setEdited] = useState({});
  const [caption, setCaption] = useState("");
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef();

  const handleFile = async (f) => {
    if (!f?.type.startsWith("image/")) return;
    setError(null); setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("analyzing");
    const reader = new FileReader();
    // Storage 업로드용이 아닌 AI 분석용 base64 별도 추출
    reader.onload = async (e) => {
      const b64 = e.target.result.split(",")[1];
      try {
        const r = await analyzeRunImage(b64, f.type);
        if (r.error === "not_running") {
          setError("러닝 기록 이미지가 아닌 것 같아요 🤔");
          setStep("pick"); setPreviewUrl(null); setFile(null);
        } else {
          setResult(r);
          setEdited({ ...r, durationStr: r.duration ? fmtTime(r.duration) : "" });
          setStep("confirm");
          // 피드백 비동기 요청
          if (isPro) {
            generateRunFeedback({
              distance: r.distance,
              duration: r.duration,
              pace: r.pace,
              calories: r.calories,
            }).then(fb => setFeedback(fb)).catch(() => {});
          }
        }
      } catch (err) {
        setError("AI 분석 실패: " + err.message);
        setStep("pick"); setPreviewUrl(null); setFile(null);
      }
    };
    reader.readAsDataURL(f);
  };

  const handlePost = async () => {
    setPosting(true);
    let duration = Number(edited.duration) || 0;
    if (edited.durationStr) {
      const p = edited.durationStr.split(":").map(Number);
      duration = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0);
    }
    await onPost({ dist: parseFloat(edited.distance) || 0, duration, pace: edited.pace || "", calories: parseInt(edited.calories) || 0, date: edited.date || new Date().toISOString().slice(0, 10), caption, imageFile: file, source: result ? "ai" : "manual", appName: result?.appName || null, aiFeedback: feedback || null });
    setPosting(false);
    onClose();
  };

  const ef = (key, label, unit, kbd = "decimal") => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: "#444", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <input value={edited[key] ?? ""} onChange={e => setEdited(p => ({ ...p, [key]: e.target.value }))} inputMode={kbd}
          style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #222", color: "#00ff88", fontFamily: "inherit", fontSize: 19, fontWeight: 800, outline: "none", padding: "4px 0" }} />
        {unit && <span style={{ fontSize: 12, color: "#333" }}>{unit}</span>}
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#0d0d0d", borderRadius: "22px 22px 0 0", border: "1px solid #1a1a1a", padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})`, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {{"pick": "🏃 러닝 기록 올리기", "analyzing": "🤖 AI 분석 중...", "confirm": "📊 데이터 확인", "caption": "✏️ 공유하기"}[step]}
          </div>
          <button onClick={onClose} style={{ background: "#111", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#666", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {step === "pick" && <>
          {error && <div style={{ background: "#1a0808", border: "1px solid #3d1010", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 15, color: "#ff7070" }}>{error}</div>}
          <div onClick={() => inputRef.current?.click()} style={{ border: "2px dashed #1e1e1e", borderRadius: 18, padding: "44px 20px", textAlign: "center", background: "#080808" }}>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 50, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#555", marginBottom: 8 }}>러닝 앱 스크린샷 업로드</div>
            <div style={{ fontSize: 14, color: "#2a2a2a", lineHeight: 1.9 }}>Nike Run Club · Strava · 삼성 헬스<br />Apple Watch · Garmin · 기타 앱</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#161616" }} /><div style={{ fontSize: 13, color: "#2e2e2e" }}>또는</div><div style={{ flex: 1, height: 1, background: "#161616" }} />
          </div>
          <button onClick={() => { setResult(null); setEdited({ distance: "", durationStr: "", pace: "", calories: "", date: new Date().toISOString().slice(0, 10) }); setStep("confirm"); }}
            style={{ width: "100%", padding: "15px", background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, color: "#666", fontFamily: "inherit", fontSize: 16, minHeight: 52 }}>✏️ 직접 입력하기</button>
        </>}

        {step === "analyzing" && (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            {previewUrl && <div style={{ position: "relative", width: 120, height: 120, borderRadius: 18, overflow: "hidden", margin: "0 auto 20px" }}>
              <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 44, height: 44, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              </div>
            </div>}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes scan{0%{transform:translateX(-200%)}100%{transform:translateX(500%)}}`}</style>
            <div style={{ fontSize: 17, color: "#00ff88", fontWeight: 700, marginBottom: 8 }}>Claude AI가 분석 중이에요</div>
            <div style={{ fontSize: 14, color: "#333", marginBottom: 20 }}>거리 · 시간 · 페이스 · 칼로리 추출 중</div>
            <div style={{ height: 3, background: "#111", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "40%", background: "linear-gradient(90deg,transparent,#00ff88,transparent)", animation: "scan 1.4s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {step === "confirm" && <>
          {previewUrl && <div style={{ height: 130, borderRadius: 14, overflow: "hidden", marginBottom: 18, position: "relative" }}>
            <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,#0d0d0d)" }} />
            {result && <div style={{ position: "absolute", top: 10, right: 10, background: "#0d1f14", border: "1px solid #00ff88", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#00ff88" }}>AI 분석 완료 ✓</div>}
          </div>}
          {/* AI 피드백 */}
          {isPro && feedback && (
            <div style={{ background: "#080f0b", border: "1px solid #1a3d28", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#00ff88", letterSpacing: 2, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✨</span> AI 코치 피드백
              </div>
              {feedback.split("\n").filter(l => l.trim()).map((line, i) => (
                <div key={i} style={{ fontSize: 15, color: "#aaa", lineHeight: 1.7, marginBottom: i < 2 ? 4 : 0 }}>{line}</div>
              ))}
            </div>
          )}
          {isPro && !feedback && result && (
            <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 16, height: 16, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <div style={{ fontSize: 14, color: "#333" }}>AI 코치가 피드백 작성 중...</div>
            </div>
          )}
          {!isPro && result && (
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 22 }}>🔒</div>
              <div>
                <div style={{ fontSize: 13, color: "#555", fontWeight: 700, marginBottom: 3 }}>AI 코치 피드백</div>
                <div style={{ fontSize: 12, color: "#333" }}>PRO 회원 전용 기능이에요</div>
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 14 }}>데이터 확인 · 수정 가능</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>{ef("distance", "거리", "km")}{ef("durationStr", "시간", "")}{ef("pace", "페이스", "/km", "text")}</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>{ef("calories", "칼로리", "kcal")}{ef("date", "날짜", "", "text")}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setStep("pick"); setPreviewUrl(null); setFile(null); setResult(null); }} style={{ flex: 1, padding: "14px", background: "transparent", border: "1px solid #1e1e1e", borderRadius: 14, color: "#555", fontFamily: "inherit", fontSize: 16, minHeight: 52 }}>다시</button>
            <button onClick={() => setStep("caption")} style={{ flex: 2, padding: "14px", background: "#00ff88", border: "none", borderRadius: 14, color: "#000", fontFamily: "inherit", fontSize: 17, fontWeight: 800, minHeight: 52 }}>다음 →</button>
          </div>
        </>}

        {step === "caption" && <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <Avatar user={currentUser} size={46} />
            <div><div style={{ fontSize: 16, fontWeight: 700 }}>{currentUser?.name}</div><div style={{ fontSize: 13, color: "#444", marginTop: 2 }}>{edited.distance}km · {edited.durationStr}</div></div>
          </div>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="오늘의 러닝은 어땠나요? 경로, 날씨, 느낀 점을 공유해봐요 🏃"
            style={{ width: "100%", background: "#080808", border: "1px solid #1e1e1e", borderRadius: 14, padding: "14px", color: "#ccc", fontFamily: "inherit", fontSize: 15, outline: "none", resize: "none", height: 120, boxSizing: "border-box", lineHeight: 1.7 }} />
          <button onClick={handlePost} disabled={posting} style={{ width: "100%", marginTop: 14, padding: "17px", background: posting ? "#0d3320" : "#00ff88", border: "none", borderRadius: 14, color: posting ? "#00ff88" : "#000", fontFamily: "inherit", fontSize: 17, fontWeight: 800, minHeight: 56 }}>
            {posting ? "업로드 중..." : "커뮤니티에 공유하기 🚀"}
          </button>
        </>}
      </div>
    </div>
  );
}

/* ══ LEADERBOARD ══ */
function parsePaceToSec(paceStr) {
  if (!paceStr) return 0;
  const m = paceStr.match(/(\d+)'(\d+)/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  const parts = paceStr.replace(/[^0-9:]/g, "").split(":");
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  return 0;
}
function fmtPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return "--'--\"";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2,"0")}"`;
}

function LeaderboardTab({ posts, currentUser, isPro }) {
  const [period, setPeriod] = useState("week");
  const userMap = {};
  posts.forEach(p => {
    if (!p.author) return;
    const ts = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
    const age = Date.now() - ts.getTime();
    if (period === "week" && age > 7 * 86400000) return;
    if (period === "month" && age > 30 * 86400000) return;
    if (!userMap[p.userId]) userMap[p.userId] = { user: p.author, dist: 0, runs: 0, totalDuration: 0 };
    userMap[p.userId].dist += parseFloat(p.dist) || 0;
    userMap[p.userId].runs += 1;
    userMap[p.userId].totalDuration += parseInt(p.duration) || 0;
  });
  // 누적 거리 합산, 페이스 = 총 시간 / 총 거리 (가중평균)
  const scores = Object.values(userMap).map(s => ({
    ...s,
    avgPace: s.dist > 0 ? fmtPace(s.totalDuration / s.dist) : "--'--\"",
  })).sort((a, b) => b.dist - a.dist);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["week", "이번 주"], ["month", "이번 달"], ["all", "전체"]].map(([v, l]) => {
          const locked = v === "all" && !isPro;
          return (
            <button key={v} onClick={() => !locked && setPeriod(v)}
              style={{ flex: 1, padding: "11px", borderRadius: 12, border: locked ? "1px solid #1a1a1a" : "none", background: period === v ? "#00ff88" : "#0d0d0d", color: period === v ? "#000" : locked ? "#333" : "#444", fontFamily: "inherit", fontSize: 13, fontWeight: 700, minHeight: 46 }}>
              {locked ? "🔒 " : ""}{l}
            </button>
          );
        })}
      </div>

      {scores.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#2a2a2a" }}>
          <div style={{ fontSize: 46, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 16, lineHeight: 1.8 }}>아직 기록이 없어요<br />첫 번째로 달려보세요!</div>
        </div>
      )}

      {scores.length >= 2 && (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 22 }}>
          {[scores[1], scores[0], scores[2]].map((s, i) => {
            if (!s) return <div key={i} style={{ flex: 1 }} />;
            const rank = [1, 0, 2][i];
            const heights = [80, 115, 60];
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 28 }}>{s.user.avatar || "🏃"}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: rank === 0 ? "#00ff88" : "#888", textAlign: "center" }}>{s.user.name}</div>
                <div style={{ fontSize: 15, color: "#00ff88", fontWeight: 800 }}>{s.dist.toFixed(1)}km</div>
                <div style={{ width: "100%", height: heights[i], background: rank === 0 ? "linear-gradient(180deg,#00ff88,#009944)" : "#111", borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: rank !== 0 ? "1px solid #1a1a1a" : "none" }}>{medals[rank]}</div>
              </div>
            );
          })}
        </div>
      )}

      {scores.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: s.user.uid === currentUser?.uid ? "#0d1f14" : "#0a0a0a", border: `1px solid ${s.user.uid === currentUser?.uid ? "#1a3d28" : "#161616"}`, borderRadius: 14, marginBottom: 8, minHeight: 66 }}>
          <div style={{ fontSize: i < 3 ? 22 : 14, width: 28, textAlign: "center", color: i < 3 ? "inherit" : "#2e2e2e", fontWeight: 700 }}>{i < 3 ? medals[i] : i + 1}</div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: "#111", border: "1.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{s.user.avatar || "🏃"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{s.user.name}{s.user.uid === currentUser?.uid && <span style={{ color: "#00ff88", fontSize: 12, marginLeft: 6 }}>ME</span>}</div>
            <div style={{ fontSize: 13, color: "#383838", marginTop: 2 }}>{s.runs}회 러닝 · 평균 {s.avgPace}/km</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: i === 0 ? "#00ff88" : "#aaa" }}>{s.dist.toFixed(1)}</div>
            <div style={{ fontSize: 12, color: "#2a2a2a" }}>km 누적</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ STREAK CALCULATOR ══ */
function calcStreak(posts, userId) {
  // 내 게시물의 날짜만 추출 (YYYY-MM-DD)
  const myDates = [...new Set(
    posts
      .filter(p => p.userId === userId)
      .map(p => p.date || (p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0)).toISOString().slice(0, 10))
  )].sort().reverse(); // 최신순

  if (myDates.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // 오늘 또는 어제 기록이 없으면 스트릭 0
  if (myDates[0] !== today && myDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < myDates.length; i++) {
    const prev = new Date(myDates[i - 1]);
    const curr = new Date(myDates[i]);
    const diff = (prev - curr) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

/* ══ NOTIFICATION MODAL ══ */
function NotificationModal({ notifications, onClose, onMarkAllRead, onDelete, schedules = [] }) {
  const relTime = (val) => {
    const ts = val?.toDate ? val.toDate() : new Date(val || 0);
    const d = Date.now() - ts.getTime();
    if (isNaN(d) || d < 0) return "방금";
    if (d < 60000) return "방금";
    if (d < 3600000) return `${Math.floor(d / 60000)}분 전`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}시간 전`;
    return `${Math.floor(d / 86400000)}일 전`;
  };

  const getDday = (dateStr, timeStr) => {
    const target = new Date(dateStr + "T" + (timeStr || "00:00"));
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.ceil((target - today) / 86400000);
    if (diff < 0) return null; // 지난 일정 제외
    if (diff === 0) return "D-Day";
    return `D-${diff}`;
  };

  // 아직 안 지난 일정만, 날짜순 정렬
  const upcomingSchedules = schedules
    .filter(s => {
      const sc = s.schedule || {};
      if (!sc.date) return false;
      const target = new Date(sc.date + "T" + (sc.time || "23:59"));
      return target >= new Date() && !sc.closed;
    })
    .sort((a, b) => new Date(a.schedule.date + "T" + (a.schedule.time || "00:00")) - new Date(b.schedule.date + "T" + (b.schedule.time || "00:00")));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#0d0d0d", borderRadius: "22px 22px 0 0", border: "1px solid #1a1a1a", padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})`, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>🔔 알림</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {notifications.some(n => !n.read) && (
              <button onClick={onMarkAllRead} style={{ background: "none", border: "none", color: "#00ff88", fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>모두 읽음</button>
            )}
            <button onClick={onClose} style={{ background: "#111", border: "none", borderRadius: "50%", width: 32, height: 32, color: "#666", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        {/* D-day 일정 섹션 */}
        {upcomingSchedules.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 10 }}>📅 예정된 러닝</div>
            {upcomingSchedules.map(s => {
              const sc = s.schedule;
              const dday = getDday(sc.date, sc.time);
              const ddayColor = dday === "D-Day" ? "#ff6b6b" : dday === "D-1" ? "#ffaa00" : "#00ff88";
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#080f08", border: "1px solid #1a3028", borderRadius: 14, marginBottom: 8 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: "#0a1a0a", border: `1.5px solid ${ddayColor}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: ddayColor, letterSpacing: -0.5 }}>{dday}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e0e0e0", marginBottom: 3 }}>{sc.title}</div>
                    <div style={{ fontSize: 12, color: "#555", display: "flex", gap: 8 }}>
                      <span>{sc.date} {sc.time}</span>
                      {sc.place && <span>· {sc.place}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#2e2e2e", marginTop: 2 }}>
                      참여 {(sc.participants || []).length}{sc.maxMembers > 0 ? `/${sc.maxMembers}명` : "명"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {notifications.length === 0 && upcomingSchedules.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#2a2a2a" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🔔</div>
            <div style={{ fontSize: 15 }}>아직 알림이 없어요</div>
          </div>
        )}

        {notifications.map(n => {
          const typeIcon = n.type === "reaction" ? n.emoji : n.type === "feed" ? "🏃" : n.type === "chat" ? "💬" : "💬";
          const typeText = n.type === "reaction" ? ` 님이 ${n.emoji} 반응했어요`
            : n.type === "comment" ? " 님이 댓글을 달았어요"
            : n.type === "feed" ? " 님이 새 러닝을 공유했어요"
            : " 님이 메시지를 보냈어요";
          return (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: n.read ? "#080808" : "#0a1a0f", border: `1px solid ${n.read ? "#111" : "#1a3d28"}`, borderRadius: 14, marginBottom: 8 }}>
              <div style={{ width: 42, height: 42, borderRadius: 21, background: "#111", border: "1.5px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, position: "relative" }}>
                {n.fromUserAvatar || "🏃"}
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                  {typeIcon}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: n.read ? "#aaa" : "#e0e0e0" }}>{n.fromUserName}</span>
                  <span style={{ color: "#555" }}>{typeText}</span>
                </div>
                {(n.type === "comment" || n.type === "chat") && n.commentText && (
                  <div style={{ fontSize: 13, color: "#444", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{n.commentText}"</div>
                )}
                {n.postDist && (
                  <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 2 }}>{Number(n.postDist).toFixed(2)}km 기록</div>
                )}
                <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 2 }}>{relTime(n.createdAt)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: 4, background: "#00ff88" }} />}
                {onDelete && (
                  <button onClick={() => onDelete(n.id)} style={{ background: "none", border: "none", color: "#333", fontSize: 18, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, cursor: "pointer" }}>✕</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ══ CHAT TAB ══ */
function ChatTab({ setId, currentUser }) {
  const { messages, sendMessage, sendSchedule, joinSchedule, closeSchedule } = useChat(setId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [chatHeight, setChatHeight] = useState(null);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // visualViewport로 키보드 높이 반영해 채팅 영역 동적 조정
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // 뷰포트 높이 - GNB 높이(58px) - safe area
      const gnbH = 58;
      const safeB = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--safe-bottom") || "0") || 0;
      setChatHeight(vv.height - gnbH);
      scrollToBottom(false);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const relTime = (val) => {
    const ts = val?.toDate ? val.toDate() : new Date(val || 0);
    const d = Date.now() - ts.getTime();
    if (isNaN(d) || d < 0) return "방금";
    if (d < 60000) return "방금";
    if (d < 3600000) return `${Math.floor(d/60000)}분 전`;
    if (d < 86400000) return `${Math.floor(d/3600000)}시간 전`;
    return `${Math.floor(d/86400000)}일 전`;
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(text, currentUser);
    setText("");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleCreateSchedule = async (schedule) => {
    await sendSchedule(schedule, currentUser);
    setShowScheduleModal(false);
  };

  // 날짜 구분선 표시용
  const getDateLabel = (val) => {
    const ts = val?.toDate ? val.toDate() : new Date(val || 0);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (ts.toDateString() === today.toDateString()) return "오늘";
    if (ts.toDateString() === yesterday.toDateString()) return "어제";
    return `${ts.getMonth()+1}월 ${ts.getDate()}일`;
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", height: chatHeight ? `${chatHeight}px` : "100%", minHeight: 0, background: "#080808", overflow: "hidden" }}>

      {/* 메시지 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 8px", WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#2a2a2a", gap: 12, padding: "0 32px" }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#333" }}>대화를 시작해보세요!</div>
            <div style={{ fontSize: 13, color: "#2a2a2a", textAlign: "center", lineHeight: 1.8 }}>크루원들과 러닝 일정을 잡고<br />기록을 공유해보세요</div>
            <button onClick={() => {
              const link = getInviteLink(currentSet?.id);
              if (navigator.share) {
                navigator.share({ title: `${currentSet?.name} 러닝 크루`, text: `${currentSet?.name}에서 같이 달려요! 🏃`, url: link });
              } else {
                navigator.clipboard.writeText(link).then(() => showToast("초대 링크가 복사됐어요! 🔗", "success"));
              }
            }} style={{ background: "#0d1f14", border: "1px solid #1a3d28", borderRadius: 14, padding: "11px 22px", color: "#00ff88", fontFamily: "inherit", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              🔗 크루원 초대하기
            </button>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.userId === currentUser?.uid;
          const isNewSender = i === 0 || messages[i-1]?.userId !== msg.userId;
          const isLastInGroup = i === messages.length - 1 || messages[i+1]?.userId !== msg.userId;

          // 날짜 구분선
          const prevTs = i > 0 ? (messages[i-1].createdAt?.toDate ? messages[i-1].createdAt.toDate() : new Date(messages[i-1].createdAt || 0)) : null;
          const curTs = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt || 0);
          const showDate = i === 0 || (prevTs && prevTs.toDateString() !== curTs.toDateString());

          // 일정 카드 렌더링
          if (msg.type === "schedule") {
            const sc = msg.schedule || {};
            const participants = sc.participants || [];
            const isJoined = participants.find(p => p.uid === currentUser?.uid);
            const isFull = sc.maxMembers > 0 && participants.length >= sc.maxMembers;
            const isOwner = msg.userId === currentUser?.uid;
            const isExpired = sc.date && new Date(sc.date + "T" + (sc.time || "23:59")) < new Date();
            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                    <div style={{ flex: 1, height: 1, background: "#161616" }} />
                    <div style={{ fontSize: 11, color: "#333", fontWeight: 600, padding: "2px 10px", background: "#0d0d0d", borderRadius: 10, border: "1px solid #1a1a1a" }}>{getDateLabel(msg.createdAt)}</div>
                    <div style={{ flex: 1, height: 1, background: "#161616" }} />
                  </div>
                )}
                <div style={{ margin: "8px 0", padding: "0 4px" }}>
                  <div style={{ background: "#0d0d0d", border: "1px solid #1a3028", borderRadius: 16, overflow: "hidden" }}>
                    {/* 카드 헤더 */}
                    <div style={{ background: "linear-gradient(135deg,#0a1f14,#061209)", padding: "12px 14px 10px", borderBottom: "1px solid #1a2a1a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>🏃</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#e0e0e0" }}>{sc.title || "같이 러닝"}</span>
                        {(sc.closed || isExpired) && <span style={{ marginLeft: "auto", fontSize: 11, background: "#1a1a1a", color: "#555", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>마감</span>}
                        {!(sc.closed || isExpired) && isFull && <span style={{ marginLeft: "auto", fontSize: 11, background: "#1a1000", color: "#ffaa00", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>인원 마감</span>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#666" }}>
                          <span>📅</span><span>{sc.date} {sc.time && sc.time}</span>
                        </div>
                        {sc.place && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#666" }}>
                          <span>📍</span><span>{sc.place}</span>
                        </div>}
                      </div>
                    </div>
                    {/* 참여자 */}
                    <div style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#444" }}>
                          참여자 {participants.length}{sc.maxMembers > 0 ? `/${sc.maxMembers}명` : "명"}
                        </div>
                        {isOwner && !sc.closed && !isExpired && (
                          <button onClick={() => closeSchedule(msg.id)} style={{ fontSize: 11, color: "#ff4444", background: "none", border: "1px solid #3d1010", borderRadius: 6, padding: "2px 8px", fontFamily: "inherit" }}>마감하기</button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {participants.map(p => (
                          <div key={p.uid} style={{ display: "flex", alignItems: "center", gap: 4, background: "#111", borderRadius: 20, padding: "3px 8px 3px 4px", border: "1px solid #1e1e1e" }}>
                            <span style={{ fontSize: 14 }}>{p.avatar}</span>
                            <span style={{ fontSize: 12, color: "#888" }}>{p.name}</span>
                          </div>
                        ))}
                        {participants.length === 0 && <span style={{ fontSize: 12, color: "#333" }}>아직 참여자가 없어요</span>}
                      </div>
                      {!(sc.closed || isExpired) && (
                        <button
                          onClick={() => joinSchedule(msg.id, currentUser, !!isJoined)}
                          disabled={!isJoined && isFull}
                          style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                            background: isJoined ? "#111" : "#00ff88",
                            color: isJoined ? "#555" : "#000",
                            border: isJoined ? "1px solid #222" : "none",
                          }}>
                          {isJoined ? "참여 취소" : isFull ? "인원 마감" : "참여하기"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#2e2e2e", marginTop: 4, paddingLeft: 4 }}>{msg.userName} · {relTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id}>
              {/* 날짜 구분선 */}
              {showDate && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                  <div style={{ flex: 1, height: 1, background: "#161616" }} />
                  <div style={{ fontSize: 11, color: "#333", fontWeight: 600, padding: "2px 10px", background: "#0d0d0d", borderRadius: 10, border: "1px solid #1a1a1a" }}>{getDateLabel(msg.createdAt)}</div>
                  <div style={{ flex: 1, height: 1, background: "#161616" }} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 6, marginBottom: isLastInGroup ? 8 : 2 }}>
                {!isMe && (
                  <div style={{ width: 28, height: 28, borderRadius: 14, background: isLastInGroup ? "#111" : "transparent", border: isLastInGroup ? "1px solid #1e1e1e" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {isLastInGroup ? msg.userAvatar : ""}
                  </div>
                )}
                <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 1 }}>
                  {!isMe && isNewSender && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 3, paddingLeft: 4 }}>{msg.userName}</div>
                  )}
                  <div style={{
                    background: isMe ? "#00ff88" : "#141414",
                    color: isMe ? "#000" : "#ddd",
                    borderRadius: isMe ? (isNewSender ? "18px 4px 18px 18px" : "18px 18px 18px 18px") : (isNewSender ? "4px 18px 18px 18px" : "18px 18px 18px 18px"),
                    padding: "9px 13px", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                    border: isMe ? "none" : "1px solid #1e1e1e",
                  }}>
                    {msg.text}
                  </div>
                  {isLastInGroup && (
                    <div style={{ fontSize: 10, color: "#2e2e2e", marginTop: 2, paddingLeft: isMe ? 0 : 2, paddingRight: isMe ? 2 : 0 }}>{relTime(msg.createdAt)}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderTop: "1px solid #111", background: "#060606", flexShrink: 0 }}>
        <button onClick={() => setShowScheduleModal(true)}
          style={{ width: 42, height: 42, borderRadius: 21, background: "#0d0d0d", border: "1px solid #1a3028", color: "#00cc66", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          📅
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="메시지 입력..."
          maxLength={500}
          style={{ flex: 1, background: "#0d0d0d", border: "1px solid #222", borderRadius: 22, padding: "10px 16px", color: "#e0e0e0", fontFamily: "inherit", fontSize: 14, outline: "none", transition: "border-color 0.15s" }}
          onFocus={e => e.target.style.borderColor = "#00ff88"}
          onBlur={e => e.target.style.borderColor = "#222"}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{ width: 42, height: 42, borderRadius: 21, background: text.trim() ? "#00ff88" : "#111", border: "none", color: text.trim() ? "#000" : "#333", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {/* 일정 생성 모달 */}
      {showScheduleModal && <ScheduleCreateModal onClose={() => setShowScheduleModal(false)} onCreate={handleCreateSchedule} />}
    </div>
  );
}

/* ══ SCHEDULE CREATE MODAL ══ */
function ScheduleCreateModal({ onClose, onCreate }) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("07:00");
  const [place, setPlace] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !date) return;
    setLoading(true);
    await onCreate({ title: title.trim(), date, time, place: place.trim(), maxMembers: parseInt(maxMembers) || 0 });
    setLoading(false);
  };

  const labelStyle = { fontSize: 12, color: "#444", letterSpacing: 1, marginBottom: 6 };
  const inputStyle = { width: "100%", background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: 10, padding: "11px 14px", color: "#e0e0e0", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#0d0d0d", borderRadius: "22px 22px 0 0", border: "1px solid #1a1a1a", padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})` }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🏃</span> 같이 러닝 일정 만들기
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>일정 제목</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예) 한강 야간 러닝" style={inputStyle} />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>날짜</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>시간</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>장소</div>
          <input value={place} onChange={e => setPlace(e.target.value)} placeholder="예) 잠실 한강공원 주차장" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={labelStyle}>최대 인원 (0 = 제한 없음)</div>
          <input type="number" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} placeholder="0" min="0" max="99" style={inputStyle} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1px solid #222", background: "transparent", color: "#555", fontFamily: "inherit", fontSize: 15, fontWeight: 700 }}>취소</button>
          <button onClick={handleCreate} disabled={!title.trim() || !date || loading}
            style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: title.trim() && date ? "#00ff88" : "#111", color: title.trim() && date ? "#000" : "#333", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>
            {loading ? "생성 중..." : "일정 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ BADGE SYSTEM ══ */
const BADGES = [
  { id: "first_run",   emoji: "🎉", name: "첫 발걸음",    desc: "첫 번째 러닝 기록",          check: (p,d) => p.length >= 1 },
  { id: "run_10",      emoji: "🔟", name: "10회 러너",    desc: "10번 러닝 기록",              check: (p,d) => p.length >= 10 },
  { id: "run_30",      emoji: "💪", name: "30회 러너",    desc: "30번 러닝 기록",              check: (p,d) => p.length >= 30 },
  { id: "dist_10",     emoji: "🏅", name: "10km 클럽",    desc: "누적 10km 달성",             check: (p,d) => d >= 10 },
  { id: "dist_50",     emoji: "🥈", name: "50km 클럽",    desc: "누적 50km 달성",             check: (p,d) => d >= 50 },
  { id: "dist_100",    emoji: "🥇", name: "100km 클럽",   desc: "누적 100km 달성",            check: (p,d) => d >= 100 },
  { id: "dist_500",    emoji: "🏆", name: "500km 레전드", desc: "누적 500km 달성",            check: (p,d) => d >= 500 },
  { id: "streak_7",    emoji: "🔥", name: "7일 스트릭",   desc: "7일 연속 러닝",              check: (p,d,s) => s >= 7 },
  { id: "streak_30",   emoji: "⚡", name: "30일 스트릭",  desc: "30일 연속 러닝",             check: (p,d,s) => s >= 30 },
  { id: "single_10",   emoji: "🚀", name: "10K 완주",     desc: "한 번에 10km 이상 완주",     check: (p) => p.some(r => parseFloat(r.dist) >= 10) },
  { id: "single_21",   emoji: "🦅", name: "하프 마라톤",  desc: "한 번에 21km 이상 완주",     check: (p) => p.some(r => parseFloat(r.dist) >= 21) },
  { id: "early_bird",  emoji: "🌅", name: "얼리버드",     desc: "오전 6시 이전 러닝 3회",     check: (p) => p.filter(r => { const h = r.createdAt?.toDate ? r.createdAt.toDate().getHours() : new Date(r.createdAt||0).getHours(); return h < 6; }).length >= 3 },
];

function calcBadges(myPosts, totalDist, streak) {
  return BADGES.filter(b => b.check(myPosts, totalDist, streak));
}

/* ══ STATS TAB ══ */
function StatsTab({ posts, currentUser, isPro, onUpdateProfile }) {
  const myPosts = posts.filter(p => p.userId === currentUser?.uid);
  const [chartView, setChartView] = useState("week"); // week | month | year
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const goal = currentUser?.weeklyGoal || 0;

  // 주간 차트 (8주)
  const weeklyData = [];
  for (let i = 7; i >= 0; i--) {
    const start = Date.now() - (i + 1) * 7 * 86400000;
    const end = Date.now() - i * 7 * 86400000;
    const dist = myPosts.filter(p => {
      const t = p.createdAt?.toDate ? p.createdAt.toDate().getTime() : new Date(p.createdAt || 0).getTime();
      return t >= start && t < end;
    }).reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);
    weeklyData.push({ label: i === 0 ? "이번주" : `${i}주전`, dist });
  }

  // 월별 차트 (12개월) - PRO
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear(), m = d.getMonth();
    const dist = myPosts.filter(p => {
      const t = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
      return t.getFullYear() === y && t.getMonth() === m;
    }).reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);
    monthlyData.push({ label: i === 0 ? "이번달" : `${m+1}월`, dist });
  }

  // 연별 차트 (3년) - PRO
  const yearlyData = [];
  for (let i = 2; i >= 0; i--) {
    const y = new Date().getFullYear() - i;
    const dist = myPosts.filter(p => {
      const t = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
      return t.getFullYear() === y;
    }).reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);
    yearlyData.push({ label: `${y}`, dist });
  }

  const chartData = chartView === "week" ? weeklyData : chartView === "month" ? monthlyData : yearlyData;
  const maxDist = Math.max(...chartData.map(w => w.dist), 1);
  const totalDist = myPosts.reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);
  const totalRuns = myPosts.length;
  const avgDist = totalRuns > 0 ? totalDist / totalRuns : 0;
  const bestDist = myPosts.reduce((a, p) => Math.max(a, parseFloat(p.dist) || 0), 0);

  // 이번 주 거리 (목표 대비)
  const thisWeekDist = weeklyData[7]?.dist || 0;
  const goalPct = goal > 0 ? Math.min((thisWeekDist / goal) * 100, 100) : 0;

  return (
    <div>
      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          [`${totalDist.toFixed(1)}km`, "총 누적 거리", "🏃"],
          [`${totalRuns}회`, "총 러닝 횟수", "📅"],
          [`${avgDist.toFixed(1)}km`, "평균 거리", "📊"],
          [`${bestDist.toFixed(1)}km`, "최장 거리", "🏆"],
        ].map(([v, l, icon]) => (
          <div key={l} style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "16px 14px" }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#00ff88" }}>{v}</div>
            <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* 주간 목표 - PRO */}
      {isPro ? (
        <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#444", letterSpacing: 1 }}>🎯 이번 주 목표</div>
            <button onClick={() => { setGoalInput(goal || ""); setShowGoalEdit(true); }}
              style={{ fontSize: 12, color: "#00ff88", background: "none", border: "1px solid #1a3028", borderRadius: 8, padding: "3px 10px", fontFamily: "inherit" }}>
              {goal > 0 ? "수정" : "설정하기"}
            </button>
          </div>
          {goal > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#00ff88" }}>{thisWeekDist.toFixed(1)}km</span>
                <span style={{ fontSize: 14, color: "#333" }}>/ {goal}km</span>
              </div>
              <div style={{ background: "#111", borderRadius: 8, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${goalPct}%`, height: "100%", background: goalPct >= 100 ? "#00ff88" : "linear-gradient(90deg,#00aa55,#00ff88)", borderRadius: 8, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 12, color: goalPct >= 100 ? "#00ff88" : "#444", marginTop: 6, textAlign: "right" }}>
                {goalPct >= 100 ? "🎉 목표 달성!" : `${(goal - thisWeekDist).toFixed(1)}km 남음`}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#2a2a2a", textAlign: "center", padding: "8px 0" }}>주간 목표를 설정해보세요!</div>
          )}
        </div>
      ) : (
        <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: 16, padding: "16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🔒</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>🎯 주간 목표 설정</div>
            <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 2 }}>PRO 회원 전용 기능이에요</div>
          </div>
        </div>
      )}

      {/* 차트 뷰 토글 */}
      <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["week", "주간"], ["month", "월별 " + (!isPro ? "🔒" : "")], ["year", "연별 " + (!isPro ? "🔒" : "")]].map(([v, l]) => {
            const locked = v !== "week" && !isPro;
            return (
              <button key={v} onClick={() => !locked && setChartView(v)}
                style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", background: chartView === v ? "#00ff88" : "#111", color: chartView === v ? "#000" : locked ? "#2a2a2a" : "#555", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
                {l}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
          {chartData.map((w, i) => {
            const isLast = i === chartData.length - 1;
            const h = maxDist > 0 ? Math.max((w.dist / maxDist) * 88, w.dist > 0 ? 5 : 0) : 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {w.dist > 0 && <div style={{ fontSize: 9, color: isLast ? "#00ff88" : "#444" }}>{w.dist.toFixed(1)}</div>}
                <div style={{ width: "100%", height: h, background: isLast ? "#00ff88" : "#1a3020", borderRadius: "3px 3px 0 0", minHeight: h > 0 ? 4 : 0 }} />
                <div style={{ fontSize: 9, color: isLast ? "#00ff88" : "#2a2a2a", textAlign: "center", wordBreak: "keep-all" }}>{w.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🏅 배지/업적 */}
      <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#444", letterSpacing: 1, marginBottom: 12 }}>🏅 업적 배지</div>
        {(() => {
          const streak = calcStreak(posts, currentUser?.uid);
          const earned = calcBadges(myPosts, totalDist, streak);
          const locked = BADGES.filter(b => !earned.find(e => e.id === b.id));
          return (
            <>
              {earned.length === 0 && <div style={{ fontSize: 13, color: "#2a2a2a", textAlign: "center", padding: "8px 0" }}>아직 획득한 배지가 없어요. 달려보세요!</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: locked.length > 0 ? 10 : 0 }}>
                {earned.map(b => (
                  <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "#0a1a0a", border: "1px solid #1a3028", borderRadius: 12, padding: "10px 12px", minWidth: 72 }}>
                    <span style={{ fontSize: 26 }}>{b.emoji}</span>
                    <span style={{ fontSize: 11, color: "#00ff88", fontWeight: 700, textAlign: "center" }}>{b.name}</span>
                    <span style={{ fontSize: 10, color: "#2e2e2e", textAlign: "center" }}>{b.desc}</span>
                  </div>
                ))}
              </div>
              {locked.length > 0 && (
                <div style={{ fontSize: 11, color: "#222", marginBottom: 6 }}>미획득 ({locked.length})</div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {locked.map(b => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a0a0a", border: "1px solid #161616", borderRadius: 10, padding: "6px 10px", opacity: 0.5 }}>
                    <span style={{ fontSize: 16, filter: "grayscale(1)" }}>{b.emoji}</span>
                    <span style={{ fontSize: 11, color: "#333" }}>{b.desc}</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* 🎽 페이스존 분석 */}
      {isPro ? (() => {
        const paceRuns = myPosts.filter(p => p.pace && p.pace !== "--");
        const zones = [
          { name: "쉬움",   color: "#4fc3f7", range: [0, 6],   desc: "6분00초 이상" },
          { name: "적당",   color: "#00ff88", range: [5, 6],   desc: "5분~6분" },
          { name: "빠름",   color: "#ffaa00", range: [4, 5],   desc: "4분~5분" },
          { name: "전력",   color: "#ff4444", range: [0, 4],   desc: "4분 미만" },
        ];
        const toSec = pace => { const [m,s] = pace.replace('"','').split("'").map(Number); return (m||0)*60+(s||0); };
        const counts = zones.map(z => ({
          ...z,
          count: paceRuns.filter(p => {
            const s = toSec(p.pace);
            if (z.name === "쉬움") return s >= 360;
            if (z.name === "적당") return s >= 300 && s < 360;
            if (z.name === "빠름") return s >= 240 && s < 300;
            return s < 240;
          }).length
        }));
        const total = paceRuns.length || 1;
        return (
          <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#444", letterSpacing: 1, marginBottom: 12 }}>🎽 페이스 존 분석</div>
            {paceRuns.length === 0
              ? <div style={{ fontSize: 13, color: "#2a2a2a", textAlign: "center", padding: "8px 0" }}>페이스 데이터가 있는 기록이 필요해요</div>
              : counts.map(z => (
                <div key={z.name} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{z.name} <span style={{ fontSize: 11, color: "#444" }}>{z.desc}</span></span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: z.color }}>{z.count}회 ({Math.round(z.count/total*100)}%)</span>
                  </div>
                  <div style={{ background: "#111", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${z.count/total*100}%`, height: "100%", background: z.color, borderRadius: 6, transition: "width 0.5s" }} />
                  </div>
                </div>
              ))
            }
          </div>
        );
      })() : (
        <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: 16, padding: "16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🔒</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>🎽 페이스 존 분석</div>
            <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 2 }}>PRO 회원 전용 기능이에요</div>
          </div>
        </div>
      )}

      {/* 👥 크루 비교 */}
      {isPro ? (() => {
        const crewPosts = posts;
        const crewDist = crewPosts.reduce((a,p) => a + (parseFloat(p.dist)||0), 0);
        const crewRuns = crewPosts.length;
        const crewAvg = crewRuns > 0 ? crewDist / crewRuns : 0;
        const myRuns = myPosts.length;
        const myAvg = myRuns > 0 ? totalDist / myRuns : 0;
        const metrics = [
          { label: "총 거리", me: `${totalDist.toFixed(1)}km`, crew: `${(crewDist/Math.max(1, [...new Set(crewPosts.map(p=>p.userId))].length)).toFixed(1)}km`, unit: "크루 평균" },
          { label: "러닝 횟수", me: `${myRuns}회`, crew: `${Math.round(crewRuns/Math.max(1, [...new Set(crewPosts.map(p=>p.userId))].length))}회`, unit: "크루 평균" },
          { label: "평균 거리", me: `${myAvg.toFixed(1)}km`, crew: `${crewAvg.toFixed(1)}km`, unit: "크루 평균" },
        ];
        return (
          <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#444", letterSpacing: 1, marginBottom: 12 }}>👥 크루 비교</div>
            {metrics.map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <div style={{ width: 70, fontSize: 12, color: "#444" }}>{m.label}</div>
                <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ flex: 1, background: "#0a1a0a", border: "1px solid #1a3028", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#00ff88" }}>{m.me}</div>
                    <div style={{ fontSize: 10, color: "#2e2e2e" }}>나</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#222" }}>vs</div>
                  <div style={{ flex: 1, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#555" }}>{m.crew}</div>
                    <div style={{ fontSize: 10, color: "#2a2a2a" }}>{m.unit}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })() : (
        <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: 16, padding: "16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🔒</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>👥 크루 비교</div>
            <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 2 }}>PRO 회원 전용 기능이에요</div>
          </div>
        </div>
      )}

      {/* 🤖 월간 AI 리포트 */}
      {isPro ? <MonthlyAIReport myPosts={myPosts} /> : (
        <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: 16, padding: "16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🔒</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>🤖 월간 AI 리포트</div>
            <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 2 }}>PRO 회원 전용 기능이에요</div>
          </div>
        </div>
      )}

      {myPosts.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#2a2a2a" }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 15 }}>러닝 기록을 추가하면 통계가 보여요!</div>
        </div>
      )}

      {/* 목표 설정 모달 */}
      {showGoalEdit && (
        <div onClick={() => setShowGoalEdit(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 320, background: "#111", borderRadius: 20, padding: "24px 20px", border: "1px solid #222" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>🎯 주간 목표 설정</div>
            <div style={{ fontSize: 13, color: "#444", marginBottom: 8 }}>목표 거리 (km/주)</div>
            <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
              placeholder="예: 20" min="1" max="300"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#e0e0e0", fontFamily: "inherit", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowGoalEdit(false)} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid #222", background: "transparent", color: "#555", fontFamily: "inherit", fontSize: 15, fontWeight: 700 }}>취소</button>
              <button onClick={async () => { await onUpdateProfile({ weeklyGoal: parseFloat(goalInput) || 0 }); setShowGoalEdit(false); }}
                style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "#00ff88", color: "#000", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ MONTHLY AI REPORT ══ */
function MonthlyAIReport({ myPosts }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const thisMonth = new Date();
  const monthPosts = myPosts.filter(p => {
    const t = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
    return t.getFullYear() === thisMonth.getFullYear() && t.getMonth() === thisMonth.getMonth();
  });

  const generateReport = async () => {
    if (monthPosts.length === 0) return;
    setLoading(true);
    const totalDist = monthPosts.reduce((a,p) => a+(parseFloat(p.dist)||0), 0);
    const totalRuns = monthPosts.length;
    const avgDist = totalDist / totalRuns;
    const bestDist = Math.max(...monthPosts.map(p => parseFloat(p.dist)||0));
    const paces = monthPosts.filter(p => p.pace && p.pace !== "--").map(p => p.pace);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: `이번 달 러닝 기록을 분석해줘:
- 총 ${totalRuns}회 러닝
- 누적 거리: ${totalDist.toFixed(1)}km
- 평균 거리: ${avgDist.toFixed(1)}km
- 최장 거리: ${bestDist.toFixed(1)}km
- 페이스 목록: ${paces.slice(0,5).join(", ") || "없음"}

아래 형식으로 한국어로 간결하게 작성해줘 (각 항목 1~2줄):
1️⃣ 이번 달 총평 (칭찬+평가)
2️⃣ 잘한 점
3️⃣ 개선할 점
4️⃣ 다음 달 목표 제안` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "리포트 생성 실패";
      setReport(text);
      setGenerated(true);
    } catch(e) {
      setReport("리포트 생성 중 오류가 발생했어요.");
      setGenerated(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: "#444", letterSpacing: 1 }}>🤖 월간 AI 리포트</div>
        <div style={{ fontSize: 11, color: "#2a2a2a" }}>{thisMonth.getMonth()+1}월</div>
      </div>
      {monthPosts.length === 0 ? (
        <div style={{ fontSize: 13, color: "#2a2a2a", textAlign: "center", padding: "8px 0" }}>이번 달 러닝 기록이 없어요</div>
      ) : loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <div style={{ width: 18, height: 18, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          <div style={{ fontSize: 14, color: "#444" }}>🤖 AI가 분석 중이에요...</div>
        </div>
      ) : !generated ? (
        <button onClick={generateReport}
          style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#00ff88", color: "#000", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>
          ✨ 이번 달 리포트 생성 ({monthPosts.length}회 기록)
        </button>
      ) : (
        <div>
          {(report || "").split("\n").filter(l => l.trim()).map((line, i) => (
            <div key={i} style={{ fontSize: 14, color: "#aaa", lineHeight: 1.8, marginBottom: 4 }}>{line}</div>
          ))}
          <button onClick={() => { setReport(null); setGenerated(false); }}
            style={{ marginTop: 10, fontSize: 12, color: "#444", background: "none", border: "1px solid #222", borderRadius: 8, padding: "4px 12px", fontFamily: "inherit" }}>
            다시 생성
          </button>
        </div>
      )}
    </div>
  );
}

/* ══ PROFILE MODAL ══ */
function ProfileModal({ currentUser, posts, currentSet, isAdmin, onKick, onTransfer, onLeaveSet, onDeleteSet, onClose, onLogout, onUpdateProfile, onRedeemCoupon }) {

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || "🏃");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState(null);
  const [payPlan, setPayPlan] = useState("yearly");
  const [payLoading, setPayLoading] = useState(false);
  const AVATARS_LIST = ["🏃", "⚡", "🔥", "🌊", "💨", "🦅", "🐆", "🎯", "🚀", "💎", "🏅", "🌟"];

  const saveProfile = async () => { await onUpdateProfile({ name, bio, avatar: selectedAvatar }); setEditMode(false); };

  const handlePayment = async () => {
    setPayLoading(true);
    const amount = payPlan === "yearly" ? 29900 : 3900;
    const orderId = `RUNTRACK-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    const orderName = payPlan === "yearly" ? "RUNTRACK PRO 연간" : "RUNTRACK PRO 월간";

    // 토스페이먼츠 SDK 로드
    const clientKey = process.env.REACT_APP_TOSS_CLIENT_KEY || "test_ck_placeholder";
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const toss = await loadTossPayments(clientKey);
      await toss.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId,
        orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: currentUser?.email || "",
        customerName: currentUser?.name || "러너",
      });
    } catch(e) {
      if (e.code !== "USER_CANCEL") alert("결제 오류: " + e.message);
    }
    setPayLoading(false);
  };

  const handleRedeem = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponMsg(null);
    try {
      await onRedeemCoupon(couponCode);
      setCouponMsg({ ok: true, text: "PRO 활성화 완료! 🎉" });
      setCouponCode("");
    } catch (e) {
      setCouponMsg({ ok: false, text: e.message });
    }
    setCouponLoading(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#0d0d0d", borderRadius: "22px 22px 0 0", border: "1px solid #1a1a1a", padding: "16px 18px", paddingBottom: `calc(20px + ${safeBottom})`, maxHeight: "70vh", overflowY: "auto", position: "relative" }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1 }}>
            <div style={{ width: 70, height: 70, borderRadius: 35, background: "#111", border: "1.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>{selectedAvatar}</div>
            <div style={{ flex: 1 }}>
              {editMode ? <input value={name} onChange={e => setName(e.target.value)} style={{ background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#fff", fontFamily: "inherit", fontSize: 19, fontWeight: 800, outline: "none", width: "100%" }} />
                : <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 19, fontWeight: 800 }}>{currentUser?.name}</span>
                    {currentUser?.isPro && <span style={{ background: "transparent", border: "1px solid #00ff88", color: "#00ff88", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>PRO</span>}
                  </div>}
              {editMode ? <input value={bio} onChange={e => setBio(e.target.value)} placeholder="한 줄 소개..." style={{ background: "transparent", border: "none", borderBottom: "1px solid #222", color: "#666", fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%", marginTop: 6 }} />
                : <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>{currentUser?.bio || "한 줄 소개를 입력해보세요"}</div>}
            </div>
          </div>
          <button onClick={() => editMode ? saveProfile() : setEditMode(true)} style={{ background: editMode ? "#00ff88" : "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "9px 16px", color: editMode ? "#000" : "#666", fontFamily: "inherit", fontSize: 15, fontWeight: 700, minHeight: 42 }}>
            {editMode ? "저장" : "편집"}
          </button>
        </div>

        {editMode && <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 10 }}>아바타 선택</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {AVATARS_LIST.map(a => <button key={a} onClick={() => setSelectedAvatar(a)} style={{ width: 46, height: 46, borderRadius: 23, background: selectedAvatar === a ? "#0d1f14" : "#0d0d0d", border: selectedAvatar === a ? "2px solid #00ff88" : "1px solid #1a1a1a", fontSize: 24 }}>{a}</button>)}
          </div>
        </div>}

        {/* PRO 업그레이드 영역 */}
        <div style={{ marginBottom: 18, background: currentUser?.isPro ? "#080f08" : "#0a0a0a", border: currentUser?.isPro ? "1px solid #1a3028" : "1px solid #1e1e1e", borderRadius: 16, padding: "16px" }}>
          {currentUser?.isPro ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 21, background: "#0d1f14", border: "1px solid #1a3d28", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✨</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#e0e0e0" }}>PRO 회원</span>
                  <span style={{ background: "transparent", border: "1px solid #00ff88", color: "#00ff88", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>PRO</span>
                </div>
                <div style={{ fontSize: 13, color: "#2e2e2e" }}>AI 코치 · 무제한 업로드 이용 중</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#e0e0e0", marginBottom: 3 }}>PRO로 업그레이드</div>
                  <div style={{ fontSize: 12, color: "#333" }}>AI 코치 · 무제한 업로드 · 상세 통계</div>
                </div>
                <span style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 800, color: "#555" }}>FREE</span>
              </div>

              {/* 결제 플랜 선택 */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[
                  { type: "monthly", label: "월간", price: "3,900원", sub: "월마다 갱신" },
                  { type: "yearly",  label: "연간", price: "29,900원", sub: "월 2,491원 · 36% 할인", badge: "BEST" },
                ].map(p => (
                  <button key={p.type} onClick={() => setPayPlan(p.type)}
                    style={{ flex: 1, padding: "12px 8px", borderRadius: 14, border: payPlan === p.type ? "1.5px solid #00ff88" : "1px solid #222", background: payPlan === p.type ? "#0a1a0a" : "#0a0a0a", textAlign: "center", position: "relative" }}>
                    {p.badge && <div style={{ position: "absolute", top: -8, right: 6, background: "#00ff88", color: "#000", fontSize: 10, fontWeight: 900, borderRadius: 6, padding: "2px 6px" }}>{p.badge}</div>}
                    <div style={{ fontSize: 13, color: payPlan === p.type ? "#00ff88" : "#555", fontWeight: 700 }}>{p.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: payPlan === p.type ? "#e0e0e0" : "#444", marginTop: 3 }}>{p.price}</div>
                    <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>{p.sub}</div>
                  </button>
                ))}
              </div>

              <button onClick={handlePayment} disabled={payLoading}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#00ff88", color: "#000", fontFamily: "inherit", fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                {payLoading ? "결제 준비 중..." : `💳 ${payPlan === "yearly" ? "29,900원" : "3,900원"} 결제하기`}
              </button>

              {/* 구분선 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
                <div style={{ fontSize: 11, color: "#2a2a2a" }}>또는 쿠폰 코드</div>
                <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleRedeem()}
                  placeholder="쿠폰 코드 입력" maxLength={20}
                  style={{ flex: 1, background: "#060606", border: "1px solid #222", borderRadius: 10, padding: "10px 12px", color: "#e0e0e0", fontFamily: "inherit", fontSize: 14, outline: "none", letterSpacing: 2 }} />
                <button onClick={handleRedeem} disabled={!couponCode.trim() || couponLoading}
                  style={{ padding: "10px 16px", borderRadius: 10, background: couponCode.trim() ? "#00ff88" : "#111", border: "none", color: couponCode.trim() ? "#000" : "#333", fontFamily: "inherit", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {couponLoading ? "..." : "적용"}
                </button>
              </div>
              {couponMsg && <div style={{ marginTop: 8, fontSize: 13, color: couponMsg.ok ? "#00ff88" : "#ff4444", fontWeight: 600 }}>{couponMsg.text}</div>}
            </>
          )}
        </div>

        {/* 크루 멤버 관리 (관리자만) */}
        {currentSet && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 12 }}>
              {isAdmin ? "👑 멤버 관리" : "👥 멤버 목록"}
            </div>
            {(currentSet.members || []).map(m => (
              <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#080808", border: "1px solid #111", borderRadius: 12, marginBottom: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{m.avatar || "🏃"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {m.name}
                    {m.uid === currentUser?.uid && <span style={{ color: "#00ff88", fontSize: 12, marginLeft: 6 }}>나</span>}
                    {m.uid === currentSet.adminId && <span style={{ color: "#ffaa00", fontSize: 11, marginLeft: 6 }}>👑 관리자</span>}
                  </div>
                </div>
                {isAdmin && m.uid !== currentUser?.uid && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => onTransfer(m.uid, m.name)} style={{ padding: "5px 10px", borderRadius: 8, background: "#1a1000", border: "1px solid #4d3300", color: "#ffaa00", fontFamily: "inherit", fontSize: 12, minHeight: 30 }}>👑 이전</button>
                    <button onClick={() => onKick(m.uid, m.name)} style={{ padding: "5px 10px", borderRadius: 8, background: "#1a0808", border: "1px solid #3d1010", color: "#ff7070", fontFamily: "inherit", fontSize: 12, minHeight: 30 }}>강퇴</button>
                  </div>
                )}
              </div>
            ))}
            {!isAdmin && (
              <button onClick={onLeaveSet} style={{ width: "100%", marginTop: 8, padding: "13px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 14, color: "#555", fontFamily: "inherit", fontSize: 15, minHeight: 48 }}>크루 나가기</button>
            )}
          </div>
        )}

        {isAdmin && (
          <button onClick={onDeleteSet} style={{ width: "100%", marginTop: 12, padding: "15px", background: "transparent", border: "1px solid #3d1010", borderRadius: 14, color: "#ff4444", fontFamily: "inherit", fontSize: 16, minHeight: 52 }}>
            🗑️ 크루 삭제
          </button>
        )}

        <button onClick={onLogout} style={{ width: "100%", marginTop: 12, padding: "15px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 14, color: "#444", fontFamily: "inherit", fontSize: 16, minHeight: 52 }}>로그아웃</button>
      </div>
    </div>
  );
}

/* ══ BOTTOM NAV ══ */
function BottomNav({ tab, setTab, onUpload, newFeedCount = 0, newChatCount = 0 }) {
  const tabs = [
    { id: "feed", label: "피드", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00ff88" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { id: "rank", label: "랭킹", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00ff88" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )},
    { id: "stats", label: "통계", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00ff88" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )},
    { id: "chat", label: "채팅", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00ff88" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )},
  ];

  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(6,6,6,0.97)", borderTop: "1px solid #161616", paddingBottom: safeBottom, display: "flex", alignItems: "center", zIndex: 100, backdropFilter: "blur(20px)" }}>
      {tabs.slice(0, 2).map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 58 }}>
          <div style={{ position: "relative" }}>
            {t.icon(tab === t.id)}
            {t.id === "feed" && newFeedCount > 0 && (
              <div style={{ position: "absolute", top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, background: "#ff3b3b", border: "2px solid #060606", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", padding: "0 3px" }}>
                {newFeedCount > 9 ? "9+" : newFeedCount}
              </div>
            )}
          </div>
          <span style={{ fontSize: 11, color: tab === t.id ? "#00ff88" : "#888", fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
        </button>
      ))}

      {/* 중앙 + 버튼 */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: 4 }}>
        <button onClick={onUpload} style={{ width: 52, height: 52, borderRadius: 26, background: "#00ff88", border: "none", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(0,255,136,0.4)", marginTop: -10 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {tabs.slice(2).map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 58 }}>
          <div style={{ position: "relative" }}>
            {t.icon(tab === t.id)}
            {t.id === "chat" && newChatCount > 0 && (
              <div style={{ position: "absolute", top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, background: "#ff3b3b", border: "2px solid #060606", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", padding: "0 3px" }}>
                {newChatCount > 9 ? "9+" : newChatCount}
              </div>
            )}
          </div>
          <span style={{ fontSize: 11, color: tab === t.id ? "#00ff88" : "#888", fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ══ MAIN ══ */
export default function CommunityApp({ currentUser, currentSet, onLeaveSet, onLogout, onUpdateProfile, onRedeemCoupon }) {
  const { posts, loading, createPost, toggleReaction, addComment, deletePost, getMyMonthlyPostCount } = usePosts(currentUser, currentSet?.id);
  const { kickMember, transferAdmin, leaveSet, addNotice, deleteNotice, getInviteLink, deleteSet } = useSets(currentUser);
  const isAdmin = currentSet?.adminId === currentUser?.uid;
  const isPro = currentUser?.isPro === true;

  // 푸시 알림 권한 요청 (PRO 유저만)
  useEffect(() => {
    if (!isPro) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isPro]);

  // 주간 목표 달성 알림
  const prevGoalPct = useRef(0);
  useEffect(() => {
    if (!isPro || !currentUser?.weeklyGoal) return;
    const goal = currentUser.weeklyGoal;
    const thisWeekDist = posts.filter(p => {
      if (p.userId !== currentUser?.uid) return false;
      const ts = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt||0);
      return Date.now() - ts.getTime() < 7 * 86400000;
    }).reduce((a,p) => a+(parseFloat(p.dist)||0), 0);
    const pct = (thisWeekDist / goal) * 100;
    if (prevGoalPct.current < 100 && pct >= 100) {
      if (Notification.permission === "granted") {
        new Notification("🎉 주간 목표 달성!", { body: `${thisWeekDist.toFixed(1)}km 완주! 이번 주 목표를 달성했어요!`, icon: "/icon-192.png" });
      }
    }
    prevGoalPct.current = pct;
  }, [posts]);

  // 새 채팅 카운트 - 채팅 탭 아닐 때 새 메시지 감지
  const { messages: chatMessages } = useChat(currentSet?.id);
  useEffect(() => {
    if (chatMessages.length === 0) return;
    if (prevChatLen.current === 0) { prevChatLen.current = chatMessages.length; return; }
    const diff = chatMessages.length - prevChatLen.current;
    if (diff > 0 && tab !== "chat") {
      // 내가 보낸 메시지는 카운트 제외
      const newMsgs = chatMessages.slice(-diff);
      const othersCount = newMsgs.filter(m => m.userId !== currentUser?.uid).length;
      if (othersCount > 0) setNewChatCount(c => c + othersCount);
    }
    prevChatLen.current = chatMessages.length;
  }, [chatMessages.length]);

  // 새 피드 카운트 - 피드 탭 아닐 때 새 게시물 감지
  const prevPostsLen = useRef(0);
  useEffect(() => {
    if (posts.length === 0) return;
    if (prevPostsLen.current === 0) {
      prevPostsLen.current = posts.length;
      return;
    }
    const diff = posts.length - prevPostsLen.current;
    if (diff > 0 && tab !== "feed") {
      setNewFeedCount(c => c + diff);
    }
    prevPostsLen.current = posts.length;
  }, [posts.length]);
  const { notifications, unreadCount, createNotification, createFeedNotification, createChatNotification, deleteNotification, markAllRead } = useNotifications(currentUser);
  const [tab, setTab] = useState("feed");
  const [newFeedCount, setNewFeedCount] = useState(0);
  const [newChatCount, setNewChatCount] = useState(0);
  const prevChatLen = useRef(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };
  const showConfirm = (message, onConfirm, confirmLabel, confirmColor) => {
    setConfirm({ message, onConfirm, confirmLabel, confirmColor });
  };

  const myWeekDist = posts.filter(p => {
    const ts = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
    return p.userId === currentUser?.uid && Date.now() - ts.getTime() < 7 * 86400000;
  }).reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);

  return (
    <div style={{ height: "100dvh", background: "#060606", color: "#e0e0e0", fontFamily: "'Pretendard', -apple-system, sans-serif", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed", inset: "0 auto", width: "100%" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); *{font-family:'Pretendard',-apple-system,sans-serif!important}`}</style>


      {/* 헤더 */}
      <div style={{ padding: `calc(14px + ${safeTop}) 18px 10px`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#060606", zIndex: 50 }}>
        <div>
          <div style={{ fontSize: 10, color: "#1e1e1e", letterSpacing: 4 }}>RUNTRACK</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onLeaveSet} style={{ background: "none", border: "none", color: "#e0e0e0", fontSize: 26, padding: "0 4px 0 0", cursor: "pointer", lineHeight: 1 }}>‹</button>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00ff88", letterSpacing: -0.5 }}>{currentSet?.emoji} {currentSet?.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 알림 벨 */}
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotif(true)}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "#0d0d0d", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            {unreadCount > 0 && (
              <div style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: "#ff3b3b", border: "2px solid #060606", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", padding: "0 3px" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </div>
          {/* 프로필 아바타 */}
          <div style={{ cursor: "pointer" }} onClick={() => setShowProfile(true)}>
            <Avatar user={currentUser} size={36} />
          </div>
        </div>
      </div>

      {/* 주간 요약 - 채팅 탭에서는 숨김 */}
      <div style={{ margin: "0 18px 12px", background: "#0a0a0a", border: "1px solid #161616", borderRadius: 16, padding: "12px 16px", display: tab === "chat" ? "none" : "flex", flexShrink: 0 }}>
        {[[`${myWeekDist.toFixed(1)}km`, "이번 주"], [`${posts.filter(p => p.userId === currentUser?.uid).length}회`, "총 러닝"], [`${calcStreak(posts, currentUser?.uid)}일`, "🔥 스트릭"]].map(([v, l], i) => (
          <div key={l} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #141414" : "none", paddingLeft: i > 0 ? 14 : 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#00ff88" }}>{v}</div>
            <div style={{ fontSize: 12, color: "#2e2e2e" }}>{l}</div>
          </div>
        ))}
      </div>



      {/* 컨텐츠 */}
      <div style={{ flex: 1, overflowY: tab === "chat" ? "hidden" : "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", padding: tab === "chat" ? "0" : "0 18px", paddingBottom: tab === "chat" ? "0" : `calc(80px + ${safeBottom})`, minHeight: 0 }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <div style={{ width: 34, height: 34, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {tab === "feed" && !loading && (
          <>
            {posts.length === 0 && (
              <div style={{ textAlign: "center", padding: "50px 0 40px", color: "#2a2a2a" }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>🏃</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#333", marginBottom: 10 }}>아직 기록이 없어요</div>
                <div style={{ fontSize: 14, color: "#2a2a2a", lineHeight: 1.9, marginBottom: 28 }}>
                  아래 <span style={{ color: "#00ff88", fontWeight: 800 }}>+</span> 버튼으로 러닝 기록을 올리거나<br />
                  크루원을 초대해서 같이 달려보세요!
                </div>
                <button onClick={() => {
                  const link = getInviteLink(currentSet?.id);
                  if (navigator.share) {
                    navigator.share({ title: `${currentSet?.name} 러닝 크루`, text: `${currentSet?.name}에서 같이 달려요! 🏃`, url: link });
                  } else {
                    navigator.clipboard.writeText(link).then(() => showToast("초대 링크가 복사됐어요! 🔗", "success"));
                  }
                }} style={{ background: "#0d1f14", border: "1px solid #1a3d28", borderRadius: 14, padding: "13px 24px", color: "#00ff88", fontFamily: "inherit", fontSize: 15, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  🔗 크루원 초대하기
                </button>
              </div>
            )}
            {posts.map(post => (
              <PostCard key={post.id} post={post} currentUser={currentUser} isAdmin={isAdmin}
                onReact={async (id, e) => {
                  await toggleReaction(id, e, currentUser?.uid);
                  const p = posts.find(p => p.id === id);
                  if (p && p.userId !== currentUser?.uid) {
                    createNotification({ toUserId: p.userId, fromUser: currentUser, type: "reaction", postId: id, postDist: p.dist, emoji: e });
                  }
                }}
                onComment={async (id, t) => {
                  await addComment(id, t, currentUser);
                  const p = posts.find(p => p.id === id);
                  if (p && p.userId !== currentUser?.uid) {
                    createNotification({ toUserId: p.userId, fromUser: currentUser, type: "comment", postId: id, postDist: p.dist, commentText: t });
                  }
                }}
                onDelete={(id) => deletePost(id, isAdmin)} />
            ))}
          </>
        )}

        {tab === "rank" && !loading && <LeaderboardTab posts={posts} currentUser={currentUser} isPro={isPro} />}

        {tab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingBottom: `calc(58px + ${safeBottom})` }}>
            <ChatTab setId={currentSet?.id} currentUser={currentUser} />
          </div>
        )}

        {tab === "stats" && !loading && (
          <StatsTab posts={posts} currentUser={currentUser} isPro={isPro} onUpdateProfile={onUpdateProfile} />
        )}
      </div>

      {/* 하단 네비게이션 */}
      <BottomNav tab={tab} setTab={(t) => { setTab(t); if (t === "feed") setNewFeedCount(0); if (t === "chat") setNewChatCount(0); }} newFeedCount={newFeedCount} newChatCount={newChatCount} onUpload={() => {
        if (!isPro) {
          const count = getMyMonthlyPostCount();
          if (count >= FREE_MONTHLY_LIMIT) {
            showToast(`무료 회원은 월 ${FREE_MONTHLY_LIMIT}회까지만 업로드할 수 있어요. PRO로 업그레이드하세요! ⚡`, "warning");
            return;
          }
        }
        setShowUpload(true);
      }} />

      {/* 모달 */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onPost={async (data) => {
        await createPost(data);
        // 크루원들에게 피드 알림
        const members = currentSet?.memberIds || [];
        members.forEach(uid => {
          if (uid !== currentUser?.uid) {
            createFeedNotification({ toUserId: uid, fromUser: currentUser, postId: null, postDist: data.dist });
          }
        });
      }} currentUser={currentUser} isPro={isPro} />}
      {showNotif && <NotificationModal notifications={notifications} onClose={() => { setShowNotif(false); markAllRead(); }} onMarkAllRead={markAllRead} onDelete={deleteNotification} schedules={chatMessages.filter(m => m.type === "schedule")} />}
      {showProfile && <ProfileModal
        currentUser={currentUser} posts={posts}
        currentSet={currentSet} isAdmin={isAdmin}
        onKick={(uid, name) => {
          setShowProfile(false);
          setTimeout(() => {
            showConfirm(`${name}님을 강퇴할까요?`, async () => {
              setConfirm(null);
              await kickMember(currentSet.id, uid);
              showToast(`${name}님을 강퇴했어요.`, "warning");
            }, "강퇴", "#ff4444");
          }, 200);
        }}
        onTransfer={(uid, name) => {
          setShowProfile(false);
          setTimeout(() => {
            showConfirm(`${name}님에게 관리자 권한을 이전할까요?`, async () => {
              setConfirm(null);
              await transferAdmin(currentSet.id, uid);
              showToast(`${name}님에게 관리자 권한을 이전했어요. 👑`, "success");
            }, "이전", "#ffaa00");
          }, 200);
        }}
        onLeaveSet={async () => {
          try {
            await leaveSet(currentSet.id);
            onLeaveSet();
          } catch(e) { alert(e.message); }
        }}
        onDeleteSet={() => {
          showConfirm(`"${currentSet?.name}" 크루를 삭제할까요?\n게시물이 모두 삭제되고 복구할 수 없어요.`, async () => {
            setConfirm(null);
            try {
              await deleteSet(currentSet.id);
              onLeaveSet();
            } catch(e) { showToast(e.message, "error"); }
          }, "삭제", "#ff4444");
        }}
        onClose={() => setShowProfile(false)}
        onLogout={onLogout} onUpdateProfile={onUpdateProfile} onRedeemCoupon={onRedeemCoupon} />}
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} confirmLabel={confirm.confirmLabel} confirmColor={confirm.confirmColor} />}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
