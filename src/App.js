// src/App.js
import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useSets } from "./hooks/useSets";
import LoginScreen from "./components/LoginScreen";
import HomeScreen from "./components/HomeScreen";
import CommunityApp from "./components/CommunityApp";

function AppInner({ user, profile, loading, loginWithGoogle, logout, updateUserProfile }) {
  const [currentSet, setCurrentSet] = useState(null);
  const currentUser = profile ? { ...profile, uid: user?.uid } : null;
  const { joinByInvite } = useSets(currentUser);

  // 초대 링크 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get("invite");
    if (inviteId && user && profile) {
      joinByInvite(inviteId)
        .then(set => {
          window.history.replaceState({}, "", window.location.pathname);
          setCurrentSet(set);
        })
        .catch(e => {
          if (e.message !== "already_member") alert(e.message);
          window.history.replaceState({}, "", window.location.pathname);
        });
    }
  }, [user?.uid, profile]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#060606", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14,
        fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&display=swap');`}</style>
        <div style={{ width: 40, height: 40, border: "2px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 11, color: "#333", letterSpacing: 2 }}>RUNTRACK</div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={loginWithGoogle} />;

  if (!currentSet) {
    return (
      <HomeScreen
        currentUser={currentUser}
        onEnterSet={(set) => setCurrentSet(set)}
        onLogout={logout}
      />
    );
  }

  return (
    <CommunityApp
      currentUser={currentUser}
      currentSet={currentSet}
      onLeaveSet={() => setCurrentSet(null)}
      onLogout={logout}
      onUpdateProfile={updateUserProfile}
    />
  );
}

export default function App() {
  const auth = useAuth();
  return <AppInner {...auth} />;
}
