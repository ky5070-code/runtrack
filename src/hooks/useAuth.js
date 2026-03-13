// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

async function createOrGetProfile(firebaseUser) {
  const profileRef = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(profileRef);
  if (snap.exists()) return snap.data();
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
  return newProfile;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect 결과 처리 (모바일에서 redirect 로그인 후 돌아왔을 때)
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const p = await createOrGetProfile(result.user);
        setUser(result.user);
        setProfile(p);
      }
    }).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const p = await createOrGetProfile(firebaseUser);
        setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    try {
      // 팝업 먼저 시도
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // 팝업 차단되면 redirect로 fallback (모바일 등)
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw err;
      }
    }
  };

  const logout = () => signOut(auth);

  const updateUserProfile = async (updates) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, updates, { merge: true });
    setProfile((p) => ({ ...p, ...updates }));
  };

  const redeemCoupon = async (code) => {
    if (!user) throw new Error("로그인이 필요해요.");
    const code_upper = code.trim().toUpperCase();
    // coupons 컬렉션에서 코드 찾기
    const q = query(collection(db, "coupons"), where("code", "==", code_upper), where("used", "==", false));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("유효하지 않은 코드예요.");
    const couponDoc = snap.docs[0];
    // 쿠폰 사용 처리
    await updateDoc(couponDoc.ref, { used: true, usedBy: user.uid, usedAt: serverTimestamp() });
    // 유저 PRO 업그레이드
    await updateUserProfile({ isPro: true, proActivatedAt: new Date().toISOString() });
  };

  return { user, profile, loading, loginWithGoogle, logout, updateUserProfile, redeemCoupon };
}
