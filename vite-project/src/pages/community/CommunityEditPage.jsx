import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// 백엔드 서버 주소
const API_BASE_URL = "http://211.188.57.154:4000";

/**
 * sessionStorage에 저장된 로그인 정보를 읽어오는 헬퍼 함수
 */
function getAuthInfo() {
  try {
    const token = sessionStorage.getItem("authToken");
    const rawUser = sessionStorage.getItem("authUser");

    if (!token || !rawUser) {
      return { token: null, userNum: null };
    }

    const parsedUser = JSON.parse(rawUser);
    const userNum = parsedUser.userNum ?? parsedUser.id ?? null;

    return { token, userNum };
  } catch (e) {
    console.warn("auth 파싱 실패:", e);
    return { token: null, userNum: null };
  }
}

export default function CommunityEditPage() {
  const navigate = useNavigate();
  const { postNum } = useParams();
  const { token, userNum } = getAuthInfo();

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "자유",
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);

  // 기존 게시글 데이터 불러오기
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/community/posts/${postNum}`
        );
        if (!response.ok) {
          throw new Error("게시글을 불러오는데 실패했습니다.");
        }
        const data = await response.json();

        // 본인의 글인지 확인
        if (data.userNum !== userNum) {
          alert("수정 권한이 없습니다. 본인의 글만 수정할 수 있습니다.");
          navigate(`/community/${postNum}`);
          return;
        }

        setFormData({
          title: data.title,
          content: data.content,
          category: data.category || "자유",
        });
      } catch (e) {
        console.error(e);
        setError("게시글을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setFetchLoading(false);
      }
    };

    if (!token || !userNum) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    fetchPost();
  }, [postNum, token, userNum, navigate]);

  // 인풋 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 폼 제출 핸들러 (게시글 수정 API 호출)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.content) {
      setError("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/community/posts/${postNum}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formData.title,
            content: formData.content,
            category: formData.category,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "게시글 수정에 실패했습니다.");
      }

      alert("게시글이 성공적으로 수정되었습니다.");
      navigate(`/community/${postNum}`);
    } catch (e) {
      console.error("게시글 수정 오류:", e);
      setError(e.message || "게시글 수정 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
        <div className="text-center py-8">게시글을 불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      <section className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-6">
            게시글 수정
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 카테고리 선택 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                카테고리
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500"
                disabled={loading}
              >
                <option value="자유">자유</option>
                <option value="질문">질문</option>
                <option value="정보">정보</option>
              </select>
            </div>

            {/* 제목 입력 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                제목
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="제목을 입력하세요"
                disabled={loading}
                required
              />
            </div>

            {/* 내용 입력 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                내용
              </label>
              <textarea
                name="content"
                rows="10"
                value={formData.content}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                placeholder="내용을 입력하세요."
                disabled={loading}
                required
              />
            </div>

            {/* 오류 메시지 */}
            {error && (
              <div className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/community/${postNum}`)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-md hover:bg-sky-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "수정 중..." : "수정 완료"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
