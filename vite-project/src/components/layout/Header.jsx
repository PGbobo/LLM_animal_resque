// src/components/layout/Header.jsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // 브라우저용 Link
import { useAuth } from "../../hooks/useAuth.js";
import LoginModal from "../common/LoginModal.jsx";
import SignupModal from "../common/SignupModal.jsx";

export default function Header() {
  const { isLoggedIn, logout, user } = useAuth();

  // 모달 상태
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // 스크롤 그림자
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 모바일 배너 상태
  const [mobileOpen, setMobileOpen] = useState(false);

  // 모바일 배너 내 아코디언 상태
  const [openMissing, setOpenMissing] = useState(false); // 실종
  const [openReport, setOpenReport] = useState(false); // 제보
  const [openAdopt, setOpenAdopt] = useState(false); // 입양
  const [openMy, setOpenMy] = useState(false); // 마이페이지

  // 배너 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeAndGo = () => setMobileOpen(false);

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
              <Link
                to="/"
                className="text-4xl font-extrabold text-sky-400"
                onClick={() => setMobileOpen(false)}
              >
                이어주개
              </Link>
            </div>

            {/* 데스크톱 내비게이션: hd(1200) 있으면 hd부터, 없으면 lg(1024)부터 표시 */}
            <nav className="hidden lg:flex hd:flex lg:items-center hd:items-center lg:space-x-8 hd:space-x-8 h-20">
              {/* 실종 */}
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
                    />
                  </svg>
                </button>
                <div className="absolute left-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block">
                  <Link
                    to="/register-pet"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    실종 동물 등록
                  </Link>
                  <Link
                    to="/missing-pets"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    실종 동물 조회
                  </Link>
                </div>
              </div>

              {/* 제보 */}
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
                    />
                  </svg>
                </button>
                <div className="absolute left-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block">
                  <Link
                    to="/report-sighting"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    실종 동물 제보
                  </Link>
                  <Link
                    to="/witness-pets"
                    className="block px-5 py-3 text-base text-gray-700 hover:bg-gray-100"
                  >
                    제보 동물 조회
                  </Link>
                </div>
              </div>

              {/* 입양 */}
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
                    />
                  </svg>
                </button>
                <div className="absolute left-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block">
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

            {/* 데스크톱: 인증 영역 (hd 또는 lg 이상에서만 표시) */}
            <div className="hidden lg:flex hd:flex items-center space-x-3">
              {!isLoggedIn ? (
                <div id="auth-buttons" className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-gray-100 whitespace-nowrap"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => setIsSignupModalOpen(true)}
                    className="px-6 py-3 text-base font-bold text-white bg-sky-400 border-2 border-transparent rounded-lg shadow-sm hover:bg-sky-500 whitespace-nowrap"
                  >
                    회원가입
                  </button>
                </div>
              ) : (
                <div id="user-actions" className="flex items-center space-x-4">
                  {user && (
                    <span className="text-lg font-medium text-gray-800 whitespace-nowrap">
                      <span className="text-sky-400">{user.nickname}</span>님
                    </span>
                  )}
                  {/* 마이페이지 드롭다운 */}
                  <div className="relative group h-20 flex items-center">
                    <button className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-gray-100 flex items-center whitespace-nowrap">
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
                        />
                      </svg>
                    </button>
                    <div className="absolute right-0 top-20 w-56 bg-white rounded-md shadow-lg py-2 z-10 hidden group-hover:block">
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
                  <button
                    onClick={logout}
                    className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-gray-100 whitespace-nowrap"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>

            {/* 모바일/태블릿: 햄버거 버튼 (hd 미만 또는 lg 미만에서 표시) */}
            <button
              className="lg:hidden hd:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="메뉴 열기"
              onClick={() => setMobileOpen(true)}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 배너: 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40"
          role="button"
          aria-label="배너 닫기"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 모바일 배너: 우측 패널 */}
      <aside
        className={`fixed top-0 right-0 h-full w-[85%] max-w-[380px] z-[80] bg-white shadow-2xl transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between h-20 px-5 border-b">
          <span className="text-2xl font-extrabold text-sky-400">메뉴</span>
          <button
            className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="메뉴 닫기"
            onClick={() => setMobileOpen(false)}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M6 6l12 12M18 6l-12 12"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="px-5 py-4 overflow-y-auto h-[calc(100vh-80px)]">
          {/* 인증/마이영역 */}
          {!isLoggedIn ? (
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => {
                  setIsLoginModalOpen(true);
                  setMobileOpen(false);
                }}
                className="flex-1 px-4 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-gray-100"
              >
                로그인
              </button>
              <button
                onClick={() => {
                  setIsSignupModalOpen(true);
                  setMobileOpen(false);
                }}
                className="flex-1 px-4 py-3 text-base font-bold text-white bg-sky-400 border-2 border-transparent rounded-lg shadow-sm hover:bg-sky-500"
              >
                회원가입
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <div className="mb-2 text-base text-gray-800">
                <span className="font-semibold text-sky-500">
                  {user?.nickname}
                </span>
                님 환영합니다
              </div>
              <button
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => setOpenMy((v) => !v)}
              >
                <span className="font-semibold">마이페이지</span>
                <svg
                  className={`w-5 h-5 transition-transform ${
                    openMy ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openMy && (
                <div className="mt-2 ml-2 flex flex-col gap-1">
                  <Link
                    to="/mypage/edit"
                    onClick={closeAndGo}
                    className="block px-3 py-2 rounded hover:bg-slate-50"
                  >
                    개인정보수정
                  </Link>
                  <Link
                    to="/mypage/pets"
                    onClick={closeAndGo}
                    className="block px-3 py-2 rounded hover:bg-slate-50"
                  >
                    실종동물 관리
                  </Link>
                </div>
              )}
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="mt-3 w-full px-4 py-3 text-base font-bold text-gray-700 bg-white border-2 border-sky-200 rounded-lg shadow-sm hover:bg-slate-50"
              >
                로그아웃
              </button>
            </div>
          )}

          {/* 실종 (아코디언) */}
          <div className="mb-3">
            <button
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => setOpenMissing((v) => !v)}
            >
              <span className="font-semibold">실종</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  openMissing ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openMissing && (
              <div className="mt-2 ml-2 flex flex-col gap-1">
                <Link
                  to="/register-pet"
                  onClick={closeAndGo}
                  className="block px-3 py-2 rounded hover:bg-slate-50"
                >
                  실종 동물 등록
                </Link>
                <Link
                  to="/missing-pets"
                  onClick={closeAndGo}
                  className="block px-3 py-2 rounded hover:bg-slate-50"
                >
                  실종 동물 조회
                </Link>
              </div>
            )}
          </div>

          {/* 제보 (아코디언) */}
          <div className="mb-3">
            <button
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => setOpenReport((v) => !v)}
            >
              <span className="font-semibold">제보</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  openReport ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openReport && (
              <div className="mt-2 ml-2 flex flex-col gap-1">
                <Link
                  to="/report-sighting"
                  onClick={closeAndGo}
                  className="block px-3 py-2 rounded hover:bg-slate-50"
                >
                  실종 동물 제보
                </Link>
                <Link
                  to="/witness-pets"
                  onClick={closeAndGo}
                  className="block px-3 py-2 rounded hover:bg-slate-50"
                >
                  제보 동물 조회
                </Link>
              </div>
            )}
          </div>

          {/* 입양 (아코디언) */}
          <div className="mb-3">
            <button
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => setOpenAdopt((v) => !v)}
            >
              <span className="font-semibold">입양</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  openAdopt ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openAdopt && (
              <div className="mt-2 ml-2 flex flex-col gap-1">
                <Link
                  to="/adopt"
                  onClick={closeAndGo}
                  className="block px-3 py-2 rounded hover:bg-slate-50"
                >
                  AI 입양 추천
                </Link>
                <Link
                  to="/abandoned-pets"
                  onClick={closeAndGo}
                  className="block px-3 py-2 rounded hover:bg-slate-50"
                >
                  보호소 동물 보러가기
                </Link>
              </div>
            )}
          </div>

          {/* 커뮤니티 */}
          <Link
            to="/community"
            onClick={closeAndGo}
            className="block px-4 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            커뮤니티
          </Link>
        </div>
      </aside>

      {/* 모달 */}
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
}
