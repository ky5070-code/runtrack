// src/hooks/useChat.js
import { useState, useEffect } from "react";
import {
  collection, addDoc, query, where,
  orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useChat(setId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!setId) return;
    const q = query(
      collection(db, "chats"),
      where("setId", "==", setId),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      // 인덱스 없을 때 fallback
      console.warn("chat index fallback:", err.message);
      const fallbackQ = query(
        collection(db, "chats"),
        where("setId", "==", setId),
        limit(100)
      );
      onSnapshot(fallbackQ, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return ta - tb;
        });
        setMessages(data);
        setLoading(false);
      });
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
