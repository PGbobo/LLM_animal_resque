// src/pages/SearchResultPage.jsx
// (제보 시: 유사도 30% 이상, 퍼센트 숨김, 이름 표시)

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { MapPinIcon } from "@heroicons/react/24/outline";

// -----------------------------------------------------------------
// ❗️ [설정] S3 버킷 정보
const S3_BUCKET_BASE_URL = "https://kr.object.ncloudstorage.com/animal-bucket";
// -----------------------------------------------------------------

export default function SearchResultPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. 이전 페이지에서 보낸 state 받기
  const {
    results: originalResults,
    returnTo = "/",
    source = "default",
  } = location.state || {};

  // 2. ◀◀ [수정] 'source'에 따라 임계값(Threshold) 동적 설정
  // 제보('report')와 입양('adopt')인 경우 30%(0.3), 나머지는 70%(0.7)
  const similarityThreshold =
    source === "report" || source === "adopt" ? 0.3 : 0.7;

  // 3. ◀◀ [수정] 페이지 제목과 설명 설정
  let pageTitle = "AI 유사도 분석 결과";
  let pageDescription = "분석 결과 중 유사도가 높은 항목입니다.";

  if (source === "register") {
    pageTitle = "🔎 실종 동물 유사도 분석 결과";
    pageDescription =
      "등록하신 실종 동물과 유사한 보호소 동물이 발견되었습니다.";
  } else if (source === "report") {
    pageTitle = "📢 제보 동물 유사도 분석 결과";
    // 문구 변경
    pageDescription = "제보하신 동물과 생김새가 비슷한 실종 동물을 찾았습니다.";
  } else if (source === "adopt") {
    pageTitle = "🐶 AI 입양 추천 결과";
    pageDescription =
      "회원님의 취향과 가장 유사한 보호소 동물을 추천해 드립니다.";
  }

  // 4. 동적 임계값으로 필터링
  const filteredResults = React.useMemo(() => {
    if (!Array.isArray(originalResults)) return [];
    return originalResults.filter(
      (item) => item && item.score >= similarityThreshold
    );
  }, [originalResults, similarityThreshold]);

  // 5. (헬퍼 함수) 파일명에서 '이름' 추출하기
  // 예: "abandon/missing/5_개새_1762936443522.jpeg" -> "개새"
  const extractNameFromFilename = (filename) => {
    try {
      // 1. 경로가 있다면 파일명만 분리
      const fileOnly = filename.split("/").pop(); // "5_개새_1762936443522.jpeg"
      // 2. 언더바(_)로 분리
      const parts = fileOnly.split("_");
      // 3. 형식이 맞다면 두 번째 요소(인덱스 1)가 이름
      if (parts.length >= 3) {
        return parts[1]; // "개새"
      }
      return "이름 미상";
    } catch (e) {
      return "이름 미상";
    }
  };

  // 6. 결과 없음 처리
  if (!originalResults || filteredResults.length === 0) {
    return (
      <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
        <section className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
            <h1 className="text-3xl font-extrabold text-red-500 mb-4">
              검색 결과 없음
            </h1>
            <p className="text-slate-600 mb-6">
              {source === "adopt"
                ? "조건에 맞는 입양 추천 동물을 찾지 못했습니다."
                : `유사도 ${(similarityThreshold * 100).toFixed(
                    0
                  )}% 이상인 매칭 결과가 없습니다.`}
            </p>
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="px-8 py-3 text-lg font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500"
            >
              이전 페이지로
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 7. 결과 리스트 출력
  return (
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      <section className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-2">
            {pageTitle}
          </h1>
          <p className="text-slate-600 mb-6">{pageDescription}</p>

          {/* 제보가 아닐 때만 기준 문구 표시 */}
          {source !== "report" && (
            <p className="text-sm text-slate-500 mb-6 text-right">
              * 유사도 {(similarityThreshold * 100).toFixed(0)}% 이상만 표시
            </p>
          )}

          <div className="space-y-4">
            {filteredResults.map((item, index) => {
              // (안전장치) item이나 filename이 없으면 렌더링 건너뛰기
              if (!item || !item.filename) return null;

              const imageUrl = `${S3_BUCKET_BASE_URL}/${item.filename}`;
              let detailLink = null;

              // (입양 링크 로직 유지)
              if (
                source === "adopt" &&
                item.filename.includes("crawled_data")
              ) {
                try {
                  const parts = item.filename.split("/");
                  if (parts.length >= 2) {
                    const boardIdx = parts[1];
                    detailLink = `https://www.kcanimal.or.kr/board_gallery01/board_content.asp?board_idx=${boardIdx}&tname=board_gallery01`;
                  }
                } catch (e) {
                  console.warn("링크 생성 실패:", item.filename);
                }
              }

              // ◀◀ [신규] 제보('report')일 때 표시할 이름 추출
              const extractedName =
                source === "report"
                  ? extractNameFromFilename(item.filename)
                  : null;

              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-center p-4 border border-slate-200 rounded-lg shadow-sm gap-4 bg-white hover:shadow-md transition-shadow"
                >
                  {/* 이미지 */}
                  <img
                    src={imageUrl}
                    alt="검색 결과"
                    className="w-24 h-24 object-cover rounded-md border border-slate-200 flex-shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/100x100?text=No+Image";
                    }}
                  />

                  {/* 텍스트 정보 */}
                  <div className="flex items-center flex-grow w-full sm:w-auto">
                    {/* 순위 (제보는 순위가 덜 중요할 수 있지만, 일단 유지) */}
                    <span className="text-2xl font-bold text-sky-400 w-12 text-center sm:text-left">
                      {index + 1}
                    </span>

                    <div className="flex-1">
                      {/* ◀◀ [분기 처리] 제보 vs 나머지 */}
                      {source === "report" ? (
                        // [Case A] 제보: 이름과 위치 표시 (DB 데이터 사용)
                        <>
                          <p className="font-bold text-slate-800 text-lg">
                            이름:{" "}
                            <span className="text-red-500">
                              {item.petName || "이름 미상"}
                            </span>
                          </p>
                          <p className="text-sm text-slate-600 mt-1 flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-1 text-gray-400" />
                            실종 위치: {item.location || "위치 정보 없음"}
                          </p>
                        </>
                      ) : (
                        // [Case B] 나머지: 유사도 표시
                        <>
                          <p className="font-bold text-slate-800 text-lg">
                            유사도: {(item.score * 100).toFixed(2)}%
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            광주광역시 동물보호센터
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 입양 상세 버튼 (유지) */}
                  {detailLink && (
                    <a
                      href={detailLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 sm:mt-0 px-4 py-2 text-sm font-bold text-white bg-sky-400 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap"
                    >
                      보호소 공고 보기
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="mt-8 w-full sm:w-auto px-8 py-3 text-lg font-bold text-white bg-gray-400 rounded-lg hover:bg-gray-500"
          >
            이전으로 돌아가기
          </button>
        </div>
      </section>
    </main>
  );
}
