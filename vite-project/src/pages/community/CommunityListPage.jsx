// src/pages/community/CommunityListPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router"; // ✅ Link 제거

const STORAGE_KEY = "community_posts";

export default function CommunityListPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 초기 로드: localStorage에서 불러오기
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

  const persist = (next) => {
    setPosts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addPost = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    const newPost = {
      id: Date.now(),
      title,
      content,
      author: "익명",
      date: new Date().toLocaleString(),
      comments: [],
    };
    const next = [newPost, ...posts];
    persist(next);
    setTitle("");
    setContent("");
    setFormOpen(false);
  };

  const deletePost = (id) => {
    if (!confirm("이 글을 삭제할까요?")) return;
    const next = posts.filter((p) => p.id !== id);
    persist(next);
  };

  // 카드 클릭 → 상세페이지 이동
  const goDetail = (id) => navigate(`/community/${id}`);

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800">커뮤니티</h1>
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="px-5 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600 transition"
          >
            {formOpen ? "닫기" : "새 글 작성"}
          </button>
        </div>

        {/* ✏️ 새 글 작성 폼 */}
        {formOpen && (
          <form
            onSubmit={addPost}
            className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm"
          >
            <div className="mb-3">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                내용
              </label>
              <textarea
                rows="5"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="내용을 입력하세요"
              />
            </div>
            <div className="text-right">
              <button
                type="submit"
                className="px-5 py-2 bg-sky-500 text-white rounded-md font-semibold hover:bg-sky-600 transition"
              >
                등록
              </button>
            </div>
          </form>
        )}

        {/* 📋 게시글 목록 (카드 전체 클릭 → 상세) */}
        {posts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-sm">
            아직 작성된 글이 없습니다. 첫 글을 남겨보세요!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <div
                key={p.id}
                onClick={() => goDetail(p.id)} // ✅ 카드 전체 클릭
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer hover:border-sky-300"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && goDetail(p.id)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-800 truncate">
                      {p.title}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {p.content}
                    </p>
                    <div className="text-xs text-slate-400 flex items-center gap-3 mt-2">
                      <span>{p.author}</span>
                      <span>·</span>
                      <span>{p.date}</span>
                      <span>·</span>
                      <span>댓글 {p.comments?.length ?? 0}</span>
                    </div>
                  </div>

                  {/* 삭제 버튼만 유지 — 클릭 전파 막기 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePost(p.id);
                    }}
                    className="px-3 py-1 rounded-md border text-sm text-slate-600 hover:bg-slate-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
