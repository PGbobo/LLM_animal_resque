import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 백엔드 서버 주소
const API_BASE_URL = "http://211.188.57.154:4000";

/**
 * 🛠️ [재사용] localStorage에 저장된 로그인 정보를 읽어오는 헬퍼 함수 (토큰 및 userNum 추출)
 */
function getAuthInfo() {
  try {
    // ⭐️ [수정] sessionStorage에서 authToken과 rawUser 데이터를 읽습니다.
    const token = sessionStorage.getItem("authToken");
    const rawUser = sessionStorage.getItem("authUser");

    // 토큰이나 유저 정보 중 하나라도 없으면 로그아웃 상태
    if (!token || !rawUser) {
      return { token: null, userNum: null };
    }

    const parsedUser = JSON.parse(rawUser);

    // user 객체에서 userNum 또는 id를 추출합니다.
    const userNum = parsedUser.userNum ?? parsedUser.id ?? null;

    return { token, userNum };
  } catch (e) {
    console.warn("auth 파싱 실패:", e);
    return { token: null, userNum: null };
  }
}

export default function CommunityWritePage() {
  const navigate = useNavigate();
  // 로그인 정보 (토큰, userNum)를 가져옵니다.
  const { token, userNum } = getAuthInfo();

  // 🔸 폼 상태 관리
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "자유", // 기본값
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 인풋 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 폼 제출 핸들러 (게시글 작성 API 호출)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. 필수 값 검증 및 인증 체크
    if (!formData.title || !formData.content) {
      setError("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    if (!userNum || !token) {
      alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // 2. 게시글 작성 API 호출 (POST 요청)
      const response = await fetch(`${API_BASE_URL}/community/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 🚨 로그인 사용자임을 증명하는 Authorization 헤더 추가
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userNum: userNum, // 글쓴이 ID
          title: formData.title,
          content: formData.content,
          category: formData.category,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // HTTP 상태 코드가 200번대가 아닐 경우
        throw new Error(result.message || "게시글 작성에 실패했습니다.");
      }

      alert("게시글이 성공적으로 작성되었습니다.");
      // 3. 작성 성공 후, 작성된 글로 이동
      navigate(`/community/${result.postNum}`);
    } catch (e) {
      console.error("게시글 작성 오류:", e);
      setError(e.message || "게시글 작성 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // ⭐️ [개선] 최상위 레이아웃 스타일 통일 (상단 여백, 배경색)
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      <section className="container mx-auto px-4">
        {/* ⭐️ [개선] 콘텐츠 박스 스타일 통일 */}
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-6">
            새 게시글 작성
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
                onClick={() => navigate("/community")}
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
                {loading ? "작성 중..." : "게시글 작성"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
