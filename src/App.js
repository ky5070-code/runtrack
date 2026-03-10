// src/App.js
import React from "react";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./components/LoginScreen";
import CommunityApp from "./components/CommunityApp";

export default function App() {
  const { user, profile, loading, loginWithGoogle, logout, updateUserProfile } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#060606", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14,
        fontFamily: "'Nanum Gothic', sans-serif",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap');`}</style>
        <div style={{
          width: 40, height: 40, border: "2px solid #00ff88",
          borderTopColor: "transparent", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 11, color: "#333", letterSpacing: 2 }}>RUNTRACK</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={loginWithGoogle} />;
  }

  return (
    <CommunityApp
      currentUser={{ ...profile, uid: user.uid }}
      onLogout={logout}
      onUpdateProfile={updateUserProfile}
    />
  );
}
