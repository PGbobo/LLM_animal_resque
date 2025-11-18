import React, { useState, useEffect } from "react";
import { getStrayDogs } from "../services/api";
import {
  CalendarDaysIcon,
  MapPinIcon,
  InformationCircleIcon,
  TagIcon,
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";

// 날짜 형식을 'YYYY-MM-DD'로 변경하는 헬퍼 함수
const formatDate = (dateString) => {
  if (!dateString) return "날짜 정보 없음";
  try {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0]; // 'YYYY-MM-DD' 형식
  } catch (e) {
    return dateString; // 변환 실패 시 원본 반환
  }
};

const S3_BASE_URL = "https://kr.object.ncloudstorage.com/animal-bucket";

const StrayDogPage = () => {
  const [strayAnimals, setStrayAnimals] = useState([]); // DB 데이터 (전체)
  const [loading, setLoading] = useState(true); // 로딩 상태

  const [currentPage, setCurrentPage] = useState(1); // 현재 페이지
  const itemsPerPage = 12; // 페이지당 12개
  const pagesPerGroup = 10; // 한 번에 보여줄 페이지 번호 개수

  useEffect(() => {
    const fetchStrayDogs = async () => {
      try {
        const response = await getStrayDogs();
        // DB 데이터 매핑
        const mappedList = response.data.data.map((dbDog) => {
          let status = "정보 없음";
          let weight = "정보 없음";
          let features = dbDog.FEATURE || "";

          // '상태' 파싱 로직 (기존 유지)
          if (features) {
            const parts = features.split("/").map((s) => s.trim());
            if (parts.length > 0) status = parts[0];
            if (parts.length > 1) weight = parts[1];
          }

          // ◀◀ [신규 2] S3_BASE_URL과 경로(dbDog.PHOTO1)를 조합
          const imageUrl = dbDog.PHOTO1
            ? `${S3_BASE_URL}/${dbDog.PHOTO1}` // (예: "https://.../animal-bucket/crawled_data/...")
            : null; // 👈 사진이 없으면 null

          return {
            id: dbDog.BOARD_IDX,
            name: dbDog.NAME || "정보 없음",
            image: imageUrl, // 👈 [수정됨] 조합된 전체 URL을 사용
            breed: dbDog.BREED,
            gender: dbDog.GENDER,
            age: dbDog.AGE,
            foundDate: formatDate(dbDog.RESCUE_DATE),
            foundLocation: dbDog.RESCUE_LOCATION,
            featureText: features,
            status: status,
            weight: weight,
            color: dbDog.COLOR || "정보 없음",
            shelterName: dbDog.SHELTER_NAME || "정보 없음",
            crawlUrl: dbDog.CRAWL_URL,
          };
        });

        setStrayAnimals(mappedList);
      } catch (error) {
        console.error("유기동물 데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStrayDogs();
  }, []);

  // --- 페이지네이션 로직 ---
  const totalPages = Math.ceil(strayAnimals.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = strayAnimals.slice(indexOfFirstItem, indexOfLastItem);
  const currentGroup = Math.ceil(currentPage / pagesPerGroup);
  const startPage = (currentGroup - 1) * pagesPerGroup + 1;
  const endPage = Math.min(startPage + pagesPerGroup - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );
  const paginate = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // ------------------------------

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section
        id="stray-animal-list"
        className="container mx-auto px-4 sm:px-6 lg:px-8"
      >
        <h1 className="text-3xl font-extrabold text-sky-500 mb-8 text-center">
          유기동물 공고 조회
        </h1>

        <div
          id="stray-posts-container"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {loading ? (
            <div className="col-span-full text-center py-10">
              <p className="text-lg text-slate-500">
                데이터를 불러오는 중입니다...
              </p>
            </div>
          ) : strayAnimals.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-lg text-slate-500">
                조회된 유기동물 정보가 없습니다.
              </p>
            </div>
          ) : (
            currentAnimals.map((animal, index) => (
              <div
                key={animal.id || indexOfFirstItem + index}
                className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col"
              >
                {/* 이미지 */}
                <div className="h-52 overflow-hidden">
                  <img
                    src={animal.image}
                    alt={`${animal.name} 이미지`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/400x300/e2e8f0/94a3b8?text=Image+Not+Found";
                    }}
                  />
                </div>

                {/* 컨텐츠 */}
                <div className="p-4 flex-grow flex flex-col">
                  {/* [수정] 상단: 이름 (span 태그 삭제) */}
                  <div className="mb-3">
                    <h2
                      className="text-lg font-extrabold text-slate-800 truncate"
                      title={animal.name}
                    >
                      {animal.name}
                    </h2>
                    {/* "상태:공고중..." 등을 표시하던 span 태그 삭제됨 */}
                  </div>

                  {/* 중간: 상세 정보 (품종, 나이, 성별 순서) */}
                  <div className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1 text-sm mb-4">
                    <span className="text-slate-400 font-medium">품종:</span>
                    <span
                      className="text-slate-800 font-semibold truncate"
                      title={animal.breed}
                    >
                      {animal.breed}
                    </span>
                    <span className="text-slate-400 font-medium">나이:</span>
                    <span className="text-slate-800 font-semibold">
                      {animal.age}
                    </span>
                    <span className="text-slate-400 font-medium">성별:</span>
                    <span className="text-slate-800 font-semibold">
                      {animal.gender}
                    </span>
                  </div>

                  {/* 하단: 구조 정보 */}
                  <div className="space-y-2 text-sm text-slate-600 mt-auto">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="w-4 h-4 mr-2 text-pink-400 flex-shrink-0" />
                      <span className="font-medium text-slate-700">
                        {animal.foundDate}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <MapPinIcon className="w-4 h-4 mr-2 text-pink-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">
                        {animal.foundLocation}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <InformationCircleIcon className="w-4 h-4 mr-2 text-blue-400 flex-shrink-0 mt-0.5" />
                      {/* 상세 특징(featureText)은 예정대로 하단에 표시 */}
                      <span className="text-slate-700 text-xs italic">
                        {animal.featureText}
                      </span>
                    </div>
                  </div>

                  {/* 최하단: 보호소 및 버튼 */}
                  <div className="pt-3 mt-4 border-t border-gray-100">
                    <div className="flex items-center mb-2">
                      <TagIcon className="w-4 h-4 mr-2 text-sky-400 flex-shrink-0" />
                      <p
                        className="text-xs font-semibold text-sky-500 truncate"
                        title={animal.shelterName}
                      >
                        광주동물보호소
                      </p>
                    </div>

                    <a
                      href={`https://www.kcanimal.or.kr/board_gallery01/board_content.asp?board_idx=${animal.id}&tname=board_gallery01`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2 text-sm font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500 transition-colors shadow-md text-center"
                    >
                      상세정보 보기
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- 페이지네이션 UI --- */}
        {!loading && totalPages > 1 && (
          <nav
            className="flex justify-center items-center space-x-1 mt-10"
            aria-label="Pagination"
          >
            {/* << (이전 10개) 버튼 */}
            <button
              onClick={() => paginate(startPage - 1)}
              disabled={currentGroup === 1}
              className="p-2 text-gray-500 hover:text-sky-500 disabled:text-gray-300 disabled:cursor-not-allowed"
              title="이전 10페이지"
            >
              <span className="sr-only">이전 10페이지</span>
              <ChevronDoubleLeftIcon className="w-5 h-5" />
            </button>
            {/* < (이전 1개) 버튼 */}
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-sky-500 disabled:text-gray-300 disabled:cursor-not-allowed"
              title="이전 페이지"
            >
              <span className="sr-only">이전 페이지</span>
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            {/* 페이지 번호 버튼 (10개씩) */}
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`w-9 h-9 text-sm font-medium rounded-md shadow-sm ${
                  currentPage === number
                    ? "bg-sky-500 text-white border-sky-500" // 현재 페이지
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" // 다른 페이지
                }`}
                aria-current={currentPage === number ? "page" : undefined}
              >
                {number}
              </button>
            ))}

            {/* > (다음 1개) 버튼 */}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-sky-500 disabled:text-gray-300 disabled:cursor-not-allowed"
              title="다음 페이지"
            >
              <span className="sr-only">다음 페이지</span>
              <ChevronRightIcon className="w-5 h-5" />
            </button>
            {/* >> (다음 10개) 버튼 */}
            <button
              onClick={() => paginate(endPage + 1)}
              disabled={endPage === totalPages}
              className="p-2 text-gray-500 hover:text-sky-500 disabled:text-gray-300 disabled:cursor-not-allowed"
              title="다음 10페이지"
            >
              <span className="sr-only">다음 10페이지</span>
              <ChevronDoubleRightIcon className="w-5 h-5" />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
};

export default StrayDogPage;
