// src/pages/mypage/EditProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

// 배포된 서버 주소
const API_BASE = "http://211.188.57.154:4000";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, token, setUser } = useAuth();

  // 폼 상태 (프로필 이미지, 안심번호 제거됨)
  const [profile, setProfile] = useState({
    id: "", // 이메일 (수정불가)
    name: "", // 실명 (수정불가)
    displayName: "", // 닉네임 (수정가능)
    phone: "", // 전화번호 (수정가능)
  });

  // 비밀번호 변경용 상태
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id || "",
        name: user.name || "",
        displayName: user.nickname || "",
        phone: user.phone || "",
      });
    }
    setLoading(false);
  }, [user]);

  const updateField = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  // 유효성 검사
  const validate = () => {
    const e = {};
    if (!profile.displayName || profile.displayName.trim().length < 2) {
      e.displayName = "닉네임은 2자 이상 입력해주세요.";
    }
    if (profile.phone && !/^0\d{1,2}-\d{3,4}-\d{4}$/.test(profile.phone)) {
      e.phone = "예: 010-1234-5678 형식으로 입력해주세요.";
    }
    if (password || passwordConfirm) {
      if (password.length < 6)
        e.password = "비밀번호는 최소 6자 이상이어야 합니다.";
      if (password !== passwordConfirm)
        e.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // 저장
  const onSubmit = async (e) => {
    e.preventDefault();

    // 1. 유효성 검사 실행 (추가됨)
    if (!validate()) return;

    setLoading(true);

    // 2. 전송 데이터 구성 (JSON으로 변경)
    // 이미지가 없으므로 FormData 대신 JSON을 써도 되지만,
    // 기존 백엔드(multer) 호환성을 위해 FormData 유지하거나 JSON으로 보내도 됨.
    // 여기서는 백엔드가 multer를 쓰고 있으므로 FormData를 유지합니다.
    const fd = new FormData();
    fd.append("nickname", profile.displayName);
    fd.append("phone", profile.phone);

    // (주의: 현재 백엔드에는 비밀번호 변경 로직이 없습니다.
    // 비밀번호 변경이 필요하면 백엔드 index.js 수정이 필요합니다.)
    if (password) {
      // fd.append("password", password);
    }

    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // 성공 시 상태 업데이트
      setUser(data.user);
      sessionStorage.setItem("authUser", JSON.stringify(data.user));

      alert("회원정보가 수정되었습니다.");
      navigate("/");
    } catch (err) {
      console.error("수정 실패:", err);
      alert("오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800 min-h-screen">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
          <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
            개인정보 수정
          </h1>
          <p className="text-sm text-slate-500 mb-6">회원 정보를 수정합니다.</p>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* 기본 정보 입력 영역 (2열 배치) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. 이름 (수정 불가) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={profile.name}
                  readOnly
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* 2. 닉네임 (수정 가능) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  닉네임
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                    errors.displayName ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.displayName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.displayName}
                  </p>
                )}
              </div>

              {/* 3. 이메일 (수정 불가) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이메일
                </label>
                <input
                  type="text"
                  value={profile.id}
                  readOnly
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* 4. 전화번호 (수정 가능) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                    errors.phone ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* 비밀번호 변경 (선택) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="변경 시에만 입력"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${
                    errors.password ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 확인"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${
                    errors.passwordConfirm
                      ? "border-red-400"
                      : "border-slate-200"
                  }`}
                />
                {errors.passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.passwordConfirm}
                  </p>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-sky-500 text-white rounded-md font-semibold hover:bg-sky-600"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
