// src/components/layout/Header.jsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import LoginModal from "../common/LoginModal.jsx";
import SignupModal from "../common/SignupModal.jsx";

const Header = () => {
  const { isLoggedIn, logout, user } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // 헤더 그림자 효과
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // [] : 컴포넌트 마운트 시 1회 실행

  return (
    <>
      <header
        id="header"
        className={`bg-white/80 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "shadow-lg" : "shadow-sm"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* 로고 */}
            <div className="flex-shrink-0 flex items-center h-20">
              <Link to="/" className="text-4xl font-extrabold text-sky-400">
                이어주개
              </Link>
            </div>

            {/* 네비게이션 (Link 컴포넌트 사용) */}
            <nav className="hidden lg:flex lg:items-center lg:space-x-8 h-20">
              {/* <div className="nav-item">
                <Link
                  to="/IntroPage" // 🚩 intro.jsx
                  className="text-lg text-gray-700 hover:text-sky-400 transition-colors font-medium whitespace-nowrap"
                >
                  서비스소개
                </Link>
              </div> */}

              {/* 조회 서비스 드롭다운 */}
              <div className="nav-item relative group">
                <button className="text-lg text-gray-700 hover:text-sky-400 transition-colors font-medium whitespace-nowrap flex items-center">
                  실종
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </button>
                <div className="absolute left-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block dropdown-menu">
                  <Link
                    to="/register-pet"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    실종 동물 등록
                  </Link>
                  <Link
                    to="/reported-pets"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    실종 동물 조회
                  </Link>
                </div>
              </div>

              {/* 등록/제보 드롭다운 */}
              <div className="nav-item relative group">
                <button className="text-lg text-gray-700 hover:text-sky-400 transition-colors font-medium whitespace-nowrap flex items-center">
                  제보
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </button>
                <div className="absolute left-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block dropdown-menu">
                  <Link
                    to="/report-sighting"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    실종 동물 제보
                  </Link>
                  <Link
                    to="/reported-pets"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    제보 동물 조회
                  </Link>
                </div>
              </div>

              {/* 보호소/병원 드롭다운 */}
              <div className="nav-item relative group">
                <button className="text-lg text-gray-700 hover:text-sky-400 transition-colors font-medium whitespace-nowrap flex items-center">
                  입양
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </button>
                <div className="absolute left-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block dropdown-menu">
                  <Link
                    to="/adopt"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    AI 입양 추천
                  </Link>
                  <Link
                    to="/abandoned-pets"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    보호소 동물 보러가기
                  </Link>
                </div>
              </div>

              {/* 커뮤니티 */}
              <div className="nav-item">
                <Link
                  to="/community"
                  className="text-lg text-gray-700 hover:text-sky-400 transition-colors font-medium whitespace-nowrap"
                >
                  커뮤니티
                </Link>
              </div>
            </nav>

            {/* 인증 버튼 (조건부 렌더링) */}
            <div className="flex items-center space-x-3">
              {!isLoggedIn ? (
                <div id="auth-buttons" className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-gray-100"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => setIsSignupModalOpen(true)}
                    className="px-6 py-3 text-base font-bold text-white bg-sky-400 border-2 border-transparent rounded-lg shadow-sm hover:bg-sky-500"
                  >
                    회원가입
                  </button>
                </div>
              ) : (
                <div id="user-actions" className="flex items-center space-x-4">
                  {user && (
                    <span className="text-lg font-medium text-gray-800">
                      {user.nickname}님
                    </span>
                  )}
                  {/* 🚩 1. 마이페이지 드롭다운 (수정됨) */}
                  {/* h-20과 flex, items-center를 추가해 group 영역을 헤더 높이만큼 채웁니다. */}
                  <div className="relative group h-20 flex items-center">
                    <button className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-gray-100 flex items-center">
                      마이페이지
                      <svg
                        className="w-5 h-5 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                    </button>

                    {/* 🚩 2. 드롭다운 메뉴 (mt-1 제거) */}
                    {/* top-20 (헤더 높이 80px)에 바로 붙여 틈을 없앱니다. */}
                    <div className="absolute right-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block dropdown-menu">
                      <Link
                        to="/mypage/edit"
                        className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                      >
                        개인정보수정
                      </Link>
                      <Link
                        to="/mypage/pets"
                        className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                      >
                        실종동물 관리
                      </Link>
                    </div>
                  </div>

                  {/* 로그아웃 버튼 */}
                  <button
                    onClick={logout}
                    className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-gray-100"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 모달 컴포넌트 (상태에 따라 열림) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
      />
    </>
  );
};

export default Header;
