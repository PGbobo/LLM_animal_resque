// src/pages/community/CommunityDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const STORAGE_KEY = "community_posts";

export default function CommunityDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [comment, setComment] = useState("");

  // 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setPosts(parsed);
    } catch (e) {
      console.warn("Invalid community_posts in localStorage, clearing.");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const post = useMemo(
    () => posts.find((p) => String(p.id) === String(postId)),
    [posts, postId]
  );

  const persist = (next) => {
    setPosts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const next = posts.map((p) => {
      if (String(p.id) !== String(postId)) return p;
      const newC = {
        id: Date.now(),
        text: comment,
        author: "익명",
        date: new Date().toLocaleString(),
      };
      return { ...p, comments: [...(p.comments || []), newC] };
    });
    persist(next);
    setComment("");
  };

  const deleteComment = (cid) => {
    const next = posts.map((p) => {
      if (String(p.id) !== String(postId)) return p;
      return { ...p, comments: (p.comments || []).filter((c) => c.id !== cid) };
    });
    persist(next);
  };

  const deletePost = () => {
    if (!confirm("이 글을 삭제할까요?")) return;
    const next = posts.filter((p) => String(p.id) !== String(postId));
    persist(next);
    navigate("/community");
  };

  if (!post) {
    return (
      <main className="pt-28 pb-16">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            존재하지 않는 게시글입니다.
            <div className="mt-4">
              <Link to="/community" className="px-4 py-2 border rounded-md">
                목록으로
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <Link to="/community" className="text-slate-500 hover:underline">
            ← 목록으로
          </Link>
          <div className="flex gap-2">
            <button
              onClick={deletePost}
              className="px-3 py-1 rounded-md border text-sm text-slate-600 hover:bg-slate-50"
            >
              글 삭제
            </button>
          </div>
        </div>

        <article className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-800">
            {post.title}
          </h1>
          <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
            <span>{post.author ?? "익명"}</span>
            <span>·</span>
            <span>{post.date}</span>
            <span>·</span>
            <span>댓글 {post.comments?.length ?? 0}</span>
          </div>

          <div className="mt-5 text-slate-700 whitespace-pre-line">
            {post.content}
          </div>
        </article>

        {/* 댓글 */}
        <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3">
            댓글 {post.comments?.length ?? 0}
          </h2>

          {/* 댓글 리스트 */}
          <div className="space-y-2 mb-4">
            {(post.comments || []).length === 0 && (
              <p className="text-xs text-slate-400">아직 댓글이 없습니다.</p>
            )}
            {(post.comments || []).map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-start bg-slate-50 p-2 rounded-md"
              >
                <div>
                  <p className="text-sm text-slate-800 whitespace-pre-line">
                    {c.text}
                  </p>
                  <div className="text-xs text-slate-400">
                    {c.author ?? "익명"} · {c.date}
                  </div>
                </div>
                <button
                  onClick={() => deleteComment(c.id)}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          {/* 댓글 입력 */}
          <form onSubmit={addComment} className="flex items-center gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="댓글을 입력하세요..."
            />
            <button
              type="submit"
              className="px-3 py-2 text-sm bg-sky-500 text-white rounded-md hover:bg-sky-600"
            >
              등록
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
