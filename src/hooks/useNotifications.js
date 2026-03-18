// src/hooks/useNotifications.js
import { useState, useEffect } from "react";
import {
  collection, query, where, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useNotifications(currentUser) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", currentUser.uid),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tb - ta;
      });
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    });
    return unsub;
  }, [currentUser?.uid]);

  // 알림 생성 (반응/댓글 시 호출)
  const createNotification = async ({ toUserId, fromUser, type, postId, postDist, emoji, commentText }) => {
    if (!toUserId || toUserId === fromUser.uid) return; // 본인 글엔 알림 X
    await addDoc(collection(db, "notifications"), {
      toUserId,
      fromUserId: fromUser.uid,
      fromUserName: fromUser.name,
      fromUserAvatar: fromUser.avatar || "🏃",
      type,        // "reaction" | "comment"
      postId,
      postDist,
      emoji: emoji || null,
      commentText: commentText || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  // 전체 읽음 처리
  const markAllRead = async () => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", currentUser.uid),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(doc(db, "notifications", d.id), { read: true }));
    await batch.commit();
  };

  // 알림 삭제
  const deleteNotification = async (notifId) => {
    await deleteDoc(doc(db, "notifications", notifId));
  };

  // 새 피드 게시물 알림
  const createFeedNotification = async ({ toUserId, fromUser, postId, postDist }) => {
    if (!toUserId || toUserId === fromUser.uid) return;
    await addDoc(collection(db, "notifications"), {
      toUserId,
      fromUserId: fromUser.uid,
      fromUserName: fromUser.name,
      fromUserAvatar: fromUser.avatar || "🏃",
      type: "feed",
      postId,
      postDist,
      emoji: null,
      commentText: null,
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  // 새 채팅 알림
  const createChatNotification = async ({ toUserId, fromUser, text }) => {
    if (!toUserId || toUserId === fromUser.uid) return;
    await addDoc(collection(db, "notifications"), {
      toUserId,
      fromUserId: fromUser.uid,
      fromUserName: fromUser.name,
      fromUserAvatar: fromUser.avatar || "🏃",
      type: "chat",
      postId: null,
      postDist: null,
      emoji: null,
      commentText: text || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  return { notifications, unreadCount, createNotification, createFeedNotification, createChatNotification, deleteNotification, markAllRead };
}
