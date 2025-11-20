// src/pages/MainPage.jsx
import React, { useEffect, useState, useRef } from "react";
import reuniteImg from "../assets/images/reunite.png";
import ReportImage from "../assets/images/ReportImage.png";
import AISimilarity from "../assets/images/AI Similarity-1.png";
import mainBg from "../assets/images/main_bg-5.jpg";

/**
 * MainPage
 * 변경 사항 요약
 * - [히어로] 최초 진입 시 헤더 제외 화면 가득 / CTA 하나만 유지
 * - [이동] CTA 클릭 → #features 로 부드러운 스크롤
 * - [피처] 3개 카드(클릭 시 각 상세 섹션으로 스무스 스크롤)
 * - [상세] "카드 상세정보" 레이아웃을 좌측 이미지 / 우측 텍스트의 2열 구조로 통일
 *         (모바일에서는 세로 스택, md 이상에서 2열)
 * - [라우팅] react-router-dom 미사용 기준, window.location.href 사용
 * - [스크롤 애니메이션]
 *    · 각 섹션이 화면에 들어올 때 서서히(페이드 + 아래에서 위로) 등장
 *    · 히어로 문구 4줄, 기능 카드는 왼쪽→오른쪽 순서로 순차 등장
 */

/**
 * 공통 훅: 스크롤 시 요소 등장 애니메이션을 위한 IntersectionObserver 훅
 * - ref 를 특정 요소에 연결하면, 해당 요소가 viewport에 들어올 때 visible 상태가 true 로 변경됨
 * - 한 번 등장 후에는 다시 사라지지 않도록 unobserve 처리
 */
const useScrollReveal = (options) => {
  const [visible, setVisible] = useState(false); // 현재 요소가 화면에 보여지는지 여부
  const ref = useRef(null); // 관찰할 DOM 요소를 담을 ref

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // IntersectionObserver 콜백: 요소가 화면에 들어왔는지 여부를 감지
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // 요소가 일정 비율 이상 보이면 visible = true 로 설정하고 관찰 종료
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // 옵션: threshold 0.15 정도면 요소의 15% 정도가 보일 때 애니메이션 시작
        threshold: 0.15,
        ...options,
      }
    );

    observer.observe(element);

    // 컴포넌트 언마운트 시 observer 정리
    return () => {
      if (element) observer.unobserve(element);
      observer.disconnect();
    };
  }, [options]);

  return [ref, visible];
};

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

  // --------------------------------
  // 섹션별 스크롤 등장 애니메이션용 훅
  // --------------------------------
  const [heroRef, heroVisible] = useScrollReveal();
  const [featuresRef, featuresVisible] = useScrollReveal();
  const [detailAiRef, detailAiVisible] = useScrollReveal();
  const [detailMapRef, detailMapVisible] = useScrollReveal();
  const [detailAdoptRef, detailAdoptVisible] = useScrollReveal();

  return (
    <main className="bg-slate-50">
      {/* =========================================
          1) 히어로 섹션: 첫 화면 가득
          - 고정 헤더 높이를 고려한 최소 높이 설정
          - 화면 진입 시 문구 4줄이 순서대로 스르륵 등장
         ========================================= */}
      <section
        id="intro-hero"
        className="relative flex items-center border-b border-sky-100"
        style={{
          // 헤더 높이만큼 뺀 전체 화면 높이
          minHeight: "calc(100vh - var(--header-h, 80px))",

          // 🔥 1) 위 레이어: 왼쪽은 거의 불투명, 오른쪽으로 갈수록 투명해지는 그라디언트
          // 🔥 2) 아래 레이어: 실제 배경 이미지
          backgroundImage: `
            linear-gradient(
            to right,
            rgba(240, 249, 255, 1) 0%,    /* 아주 연한 하늘색(배경) 완전 불투명 */
            rgba(240, 249, 255, 1) 30%,   /* 왼쪽 30%까지는 이미지 거의 안 보이게 */
            rgba(240, 249, 255, 0.9) 45%, /* 가운데 근처부터 조금 보이기 시작 */
            rgba(240, 249, 255, 0.6) 65%, /* 점점 더 투명해짐 */
            rgba(240, 249, 255, 0.0) 100% /* 맨 오른쪽은 이미지 100% 보이게 */
            ),
          url(${mainBg})
        `,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right center", // ⭐ 이미지 오른쪽 고정
          backgroundSize: "auto 100%", // 세로를 기준으로 꽉 채우고 가로 비율 유지
        }}
      >
        <div
          ref={heroRef}
          className="
      container
      max-w-4xl xl:max-w-6xl   /* 🔥 글자가 들어가는 박스 최대 폭 넓힘 */
      px-4 sm:px-6 lg:px-10   /* 🔥 좌우 여백 */
      ml-0 mr-auto        /* 🔥 왼쪽으로 붙이고 오른쪽만 auto → 전체 블럭이 좌측 정렬 */
      relative
      text-left        // ⭐ 좌측 정렬로 변경
      pl-8        /* 기본 왼쪽 여백 */
      md:pl-20    /* 중간 화면에서 여백 증가 */
      lg:pl-32    /* 큰 화면에서 더 크게 */
      xl:pl-48      /* 큰 화면 */
      2xl:pl-64     /* 초대형 화면 (여백 256px 정도) */
    "
        >
          {/* 1) 서브 타이틀 */}
          <p
            className={`
        font-semibold text-lg md:text-xl text-indigo-500 mb-4 tracking-wide
        transform transition-all duration-700 ease-out
        ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
      `}
            style={{ transitionDelay: heroVisible ? "0s" : "0s" }}
          >
            함께하는 마음, 이어주는 기술
          </p>

          {/* 2) 메인 타이틀 */}
          <h1
            className={`
        font-extrabold text-4xl sm:text-5xl md:text-6xl text-slate-900 mb-8
        break-keep
        transform transition-all duration-700 ease-out
        ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
      `}
            style={{
              lineHeight: 1.25,
              transitionDelay: heroVisible ? "0.15s" : "0s",
            }}
          >
            <span className="text-sky-300">AI</span>와 함께, 잃어버린 반려동물을
            다시 당신의 품으로
          </h1>

          {/* 3) 설명 문단 */}
          <p
            className={`
        mt-6 max-w-3xl text-lg md:text-xl text-slate-600 leading-relaxed mb-10
        transform transition-all duration-700 ease-out
        ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
      `}
            style={{ transitionDelay: heroVisible ? "0.3s" : "0s" }}
          >
            ‘이어주개’는 첨단 AI와 이웃의 제보를 연결해
            <br />
            실종·유기동물 재회를 가장 빠르고 확실하게 돕는 통합 플랫폼입니다.
          </p>

          {/* 4) CTA 버튼 */}
          <div
            className={`
        mt-10 flex transform transition-all duration-700 ease-out
        ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
      `}
            style={{ transitionDelay: heroVisible ? "0.45s" : "0s" }}
          >
            <a
              href="#features"
              onClick={handleStartJourney}
              className="
          inline-flex items-center justify-center
          bg-sky-400 text-white font-bold text-lg
          px-10 py-4 rounded-full shadow-lg
          hover:shadow-xl hover:bg-sky-500
          transition-all duration-300 transform hover:scale-105
        "
            >
              따뜻한 재회의 여정 시작하기
            </a>
          </div>
        </div>
      </section>

      {/* =========================================
          2) 기능 소개 섹션 (Features)
          - 제목/설명, 카드 3개가 순서대로 등장
          - 카드: 왼쪽 카드 → 가운데 카드 → 오른쪽 카드 순으로 스르륵
         ========================================= */}
      <section id="features" className="py-20 md:py-28 bg-white">
        <div
          ref={featuresRef}
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl"
        >
          {/* 섹션 제목 */}
          <h2
            className={`text-3xl md:text-4xl font-extrabold text-slate-800 text-center mb-4 transform transition-all duration-700 ease-out
            ${
              featuresVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: featuresVisible ? "0s" : "0s" }}
          >
            우리의 약속, 세 가지 핵심 서비스
          </h2>

          {/* 섹션 설명 */}
          <p
            className={`text-lg text-slate-500 text-center mb-16 md:mb-20 max-w-2xl mx-auto transform transition-all duration-700 ease-out
            ${
              featuresVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: featuresVisible ? "0.15s" : "0s" }}
          >
            “간단한 등록 → 지도와 AI의 연결 → 입양까지” 하나의 흐름으로
            이어집니다.
          </p>

          {/* 기능 카드 3개: 왼쪽부터 순서대로 등장 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 text-center items-stretch">
            {/* --- 카드 1: AI 기반 실종 탐색 --- */}
            <button
              type="button"
              onClick={goDetail("detail-ai")}
              className={`h-full bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200 flex flex-col items-center pt-10 space-y-5
              ${
                featuresVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{
                transition: "all 0.7s ease-out",
                transitionDelay: featuresVisible ? "0.25s" : "0s",
              }}
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
              className={`h-full bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200 flex flex-col items-center pt-10 space-y-5
              ${
                featuresVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{
                transition: "all 0.7s ease-out",
                transitionDelay: featuresVisible ? "0.4s" : "0s",
              }}
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
              className={`h-full bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200 flex flex-col items-center pt-10 space-y-5
              ${
                featuresVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{
                transition: "all 0.7s ease-out",
                transitionDelay: featuresVisible ? "0.55s" : "0s",
              }}
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
          - 각 섹션이 화면에 들어오면
            · 이미지 → 제목/본문 → 리스트 → 버튼 순서로 스르륵 등장
         ========================================= */}

      {/* --- 상세 1: AI 정보 제공 --- */}
      <section id="detail-ai" className="py-20 md:py-28 bg-slate-50">
        <div
          ref={detailAiRef}
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            {/* 좌측: 이미지(플레이스홀더 SVG) */}
            <div
              className={`order-1 md:order-none transform transition-all duration-700 ease-out
              ${
                detailAiVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: detailAiVisible ? "0.1s" : "0s" }}
            >
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
              {/* 간단 요약 타이틀 + 본문 */}
              <div
                className={`transform transition-all duration-700 ease-out
                ${
                  detailAiVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailAiVisible ? "0.25s" : "0s" }}
              >
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4 break-keep whitespace-pre-line">
                  AI가 실종 등록 정보를 토대로 보호자와 반려동물의 재회를
                  돕습니다
                </h3>
                <p className="text-slate-600 mb-6">
                  사진과 특징을 등록하면, AI가 전국 보호소 데이터를 분석하여
                  유사 개체를 탐색합니다. 실시간으로 갱신되는 공고를 비교해 재회
                  가능성이 높은 후보를 자동으로 안내합니다.
                </p>
              </div>

              {/* 상세 설명(불릿) */}
              <ul
                className={`list-disc pl-5 text-slate-700 leading-7 mb-8 transform transition-all duration-700 ease-out
                ${
                  detailAiVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailAiVisible ? "0.4s" : "0s" }}
              >
                <li>
                  등록된 사진과 특징을 벡터화하여 시각적·의미적 유사도 분석
                </li>
                <li>
                  실종 시간과 위치 정보를 결합해 탐색 우선 지역을 자동 추천
                </li>
                <li>보호소 신규 공고와의 유사 개체를 탐지 시 즉시 알림 발송</li>
              </ul>

              {/* 관련 페이지 이동 버튼 */}
              <div
                className={`flex flex-wrap gap-3 transform transition-all duration-700 ease-out
                ${
                  detailAiVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailAiVisible ? "0.55s" : "0s" }}
              >
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
        <div
          ref={detailMapRef}
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            {/* 좌측: 이미지(플레이스홀더 지도) */}
            <div
              className={`order-1 md:order-none transform transition-all duration-700 ease-out
              ${
                detailMapVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: detailMapVisible ? "0.1s" : "0s" }}
            >
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
              <div
                className={`transform transition-all duration-700 ease-out
                ${
                  detailMapVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailMapVisible ? "0.25s" : "0s" }}
              >
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4 break-keep whitespace-pre-line">
                  사용자의 제보가 누군가의 재회로 연결됩니다
                </h3>
                <p className="text-slate-600 mb-6">
                  길에서 발견한 동물을 사진과 함께 제보하면, 정보가 즉시
                  등록되어 실종 데이터와 연동됩니다. AI는 사진과 자연어를
                  분석하여 높은 연관성을 보이는 제보를 식별하고, 보호자에게
                  실시간으로 알림을 전송합니다.
                </p>
              </div>

              <ul
                className={`list-disc pl-5 text-slate-700 leading-7 mb-8 transform transition-all duration-700 ease-out
                ${
                  detailMapVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailMapVisible ? "0.4s" : "0s" }}
              >
                <li>
                  제보 시 사진과 위치 정보가 자동 저장되어 정확한 탐색 지원
                </li>
                <li>
                  실종 등록 정보와 연계되어 사진·자연어 기반 매칭 자동 수행
                </li>
                <li>보호자에게 연관 제보 발생 시 즉시 알림 발송</li>
              </ul>

              <div
                className={`flex flex-wrap gap-3 transform transition-all duration-700 ease-out
                ${
                  detailMapVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailMapVisible ? "0.55s" : "0s" }}
              >
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
        <div
          ref={detailAdoptRef}
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            {/* 좌측: 이미지(플레이스홀더 카드 리스트) */}
            <div
              className={`order-1 md:order-none transform transition-all duration-700 ease-out
              ${
                detailAdoptVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: detailAdoptVisible ? "0.1s" : "0s" }}
            >
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
              <div
                className={`transform transition-all duration-700 ease-out
                ${
                  detailAdoptVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailAdoptVisible ? "0.25s" : "0s" }}
              >
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4 break-keep whitespace-pre-line">
                  AI가 사용자에게 이상적인 반려동물을 찾아드립니다
                </h3>
                <p className="text-slate-600 mb-6">
                  사용자가 원하는 반려동물의 외형이나 성격을 문장으로
                  입력하거나, 참고 이미지를 업로드하면 AI가 보호소 데이터를
                  분석합니다. 텍스트와 이미지 모두를 이해하는 멀티모달 AI를 통해
                  사용자 선호에 가장 가까운 입양 후보를 제시합니다.
                </p>
              </div>

              <ul
                className={`list-disc pl-5 text-slate-700 leading-7 mb-8 transform transition-all duration-700 ease-out
                ${
                  detailAdoptVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailAdoptVisible ? "0.4s" : "0s" }}
              >
                <li>자연어와 이미지 입력을 모두 지원하여 맞춤형 검색 가능</li>
                <li>
                  보호소 데이터의 외형·성격 정보를 통합 분석해 유사도 계산
                </li>
                <li>개인 선호도에 따른 추천 순위 제공으로 입양 결정을 지원</li>
              </ul>

              <div
                className={`flex flex-wrap gap-3 transform transition-all duration-700 ease-out
                ${
                  detailAdoptVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: detailAdoptVisible ? "0.55s" : "0s" }}
              >
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
            right-4 md:right-10 lg:right-16
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
