// src/components/common/LoginModal.jsx

import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { GoogleLogin } from "@react-oauth/google"; // 🔥 구글 로그인 추가

const LoginModal = ({ isOpen, onClose }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginWithGoogle } = useAuth(); // 🔥 loginWithGoogle 추가

  if (!isOpen) return null;

  // 일반 로그인
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(id, password);
      setId("");
      setPassword("");
      onClose();
    } catch (error) {
      alert(
        error.response?.data?.message || "아이디 또는 비밀번호가 틀립니다."
      );
    }
  };

  // 🔥 구글 로그인 성공 처리
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "구글 로그인에 실패했습니다.");
    }
  };

  // 🔥 구글 로그인 실패 처리
  const handleGoogleError = () => {
    alert("구글 로그인에 실패했습니다. 다시 시도해주세요.");
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

        {/* 🔥 소셜 로그인 섹션 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                또는 소셜 계정으로 로그인
              </span>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            {/* 🔥 구글 로그인 버튼 */}
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="350"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
