// src/hooks/useSets.js
import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs,
  writeBatch, query, where, onSnapshot, getDoc, arrayUnion, arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useSets(currentUser) {
  const [mySets, setMySets] = useState([]);       // 내가 속한 세트
  const [publicSets, setPublicSets] = useState([]); // 공개 세트 (검색용)
  const [loading, setLoading] = useState(true);

  // 내가 멤버인 세트 실시간 구독
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, "sets"),
      where("memberIds", "array-contains", currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tb - ta;
      });
      setMySets(data);
      setLoading(false);
    });
    return unsub;
  }, [currentUser?.uid]);

  // 공개 세트 검색
  const searchPublicSets = (callback) => {
    const q = query(
      collection(db, "sets"),
      where("isPublic", "==", true)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tb - ta;
      });
      callback(data);
    });
  };

  // 세트 생성
  const createSet = async ({ name, description, isPublic, emoji }) => {
    if (!currentUser?.uid) return null;
    const ref = await addDoc(collection(db, "sets"), {
      name,
      description: description || "",
      emoji: emoji || "🏃",
      isPublic,
      adminId: currentUser.uid,
      memberIds: [currentUser.uid],
      members: [{
        uid: currentUser.uid,
        name: currentUser.name,
        avatar: currentUser.avatar || "🏃",
        joinedAt: new Date().toISOString(),
      }],
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  // 세트 입장 (공개)
  const joinSet = async (setId) => {
    if (!currentUser?.uid) return;
    const setRef = doc(db, "sets", setId);
    await updateDoc(setRef, {
      memberIds: arrayUnion(currentUser.uid),
      members: arrayUnion({
        uid: currentUser.uid,
        name: currentUser.name,
        avatar: currentUser.avatar || "🏃",
        photoURL: currentUser.photoURL || null,
        joinedAt: new Date().toISOString(),
      }),
    });
  };

  // 세트 탈퇴
  const leaveSet = async (setId) => {
    if (!currentUser?.uid) return;
    const setRef = doc(db, "sets", setId);
    const snap = await getDoc(setRef);
    if (!snap.exists()) return;
    const data = snap.data();
    // 관리자는 탈퇴 불가 (먼저 권한 이전 필요)
    if (data.adminId === currentUser.uid) throw new Error("관리자는 권한을 먼저 이전해야 탈퇴할 수 있어요");
    const newMembers = (data.members || []).filter(m => m.uid !== currentUser.uid);
    await updateDoc(setRef, {
      memberIds: arrayRemove(currentUser.uid),
      members: newMembers,
    });
  };

  // 멤버 강퇴 (관리자 전용)
  const kickMember = async (setId, targetUid) => {
    if (!currentUser?.uid) return;
    const setRef = doc(db, "sets", setId);
    const snap = await getDoc(setRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.adminId !== currentUser.uid) throw new Error("관리자만 강퇴할 수 있어요");
    if (targetUid === currentUser.uid) throw new Error("본인은 강퇴할 수 없어요");
    const newMembers = (data.members || []).filter(m => m.uid !== targetUid);
    await updateDoc(setRef, {
      memberIds: arrayRemove(targetUid),
      members: newMembers,
    });
  };

  // 관리자 이전
  const transferAdmin = async (setId, targetUid) => {
    if (!currentUser?.uid) return;
    const setRef = doc(db, "sets", setId);
    const snap = await getDoc(setRef);
    if (!snap.exists()) return;
    if (snap.data().adminId !== currentUser.uid) throw new Error("관리자만 권한을 이전할 수 있어요");
    await updateDoc(setRef, { adminId: targetUid });
  };

  // 세트 정보 조회
  const getSet = async (setId) => {
    const snap = await getDoc(doc(db, "sets", setId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  // 크루 삭제 (관리자 전용)
  const deleteSet = async (setId) => {
    if (!currentUser?.uid) return;
    const setRef = doc(db, "sets", setId);
    const snap = await getDoc(setRef);
    if (!snap.exists()) return;
    if (snap.data().adminId !== currentUser.uid) throw new Error("관리자만 삭제할 수 있어요");
    // 크루 내 게시물도 함께 삭제
    const postsSnap = await getDocs(
      query(collection(db, "posts"), where("setId", "==", setId))
    );
    const batch = writeBatch(db);
    postsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(setRef);
    await batch.commit();
  };

  // 초대 링크 생성 (setId를 URL에 포함)
  const getInviteLink = (setId) => {
    return `${window.location.origin}?invite=${setId}`;
  };

  // 초대 링크로 입장
  const joinByInvite = async (setId) => {
    const snap = await getDoc(doc(db, "sets", setId));
    if (!snap.exists()) throw new Error("존재하지 않는 크루예요");
    const data = snap.data();
    if (data.memberIds?.includes(currentUser?.uid)) throw new Error("already_member");
    await joinSet(setId);
    return { id: snap.id, ...data };
  };

  // 공지 추가 (관리자 전용)
  const addNotice = async (setId, text) => {
    if (!currentUser?.uid) return;
    const snap = await getDoc(doc(db, "sets", setId));
    if (!snap.exists()) return;
    const existing = snap.data().notices || [];
    const newNotice = {
      id: Math.random().toString(36).slice(2),
      text,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar || "🏃",
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, "sets", setId), {
      notices: [...existing, newNotice],
    });
  };

  // 공지 삭제 (관리자 전용)
  const deleteNotice = async (setId, noticeId) => {
    const snap = await getDoc(doc(db, "sets", setId));
    if (!snap.exists()) return;
    const newNotices = (snap.data().notices || []).filter(n => n.id !== noticeId);
    await updateDoc(doc(db, "sets", setId), { notices: newNotices });
  };

  return { mySets, publicSets, loading, createSet, joinSet, leaveSet, kickMember, transferAdmin, getSet, searchPublicSets, getInviteLink, joinByInvite, addNotice, deleteNotice, deleteSet };
}
