// src/hooks/useChat.js
import { useState, useEffect } from "react";
import {
  collection, addDoc, doc, getDoc, updateDoc, query, where,
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
      setId, type: "text",
      text: text.trim(),
      userId: currentUser.uid,
      userName: currentUser.name,
      userAvatar: currentUser.avatar || "🏃",
      createdAt: serverTimestamp(),
    });
  };

  const sendSchedule = async (schedule, currentUser) => {
    if (!setId || !currentUser) return;
    await addDoc(collection(db, "chats"), {
      setId, type: "schedule",
      userId: currentUser.uid,
      userName: currentUser.name,
      userAvatar: currentUser.avatar || "🏃",
      schedule: {
        title: schedule.title,
        date: schedule.date,
        time: schedule.time,
        place: schedule.place,
        maxMembers: schedule.maxMembers || 0,
        participants: [{ uid: currentUser.uid, name: currentUser.name, avatar: currentUser.avatar || "🏃" }],
        closed: false,
      },
      createdAt: serverTimestamp(),
    });
  };

  const joinSchedule = async (msgId, currentUser, leave = false) => {
    const ref = doc(db, "chats", msgId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const participants = data.schedule?.participants || [];
    let updated;
    if (leave) {
      updated = participants.filter(p => p.uid !== currentUser.uid);
    } else {
      if (participants.find(p => p.uid === currentUser.uid)) return;
      updated = [...participants, { uid: currentUser.uid, name: currentUser.name, avatar: currentUser.avatar || "🏃" }];
    }
    await updateDoc(ref, { "schedule.participants": updated });
  };

  const closeSchedule = async (msgId) => {
    const ref = doc(db, "chats", msgId);
    await updateDoc(ref, { "schedule.closed": true });
  };

  return { messages, loading, sendMessage, sendSchedule, joinSchedule, closeSchedule };
}
