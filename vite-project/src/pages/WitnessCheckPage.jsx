// src/pages/WitnessCheckPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import KakaoMap from "../components/KakaoMap.jsx";
import PetListItem from "../components/common/PetListItem.jsx";

// 🐶🐱 기본 이미지
import defaultDogImg from "../assets/images/default_dog.png";
import defaultCatImg from "../assets/images/default_cat.png";
import defaultOtherImg from "../assets/images/default_other.png";

// 백엔드 API 기본 주소
const API_BASE =
  import.meta.env?.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:4000";

// "몇 분 전" 형식
function timeAgo(input) {
  if (!input) return "";
  const t = new Date(input);
  if (Number.isNaN(t.getTime())) return "";
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

// "YYYY.MM.DD" 형식
function fmtDate(input) {
  if (!input) return "";
  const t = new Date(input);
  if (Number.isNaN(t.getTime())) return "";
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

// DOG_CAT → 한글 라벨
function dogCatToLabel(code) {
  if (!code) return "";
  const c = code.toUpperCase();
  if (c === "DOG") return "개";
  if (c === "CAT") return "고양이";
  return "기타 동물";
}

const WitnessCheckPage = () => {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE}/witness-posts`);
        if (!res.ok) throw new Error(`/witness-posts 요청 실패: ${res.status}`);

        const j = await res.json();
        const rows = j?.data || [];

        const mapped = rows.map((r) => {
          const title = r.title || "목격 제보";
          const description = r.content || r.description || "";

          // 1) DOG_CAT 값 읽기
          const rawDogCat = r.dogCat ?? null;

          const dogCat =
            typeof rawDogCat === "string"
              ? rawDogCat.trim().toUpperCase()
              : null;

          // 2) REPORT_DATE(목격 날짜) / CREATED_AT(제보 날짜) 각각 분리해서 읽기
          //    - 백엔드에서 스네이크/카멜/대문자 등 어떤 식으로 내려와도 커버하도록 모두 체크
          const reportDateRaw =
            r.REPORT_DATE ??
            r.report_date ??
            r.reportDate ??
            r.reported_at ??
            null; // ← 목격한 날짜

          const createdAtRaw =
            r.CREATED_AT ??
            r.created_at ??
            r.createdAt ??
            r.created_date ??
            r.created ??
            null; // ← 제보를 등록한 날짜

          // 3) 목록에서 사용할 상대 시간(예: "3시간 전")은 보통 제보 날짜 기준으로 표시
          const time = timeAgo(createdAtRaw || reportDateRaw || r.date || null);

          // 4) 화면에 찍을 형식의 날짜 문자열로 변환
          const reportDate = fmtDate(reportDateRaw || r.date || null); // 목격 일시
          const createdAtDate = fmtDate(createdAtRaw || r.date || null); // 제보 날짜

          // 5) 이미지 경로 설정(없으면 기본 이미지)
          let imgSrc = r.img || r.img_path || null;
          if (!imgSrc || (typeof imgSrc === "string" && imgSrc.trim() === "")) {
            if (dogCat === "DOG") {
              imgSrc = defaultDogImg;
            } else if (dogCat === "CAT") {
              imgSrc = defaultCatImg;
            } else {
              imgSrc = defaultOtherImg;
            }
          }

          return {
            id: r.id,
            type: r.type || "witness",
            title,
            name: title,
            status: "제보",
            location: r.location || "",
            time, // 목록에서 사용할 상대 시간(제보 기준)
            img: imgSrc,
            latlng:
              r.lat != null && r.lon != null
                ? [Number(r.lat), Number(r.lon)]
                : null,
            // 아래 두 개가 핵심!
            date: reportDate, // "목격 일시"에 사용할 날짜 (REPORT_DATE)
            createdAtDate, // 상세 상단 우측에 표시할 "제보 날짜" (CREATED_AT)
            description,
            raw: r,
            dogCat,
          };
        });

        // 최신 제보 순으로 정렬(제보날짜 또는 목격날짜 기준)
        mapped.sort(
          (a, b) =>
            new Date(b.raw?.CREATED_AT || b.raw?.REPORT_DATE || 0) -
            new Date(a.raw?.CREATED_AT || a.raw?.REPORT_DATE || 0)
        );

        if (!cancelled) setPets(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e.message || "데이터 로드 중 오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const witnessPosts = useMemo(() => pets, [pets]);

  const handleListItemClick = (pet) => setSelectedPet(pet);
  const handleMarkerSelect = (pet) => setSelectedPet(pet);
  const handleClearSelection = () => setSelectedPet(null);

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          지도에서 목격 제보 동물들의 위치를 확인하세요
        </h1>

        {loading && (
          <div className="mb-4 text-slate-700">데이터 불러오는 중...</div>
        )}
        {error && <div className="mb-4 text-red-600">오류: {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 지도 영역 */}
          <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-lg border border-slate-200">
            <div className="w-full h-[600px] rounded-lg">
              <KakaoMap
                pets={witnessPosts}
                selectedPet={selectedPet}
                onMarkerSelect={handleMarkerSelect}
                markerVariant="blue"
              />
            </div>

            <div className="flex items-center justify-center space-x-6 mt-4 text-sm font-medium">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2 bg-blue-500"></span>
                <span className="text-slate-700">
                  목격 정보 ({witnessPosts.length})
                </span>
              </div>
            </div>
          </div>

          {/* 우측 패널 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-slate-800">
                  {selectedPet ? "상세 정보" : "목격 정보"}
                </h2>

                {selectedPet && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    aria-label="선택 해제"
                    className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* 선택된 마커가 있을 경우 → 상세정보 */}
              {selectedPet ? (
                // ✅ 상세 정보 카드 영역
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {/* 이미지 영역 - 이미지 폭에 맞춰 박스가 줄어들도록 수정 */}
                  <div className="w-full flex justify-center">
                    {/* 안쪽 박스: 이미지 크기에 맞게 줄어드는 컨테이너 */}
                    <div className="inline-block rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img
                        src={selectedPet.img}
                        alt={selectedPet.title}
                        className="
                          block           /* 인라인 요소 기본 여백 제거 */
h-[240px]   /* 너무 큰 이미지는 최대 높이 제한 */
                          w-auto          /* 가로도 이미지 비율 그대로 */
                          max-w-full      /* 카드 너비를 넘지 않도록 제한 */
                          object-contain  /* 이미지 전체가 보이게 */
                        "
                      />
                    </div>
                  </div>

                  {/* 텍스트 영역 */}
                  <div className="space-y-3 text-sm">
                    {/* 상단 메타 정보 줄 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-sky-100 text-sky-700 font-semibold">
                          목격 제보
                        </span>
                        {selectedPet.dogCat && (
                          <span className="text-xs text-slate-500">
                            동물 구분: {dogCatToLabel(selectedPet.dogCat)}(
                            {selectedPet.dogCat})
                          </span>
                        )}
                      </div>
                      {/* 상단 오른쪽: 제보 날짜 (CREATED_AT 기준) */}
                      {selectedPet.createdAtDate && (
                        <span className="text-xs text-slate-400">
                          {selectedPet.createdAtDate}
                        </span>
                      )}
                    </div>

                    {/* 제목 */}
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedPet.title}
                    </p>

                    {/* 구분선 */}
                    <div className="h-px bg-slate-200 my-1" />

                    {/* 세부 정보 블록 */}
                    <div className="space-y-1 leading-relaxed">
                      {selectedPet.location && (
                        <p className="text-slate-700">
                          <span className="font-medium">목격 위치: </span>
                          {selectedPet.location}
                        </p>
                      )}

                      {selectedPet.date && (
                        <p className="text-slate-700">
                          <span className="font-medium">목격 일시: </span>
                          {selectedPet.date}
                        </p>
                      )}

                      {selectedPet.time && (
                        <p className="text-slate-500 text-xs">
                          (제보 등록: {selectedPet.time})
                        </p>
                      )}
                    </div>

                    {/* 설명 영역 */}
                    {selectedPet.description && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 mb-1">
                          설명
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">
                          {selectedPet.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 선택된 마커가 없을 때 → 기존 목록
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {witnessPosts.map((pet) => (
                    <div
                      key={`${pet.type}-${pet.id}`}
                      onClick={() => handleListItemClick(pet)}
                    >
                      <PetListItem
                        pet={pet}
                        isSelected={
                          selectedPet &&
                          selectedPet.id === pet.id &&
                          selectedPet.type === pet.type
                        }
                      />
                    </div>
                  ))}
                  {!loading && witnessPosts.length === 0 && (
                    <p className="text-sm text-slate-500">
                      등록된 목격 제보가 없습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default WitnessCheckPage;
