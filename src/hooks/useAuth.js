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

    // photoURL 변경 시 가입된 모든 크루의 members 배열도 업데이트
    if (updates.photoURL !== undefined) {
      try {
        const setsQ = query(collection(db, "sets"), where("memberIds", "array-contains", user.uid));
        const setsSnap = await getDocs(setsQ);
        for (const setDoc2 of setsSnap.docs) {
          const data = setDoc2.data();
          const updatedMembers = (data.members || []).map(m =>
            m.uid === user.uid ? { ...m, photoURL: updates.photoURL } : m
          );
          await updateDoc(setDoc2.ref, { members: updatedMembers });
        }
      } catch (e) {
        console.warn("크루 멤버 photoURL 업데이트 실패:", e);
      }
    }
  };

  const redeemCoupon = async (code) => {
    if (!user) throw new Error("로그인이 필요해요.");
    const code_upper = code.trim().toUpperCase();
    try {
      const q = query(collection(db, "coupons"), where("code", "==", code_upper));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("유효하지 않은 코드예요.");
      const couponDoc = snap.docs[0];
      const data = couponDoc.data();
      const usedCount = data.usedCount || 0;
      const maxUses = data.maxUses ?? 1;
      const usedBy = data.usedBy || [];
      if (usedBy.includes(user.uid)) throw new Error("이미 사용한 코드예요.");
      if (usedCount >= maxUses) throw new Error("사용 횟수가 초과된 코드예요.");
      await updateDoc(couponDoc.ref, {
        usedCount: usedCount + 1,
        usedBy: [...usedBy, user.uid],
        lastUsedAt: serverTimestamp(),
      });
      await updateUserProfile({ isPro: true, proActivatedAt: new Date().toISOString() });
    } catch(e) {
      throw e;
    }
  };

  return { user, profile, loading, loginWithGoogle, logout, updateUserProfile, redeemCoupon };
}
