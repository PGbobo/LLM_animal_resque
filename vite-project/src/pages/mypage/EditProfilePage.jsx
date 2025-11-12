// src/pages/mypage/EditProfilePage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// 프로젝트에 useAuth가 있으면 사용(없어도 동작하도록 안전하게 처리)
import { useAuth } from "../../hooks/useAuth.js";

export default function EditProfilePage() {
  const navigate = useNavigate();

  // 인증 훅(있으면 사용, 없으면 undefined)
  const auth = typeof useAuth === "function" ? useAuth() : undefined;

  // 폼 상태
  const [profile, setProfile] = useState({
    id: null,
    displayName: "", // [수정] DB 'NAME' 컬럼이 이곳에 매핑됩니다.
    email: "", // [수정] DB 'ID' 컬럼이 이곳에 매핑됩니다.
    phone: "",
    useSafeNumber: false,
    profileImageUrl: "",
  });
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // 초기 로드: auth가 있으면 auth.user 사용
  useEffect(() => {
    // 1) 인증 훅이 사용자 정보를 제공하는 경우
    if (auth?.user) {
      const u = auth.user;
      setProfile((prev) => ({
        ...prev,
        // [수정] DB 컬럼에 맞게 상태 매핑
        id: u.id ?? prev.id, // 폼 제출 시 사용할 ID (예: test@test)
        displayName: u.name ?? "", // '이름' 필드 <- DB NAME 컬럼 (u.name)
        email: u.id ?? "", // '이메일' 필드 <- DB ID 컬럼 (u.id)
        phone: u.phone ?? "",
        useSafeNumber: !!u.useSafeNumber,
        profileImageUrl: u.profileImageUrl ?? "",
      }));
      setPhotoPreview(u.profileImageUrl ?? "");
      setLoading(false);
      return;
    }

    // 2) 임시: 로컬 저장소에서 불러오기 (인증 로직 없을 때 fallback)
    const raw = localStorage.getItem("mock_current_user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setProfile((prev) => ({
          ...prev,
          id: u.id ?? Date.now(),
          displayName: u.name ?? u.displayName ?? "", // [수정] name 우선
          email: u.id ?? u.email ?? "", // [수정] id 우선
          phone: u.phone ?? "",
          useSafeNumber: !!u.useSafeNumber,
          profileImageUrl: u.profileImageUrl ?? "",
        }));
        setPhotoPreview(u.profileImageUrl ?? "");
      } catch (e) {
        console.error("parse user error", e);
      }
    } else {
      // 기본값
      setProfile((prev) => ({
        ...prev,
        id: "hong@example.com",
        displayName: "홍길동",
        email: "hong@example.com",
        phone: "010-1234-5678",
        useSafeNumber: false,
      }));
    }
    setLoading(false);
  }, [auth]);

  // 사진 선택 → 미리보기
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (!file) return setPhotoPreview("");
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(String(ev.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const updateField = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  // 간단 유효성
  const validate = () => {
    const e = {};
    if (!profile.displayName || profile.displayName.trim().length < 2) {
      e.displayName = "이름은 2자 이상 입력해주세요.";
    }

    // [수정] '이메일(ID)'은 수정 불가(readOnly)이므로 유효성 검사 제거
    /*
    if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      e.email = "유효한 이메일을 입력해주세요.";
    }
    */

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

  // 저장(임시: localStorage, 실제: API 연동 위치)
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 서버 전송 시에는 FormData 권장
    const fd = new FormData();
    fd.append("id", profile.id); // 사용자의 ID (이메일)
    fd.append("displayName", profile.displayName); // 사용자의 이름 (NAME)
    fd.append("phone", profile.phone);
    // [수정] 'email'은 'id'와 동일한 값이므로 중복 전송 불필요
    // fd.append("email", profile.email);
    fd.append("useSafeNumber", profile.useSafeNumber ? "1" : "0");
    if (password) fd.append("password", password);
    if (photoFile) fd.append("profileImage", photoFile);

    // 실제 연동 예시
    // await fetch("/api/users/me", { method: "PUT", body: fd });

    // 임시 저장: 미리보기(base64)를 URL로 저장
    const saveObj = {
      id: profile.id, // ID (이메일)
      displayName: profile.displayName, // 이름
      name: profile.displayName, // 이름 (name 필드도 추가)
      email: profile.id, // email은 id와 동일하게
      phone: profile.phone,
      useSafeNumber: profile.useSafeNumber,
      profileImageUrl: photoPreview || profile.profileImageUrl || "",
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("mock_current_user", JSON.stringify(saveObj));

    // 인증 컨텍스트가 있다면 갱신
    if (auth?.refreshUser) auth.refreshUser();

    alert("개인정보가 저장되었습니다.");
    navigate("/"); // 필요 없으면 제거
  };

  if (loading) {
    return (
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
          <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
            개인정보 수정
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            개인정보를 안전하게 관리할 수 있습니다. 변경한 내용은 저장을 눌러
            적용하세요.
          </p>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* 프로필 사진 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                프로필 사진
              </label>
              <div className="flex items-center gap-4">
                <div
                  className="w-28 h-28 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="사진 변경"
                >
                  {photoPreview || profile.profileImageUrl ? (
                    <img
                      src={photoPreview || profile.profileImageUrl}
                      alt="프로필 미리보기"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-10 h-10 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M12 12a4 4 0 100-8 4 4 0 000 8z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      ></path>
                      <path
                        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      ></path>
                    </svg>
                  )}
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPhotoChange}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-sky-500 text-white rounded-md"
                    >
                      사진 변경
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview("");
                        setProfile((p) => ({ ...p, profileImageUrl: "" }));
                      }}
                      className="px-4 py-2 bg-slate-100 rounded-md"
                    >
                      제거
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    PNG, JPG 권장 (최대 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  이름
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  className={`mt-1 w-full px-4 py-3 border rounded-lg focus:outline-none ${
                    errors.displayName ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.displayName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.displayName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  이메일
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly // [수정] 수정 불가
                  className={`mt-1 w-full px-4 py-3 border rounded-lg focus:outline-none bg-slate-100 text-slate-500 cursor-not-allowed focus:ring-0 ${
                    // [수정] 비활성화 스타일
                    errors.email ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {/* [수정] readOnly 필드는 에러 메시지 불필요
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
                */}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className={`mt-1 w-full px-4 py-3 border rounded-lg focus:outline-none ${
                    errors.phone ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* 비밀번호 변경(선택) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="변경할 비밀번호 입력 (선택)"
                  className={`mt-1 w-full px-4 py-3 border rounded-lg focus:outline-none ${
                    errors.password ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 확인"
                  className={`mt-1 w-full px-4 py-3 border rounded-lg focus:outline-none ${
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

            {/* 설정 */}
            <div className="flex items-center gap-3">
              <input
                id="use-safe-number"
                type="checkbox"
                checked={profile.useSafeNumber}
                onChange={(e) => updateField("useSafeNumber", e.target.checked)}
                className="h-4 w-4"
              />
              <label
                htmlFor="use-safe-number"
                className="text-sm text-slate-700"
              >
                안심번호 사용
              </label>
            </div>

            {/* 액션 */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 bg-slate-100 rounded-md"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-sky-500 text-white rounded-md font-semibold"
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
