// src/hooks/usePosts.js
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";

export function usePosts(currentUser) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const data = await Promise.all(
        snap.docs.map(async (d) => {
          const post = { id: d.id, ...d.data() };
          // 작성자 프로필 가져오기
          if (post.userId) {
            const userSnap = await getDoc(doc(db, "users", post.userId));
            post.author = userSnap.exists() ? userSnap.data() : null;
          }
          return post;
        })
      );
      setPosts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // 이미지 업로드 후 URL 반환
  const uploadImage = async (file, userId) => {
    const storageRef = ref(storage, `posts/${userId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  // 게시글 생성
  const createPost = async ({ dist, duration, pace, calories, date, caption, imageFile, source, appName }) => {
    if (!currentUser) return;
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile, currentUser.uid);
    }
    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      dist: Number(dist) || 0,
      duration: Number(duration) || 0,
      pace: pace || "",
      calories: Number(calories) || 0,
      date: date || new Date().toISOString().slice(0, 10),
      caption: caption || "",
      imageUrl,
      source: source || "manual",
      appName: appName || null,
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

    if (prev) {
      reactions[prev] = Math.max(0, (reactions[prev] || 1) - 1);
    }
    const updates = { reactions };
    if (prev === emoji) {
      updates[myKey] = null;
    } else {
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      updates[myKey] = emoji;
    }
    await updateDoc(postRef, updates);
  };

  // 댓글 추가
  const addComment = async (postId, text, author) => {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
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

  return { posts, loading, createPost, toggleReaction, addComment };
}
