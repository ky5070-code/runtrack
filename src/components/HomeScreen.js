// src/components/HomeScreen.js
import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useSets } from "../hooks/useSets";

const Avatar = ({ user, size = 38 }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2,
    background: "linear-gradient(135deg,#111,#1a1a1a)",
    border: "1.5px solid #222", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: size * 0.44, flexShrink: 0,
    overflow: "hidden", position: "relative",
  }}>
    {user?.photoURL
      ? <img src={user.photoURL} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      : (user?.avatar || "🏃")}
  </div>
);

const safeTop = "env(safe-area-inset-top, 0px)";
const safeBottom = "env(safe-area-inset-bottom, 0px)";

const EMOJIS = ["🏃","⚡","🔥","🌊","💨","🦅","🏅","💎","🚀","🌟","🎯","🏆"];

function CreateSetModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [emoji, setEmoji] = useState("🏃");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onCreate({ name: name.trim(), description: desc.trim(), isPublic, emoji });
    setLoading(false);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--modal-bg)", borderRadius: "22px 22px 0 0", border: "1px solid var(--border)", padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})`, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 18px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>🏃 새 러닝크루 만들기</div>
          <button onClick={onClose} style={{ background: "var(--bg4)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "var(--text3)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* 이모지 선택 */}
        <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 10 }}>크루 아이콘</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{ width: 44, height: 44, borderRadius: 22, background: emoji === e ? "#0d1f14" : "#0d0d0d", border: emoji === e ? "2px solid #00ff88" : "1px solid #1a1a1a", fontSize: 24 }}>{e}</button>
          ))}
        </div>

        {/* 러닝크루 이름 */}
        <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 8 }}>러닝크루 이름 *</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 대치동 러닝크루" maxLength={30}
          style={{ width: "100%", background: "#080808", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 14px", color: "var(--text1)", fontFamily: "inherit", fontSize: 16, outline: "none", marginBottom: 14, boxSizing: "border-box" }} />

        {/* 설명 */}
        <div style={{ fontSize: 12, color: "#333", letterSpacing: 2, marginBottom: 8 }}>설명 (선택)</div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="이 크루에 대해 소개해주세요" maxLength={100} rows={3}
          style={{ width: "100%", background: "#080808", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 14px", color: "var(--text1)", fontFamily: "inherit", fontSize: 15, outline: "none", resize: "none", marginBottom: 16, boxSizing: "border-box", lineHeight: 1.6 }} />

        {/* 공개/비공개 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {[[true, "🌍 공개", "누구나 검색하고 입장 가능"], [false, "🔒 비공개", "링크로만 입장 가능"]].map(([val, label, desc]) => (
            <button key={String(val)} onClick={() => setIsPublic(val)} style={{ flex: 1, padding: "12px 10px", borderRadius: 14, border: isPublic === val ? "1.5px solid #00ff88" : "1px solid #1a1a1a", background: isPublic === val ? "#0d1f14" : "#080808", textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: isPublic === val ? "#00ff88" : "#555", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: "#2a2a2a", lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>

        <button onClick={handleCreate} disabled={!name.trim() || loading} style={{ width: "100%", padding: "16px", background: name.trim() ? "#00ff88" : "#0d0d0d", border: "none", borderRadius: 14, color: name.trim() ? "#000" : "#333", fontFamily: "inherit", fontSize: 17, fontWeight: 800, minHeight: 54 }}>
          {loading ? "만드는 중..." : "러닝크루 만들기 🚀"}
        </button>
      </div>
    </div>
  );
}

function JoinSetModal({ onClose, onJoin, currentUser }) {
  const { searchPublicSets, mySets } = useSets(currentUser);
  const [sets, setSets] = useState([]);
  const [search, setSearch] = useState("");
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    const unsub = searchPublicSets(setSets);
    return unsub;
  }, []);

  const filtered = sets.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    !mySets.find(m => m.id === s.id)
  );

  const handleJoin = async (set) => {
    setJoining(set.id);
    await onJoin(set.id);
    setJoining(null);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--modal-bg)", borderRadius: "22px 22px 0 0", border: "1px solid var(--border)", padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})`, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#222", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>🌍 공개 러닝크루 찾기</div>
          <button onClick={onClose} style={{ background: "var(--bg4)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "var(--text3)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="러닝크루 이름 검색..."
          style={{ width: "100%", background: "#080808", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", color: "var(--text1)", fontFamily: "inherit", fontSize: 16, outline: "none", marginBottom: 14, boxSizing: "border-box" }} />

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#2a2a2a" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 15 }}>공개 러닝크루가 없어요</div>
          </div>
        )}

        {filtered.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: "#080808", border: "1px solid #111", borderRadius: 14, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: "#0d1f14", border: "1px solid #1a3d28", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{s.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</div>
              {s.description && <div style={{ fontSize: 13, color: "var(--text4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</div>}
              <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 3 }}>멤버 {s.memberIds?.length || 0}명</div>
            </div>
            <button onClick={() => handleJoin(s)} disabled={joining === s.id} style={{ padding: "8px 16px", background: "#00ff88", border: "none", borderRadius: 10, color: "#000", fontFamily: "inherit", fontSize: 14, fontWeight: 800, minHeight: 38, flexShrink: 0 }}>
              {joining === s.id ? "..." : "입장"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeScreen({ currentUser, onEnterSet, onLogout }) {
  const { mySets, loading, createSet, joinSet, getInviteLink } = useSets(currentUser);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)", fontFamily: "'Pretendard', -apple-system, sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); *{font-family:'Pretendard',-apple-system,sans-serif!important}`}</style>


      {/* 헤더 */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#1e1e1e", letterSpacing: 4 }}>RUNTRACK</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#00ff88", letterSpacing: -0.5 }}>HOME</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{currentUser?.name}</div>
            <button onClick={onLogout} style={{ background: "none", border: "none", color: "#333", fontFamily: "inherit", fontSize: 12, cursor: "pointer", padding: 0 }}>로그아웃</button>
          </div>
          <Avatar user={currentUser} size={44} />
        </div>
      </div>

      <div style={{ padding: "20px 20px", paddingBottom: `calc(24px + ${safeBottom})` }}>

        {/* 액션 버튼 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button onClick={() => setShowCreate(true)} style={{ flex: 1, padding: "14px", background: "#00ff88", border: "none", borderRadius: 14, color: "#000", fontFamily: "inherit", fontSize: 16, fontWeight: 800, minHeight: 52 }}>
            + 러닝크루 만들기
          </button>
          <button onClick={() => setShowJoin(true)} style={{ flex: 1, padding: "14px", background: "var(--modal-bg)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--text3)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, minHeight: 52 }}>
            🌍 러닝크루 찾기
          </button>
        </div>

        {/* 내 러닝크루 목록 */}
        <div style={{ fontSize: 12, color: "#2e2e2e", letterSpacing: 3, marginBottom: 14 }}>내 러닝크루 {mySets.length > 0 ? `(${mySets.length})` : ""}</div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <div style={{ width: 28, height: 28, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && mySets.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#2a2a2a" }}>
            <div style={{ fontSize: 50, marginBottom: 14 }}>🏃</div>
            <div style={{ fontSize: 16, lineHeight: 1.9, color: "#333" }}>
              아직 러닝크루가 없어요<br />
              러닝크루를 만들거나 참여해보세요!
            </div>
          </div>
        )}

        {mySets.map(set => (
          <div key={set.id} onClick={() => onEnterSet(set)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "var(--bg2)", border: `1px solid ${set.adminId === currentUser?.uid ? "#1a3d28" : "#161616"}`, borderRadius: 18, marginBottom: 10, cursor: "pointer" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: set.adminId === currentUser?.uid ? "#0d1f14" : "#0d0d0d", border: `1.5px solid ${set.adminId === currentUser?.uid ? "#1a3d28" : "#1a1a1a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>{set.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{set.name}</div>
                {set.adminId === currentUser?.uid && <span style={{ background: "#0d1f14", border: "1px solid #1a3d28", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: "#00cc66", flexShrink: 0 }}>관리자</span>}
                
              </div>
              {set.description && <div style={{ fontSize: 14, color: "var(--text4)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{set.description}</div>}
              <div style={{ fontSize: 13, color: "#2e2e2e", marginTop: 4 }}>멤버 {set.memberIds?.length || 0}명</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button onClick={e => {
                e.stopPropagation();
                const link = getInviteLink(set.id);
                if (navigator.share) {
                  navigator.share({ title: `${set.name} 러닝 크루`, text: `${set.name}에서 같이 달려요! 🏃`, url: link });
                } else {
                  navigator.clipboard.writeText(link).then(() => alert("초대 링크가 복사됐어요! 🔗"));
                }
              }} style={{ background: "var(--modal-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text3)", fontFamily: "inherit", fontSize: 13, minHeight: 32 }}>🔗</button>
              <div style={{ color: "#2a2a2a", fontSize: 20 }}>›</div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateSetModal onClose={() => setShowCreate(false)} onCreate={async (data) => { await createSet(data); }} />}
      {showJoin && <JoinSetModal onClose={() => setShowJoin(false)} onJoin={joinSet} currentUser={currentUser} />}
    </div>
  );
}
