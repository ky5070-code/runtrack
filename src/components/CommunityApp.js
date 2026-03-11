// src/components/CommunityApp.js
import React, { useState, useRef } from "react";
import { usePosts } from "../hooks/usePosts";
import { useNotifications } from "../hooks/useNotifications";
import { useSets } from "../hooks/useSets";
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
  const [showFeedback, setShowFeedback] = useState(true);
  const myReaction = post[`myReaction_${currentUser?.uid}`];
  const isMyPost = post.userId === currentUser?.uid;
  const canDelete = isMyPost || isAdmin;

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div style={{ background: isMyPost ? "#0c110e" : "#0b0b0b", border: isMyPost ? "1.5px solid #00ff88" : "1px solid #181818", borderRadius: 18, overflow: "hidden", marginBottom: 12, boxShadow: isMyPost ? "0 0 12px rgba(0,255,136,0.06)" : "none" }}>
      <div style={{ height: 4, background: post.source === "ai" ? "linear-gradient(90deg,#00ff88,#009944)" : "#1a1a1a" }} />

      {post.imageUrl && (
        <div style={{ height: 200, overflow: "hidden", position: "relative" }}>
          <img src={post.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.65 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 50%,#0b0b0b)" }} />
          {post.source === "ai" && (
            <div style={{ position: "absolute", top: 10, right: 10, background: "#0d1f14", border: "1px solid #00ff88", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#00ff88" }}>📸 AI</div>
          )}
        </div>
      )}

      <div style={{ padding: "14px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar user={author} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{author.name || "러너"}</div>
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

        <div style={{ background: "#070707", border: "1px solid #141414", borderRadius: 14, padding: "12px 14px", marginBottom: 12, display: "flex" }}>
          {[[Number(post.dist).toFixed(2) + "km", "거리", true], [fmtTime(post.duration), "시간", false], [post.pace || "--", "페이스", false], [post.calories || "--", "칼로리", false]].map(([v, l, accent], i) => (
            <div key={l} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #141414" : "none", paddingLeft: i > 0 ? 10 : 0 }}>
              <div style={{ fontSize: 11, color: "#2e2e2e", marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: i === 0 ? 17 : 13, fontWeight: 800, color: accent ? "#00ff88" : "#d0d0d0" }}>{v}</div>
            </div>
          ))}
        </div>

        {post.caption && <div style={{ fontSize: 15, color: "#aaa", marginBottom: 12, lineHeight: 1.6 }}>{post.caption}</div>}

        {/* AI 코치 피드백 */}
        {post.aiFeedback && showFeedback && (
          <div style={{ background: "#060e09", border: "1px solid #1a3028", borderRadius: 12, padding: "12px 14px", marginBottom: 12, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>✨</span>
              <span style={{ fontSize: 12, color: "#00cc66", fontWeight: 700, letterSpacing: 1 }}>AI 코치 피드백</span>
              <button onClick={() => setShowFeedback(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#2a2a2a", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
            </div>
            {post.aiFeedback.split("\n").filter(l => l.trim()).map((line, i) => (
              <div key={i} style={{ fontSize: 14, color: "#7a9e87", lineHeight: 1.8 }}>{line}</div>
            ))}
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
                style={{ flex: 1, background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 20, padding: "8px 14px", color: "#ccc", fontFamily: "inherit", fontSize: 15, outline: "none" }} />
              <button onClick={submitComment} style={{ width: 38, height: 38, borderRadius: 19, background: commentText ? "#00ff88" : "#111", border: "none", color: commentText ? "#000" : "#333", fontSize: 18, fontWeight: 800 }}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ UPLOAD MODAL ══ */
function UploadModal({ onClose, onPost, currentUser }) {
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
          generateRunFeedback({
            distance: r.distance,
            duration: r.duration,
            pace: r.pace,
            calories: r.calories,
          }).then(fb => setFeedback(fb)).catch(() => {});
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
          {feedback && (
            <div style={{ background: "#080f0b", border: "1px solid #1a3d28", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#00ff88", letterSpacing: 2, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✨</span> AI 코치 피드백
              </div>
              {feedback.split("\n").filter(l => l.trim()).map((line, i) => (
                <div key={i} style={{ fontSize: 15, color: "#aaa", lineHeight: 1.7, marginBottom: i < 2 ? 4 : 0 }}>{line}</div>
              ))}
            </div>
          )}
          {!feedback && result && (
            <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 16, height: 16, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <div style={{ fontSize: 14, color: "#333" }}>AI 코치가 피드백 작성 중...</div>
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

function LeaderboardTab({ posts, currentUser }) {
  const [period, setPeriod] = useState("week");
  const cutoff = period === "week" ? 7 * 86400000 : 30 * 86400000;
  const userMap = {};
  posts.forEach(p => {
    if (!p.author) return;
    const ts = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
    if (Date.now() - ts.getTime() > cutoff) return;
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
        {[["week", "이번 주"], ["month", "이번 달"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: period === v ? "#00ff88" : "#0d0d0d", color: period === v ? "#000" : "#444", fontFamily: "inherit", fontSize: 15, fontWeight: 700, minHeight: 46 }}>{l}</button>
        ))}
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
function NotificationModal({ notifications, onClose, onMarkAllRead }) {
  const relTime = (val) => {
    const ts = val?.toDate ? val.toDate() : new Date(val || 0);
    const d = Date.now() - ts.getTime();
    if (isNaN(d) || d < 0) return "방금";
    if (d < 60000) return "방금";
    if (d < 3600000) return `${Math.floor(d / 60000)}분 전`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}시간 전`;
    return `${Math.floor(d / 86400000)}일 전`;
  };

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

        {notifications.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#2a2a2a" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🔔</div>
            <div style={{ fontSize: 15 }}>아직 알림이 없어요</div>
          </div>
        )}

        {notifications.map(n => (
          <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: n.read ? "#080808" : "#0a1a0f", border: `1px solid ${n.read ? "#111" : "#1a3d28"}`, borderRadius: 14, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: "#111", border: "1.5px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, position: "relative" }}>
              {n.fromUserAvatar || "🏃"}
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                {n.type === "reaction" ? n.emoji : "💬"}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: n.read ? "#aaa" : "#e0e0e0" }}>{n.fromUserName}</span>
                <span style={{ color: "#555" }}>
                  {n.type === "reaction" ? ` 님이 ${n.emoji} 반응했어요` : " 님이 댓글을 달았어요"}
                </span>
              </div>
              {n.type === "comment" && n.commentText && (
                <div style={{ fontSize: 13, color: "#444", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{n.commentText}"</div>
              )}
              {n.postDist && (
                <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 2 }}>{Number(n.postDist).toFixed(2)}km 기록</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#2a2a2a", flexShrink: 0 }}>{relTime(n.createdAt)}</div>
            {!n.read && <div style={{ width: 7, height: 7, borderRadius: 4, background: "#00ff88", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ══ CHAT TAB ══ */
function ChatTab({ setId, currentUser }) {
  const { messages, loading, sendMessage } = useChat(setId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // 새 메시지 오면 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div style={{ width: 28, height: 28, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%" }}>
      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12, minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#2a2a2a" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 15 }}>첫 메시지를 보내보세요!</div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.userId === currentUser?.uid;
          const showAvatar = !isMe && (i === 0 || messages[i-1]?.userId !== msg.userId);
          const showName = !isMe && showAvatar;

          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: 6, padding: "0 2px" }}>
              {/* 아바타 (상대방만) */}
              {!isMe && (
                <div style={{ width: 32, height: 32, borderRadius: 16, background: showAvatar ? "#111" : "transparent", border: showAvatar ? "1px solid #1e1e1e" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                  {showAvatar ? msg.userAvatar : ""}
                </div>
              )}

              <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                {showName && <div style={{ fontSize: 11, color: "#444", marginBottom: 3, paddingLeft: 4 }}>{msg.userName}</div>}
                <div style={{ background: isMe ? "#00ff88" : "#141414", color: isMe ? "#000" : "#e0e0e0", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", border: isMe ? "none" : "1px solid #1e1e1e" }}>
                  {msg.text}
                </div>
                <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{relTime(msg.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", paddingTop: 10, borderTop: "1px solid #111" }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="메시지 입력..."
          maxLength={500}
          style={{ flex: 1, background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 22, padding: "12px 16px", color: "#e0e0e0", fontFamily: "inherit", fontSize: 14, outline: "none" }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{ width: 46, height: 46, borderRadius: 23, background: text.trim() ? "#00ff88" : "#111", border: "none", color: text.trim() ? "#000" : "#333", fontSize: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ➤
        </button>
      </div>
    </div>
  );
}

/* ══ STATS TAB ══ */
function StatsTab({ posts, currentUser }) {
  const myPosts = posts.filter(p => p.userId === currentUser?.uid);

  // 최근 8주 데이터
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = Date.now() - (i + 1) * 7 * 86400000;
    const end = Date.now() - i * 7 * 86400000;
    const label = i === 0 ? "이번주" : `${i}주전`;
    const dist = myPosts.filter(p => {
      const t = p.createdAt?.toDate ? p.createdAt.toDate().getTime() : new Date(p.createdAt || 0).getTime();
      return t >= start && t < end;
    }).reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);
    weeks.push({ label, dist });
  }

  const maxDist = Math.max(...weeks.map(w => w.dist), 1);
  const totalDist = myPosts.reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);
  const totalRuns = myPosts.length;
  const avgDist = totalRuns > 0 ? totalDist / totalRuns : 0;
  const bestDist = myPosts.reduce((a, p) => Math.max(a, parseFloat(p.dist) || 0), 0);

  // 페이스 계산
  const validPace = myPosts.filter(p => p.pace && p.pace !== "--");
  const avgPace = validPace.length > 0
    ? validPace[validPace.length > 5 ? validPace.length - 5 : 0]?.pace || "--"
    : "--";

  return (
    <div>
      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
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

      {/* 주간 거리 바 차트 */}
      <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 16, padding: "18px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#333", letterSpacing: 2, marginBottom: 16 }}>주간 러닝 거리</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
          {weeks.map((w, i) => {
            const h = maxDist > 0 ? Math.max((w.dist / maxDist) * 90, w.dist > 0 ? 6 : 0) : 0;
            const isThis = i === 7;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                {w.dist > 0 && <div style={{ fontSize: 10, color: isThis ? "#00ff88" : "#444" }}>{w.dist.toFixed(1)}</div>}
                <div style={{ width: "100%", height: h, background: isThis ? "#00ff88" : "#1a3020", borderRadius: "4px 4px 0 0", minHeight: h > 0 ? 4 : 0, transition: "height 0.3s" }} />
                <div style={{ fontSize: 10, color: isThis ? "#00ff88" : "#2a2a2a", textAlign: "center" }}>{w.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 최근 기록 */}
      {myPosts.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#2a2a2a" }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 15 }}>러닝 기록을 추가하면 통계가 보여요!</div>
        </div>
      )}
    </div>
  );
}

/* ══ PROFILE MODAL ══ */
function ProfileModal({ currentUser, posts, currentSet, isAdmin, onKick, onTransfer, onLeaveSet, onDeleteSet, onClose, onLogout, onUpdateProfile }) {
  const myPosts = posts.filter(p => p.userId === currentUser?.uid);
  const totalDist = myPosts.reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || "🏃");
  const AVATARS_LIST = ["🏃", "⚡", "🔥", "🌊", "💨", "🦅", "🐆", "🎯", "🚀", "💎", "🏅", "🌟"];

  const saveProfile = async () => { await onUpdateProfile({ name, bio, avatar: selectedAvatar }); setEditMode(false); };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#0d0d0d", borderRadius: "22px 22px 0 0", border: "1px solid #1a1a1a", padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})`, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1 }}>
            <div style={{ width: 70, height: 70, borderRadius: 35, background: "#111", border: "1.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>{selectedAvatar}</div>
            <div style={{ flex: 1 }}>
              {editMode ? <input value={name} onChange={e => setName(e.target.value)} style={{ background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#fff", fontFamily: "inherit", fontSize: 19, fontWeight: 800, outline: "none", width: "100%" }} />
                : <div style={{ fontSize: 19, fontWeight: 800 }}>{currentUser?.name}</div>}
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[[`${totalDist.toFixed(1)}km`, "총 거리"], [`${myPosts.length}개`, "게시물"], [`${calcStreak(posts, currentUser?.uid)}일`, "🔥 스트릭"]].map(([v, l]) => (
            <div key={l} style={{ background: "#080808", border: "1px solid #161616", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#00ff88" }}>{v}</div>
              <div style={{ fontSize: 12, color: "#333", marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 12 }}>내 러닝 기록</div>
        {myPosts.slice(0, 5).map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "#080808", border: "1px solid #111", borderRadius: 12, marginBottom: 8, minHeight: 60 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#0d1f14", border: "1px solid #1a3d28", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#00ff88", lineHeight: 1 }}>{Number(p.dist).toFixed(1)}</div>
              <div style={{ fontSize: 10, color: "#1a6640" }}>KM</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: "#ccc" }}>{p.date}</div>
              <div style={{ fontSize: 13, color: "#444", marginTop: 2 }}>{fmtTime(p.duration)} · {p.pace || "--"}/km</div>
            </div>
          </div>
        ))}

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
function BottomNav({ onUpload, onHome, onProfile }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(6,6,6,0.96)", borderTop: "1px solid #161616", paddingBottom: safeBottom, display: "flex", zIndex: 100, backdropFilter: "blur(20px)" }}>
      {/* 홈 버튼 */}
      <button onClick={onHome} style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minHeight: 56 }}>
        <div style={{ fontSize: 24, color: "#383838" }}>🏠</div>
        <div style={{ fontSize: 12, color: "#383838" }}>홈</div>
      </button>

      {/* 업로드 버튼 */}
      <button onClick={onUpload} style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minHeight: 56 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: "#00ff88", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#000", marginTop: -18, boxShadow: "0 0 24px rgba(0,255,136,0.35)", fontWeight: 800 }}>+</div>
      </button>

      {/* 프로필 버튼 */}
      <button onClick={onProfile} style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minHeight: 56 }}>
        <div style={{ fontSize: 24, color: "#383838" }}>👤</div>
        <div style={{ fontSize: 12, color: "#383838" }}>프로필</div>
      </button>
    </div>
  );
}

/* ══ MAIN ══ */
export default function CommunityApp({ currentUser, currentSet, onLeaveSet, onLogout, onUpdateProfile }) {
  const { posts, loading, createPost, toggleReaction, addComment, deletePost } = usePosts(currentUser, currentSet?.id);
  const { kickMember, transferAdmin, leaveSet, addNotice, deleteNotice, getInviteLink, deleteSet } = useSets(currentUser);
  const isAdmin = currentSet?.adminId === currentUser?.uid;
  const { notifications, unreadCount, createNotification, markAllRead } = useNotifications(currentUser);
  const [tab, setTab] = useState("feed");
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const myWeekDist = posts.filter(p => {
    const ts = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
    return p.userId === currentUser?.uid && Date.now() - ts.getTime() < 7 * 86400000;
  }).reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#e0e0e0", fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&display=swap'); *{font-family:'Black Han Sans',sans-serif!important}`}</style>

      {/* 상태바 Safe Area */}
      <div style={{ height: safeTop, background: "#060606", flexShrink: 0 }} />

      {/* 헤더 */}
      <div style={{ padding: "14px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: "#1e1e1e", letterSpacing: 4 }}>RUNTRACK</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onLeaveSet} style={{ background: "none", border: "none", color: "#333", fontSize: 20, padding: 0, cursor: "pointer" }}>‹</button>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00ff88", letterSpacing: -0.5 }}>{currentSet?.emoji} {currentSet?.name}</div>
          </div>
        </div>
        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotif(true)}>
          <Avatar user={currentUser} size={40} />
          {unreadCount > 0 && (
            <div style={{ position: "absolute", top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, background: "#ff3b3b", border: "2px solid #060606", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", padding: "0 3px" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* 주간 요약 */}
      <div style={{ margin: "12px 18px 0", background: "#0a0a0a", border: "1px solid #161616", borderRadius: 16, padding: "12px 16px", display: "flex", flexShrink: 0 }}>
        {[[`${myWeekDist.toFixed(1)}km`, "이번 주"], [`${posts.filter(p => p.userId === currentUser?.uid).length}회`, "총 러닝"], [`${calcStreak(posts, currentUser?.uid)}일`, "🔥 스트릭"]].map(([v, l], i) => (
          <div key={l} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #141414" : "none", paddingLeft: i > 0 ? 14 : 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#00ff88" }}>{v}</div>
            <div style={{ fontSize: 12, color: "#2e2e2e" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 8, padding: "12px 18px 0", flexShrink: 0 }}>
        {[["feed", "피드"], ["rank", "랭킹"], ["stats", "통계"], ["chat", "채팅"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: tab === id ? "#00ff88" : "#0d0d0d", color: tab === id ? "#000" : "#444", fontFamily: "inherit", fontSize: 15, fontWeight: 700, minHeight: 44 }}>{label}</button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div style={{ flex: 1, padding: tab === "chat" ? "0" : "14px 18px", paddingBottom: tab === "chat" ? "0" : `calc(80px + ${safeBottom})`, overflowY: tab === "chat" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <div style={{ width: 34, height: 34, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {tab === "feed" && !loading && (
          <>
            {posts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#2a2a2a" }}>
                <div style={{ fontSize: 50, marginBottom: 14 }}>🏃</div>
                <div style={{ fontSize: 16, lineHeight: 1.8 }}>첫 번째 러닝을 공유해보세요!<br />아래 + 버튼을 눌러보세요</div>
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

        {tab === "rank" && !loading && <LeaderboardTab posts={posts} currentUser={currentUser} />}

        {tab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: "0 18px", paddingBottom: `calc(80px + ${safeBottom})` }}>
            <ChatTab setId={currentSet?.id} currentUser={currentUser} />
          </div>
        )}

        {tab === "stats" && !loading && (
          <StatsTab posts={posts} currentUser={currentUser} />
        )}
      </div>

      {/* 하단 네비게이션 */}
      <BottomNav onUpload={() => setShowUpload(true)} onHome={onLeaveSet} onProfile={() => setShowProfile(true)} />

      {/* 모달 */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onPost={createPost} currentUser={currentUser} />}
      {showNotif && <NotificationModal notifications={notifications} onClose={() => { setShowNotif(false); markAllRead(); }} onMarkAllRead={markAllRead} />}
      {showProfile && <ProfileModal
        currentUser={currentUser} posts={posts}
        currentSet={currentSet} isAdmin={isAdmin}
        onKick={async (uid, name) => {
          if (window.confirm(`${name}님을 강퇴할까요?`)) {
            await kickMember(currentSet.id, uid);
          }
        }}
        onTransfer={async (uid, name) => {
          if (window.confirm(`${name}님에게 관리자를 이전할까요?`)) {
            await transferAdmin(currentSet.id, uid);
          }
        }}
        onLeaveSet={async () => {
          try {
            await leaveSet(currentSet.id);
            onLeaveSet();
          } catch(e) { alert(e.message); }
        }}
        onDeleteSet={async () => {
          if (window.confirm(`"${currentSet.name}" 크루를 삭제할까요?\n게시물이 모두 삭제되고 복구할 수 없어요.`)) {
            try {
              await deleteSet(currentSet.id);
              onLeaveSet();
            } catch(e) { alert(e.message); }
          }
        }}
        onClose={() => setShowProfile(false)}
        onLogout={onLogout} onUpdateProfile={onUpdateProfile} />}
    </div>
  );
}
