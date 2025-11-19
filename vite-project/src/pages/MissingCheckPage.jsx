// src/pages/MissingCheckPage.jsx
// ------------------------------------------------------
// 실종 동물 지도 조회 페이지
// - /missing-posts API에서 실종 동물 목록 조회
// - KakaoMap 에 마커(사진 포함) 표시
// - 마커 / 리스트 클릭 시 우측 패널에 상세 정보 표시
// - X 버튼으로 선택 해제 시 다시 리스트 표시
// ------------------------------------------------------
import React, { useEffect, useMemo, useState } from "react";
import KakaoMap from "../components/KakaoMap.jsx";
import PetListItem from "../components/common/PetListItem.jsx";

const API_BASE =
  import.meta.env?.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:4000";

// "몇 분 전", "몇 시간 전" 형식으로 표시
// → 여기서는 주로 CREATED_AT(등록일 기준)으로 사용할 예정
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

// "YYYY.MM.DD" 형식으로 변환
function fmtDate(input) {
  if (!input) return "";
  const t = new Date(input);
  if (Number.isNaN(t.getTime())) return "";
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

const MissingCheckPage = () => {
  // 선택된 실종 동물(마커/리스트에서 선택)
  const [selectedPet, setSelectedPet] = useState(null);
  // 전체 실종 동물 리스트
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 실종 동물 데이터 불러오기
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/missing-posts`);
        if (!res.ok) throw new Error(`/missing-posts 요청 실패: ${res.status}`);
        const j = await res.json();
        const rows = j?.data || [];

        const mapped = rows.map((r) => {
          const type = r.type || "missing";
          const name = r.petName || "이름 미상";
          const description =
            r.description || r.content || r.feature || r.character || "";

          // ✅ 1) 실종 날짜(LOST_DATE) / 등록 날짜(CREATED_AT) 각각 분리해서 읽기
          //    - 백엔드에서 어떤 케이스/형식으로 내려와도 대응하도록 여러 키를 체크한다.
          const lostDateRaw =
            r.LOST_DATE ??
            r.lost_date ??
            r.lostDate ??
            r.date ?? // 예전에 LOST_DATE AS date 로 내려줬다면 여기로 들어감
            null;

          const createdAtRaw =
            r.CREATED_AT ?? r.created_at ?? r.createdAt ?? r.created ?? null;

          // ✅ 2) 목록에서 사용할 상대 시간(예: "3시간 전")은
          //       "등록 날짜(CREATED_AT)" 기준으로 표시하고,
          //       없으면 실종 날짜 기준으로 대체한다.
          const time = timeAgo(createdAtRaw || lostDateRaw);

          // ✅ 3) 상세에서 보여줄 날짜 문자열
          //   - 실종 일시: lostDate
          //   - 상단 오른쪽(작성/등록일): createdAtDate
          const lostDate = fmtDate(lostDateRaw);
          const createdAtDate = fmtDate(createdAtRaw || lostDateRaw);

          return {
            id: r.id, // MISSING_NUM AS id
            title: name || "실종 동물", // 카드 상단 제목
            name, // PetListItem에서 사용할 이름
            status: r.status || "실종",
            location: r.location || "",
            time, // 목록에서 사용할 상대 시간 (등록일 기준)
            img: r.img || r.img_path || "/images/placeholders/missing.png", // PET_IMAGE_URL AS img
            latlng:
              r.lat != null && r.lon != null
                ? [Number(r.lat), Number(r.lon)]
                : null,
            date: lostDate, // 🔹 실종 일시 (LOST_DATE)
            createdAtDate, // 🔹 등록/제보 날짜 (CREATED_AT)
            description,
            type,
            raw: r,
          };
        });

        // 최신순 정렬
        // - 우선 CREATED_AT 기준 정렬
        // - 없으면 LOST_DATE 기준으로 정렬
        mapped.sort(
          (a, b) =>
            new Date(b.raw?.CREATED_AT || b.raw?.LOST_DATE || 0) -
            new Date(a.raw?.CREATED_AT || a.raw?.LOST_DATE || 0)
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

  // 이 페이지는 실종 전용이니까 전체를 그대로 사용
  const missingPosts = useMemo(() => pets, [pets]);

  // 리스트에서 클릭 시 선택
  const handleListItemClick = (pet) => setSelectedPet(pet);

  // 지도 마커 클릭 시 선택 (KakaoMap에서 호출)
  const handleMarkerSelect = (pet) => setSelectedPet(pet);

  // X 버튼 → 선택 해제 (상세 → 리스트로 복귀)
  const handleClearSelection = () => setSelectedPet(null);

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section id="map-view" className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          지도에서 실종 동물들의 위치를 확인하세요
        </h1>

        {loading && (
          <div className="mb-4 text-slate-700">데이터 불러오는 중...</div>
        )}
        {!!error && <div className="mb-4 text-red-600">오류: {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 지도 영역 */}
          <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-lg border border-slate-200">
            <div className="w-full h-[600px] rounded-lg">
              <KakaoMap
                pets={missingPosts}
                selectedPet={selectedPet}
                onMarkerSelect={handleMarkerSelect}
                markerVariant="red" // 🔴 실종 페이지는 빨간 마커
              />
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm font-medium">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2 bg-red-500"></span>
                <span className="text-slate-700">
                  실종 동물 ({missingPosts.length})
                </span>
              </div>
            </div>
          </div>

          {/* 우측 패널 : 기본은 리스트, 선택 시 상세정보 */}
          <div className="lg:col-span-1 space-y-6">
            <div
              id="missing-list-card"
              className="bg-white p-4 rounded-xl shadow-lg border border-slate-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-slate-800">
                  {selectedPet ? "상세 정보" : "실종 동물"}
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

              {/* 선택된 동물이 있을 때: 상세 정보 */}
              {selectedPet ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  <div className="w-full rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={selectedPet.img}
                      alt={selectedPet.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-semibold">
                        {selectedPet.status || "실종"}
                      </span>
                      {/* ✅ 상단 오른쪽: 등록/제보 날짜 (CREATED_AT) */}
                      {selectedPet.createdAtDate && (
                        <span className="text-xs text-slate-500">
                          {selectedPet.createdAtDate}
                        </span>
                      )}
                    </div>

                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {selectedPet.title}
                    </p>

                    {selectedPet.location && (
                      <p className="text-sm text-slate-700 mt-1">
                        <span className="font-medium">실종 위치: </span>
                        {selectedPet.location}
                      </p>
                    )}

                    {/* ✅ 실종 일시: LOST_DATE */}
                    {selectedPet.date && (
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">실종 일시: </span>
                        {selectedPet.date}
                      </p>
                    )}

                    {selectedPet.description && (
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">
                        {selectedPet.description}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // 선택된 동물이 없을 때: 기존 실종 동물 리스트
                <div
                  id="missing-posts-container"
                  className="space-y-2 max-h-[600px] overflow-y-auto"
                >
                  {missingPosts.map((pet) => (
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
                  {!loading && missingPosts.length === 0 && (
                    <p className="text-sm text-slate-500">
                      등록된 실종 동물이 없습니다.
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

export default MissingCheckPage;
