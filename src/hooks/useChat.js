// src/hooks/useChat.js
import { useState, useEffect } from "react";
import {
  collection, addDoc, query, where,
  orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useChat(setId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false); // false로 시작 - 검은 화면 방지

  useEffect(() => {
    if (!setId) return;

    // orderBy 없는 단순 쿼리로 시작 (인덱스 불필요)
    const q = query(
      collection(db, "chats"),
      where("setId", "==", setId),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // 클라이언트에서 시간순 정렬
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return ta - tb;
      });
      setMessages(data);
    }, (err) => {
      console.error("chat error:", err);
    });

    return unsub;
  }, [setId]);

  const sendMessage = async (text, currentUser) => {
    if (!setId || !text.trim() || !currentUser) return;
    await addDoc(collection(db, "chats"), {
      setId,
      text: text.trim(),
      userId: currentUser.uid,
      userName: currentUser.name,
      userAvatar: currentUser.avatar || "🏃",
      createdAt: serverTimestamp(),
    });
  };

  return { messages, loading, sendMessage };
}
