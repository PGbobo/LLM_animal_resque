// src/components/layout/SignupModal.jsx (수정된 전체 코드)

import React, { useState } from "react";
// 1. 우리가 만든 api.js에서 registerUser 함수를 가져옵니다.
import { registerUser } from "../../services/api";

const SignupModal = ({ isOpen, onClose }) => {
  // 2. 백엔드가 요구하는 모든 정보(nickname, name, phone 포함)를 state로 관리합니다.
  const [formData, setFormData] = useState({
    id: "", // 이메일 주소 (ID로 사용)
    password: "",
    passwordCheck: "",
    nickname: "",
    name: "",
    phone: "",
  });

  if (!isOpen) return null;

  // 3. input 값이 바뀔 때마다 state를 업데이트하는 함수
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 4. 폼 제출(회원가입 버튼 클릭) 시 실행될 함수
  const handleSubmit = async (e) => {
    e.preventDefault(); // 폼 기본 동작(새로고침) 방지

    // 5. 비밀번호 확인
    if (formData.password !== formData.passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      // 6. 백엔드 API로 회원가입 요청
      // (passwordCheck는 제외하고 백엔드로 전송)
      const { passwordCheck, ...registerData } = formData;
      const response = await registerUser(registerData);

      // 7. 회원가입 성공
      alert(response.data.message); // "회원가입 성공!"
      onClose(); // 모달 닫기
    } catch (error) {
      // 8. 회원가입 실패 (예: 아이디 중복)
      console.error("회원가입 에러:", error);
      alert(
        error.response?.data?.message || "회원가입 중 오류가 발생했습니다."
      );
    }
  };

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
          <h2 className="text-2xl font-bold">회원가입</h2>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* 9. handleSubmit과 handleChange를 폼과 input에 연결 */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            name="id" // 👈 name 속성 (state와 일치)
            placeholder="이메일 주소 (아이디로 사용)"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            value={formData.id}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password" // 👈 name 속성
            placeholder="비밀번호"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="passwordCheck" // 👈 name 속성
            placeholder="비밀번호 확인"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            value={formData.passwordCheck}
            onChange={handleChange}
            required
          />
          {/* 10. 백엔드가 요구하는 추가 input들 */}
          <input
            type="text"
            name="nickname" // 👈 name 속성
            placeholder="닉네임"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            value={formData.nickname}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="name" // 👈 name 속성
            placeholder="이름"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="phone" // 👈 name 속성
            placeholder="전화번호 (예: 010-1234-5678)"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            className="w-full bg-sky-300 text-white font-bold py-3 mt-6 rounded-md hover:bg-sky-500"
          >
            가입하기
          </button>
        </form>

        {/* ... 소셜 가입 ... */}
      </div>
    </div>
  );
};

export default SignupModal;
