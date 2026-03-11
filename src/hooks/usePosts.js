// src/hooks/usePosts.js
import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, limit, onSnapshot,
  serverTimestamp, getDoc, arrayUnion,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// 이미지를 base64로 변환 + 리사이즈 (Firestore 저장용)
const resizeAndEncode = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 800;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else { w = Math.round(w * MAX / h); h = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL("image/jpeg", 0.7));
  };
  img.onerror = reject;
  img.src = url;
});

export function usePosts(currentUser, setId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!setId) { setLoading(false); return; }
    const processSnap = async (snap) => {
      const data = await Promise.all(
        snap.docs.map(async (d) => {
          const post = { id: d.id, ...d.data() };
          if (post.userId) {
            const userSnap = await getDoc(doc(db, "users", post.userId));
            post.author = userSnap.exists() ? userSnap.data() : null;
          }
          return post;
        })
      );
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tb - ta;
      });
      setPosts(data);
      setLoading(false);
    };
    // where + orderBy 복합 쿼리 시도, 인덱스 없으면 fallback
    const q = query(collection(db, "posts"), where("setId", "==", setId), orderBy("createdAt", "desc"), limit(50));
    const unsub = onSnapshot(q, processSnap, (err) => {
      console.warn("index fallback:", err.message);
      const fallbackQ = query(collection(db, "posts"), where("setId", "==", setId), limit(50));
      onSnapshot(fallbackQ, processSnap);
    });
    return unsub;
  }, [setId]);

  // 게시글 생성 - 이미지는 base64로 Firestore에 저장
  const createPost = async ({ dist, duration, pace, calories, date, caption, imageFile, source, appName, aiFeedback }) => {
    if (!setId) return;
    if (!currentUser) return;

    let imageUrl = null;
    if (imageFile) {
      try {
        imageUrl = await resizeAndEncode(imageFile);
      } catch (e) {
        console.warn("이미지 변환 실패, 이미지 없이 저장:", e);
      }
    }

    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      setId,
      dist: Number(dist) || 0,
      duration: Number(duration) || 0,
      pace: pace || "",
      calories: Number(calories) || 0,
      date: date || new Date().toISOString().slice(0, 10),
      caption: caption || "",
      imageUrl,
      source: source || "manual",
      appName: appName || null,
      aiFeedback: aiFeedback || null,
      reactions: {},
      comments: [],
      createdAt: serverTimestamp(),
    });
  };

  // 반응 토글
  const toggleReaction = async (postId, emoji, userId) => {
    const postRef = doc(db, "posts", postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions = { ...(data.reactions || {}) };
    const myKey = `myReaction_${userId}`;
    const prev = data[myKey];
    if (prev) reactions[prev] = Math.max(0, (reactions[prev] || 1) - 1);
    const updates = { reactions };
    if (prev === emoji) { updates[myKey] = null; }
    else { reactions[emoji] = (reactions[emoji] || 0) + 1; updates[myKey] = emoji; }
    await updateDoc(postRef, updates);
  };

  // 댓글 추가
  const addComment = async (postId, text, author) => {
    await updateDoc(doc(db, "posts", postId), {
      comments: arrayUnion({
        id: Math.random().toString(36).slice(2),
        userId: author.uid,
        userName: author.name,
        userAvatar: author.avatar,
        text,
        createdAt: new Date().toISOString(),
      }),
    });
  };

  // 게시글 삭제 (본인 또는 세트 관리자)
  const deletePost = async (postId, isAdmin = false) => {
    if (!currentUser) return;
    const postRef = doc(db, "posts", postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;
    if (!isAdmin && snap.data().userId !== currentUser.uid) return;
    await deleteDoc(postRef);
  };

  return { posts, loading, createPost, toggleReaction, addComment, deletePost };
}
