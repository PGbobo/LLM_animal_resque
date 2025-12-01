import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// 백엔드 서버 주소
const API_BASE_URL = "http://211.188.57.154:4000";

// 게시글 목록 한 페이지에 표시할 개수
const POSTS_PER_PAGE = 10;

/**
 * 🛠️ [최종 수정] getAuthInfo 함수
 * - AuthContext가 사용하는 sessionStorage와 authToken/authUser 키를 읽도록 수정했습니다.
 */
function getAuthInfo() {
  try {
    // ⭐️ [수정] localStorage 대신 sessionStorage에서 authToken과 rawUser 데이터를 읽습니다.
    const token = sessionStorage.getItem("authToken");
    const rawUser = sessionStorage.getItem("authUser");

    // 토큰이나 유저 정보 중 하나라도 없으면 로그아웃 상태
    if (!token || !rawUser) {
      return { token: null, userNum: null, nickname: null };
    }

    const parsedUser = JSON.parse(rawUser);

    // user 객체에는 userNum 또는 id가 있을 수 있습니다.
    const userNum = parsedUser.userNum ?? parsedUser.id ?? null;

    const nickname =
      parsedUser.nickname ||
      parsedUser.displayName ||
      parsedUser.name ||
      "익명";

    return { token, userNum, nickname };
  } catch (e) {
    console.warn("auth 파싱 실패:", e);
    return { token: null, userNum: null, nickname: null };
  }
}

export default function CommunityListPage() {
  const navigate = useNavigate();

  // 🔹 로그인 정보
  const {
    token,
    userNum: currentUserNum,
    nickname: currentNickname,
  } = getAuthInfo();

  // 🔸 게시글 상태 관리
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔸 페이지네이션 상태 관리
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedPosts, setPaginatedPosts] = useState([]);

  // 1. 게시글 데이터 패치
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/community/posts`);
      if (!response.ok) {
        throw new Error("게시글 목록을 불러오는데 실패했습니다.");
      }
      const data = await response.json();
      setPosts(data);
    } catch (e) {
      console.error(e);
      setError("게시글 로딩 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 2. 페이지네이션 처리
  useEffect(() => {
    const total = posts.length;
    const totalPagesCount = Math.ceil(total / POSTS_PER_PAGE);
    setTotalPages(totalPagesCount > 0 ? totalPagesCount : 1);

    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    setPaginatedPosts(posts.slice(startIndex, endIndex));
  }, [posts, currentPage]);

  const goPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 3. 페이지 이동 핸들러
  const handlePostClick = (postNum) => {
    navigate(`/community/${postNum}`);
  };

  const handleWriteClick = () => {
    // 🔍 디버깅: F12 콘솔에서 token과 currentUserNum이 null이 아닌지 확인하세요.
    console.log("글 작성 시도 - 현재 상태:", { token, currentUserNum });

    // 🟢 [최종 수정] 토큰과 유저 번호 모두 유효하면 통과
    if (token && currentUserNum !== null) {
      navigate("/community/write");
    } else {
      // 이 메시지가 다시 뜨면 안 됩니다.
      alert("글을 작성하려면 로그인이 필요합니다.");
      navigate("/login");
    }
  };

  if (loading)
    return <div className="text-center py-8">게시글을 불러오는 중...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    // ⭐️ [개선] AdoptionPage의 <main> 태그와 동일하게 상단 여백 (pt-28) 및 배경색 (bg-slate-50) 적용
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      <section className="container mx-auto px-4">
        {/* ⭐️ [개선] AdoptionPage의 콘텐츠 박스와 동일한 스타일 적용 */}
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-6">
            커뮤니티 게시판
          </h1>

          <div className="flex justify-end mb-4">
            <button
              onClick={handleWriteClick}
              className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-md hover:bg-sky-600"
            >
              글 작성
            </button>
          </div>

          <div className="space-y-4">
            {paginatedPosts.length === 0 && (
              <div className="py-10 text-center text-slate-500">
                게시글이 없습니다. 첫 글을 작성해보세요!
              </div>
            )}

            {paginatedPosts.map((post) => (
              <button
                key={post.postNum}
                onClick={() => handlePostClick(post.postNum)}
                className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition duration-150"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-slate-700 truncate mr-4">
                    <span className="text-sky-600 font-bold mr-2">
                      [{post.category || "자유"}]
                    </span>
                    {post.title}
                  </h2>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                  {post.content}
                </p>
                <div className="text-xs text-slate-400 flex items-center">
                  <span>작성자: {post.nickname || "익명"}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span>댓글 {post.commentCount ?? 0}</span>
                </div>
              </button>
            ))}
          </div>

          {/* 페이지네이션 */}
          {posts.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-1 text-sm">
              <button
                onClick={() => goPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md disabled:opacity-40 disabled:cursor-default hover:bg-slate-50"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => goPage(page)}
                    className={`px-3 py-1 border rounded-md ${
                      page === currentPage
                        ? "bg-sky-500 text-white border-sky-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => goPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md disabled:opacity-40 disabled:cursor-default hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
