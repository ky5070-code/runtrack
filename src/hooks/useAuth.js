// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Firestore에서 프로필 가져오기
        const profileRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // 첫 로그인: 프로필 생성
          const newProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "러너",
            email: firebaseUser.email,
            avatar: "🏃",
            bio: "",
            handle: "@" + (firebaseUser.email?.split("@")[0] || "runner"),
            totalKm: 0,
            streak: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const updateUserProfile = async (updates) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, updates, { merge: true });
    setProfile((p) => ({ ...p, ...updates }));
  };

  return { user, profile, loading, loginWithGoogle, logout, updateUserProfile };
}
