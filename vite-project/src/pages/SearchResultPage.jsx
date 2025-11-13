// src/pages/SearchResultPage.jsx (이미지 표시, % 필터링 적용)

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

// -----------------------------------------------------------------
// ❗️ [수정 지점 1] S3 버킷 정보 (NCS 기준)
// ❗️ llm_animal.py의 bucket_name과 일치해야 합니다.
const S3_BUCKET_BASE_URL = "https://kr.object.ncloudstorage.com/animal-bucket";

// ❗️ [수정 지점 2] 최소 유사도 점수 (여기 숫자만 수정하세요)
// ❗️ 0.7 = 70% 이상인 결과만 표시합니다. (예: 0.6 = 60%)
const MINIMUM_SIMILARITY_THRESHOLD = 0.7; // 70%
// -----------------------------------------------------------------

export default function SearchResultPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. ReportPage에서 navigate로 보낸 'state'에서 "원본" 결과 추출
  const originalResults = location.state?.results;

  // 2. ◀◀ [신규] 최소 점수 기준으로 결과 "필터링"
  const filteredResults = React.useMemo(() => {
    if (!originalResults) return []; // 원본 결과가 없으면 빈 배열

    // 점수(score)가 MINIMUM_SIMILARITY_THRESHOLD 이상인 항목만 필터링
    return originalResults.filter(
      (item) => item.score >= MINIMUM_SIMILARITY_THRESHOLD
    );
  }, [originalResults]); // originalResults가 바뀔 때만 재계산

  // 3. (수정) "필터링된" 결과가 0개이거나, 비정상 접근한 경우
  if (!originalResults || filteredResults.length === 0) {
    return (
      <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
        <section className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
            <h1 className="text-3xl font-extrabold text-red-500 mb-4">
              검색 결과 없음
            </h1>
            <p className="text-slate-600 mb-6">
              {/* (수정) ◀◀ 필터링을 고려한 안내 메시지 */}
              유사도 분석 결과가 없거나, 설정된 최소 유사도(
              {(MINIMUM_SIMILARITY_THRESHOLD * 100).toFixed(0)}
              %) 기준을 만족하는 항목이 없습니다.
            </p>
            <button
              type="button"
              onClick={() => navigate("/report")} // '제보(검색)' 페이지로 돌아가기
              className="px-8 py-3 text-lg font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500"
            >
              다시 검색하기
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 4. (성공) "필터링된" 결과가 있을 경우, 리스트로 출력
  return (
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      <section className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-6">
            AI 유사도 분석 결과
          </h1>
          <p className="text-slate-600 mb-6 -mt-4">
            (유사도 {(MINIMUM_SIMILARITY_THRESHOLD * 100).toFixed(0)}% 이상인
            결과만 표시됩니다)
          </p>

          <div className="space-y-4">
            {/* 5. (수정) 'filteredResults' 배열을 map()으로 순회 */}
            {filteredResults.map((item, index) => {
              // ◀◀ [신규] S3 키(filename)로 전체 이미지 URL 생성
              // (S3_BUCKET_BASE_URL의 마지막에 /가 없고, item.filename의 시작에 /가 없다고 가정)
              const imageUrl = `${S3_BUCKET_BASE_URL}/${item.filename}`;

              return (
                <div
                  key={index}
                  // (수정) ◀◀ 이미지와 내용을 가로로 정렬하기 위해 'gap-4' 추가
                  className="flex items-center p-4 border border-slate-200 rounded-lg shadow-sm gap-4"
                >
                  {/* ◀◀ [신규] 파일명 대신 '이미지' 표시 */}
                  <img
                    src={imageUrl}
                    alt={item.filename} // 이미지가 깨졌을 때 파일명 표시
                    className="w-24 h-24 object-cover rounded-md border border-slate-200 flex-shrink-0"
                    // (중요) S3 버킷 권한 문제로 이미지가 깨질(X) 수 있습니다.
                  />

                  {/* (수정) ◀◀ 순위와 정보 (div로 감싸기) */}
                  <div className="flex items-center flex-grow">
                    <span className="text-2xl font-bold text-sky-400 w-12">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-lg">
                        {/* 점수를 0~100%로 변환 */}
                        유사도: {(item.score * 100).toFixed(2)}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1 break-all">
                        {/* 파일명은 참고용으로 작게 표시 */}
                        (파일명: {item.filename})
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate("/report")} // '제보(검색)' 페이지로 돌아가기
            className="mt-8 px-8 py-3 text-lg font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500"
          >
            다른 사진으로 검색
          </button>
        </div>
      </section>
    </main>
  );
}
