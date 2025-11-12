// src/pages/IntroPage.jsx
import React from "react";

/**
 * IntroPage
 * 변경 사항 요약
 * - [히어로] 최초 진입 시 헤더 제외 화면 가득 / CTA 하나만 유지
 * - [이동] CTA 클릭 → #features 로 부드러운 스크롤
 * - [피처] 3개 카드(클릭 시 각 상세 섹션으로 스무스 스크롤)
 * - [상세] "카드 상세정보" 레이아웃을 좌측 이미지 / 우측 텍스트의 2열 구조로 통일
 *         (모바일에서는 세로 스택, md 이상에서 2열)
 * - [라우팅] react-router-dom 미사용 기준, window.location.href 사용
 */
const IntroPage = () => {
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 text-center">
            {/* --- 카드 1: AI 정보 제공 --- */}
            <button
              type="button"
              onClick={goDetail("detail-ai")}
              className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200"
              aria-label="종/목격 등록 시 AI가 정보를 제공하는 기능 자세히 보기"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sky-50 flex items-center justify-center shadow-inner">
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
                  ></path>
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 mb-4">
                등록만 하면 AI가 도와줘요
              </h3>
              <p className="text-slate-600 leading-relaxed">
                종/목격 정보를 간단히 등록하면, AI가 유사 개체·시간·위치 패턴을
                분석해 가능한 단서와 다음 행동을 안내합니다.
              </p>
            </button>

            {/* --- 카드 2: 지도 시각화 --- */}
            <button
              type="button"
              onClick={goDetail("detail-map")}
              className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200"
              aria-label="제보를 바탕으로 지도로 보여주는 기능 자세히 보기"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sky-50 flex items-center justify-center shadow-inner">
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
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 mb-4">
                제보가 곧 지도에 나타나요
              </h3>
              <p className="text-slate-600 leading-relaxed">
                이웃의 제보는 즉시 지도에 표시되고, 시간·동선이 연결되어
                골든타임 내에 행동을 결정하도록 도와줍니다.
              </p>
            </button>

            {/* --- 카드 3: 자연어 기반 입양 --- */}
            <button
              type="button"
              onClick={goDetail("detail-adopt")}
              className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-transparent transition duration-300 hover:border-sky-300 hover:shadow-xl transform hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-sky-200"
              aria-label="자연어로 원하는 외형을 입력하면 입양 연계 기능 자세히 보기"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sky-50 flex items-center justify-center shadow-inner">
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
                  ></path>
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 mb-4">
                말로 쓰면, 비슷한 아이를 찾아줘요
              </h3>
              <p className="text-slate-600 leading-relaxed">
                “갈색·중형·활발한 성격”처럼 자연어로 입력하면 보호소 데이터를
                탐색해 유사한 동물을 추천하고 입양을 연결합니다.
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
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
                <svg
                  viewBox="0 0 600 340"
                  className="w-full h-72"
                  role="img"
                  aria-label="AI 분석 흐름 다이어그램 예시"
                >
                  <rect
                    x="0"
                    y="0"
                    width="600"
                    height="340"
                    rx="16"
                    fill="#f1f5f9"
                  />
                  <g fill="none" stroke="#38bdf8" strokeWidth="3">
                    <rect x="40" y="80" width="150" height="120" rx="12" />
                    <rect x="230" y="80" width="150" height="120" rx="12" />
                    <rect x="420" y="80" width="150" height="120" rx="12" />
                    <path d="M190 140 L230 140" />
                    <path d="M380 140 L420 140" />
                  </g>
                  <g fill="#334155" fontSize="14">
                    <text x="56" y="146">
                      등록(사진/종/특징)
                    </text>
                    <text x="248" y="146">
                      AI 유사도/패턴
                    </text>
                    <text x="446" y="146">
                      행동 제안/알림
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            {/* 우측: 텍스트/버튼 */}
            <div>
              {/* 간단 요약 타이틀 */}
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">
                종/목격 등록만으로 AI가 다음 행동을 제안합니다
              </h3>
              <p className="text-slate-600 mb-6">
                사진·종·특징·목격 정보를 등록하면, AI가 비슷한 제보/보호소
                공고와 시간·위치 패턴을 분석해 재회 가능성을 높이는 정보를
                제공합니다.
              </p>

              {/* 상세 설명(불릿) */}
              <ul className="list-disc pl-5 text-slate-700 leading-7 mb-8">
                <li>
                  얼굴/무늬/체형 등 시각 특징을 벡터로 변환하여 유사 개체 탐색
                </li>
                <li>목격 시간대·동선 패턴을 결합해 우선 탐색 구역 추천</li>
                <li>보호소 신규 공고와의 일치 후보를 자동 알림</li>
              </ul>

              {/* 관련 페이지 이동 버튼 */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={navigate("/register-pet")}
                  className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600 transition"
                >
                  실종/목격 등록 페이지로
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
              <div className="bg-slate-100 rounded-2xl shadow-inner p-6 md:p-10">
                <svg
                  viewBox="0 0 600 340"
                  className="w-full h-72"
                  role="img"
                  aria-label="지도 시각화 예시"
                >
                  <rect
                    x="0"
                    y="0"
                    width="600"
                    height="340"
                    rx="16"
                    fill="#e2e8f0"
                  />
                  <circle cx="120" cy="180" r="10" fill="#0ea5e9" />
                  <circle cx="220" cy="120" r="8" fill="#0ea5e9" />
                  <circle cx="320" cy="200" r="10" fill="#0ea5e9" />
                  <circle cx="420" cy="160" r="8" fill="#0ea5e9" />
                  <circle cx="500" cy="230" r="10" fill="#0ea5e9" />
                  <path
                    d="M120 180 L220 120 L320 200 L420 160 L500 230"
                    stroke="#334155"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            {/* 우측: 텍스트/버튼 */}
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">
                제보는 지도에서 한눈에, 동선은 시간 순으로 연결됩니다
              </h3>
              <p className="text-slate-600 mb-6">
                주변 제보가 실시간으로 지도에 표시되고, 시간 순서대로 이어져
                동선(클러스터)을 파악할 수 있습니다.
              </p>

              <ul className="list-disc pl-5 text-slate-700 leading-7 mb-8">
                <li>핫스팟/클러스터 자동 감지로 우선 탐색 지역 안내</li>
                <li>시간대 필터·거리 필터로 최신/근접 제보 빠른 선별</li>
                <li>공유 링크로 이웃·자원봉사자와 즉시 협업</li>
              </ul>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={navigate("/map")}
                  className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600 transition"
                >
                  지도 페이지로
                </button>
                <button
                  onClick={navigate("/report")}
                  className="px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-300 hover:bg-slate-100 transition"
                >
                  제보 등록 페이지로
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
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
                <svg
                  viewBox="0 0 600 340"
                  className="w-full h-72"
                  role="img"
                  aria-label="입양 추천 카드 예시"
                >
                  <rect
                    x="0"
                    y="0"
                    width="600"
                    height="340"
                    rx="16"
                    fill="#f8fafc"
                  />
                  <g>
                    <rect
                      x="40"
                      y="60"
                      width="160"
                      height="180"
                      rx="12"
                      fill="#e2e8f0"
                    />
                    <rect
                      x="220"
                      y="60"
                      width="160"
                      height="180"
                      rx="12"
                      fill="#e2e8f0"
                    />
                    <rect
                      x="400"
                      y="60"
                      width="160"
                      height="180"
                      rx="12"
                      fill="#e2e8f0"
                    />
                  </g>
                  <g fill="#334155" fontSize="14">
                    <text x="88" y="270">
                      추천 1
                    </text>
                    <text x="268" y="270">
                      추천 2
                    </text>
                    <text x="448" y="270">
                      추천 3
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            {/* 우측: 텍스트/버튼 */}
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">
                원하는 외형을 말하면 보호소 데이터에서 찾아 연결합니다
              </h3>
              <p className="text-slate-600 mb-6">
                “작은 체구, 갈색 털, 사람을 좋아함”처럼 문장으로 작성하면, 유사
                성향/외형을 가진 보호 동물을 찾아 추천합니다.
              </p>

              <ul className="list-disc pl-5 text-slate-700 leading-7 mb-8">
                <li>자연어 프롬프트 → 특성 벡터화 → 유사 개체 검색</li>
                <li>보호소 공고의 최신성·거리·환경 적합성 가중치 반영</li>
                <li>입양 절차 안내 및 보호소 연락 연결까지 원스톱</li>
              </ul>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={navigate("/adopt")}
                  className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600 transition"
                >
                  입양 추천 페이지로
                </button>
                <button
                  onClick={navigate("/shelters")}
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
    </main>
  );
};

export default IntroPage;
