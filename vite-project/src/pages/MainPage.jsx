// src/pages/MainPage.jsx
import React, { useEffect, useState } from "react";
import reuniteImg from "../assets/images/reunite.png";
import ReportImage from "../assets/images/ReportImage.png";
import AISimilarity from "../assets/images/AI Similarity-1.png";

/**
 * MainPage
 * 변경 사항 요약
 * - [히어로] 최초 진입 시 헤더 제외 화면 가득 / CTA 하나만 유지
 * - [이동] CTA 클릭 → #features 로 부드러운 스크롤
 * - [피처] 3개 카드(클릭 시 각 상세 섹션으로 스무스 스크롤)
 * - [상세] "카드 상세정보" 레이아웃을 좌측 이미지 / 우측 텍스트의 2열 구조로 통일
 *         (모바일에서는 세로 스택, md 이상에서 2열)
 * - [라우팅] react-router-dom 미사용 기준, window.location.href 사용
 */
const MainPage = () => {
  // --------------------------------
  // TOP 버튼 관련 상태 및 스크롤 이벤트
  // --------------------------------
  const [showTopButton, setShowTopButton] = useState(false);

  // 스크롤 위치에 따라 TOP 버튼 노출/숨김
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowTopButton(true);
      } else {
        setShowTopButton(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 최상단으로 부드럽게 이동
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --------------------------------
  // 공통: 부드러운 스크롤 유틸
  // --------------------------------
  const smoothScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 히어로 CTA -> features로 이동
  const handleStartJourney = (e) => {
    e.preventDefault();
    smoothScrollTo("features");
  };

  // 피처 카드 클릭 -> 해당 상세 섹션으로 이동
  const goDetail = (targetId) => () => smoothScrollTo(targetId);

  // 라우트 이동(요구사항 반영: window.location 사용)
  const navigate = (path) => () => {
    window.location.href = path;
  };

  return (
    <main className="bg-slate-50">
      {/* =========================================
          1) 히어로 섹션: 첫 화면 가득
          - 고정 헤더 높이를 고려한 최소 높이 설정
         ========================================= */}
      <section
        id="intro-hero"
        className="relative flex items-center border-b border-sky-100"
        style={{ minHeight: "calc(100vh - var(--header-h, 80px))" }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <p className="font-semibold text-lg md:text-xl text-indigo-500 mb-4 tracking-wide">
            함께하는 마음, 이어주는 기술
          </p>

          <h1
            className="font-extrabold text-4xl sm:text-5xl md:text-6xl text-slate-900 mb-8"
            style={{ lineHeight: 1.25 }}
          >
            <span className="text-sky-300">AI</span>와 함께,{" "}
            <br className="sm:hidden" />
            잃어버린 반려동물을
            <br />
            다시 당신의 품으로
          </h1>

          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed mb-10">
            ‘이어주개’는 첨단 AI와 이웃의 제보를 연결해
            <br />
            실종·유기동물 재회를 가장 빠르고 확실하게 돕는 통합 플랫폼입니다.
          </p>

          {/* ✅ 유일 CTA → #features 로 스무스 스크롤 */}
          <div className="mt-10 flex justify-center">
            <a
              href="#features"
              onClick={handleStartJourney}
              className="inline-flex items-center justify-center bg-sky-400 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg hover:shadow-xl hover:bg-sky-500 transition-all duration-300 transform hover:scale-105"
            >
              따뜻한 재회의 여정 시작하기
            </a>
          </div>

          {/* 배경 그래픽(선택) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-sky-100 blur-3xl opacity-60" />
            <div className="absolute -bottom-10 -right-10 w-72 h-72 rounded-full bg-indigo-100 blur-3xl opacity-60" />
          </div>
        </div>
      </section>

      {/* =========================================
          2) 기능 소개 섹션 (Features)
          - 3개 카드 클릭 시 각 상세 섹션으로 이동
         ========================================= */}
      <section id="features" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 text-center mb-4">
            우리의 약속, 세 가지 핵심 서비스
          </h2>
          <p className="text-lg text-slate-500 text-center mb-16 md:mb-20 max-w-2xl mx-auto">
            “간단한 등록 → 지도와 AI의 연결 → 입양까지” 하나의 흐름으로
            이어집니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 text-center items-stretch">
            {/* --- 카드 1: AI 기반 실종 탐색 --- */}
            <button
              type="button"
              onClick={goDetail("detail-ai")}
              className="h-full bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200 flex flex-col items-center pt-10 space-y-5"
              aria-label="AI 기반 실종 탐색 기능 자세히 보기"
            >
              <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center shadow-inner shrink-0">
                <svg
                  className="w-10 h-10 text-sky-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 break-keep leading-tight text-center min-h-[3.75rem]">
                AI 기반 실종 탐색 지원
              </h3>

              <p className="text-slate-600 leading-relaxed">
                반려동물의 사진과 특징을 등록하면, AI가 보호소 데이터를
                주기적으로 분석하여 유사 개체를 탐색하고 재회의 가능성을 높이는
                정보를 제공합니다.
              </p>
            </button>

            {/* --- 카드 2: 사용자 제보 --- */}
            <button
              type="button"
              onClick={goDetail("detail-map")}
              className="h-full bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200 flex flex-col items-center pt-10 space-y-5"
              aria-label="사용자 참여형 제보 기능 자세히 보기"
            >
              <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center shadow-inner shrink-0">
                <svg
                  className="w-10 h-10 text-sky-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 break-keep leading-tight text-center min-h-[3.75rem]">
                사용자 참여형 제보 기능
              </h3>

              <p className="text-slate-600 leading-relaxed">
                사용자가 길에서 발견한 동물을 사진과 함께 제보하면, 정보가 즉시
                등록되어 보호자에게 전달됩니다. 제보된 내용은 실종 데이터와
                연동되어 신속한 대응이 가능하도록 지원합니다.
              </p>
            </button>

            {/* --- 카드 3: 맞춤 입양 추천 --- */}
            <button
              type="button"
              onClick={goDetail("detail-adopt")}
              className="h-full bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200 flex flex-col items-center pt-10 space-y-5"
              aria-label="맞춤 입양 추천 기능 자세히 보기"
            >
              <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center shadow-inner shrink-0">
                <svg
                  className="w-10 h-10 text-sky-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 break-keep leading-tight text-center min-h-[3.75rem]">
                자연어 기반 맞춤 입양 추천 서비스
              </h3>

              <p className="text-slate-600 leading-relaxed">
                사용자가 희망하는 반려동물의 외형이나 성격을 자연어로 입력하면,
                AI가 보호소 데이터를 분석하여 의미적으로 유사한 동물을
                추천합니다.
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================
          3) 상세 섹션들 (카드 상세정보)
          - 공통 레이아웃: 좌측 이미지 / 우측 텍스트 (md 이상 2열)
          - 모바일에서는 세로 스택(이미지 → 텍스트)
         ========================================= */}

      {/* --- 상세 1: AI 정보 제공 --- */}
      <section id="detail-ai" className="py-20 md:py-28 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            {/* 좌측: 이미지(플레이스홀더 SVG) */}
            <div className="order-1 md:order-none">
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 flex items-center justify-center">
                <img
                  src={reuniteImg}
                  alt="AI 기반 실종동물 재회 과정 다이어그램"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>
            </div>

            {/* 우측: 텍스트/버튼 */}
            <div>
              {/* 간단 요약 타이틀 */}
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4 break-keep whitespace-pre-line">
                AI가 실종 등록 정보를 토대로 보호자와 반려동물의 재회를 돕습니다
              </h3>
              <p className="text-slate-600 mb-6">
                사진과 특징을 등록하면, AI가 전국 보호소 데이터를 분석하여 유사
                개체를 탐색합니다. 실시간으로 갱신되는 공고를 비교해 재회
                가능성이 높은 후보를 자동으로 안내합니다.
              </p>

              {/* 상세 설명(불릿) */}
              <ul className="list-disc pl-5 text-slate-700 leading-7 mb-8">
                <li>
                  등록된 사진과 특징을 벡터화하여 시각적·의미적 유사도 분석
                </li>
                <li>
                  실종 시간과 위치 정보를 결합해 탐색 우선 지역을 자동 추천
                </li>
                <li>보호소 신규 공고와의 유사 개체를 탐지 시 즉시 알림 발송</li>
              </ul>

              {/* 관련 페이지 이동 버튼 */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={navigate("/register-pet")}
                  className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600 transition"
                >
                  실종 등록 페이지로
                </button>
                <button
                  onClick={navigate("/missing-pets")}
                  className="px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-300 hover:bg-slate-100 transition"
                >
                  실종 조회 페이지로
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 상세 2: 지도 시각화 --- */}
      <section id="detail-map" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            {/* 좌측: 이미지(플레이스홀더 지도) */}
            <div className="order-1 md:order-none">
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 flex items-center justify-center">
                <img
                  src={ReportImage}
                  alt="AI 기반 실종동물 재회 과정 다이어그램"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>
            </div>

            {/* 우측: 텍스트/버튼 */}
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4 break-keep whitespace-pre-line">
                사용자의 제보가 누군가의 재회로 연결됩니다
              </h3>
              <p className="text-slate-600 mb-6">
                길에서 발견한 동물을 사진과 함께 제보하면, 정보가 즉시 등록되어
                실종 데이터와 연동됩니다. AI는 사진과 자연어를 분석하여 높은
                연관성을 보이는 제보를 식별하고, 보호자에게 실시간으로 알림을
                전송합니다.
              </p>

              <ul className="list-disc pl-5 text-slate-700 leading-7 mb-8">
                <li>
                  제보 시 사진과 위치 정보가 자동 저장되어 정확한 탐색 지원
                </li>
                <li>
                  실종 등록 정보와 연계되어 사진·자연어 기반 매칭 자동 수행
                </li>
                <li>보호자에게 연관 제보 발생 시 즉시 알림 발송</li>
              </ul>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={navigate("/report-sighting")}
                  className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600 transition"
                >
                  실종 제보 페이지로
                </button>
                <button
                  onClick={navigate("/witness-pets")}
                  className="px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-300 hover:bg-slate-100 transition"
                >
                  제보 조회 페이지로
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 상세 3: 자연어 기반 입양 추천 --- */}
      <section id="detail-adopt" className="py-20 md:py-28 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            {/* 좌측: 이미지(플레이스홀더 카드 리스트) */}
            <div className="order-1 md:order-none">
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-3 flex items-center justify-center">
                <img
                  src={AISimilarity}
                  alt="AI 기반 입양추천"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>
            </div>

            {/* 우측: 텍스트/버튼 */}
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4 break-keep whitespace-pre-line">
                AI가 사용자에게 이상적인 반려동물을 찾아드립니다
              </h3>
              <p className="text-slate-600 mb-6">
                사용자가 원하는 반려동물의 외형이나 성격을 문장으로 입력하거나,
                참고 이미지를 업로드하면 AI가 보호소 데이터를 분석합니다.
                텍스트와 이미지 모두를 이해하는 멀티모달 AI를 통해 사용자 선호에
                가장 가까운 입양 후보를 제시합니다.
              </p>

              <ul className="list-disc pl-5 text-slate-700 leading-7 mb-8">
                <li>자연어와 이미지 입력을 모두 지원하여 맞춤형 검색 가능</li>
                <li>
                  보호소 데이터의 외형·성격 정보를 통합 분석해 유사도 계산
                </li>
                <li>개인 선호도에 따른 추천 순위 제공으로 입양 결정을 지원</li>
              </ul>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={navigate("/adopt")}
                  className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600 transition"
                >
                  입양 추천 페이지로
                </button>
                <button
                  onClick={navigate("/abandoned-pets")}
                  className="px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-300 hover:bg-slate-100 transition"
                >
                  보호소 공고 보러가기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 여백(바닥) */}
      <div className="h-10" />

      {/* =========================================
          TOP 버튼
          - 스크롤이 일정 이상 내려가면 우측 하단에 노출
          - 클릭 시 최상단으로 부드럽게 이동
         ========================================= */}
      {showTopButton && (
        <button
          type="button"
          onClick={scrollToTop}
          className="
    fixed bottom-6
    right-4
    md:right-10
    lg:right-16
    w-14 h-14
    bg-sky-50
    rounded-full
    shadow-lg
    flex items-center justify-center
    transition-all duration-300
    hover:shadow-xl
    border-2 border-white
    "
          aria-label="페이지 상단으로 이동"
        >
          {/* 화살표 아이콘 (위 방향 두 줄) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 -2 24 24"
            stroke="currentColor"
            strokeWidth="2"
            className="w-9 h-9 text-sky-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 14l5-5 5 5M7 10l5-5 5 5"
            />
          </svg>
        </button>
      )}
    </main>
  );
};

export default MainPage;
