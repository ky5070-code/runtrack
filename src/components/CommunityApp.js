// src/components/CommunityApp.js
import React, { useState, useRef } from "react";
import { usePosts } from "../hooks/usePosts";
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
function PostCard({ post, currentUser, onReact, onComment, onDelete }) {
  const author = post.author || {};
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const myReaction = post[`myReaction_${currentUser?.uid}`];
  const isMyPost = post.userId === currentUser?.uid;

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div style={{ background: "#0b0b0b", border: "1px solid #181818", borderRadius: 18, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ height: 4, background: post.source === "ai" ? "linear-gradient(90deg,#00ff88,#009944)" : "#1a1a1a" }} />

      {post.imageUrl && (
        <div style={{ height: 200, overflow: "hidden", position: "relative" }}>
          <img src={post.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.65 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 50%,#0b0b0b)" }} />
          {post.source === "ai" && (
            <div style={{ position: "absolute", top: 10, right: 10, background: "#0d1f14", border: "1px solid #00ff88", borderRadius: 6, padding: "3px 8px", fontSize: 10, color: "#00ff88" }}>📸 AI</div>
          )}
        </div>
      )}

      <div style={{ padding: "14px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar user={author} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{author.name || "러너"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#383838" }}>{relTime(post.createdAt)}</span>
              {post.source === "ai" && <span style={{ background: "#0d1f14", border: "1px solid #1a3d28", borderRadius: 4, padding: "1px 6px", fontSize: 9, color: "#00cc66" }}>AI</span>}
              {post.appName && <span style={{ fontSize: 10, color: "#2a2a2a" }}>{post.appName}</span>}
            </div>
          </div>
          {isMyPost && (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ background: "none", border: "none", color: "#333", fontSize: 18, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
          )}
        </div>

        {/* 삭제 확인 */}
        {showDeleteConfirm && (
          <div style={{ background: "#1a0808", border: "1px solid #3d1010", borderRadius: 12, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#ff7070" }}>이 기록을 삭제할까요?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", border: "1px solid #333", color: "#666", fontFamily: "inherit", fontSize: 12, minHeight: 34 }}>취소</button>
              <button onClick={() => { onDelete(post.id); setShowDeleteConfirm(false); }} style={{ padding: "6px 12px", borderRadius: 8, background: "#ff3b3b", border: "none", color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 700, minHeight: 34 }}>삭제</button>
            </div>
          </div>
        )}

        <div style={{ background: "#070707", border: "1px solid #141414", borderRadius: 14, padding: "12px 14px", marginBottom: 12, display: "flex" }}>
          {[[Number(post.dist).toFixed(2) + "km", "거리", true], [fmtTime(post.duration), "시간", false], [post.pace || "--", "페이스", false], [post.calories || "--", "칼로리", false]].map(([v, l, accent], i) => (
            <div key={l} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #141414" : "none", paddingLeft: i > 0 ? 10 : 0 }}>
              <div style={{ fontSize: 9, color: "#2e2e2e", marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: i === 0 ? 17 : 13, fontWeight: 800, color: accent ? "#00ff88" : "#d0d0d0" }}>{v}</div>
            </div>
          ))}
        </div>

        {post.caption && <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12, lineHeight: 1.6 }}>{post.caption}</div>}

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
                  fontSize: 13, display: "flex", alignItems: "center", gap: 3
                }}>
                  {e}{count > 0 && <span style={{ fontSize: 11, color: active ? "#00ff88" : "#555" }}>{count}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowComments(s => !s)} style={{ background: "none", border: "none", color: "#555", fontSize: 14, minWidth: 40, minHeight: 40, display: "flex", alignItems: "center", gap: 3 }}>
            💬{post.comments?.length > 0 && <span style={{ fontSize: 11 }}>{post.comments.length}</span>}
          </button>
        </div>

        {showComments && (
          <div style={{ borderTop: "1px solid #111", paddingTop: 12, marginTop: 10 }}>
            {(post.comments || []).map(c => (
              <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{c.userAvatar || "🏃"}</div>
                <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 10, padding: "8px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 2 }}>{c.userName}</div>
                  <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5 }}>{c.text}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Avatar user={currentUser} size={30} />
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="댓글 달기..."
                style={{ flex: 1, background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 20, padding: "8px 14px", color: "#ccc", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
              <button onClick={submitComment} style={{ width: 38, height: 38, borderRadius: 19, background: commentText ? "#00ff88" : "#111", border: "none", color: commentText ? "#000" : "#333", fontSize: 16, fontWeight: 800 }}>↑</button>
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
          // 피드백 비동기 요청 (분석과 별개로)
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
    await onPost({ dist: parseFloat(edited.distance) || 0, duration, pace: edited.pace || "", calories: parseInt(edited.calories) || 0, date: edited.date || new Date().toISOString().slice(0, 10), caption, imageFile: file, source: result ? "ai" : "manual", appName: result?.appName || null });
    setPosting(false);
    onClose();
  };

  const ef = (key, label, unit, kbd = "decimal") => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: "#444", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <input value={edited[key] ?? ""} onChange={e => setEdited(p => ({ ...p, [key]: e.target.value }))} inputMode={kbd}
          style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #222", color: "#00ff88", fontFamily: "inherit", fontSize: 17, fontWeight: 800, outline: "none", padding: "4px 0" }} />
        {unit && <span style={{ fontSize: 10, color: "#333" }}>{unit}</span>}
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#0d0d0d", borderRadius: "22px 22px 0 0", border: "1px solid #1a1a1a", padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})`, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            {{"pick": "🏃 러닝 기록 올리기", "analyzing": "🤖 AI 분석 중...", "confirm": "📊 데이터 확인", "caption": "✏️ 공유하기"}[step]}
          </div>
          <button onClick={onClose} style={{ background: "#111", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#666", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {step === "pick" && <>
          {error && <div style={{ background: "#1a0808", border: "1px solid #3d1010", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "#ff7070" }}>{error}</div>}
          <div onClick={() => inputRef.current?.click()} style={{ border: "2px dashed #1e1e1e", borderRadius: 18, padding: "44px 20px", textAlign: "center", background: "#080808" }}>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#555", marginBottom: 8 }}>러닝 앱 스크린샷 업로드</div>
            <div style={{ fontSize: 12, color: "#2a2a2a", lineHeight: 1.9 }}>Nike Run Club · Strava · 삼성 헬스<br />Apple Watch · Garmin · 기타 앱</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#161616" }} /><div style={{ fontSize: 11, color: "#2e2e2e" }}>또는</div><div style={{ flex: 1, height: 1, background: "#161616" }} />
          </div>
          <button onClick={() => { setResult(null); setEdited({ distance: "", durationStr: "", pace: "", calories: "", date: new Date().toISOString().slice(0, 10) }); setStep("confirm"); }}
            style={{ width: "100%", padding: "15px", background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, color: "#666", fontFamily: "inherit", fontSize: 14, minHeight: 52 }}>✏️ 직접 입력하기</button>
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
            <div style={{ fontSize: 15, color: "#00ff88", fontWeight: 700, marginBottom: 8 }}>Claude AI가 분석 중이에요</div>
            <div style={{ fontSize: 12, color: "#333", marginBottom: 20 }}>거리 · 시간 · 페이스 · 칼로리 추출 중</div>
            <div style={{ height: 3, background: "#111", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "40%", background: "linear-gradient(90deg,transparent,#00ff88,transparent)", animation: "scan 1.4s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {step === "confirm" && <>
          {previewUrl && <div style={{ height: 130, borderRadius: 14, overflow: "hidden", marginBottom: 18, position: "relative" }}>
            <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,#0d0d0d)" }} />
            {result && <div style={{ position: "absolute", top: 10, right: 10, background: "#0d1f14", border: "1px solid #00ff88", borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#00ff88" }}>AI 분석 완료 ✓</div>}
          </div>}
          {/* AI 피드백 */}
          {feedback && (
            <div style={{ background: "#080f0b", border: "1px solid #1a3d28", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#00ff88", letterSpacing: 2, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✨</span> AI 코치 피드백
              </div>
              {feedback.split("\n").filter(l => l.trim()).map((line, i) => (
                <div key={i} style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7, marginBottom: i < 2 ? 4 : 0 }}>{line}</div>
              ))}
            </div>
          )}
          {!feedback && result && (
            <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 16, height: 16, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#333" }}>AI 코치가 피드백 작성 중...</div>
            </div>
          )}
          <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 14 }}>데이터 확인 · 수정 가능</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>{ef("distance", "거리", "km")}{ef("durationStr", "시간", "")}{ef("pace", "페이스", "/km", "text")}</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>{ef("calories", "칼로리", "kcal")}{ef("date", "날짜", "", "text")}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setStep("pick"); setPreviewUrl(null); setFile(null); setResult(null); }} style={{ flex: 1, padding: "14px", background: "transparent", border: "1px solid #1e1e1e", borderRadius: 14, color: "#555", fontFamily: "inherit", fontSize: 14, minHeight: 52 }}>다시</button>
            <button onClick={() => setStep("caption")} style={{ flex: 2, padding: "14px", background: "#00ff88", border: "none", borderRadius: 14, color: "#000", fontFamily: "inherit", fontSize: 15, fontWeight: 800, minHeight: 52 }}>다음 →</button>
          </div>
        </>}

        {step === "caption" && <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <Avatar user={currentUser} size={46} />
            <div><div style={{ fontSize: 14, fontWeight: 700 }}>{currentUser?.name}</div><div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{edited.distance}km · {edited.durationStr}</div></div>
          </div>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="오늘의 러닝은 어땠나요? 경로, 날씨, 느낀 점을 공유해봐요 🏃"
            style={{ width: "100%", background: "#080808", border: "1px solid #1e1e1e", borderRadius: 14, padding: "14px", color: "#ccc", fontFamily: "inherit", fontSize: 13, outline: "none", resize: "none", height: 120, boxSizing: "border-box", lineHeight: 1.7 }} />
          <button onClick={handlePost} disabled={posting} style={{ width: "100%", marginTop: 14, padding: "17px", background: posting ? "#0d3320" : "#00ff88", border: "none", borderRadius: 14, color: posting ? "#00ff88" : "#000", fontFamily: "inherit", fontSize: 15, fontWeight: 800, minHeight: 56 }}>
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
          <button key={v} onClick={() => setPeriod(v)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: period === v ? "#00ff88" : "#0d0d0d", color: period === v ? "#000" : "#444", fontFamily: "inherit", fontSize: 13, fontWeight: 700, minHeight: 46 }}>{l}</button>
        ))}
      </div>

      {scores.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#2a2a2a" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>아직 기록이 없어요<br />첫 번째로 달려보세요!</div>
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
                <div style={{ fontSize: 26 }}>{s.user.avatar || "🏃"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: rank === 0 ? "#00ff88" : "#888", textAlign: "center" }}>{s.user.name}</div>
                <div style={{ fontSize: 13, color: "#00ff88", fontWeight: 800 }}>{s.dist.toFixed(1)}km</div>
                <div style={{ width: "100%", height: heights[i], background: rank === 0 ? "linear-gradient(180deg,#00ff88,#009944)" : "#111", borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: rank !== 0 ? "1px solid #1a1a1a" : "none" }}>{medals[rank]}</div>
              </div>
            );
          })}
        </div>
      )}

      {scores.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: s.user.uid === currentUser?.uid ? "#0d1f14" : "#0a0a0a", border: `1px solid ${s.user.uid === currentUser?.uid ? "#1a3d28" : "#161616"}`, borderRadius: 14, marginBottom: 8, minHeight: 66 }}>
          <div style={{ fontSize: i < 3 ? 22 : 14, width: 28, textAlign: "center", color: i < 3 ? "inherit" : "#2e2e2e", fontWeight: 700 }}>{i < 3 ? medals[i] : i + 1}</div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: "#111", border: "1.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.user.avatar || "🏃"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{s.user.name}{s.user.uid === currentUser?.uid && <span style={{ color: "#00ff88", fontSize: 10, marginLeft: 6 }}>ME</span>}</div>
            <div style={{ fontSize: 11, color: "#383838", marginTop: 2 }}>{s.runs}회 러닝 · 평균 {s.avgPace}/km</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: i === 0 ? "#00ff88" : "#aaa" }}>{s.dist.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: "#2a2a2a" }}>km 누적</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ PROFILE MODAL ══ */
function ProfileModal({ currentUser, posts, onClose, onLogout, onUpdateProfile }) {
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
            <div style={{ width: 70, height: 70, borderRadius: 35, background: "#111", border: "1.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{selectedAvatar}</div>
            <div style={{ flex: 1 }}>
              {editMode ? <input value={name} onChange={e => setName(e.target.value)} style={{ background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#fff", fontFamily: "inherit", fontSize: 17, fontWeight: 800, outline: "none", width: "100%" }} />
                : <div style={{ fontSize: 17, fontWeight: 800 }}>{currentUser?.name}</div>}
              {editMode ? <input value={bio} onChange={e => setBio(e.target.value)} placeholder="한 줄 소개..." style={{ background: "transparent", border: "none", borderBottom: "1px solid #222", color: "#666", fontFamily: "inherit", fontSize: 12, outline: "none", width: "100%", marginTop: 6 }} />
                : <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{currentUser?.bio || "한 줄 소개를 입력해보세요"}</div>}
            </div>
          </div>
          <button onClick={() => editMode ? saveProfile() : setEditMode(true)} style={{ background: editMode ? "#00ff88" : "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "9px 16px", color: editMode ? "#000" : "#666", fontFamily: "inherit", fontSize: 13, fontWeight: 700, minHeight: 42 }}>
            {editMode ? "저장" : "편집"}
          </button>
        </div>

        {editMode && <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 10 }}>아바타 선택</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {AVATARS_LIST.map(a => <button key={a} onClick={() => setSelectedAvatar(a)} style={{ width: 46, height: 46, borderRadius: 23, background: selectedAvatar === a ? "#0d1f14" : "#0d0d0d", border: selectedAvatar === a ? "2px solid #00ff88" : "1px solid #1a1a1a", fontSize: 22 }}>{a}</button>)}
          </div>
        </div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[[`${totalDist.toFixed(1)}km`, "총 거리"], [`${myPosts.length}개`, "게시물"], [`${currentUser?.streak || 0}일`, "스트릭"]].map(([v, l]) => (
            <div key={l} style={{ background: "#080808", border: "1px solid #161616", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#00ff88" }}>{v}</div>
              <div style={{ fontSize: 10, color: "#333", marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 12 }}>내 러닝 기록</div>
        {myPosts.slice(0, 5).map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "#080808", border: "1px solid #111", borderRadius: 12, marginBottom: 8, minHeight: 60 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#0d1f14", border: "1px solid #1a3d28", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#00ff88", lineHeight: 1 }}>{Number(p.dist).toFixed(1)}</div>
              <div style={{ fontSize: 8, color: "#1a6640" }}>KM</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#ccc" }}>{p.date}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{fmtTime(p.duration)} · {p.pace || "--"}/km</div>
            </div>
          </div>
        ))}

        <button onClick={onLogout} style={{ width: "100%", marginTop: 18, padding: "15px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 14, color: "#444", fontFamily: "inherit", fontSize: 14, minHeight: 52 }}>로그아웃</button>
      </div>
    </div>
  );
}

/* ══ BOTTOM NAV ══ */
function BottomNav({ tab, setTab, onUpload }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(6,6,6,0.96)", borderTop: "1px solid #161616", paddingBottom: safeBottom, display: "flex", zIndex: 100, backdropFilter: "blur(20px)" }}>
      {[["feed", "◎", "피드"], ["upload", "+", ""], ["rank", "△", "랭킹"]].map(([id, icon, label]) => {
        const isSpecial = id === "upload";
        return (
          <button key={id} onClick={() => isSpecial ? onUpload() : setTab(id)} style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minHeight: 56 }}>
            <div style={{ width: isSpecial ? 48 : "auto", height: isSpecial ? 48 : "auto", borderRadius: isSpecial ? 24 : 0, background: isSpecial ? "#00ff88" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isSpecial ? 26 : 22, color: isSpecial ? "#000" : tab === id ? "#00ff88" : "#383838", marginTop: isSpecial ? -18 : 0, boxShadow: isSpecial ? "0 0 24px rgba(0,255,136,0.35)" : "none", fontWeight: 800 }}>{icon}</div>
            {!isSpecial && <div style={{ fontSize: 10, color: tab === id ? "#00ff88" : "#383838", fontWeight: tab === id ? 700 : 400 }}>{label}</div>}
          </button>
        );
      })}
    </div>
  );
}

/* ══ MAIN ══ */
export default function CommunityApp({ currentUser, onLogout, onUpdateProfile }) {
  const { posts, loading, createPost, toggleReaction, addComment, deletePost } = usePosts(currentUser);
  const [tab, setTab] = useState("feed");
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const myWeekDist = posts.filter(p => {
    const ts = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
    return p.userId === currentUser?.uid && Date.now() - ts.getTime() < 7 * 86400000;
  }).reduce((a, p) => a + (parseFloat(p.dist) || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#e0e0e0", fontFamily: "'Nanum Gothic', sans-serif", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap'); *{font-family:'Nanum Gothic',sans-serif!important}`}</style>

      {/* 상태바 Safe Area */}
      <div style={{ height: safeTop, background: "#060606", flexShrink: 0 }} />

      {/* 헤더 */}
      <div style={{ padding: "14px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 8, color: "#1e1e1e", letterSpacing: 4 }}>RUNTRACK</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#00ff88", letterSpacing: -0.5 }}>COMMUNITY</div>
        </div>
        <div onClick={() => setShowProfile(true)}>
          <Avatar user={currentUser} size={44} />
        </div>
      </div>

      {/* 주간 요약 */}
      <div style={{ margin: "12px 18px 0", background: "#0a0a0a", border: "1px solid #161616", borderRadius: 16, padding: "12px 16px", display: "flex", flexShrink: 0 }}>
        {[[`${myWeekDist.toFixed(1)}km`, "이번 주"], [`${posts.filter(p => p.userId === currentUser?.uid).length}회`, "총 러닝"], [`${currentUser?.streak || 0}일`, "스트릭"]].map(([v, l], i) => (
          <div key={l} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #141414" : "none", paddingLeft: i > 0 ? 14 : 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#00ff88" }}>{v}</div>
            <div style={{ fontSize: 10, color: "#2e2e2e" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 8, padding: "12px 18px 0", flexShrink: 0 }}>
        {[["feed", "피드"], ["rank", "랭킹"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: tab === id ? "#00ff88" : "#0d0d0d", color: tab === id ? "#000" : "#444", fontFamily: "inherit", fontSize: 14, fontWeight: 700, minHeight: 44 }}>{label}</button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div style={{ flex: 1, padding: "14px 18px", paddingBottom: `calc(80px + ${safeBottom})`, overflowY: "auto" }}>
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
                <div style={{ fontSize: 48, marginBottom: 14 }}>🏃</div>
                <div style={{ fontSize: 14, lineHeight: 1.8 }}>첫 번째 러닝을 공유해보세요!<br />아래 + 버튼을 눌러보세요</div>
              </div>
            )}
            {posts.map(post => (
              <PostCard key={post.id} post={post} currentUser={currentUser}
                onReact={(id, e) => toggleReaction(id, e, currentUser?.uid)}
                onComment={(id, t) => addComment(id, t, currentUser)}
                onDelete={(id) => deletePost(id)} />
            ))}
          </>
        )}

        {tab === "rank" && !loading && <LeaderboardTab posts={posts} currentUser={currentUser} />}
      </div>

      {/* 하단 네비게이션 */}
      <BottomNav tab={tab} setTab={setTab} onUpload={() => setShowUpload(true)} />

      {/* 모달 */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onPost={createPost} currentUser={currentUser} />}
      {showProfile && <ProfileModal currentUser={currentUser} posts={posts} onClose={() => setShowProfile(false)} onLogout={onLogout} onUpdateProfile={onUpdateProfile} />}
    </div>
  );
}
