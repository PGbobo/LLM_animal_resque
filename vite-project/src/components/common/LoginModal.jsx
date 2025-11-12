// src/components/common/LoginModal.jsx

import React, { useState } from "react";
// 👇 [수정] 'useAuth is not defined' 오류 해결을 위해 이 줄을 추가했습니다.
import { useAuth } from "../../hooks/useAuth.js";

// (참고) 소셜 로그인 아이콘이 있다면 import가 더 있을 수 있습니다.
// import GoogleLogo from "../../assets/icons/google-logo.svg";
// import KakaoLogo from "../../assets/icons/kakao-logo.svg";
// import NaverLogo from "../../assets/icons/naver-logo.svg";

const LoginModal = ({ isOpen, onClose }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  // 👇 이 코드가 작동하기 위해 import { useAuth }가 필요합니다.
  const { login } = useAuth();

  if (!isOpen) return null;

  // 1. handleSubmit을 async 함수로 변경
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 2. AuthProvider의 login 함수를 await으로 호출
      await login(id, password);

      // 3. 로그인 성공 시
      setId("");
      setPassword("");
      onClose(); // 모달 닫기
    } catch (error) {
      // 4. 로그인 실패 시 (AuthContext에서 throw한 에러)
      alert(
        error.response?.data?.message || "아이디 또는 비밀번호가 틀립니다."
      );
    }
  };

  // 모달 바깥 클릭 시 닫기
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">로그인</h2>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <form className="mt-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="login-id"
              className="block text-sm font-medium text-gray-700"
            >
              아이디
            </label>
            <input
              type="text"
              id="login-id"
              placeholder="아이디"
              className="w-full px-4 py-3 mt-1 border border-sky-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호
            </label>
            <input
              type="password"
              id="login-password"
              placeholder="비밀번호"
              className="w-full px-4 py-3 mt-1 border border-sky-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-sky-400 text-white font-bold py-3 mt-6 rounded-md hover:bg-sky-500"
          >
            로그인
          </button>
        </form>

        {/* (참고) 소셜 로그인 버튼이 있던 부분 */}
        <div className="mt-6">
          <p className="text-center text-sm text-gray-500 mb-4">
            소셜 계정으로 간편하게 로그인
          </p>
          <div className="flex justify-center space-x-4">
            {/* <button className="p-3 border rounded-full hover:bg-gray-100">
              <img src={GoogleLogo} alt="Google" className="w-6 h-6" />
            </button>
            <button className="p-3 border rounded-full hover:bg-gray-100">
              <img src={KakaoLogo} alt="Kakao" className="w-6 h-6" />
            </button>
            <button className="p-3 border rounded-full hover:bg-gray-100">
              <img src={NaverLogo} alt="Naver" className="w-6 h-6" />
            </button>
            */}
          </div>
        </div>
      </div>
    </div>
  );
};

// 👇 [수정] 'export default'가 빠졌을 경우를 대비해 포함시켰습니다.
export default LoginModal;
