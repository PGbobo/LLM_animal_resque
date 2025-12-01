// src/pages/community/CommunityDetailPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// ⭐️ axios를 사용하기 위해 import했다고 가정 (실제 프로젝트에 맞게 확인 필요)
import axios from "axios";

// 백엔드 API 서버 주소
const API_BASE_URL = "http://211.188.57.154:4000";

/**
 * sessionStorage에 저장된 로그인 정보를 읽어오는 헬퍼 함수
 */
function getAuthInfo() {
  try {
    // ⭐️ sessionStorage에서 authToken과 authUser 데이터를 읽습니다.
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

export default function CommunityDetailPage() {
  // URL 파라미터 (:postNum)
  const { postNum } = useParams();
  const navigate = useNavigate();

  // 로그인 정보
  const {
    token, // 🌟 토큰 사용을 위해 변수 유지
    userNum: currentUserNum,
    nickname: currentNickname,
  } = getAuthInfo();

  // 게시글 상세 데이터
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState("");

  // 댓글 수정 상태 관리
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      // 1. 게시글 상세 정보
      const postResponse = await fetch(
        `${API_BASE_URL}/community/posts/${postNum}`
      );
      if (!postResponse.ok) {
        throw new Error("게시글을 찾을 수 없습니다.");
      }
      const postData = await postResponse.json();
      setPost(postData);

      // 2. 댓글 목록
      const commentsResponse = await fetch(
        `${API_BASE_URL}/community/posts/${postNum}/comments`
      );
      const commentsData = await commentsResponse.json();
      setComments(commentsData);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostAndComments();
  }, [postNum]);

  // ----------------------------------------------------
  // 🟢 댓글 작성 로직
  // ----------------------------------------------------
  const addComment = async (e) => {
    e.preventDefault();
    // ⚠️ alert 대신 custom modal을 사용하는 것이 좋습니다.
    if (!commentText || !currentUserNum || !token) {
      alert(
        currentUserNum ? "댓글 내용을 입력해주세요." : "로그인이 필요합니다."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/community/posts/${postNum}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // ⭐️ 인증 토큰을 Bearer 형식으로 헤더에 추가
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: commentText,
            // userNum은 서버에서 토큰을 통해 가져가도록 가정
          }),
        }
      );

      if (response.status === 401) {
        alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
        // ⭐ 필요하다면 로그아웃 및 리다이렉트 로직 추가
        return;
      }

      if (!response.ok) {
        throw new Error("댓글 작성에 실패했습니다.");
      }

      // 성공 후 상태 업데이트
      setCommentText("");
      // 댓글 목록 새로고침
      fetchPostAndComments();
    } catch (e) {
      console.error("댓글 작성 에러:", e);
      alert("댓글 작성 중 오류가 발생했습니다.");
    }
  };
  // ----------------------------------------------------

  // 댓글 수정 시작
  const startEditComment = (comment) => {
    setEditingCommentId(comment.commentNum);
    setEditingCommentText(comment.content);
  };

  // 댓글 수정 취소
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  // 댓글 수정 저장
  const saveEditComment = async (commentNum) => {
    if (!editingCommentText.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      console.log("댓글 수정 요청:", {
        commentNum,
        content: editingCommentText,
        token: token ? "있음" : "없음",
      });

      const response = await fetch(
        `${API_BASE_URL}/community/comments/${commentNum}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: editingCommentText,
          }),
        }
      );

      console.log("댓글 수정 응답 상태:", response.status);

      if (response.status === 403) {
        alert("수정 권한이 없습니다.");
        return;
      }

      if (response.status === 401) {
        alert("로그인이 필요합니다. 다시 로그인해주세요.");
        return;
      }

      const result = await response.json();
      console.log("댓글 수정 응답:", result);

      if (!response.ok) {
        throw new Error(result.message || "댓글 수정에 실패했습니다.");
      }

      // 성공 후 상태 초기화 및 새로고침
      setEditingCommentId(null);
      setEditingCommentText("");
      fetchPostAndComments();
    } catch (e) {
      console.error("댓글 수정 에러 상세:", e);
      alert(`댓글 수정 중 오류가 발생했습니다: ${e.message}`);
    }
  };

  const deleteComment = async (commentNum) => {
    // ⚠️ window.confirm 대신 custom modal을 사용하는 것이 좋습니다.
    if (!window.confirm("정말로 이 댓글을 삭제하시겠습니까?")) return;

    try {
      // ⭐️ 댓글 삭제 시에도 권한 확인을 위해 토큰을 보냅니다.
      const response = await fetch(
        `${API_BASE_URL}/community/comments/${commentNum}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 403) {
        alert("삭제 권한이 없습니다.");
        return;
      }

      if (!response.ok) {
        throw new Error("댓글 삭제에 실패했습니다.");
      }

      // 성공 후 상태 업데이트
      fetchPostAndComments();
    } catch (e) {
      console.error("댓글 삭제 에러:", e);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    }
  };

  const deletePost = async () => {
    // ⚠️ window.confirm 대신 custom modal을 사용하는 것이 좋습니다.
    if (!window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;

    // ⭐️ 게시글 삭제 시 본인 확인을 위해 토큰을 보냅니다.
    try {
      const response = await fetch(
        `${API_BASE_URL}/community/posts/${postNum}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 403) {
        alert("삭제 권한이 없습니다. 본인의 글만 삭제할 수 있습니다.");
        return;
      }
      if (!response.ok) {
        throw new Error("게시글 삭제에 실패했습니다.");
      }

      alert("게시글이 삭제되었습니다.");
      navigate("/community"); // 목록 페이지로 이동
    } catch (e) {
      console.error("게시글 삭제 에러:", e);
      alert("게시글 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading)
    return <div className="text-center py-8">게시글을 불러오는 중...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;
  if (!post)
    return (
      <div className="text-center py-8 text-slate-500">
        게시글을 찾을 수 없습니다.
      </div>
    );

  const isPostMine = post.userNum === currentUserNum;

  return (
    // ⭐️ [개선] AdoptionPage의 <main> 태그와 동일하게 상단 여백 (pt-28) 및 배경색 (bg-slate-50) 적용
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      <section className="container mx-auto px-4">
        {/* ⭐️ [개선] AdoptionPage의 콘텐츠 박스와 동일한 스타일 적용 */}
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          {/* 뒤로 가기 및 작성 버튼 */}
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-sky-500 hover:text-sky-600 flex items-center text-sm font-semibold"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 mr-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
              목록으로
            </button>
          </div>

          {/* 게시글 제목 */}
          <h1 className="text-3xl font-bold mb-2 text-slate-800">
            [{post.category || "자유"}] {post.title}
          </h1>

          {/* 메타 정보 */}
          <div className="flex items-center text-sm text-slate-500 mb-6 border-b pb-4">
            <span className="font-semibold mr-4">
              작성자: {post.nickname || "익명"}
            </span>
            <span className="mr-4">
              작성일: {new Date(post.createdAt).toLocaleDateString()}
            </span>
            <span>댓글: {comments.length}</span>
          </div>

          {/* 게시글 내용 */}
          <section className="min-h-[200px] text-lg text-slate-700 leading-relaxed mb-8 whitespace-pre-wrap">
            {post.content}
          </section>

          {/* 수정/삭제 버튼 */}
          {isPostMine && (
            <div className="flex justify-end gap-2 mb-8">
              <Link
                to={`/community/edit/${postNum}`}
                className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                수정
              </Link>
              <button
                onClick={deletePost}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          )}

          {/* 댓글 섹션 */}
          <section className="bg-slate-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-2">
              댓글 ({comments.length})
            </h2>

            {/* 댓글 목록 */}
            <div className="space-y-4 mb-6">
              {comments.length === 0 && (
                <p className="text-slate-500 text-sm">아직 댓글이 없습니다.</p>
              )}
              {comments.map((c) => {
                const isMine = c.userNum === currentUserNum;
                const isEditing = editingCommentId === c.commentNum;

                return (
                  <div
                    key={c.commentNum}
                    className={`p-3 rounded-lg border shadow-sm ${
                      isMine
                        ? "bg-sky-50 border-sky-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center">
                        <span className="font-medium text-slate-600 mr-2">
                          {c.nickname || "익명"}
                        </span>
                        <span className="text-slate-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {isMine && !isEditing && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditComment(c)}
                            className="text-[11px] text-sky-600 hover:underline"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteComment(c.commentNum)}
                            className="text-[11px] text-red-500 hover:underline"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      // 수정 모드
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) =>
                            setEditingCommentText(e.target.value)
                          }
                          rows={3}
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEditComment}
                            className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => saveEditComment(c.commentNum)}
                            className="px-3 py-1 text-xs bg-sky-500 text-white rounded hover:bg-sky-600"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 일반 모드
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {c.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 댓글 작성 폼 */}
            <form onSubmit={addComment} className="flex flex-col gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                placeholder={
                  currentUserNum
                    ? "댓글을 입력해주세요."
                    : "댓글을 작성하려면 로그인이 필요합니다."
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!currentUserNum} // 로그인 안 했으면 버튼 비활성화
                  className="px-4 py-2 text-sm bg-sky-500 text-white rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors"
                >
                  댓글 등록
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
