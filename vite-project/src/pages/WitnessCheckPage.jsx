// src/pages/WitnessCheckPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import KakaoMap from "../components/KakaoMap.jsx";
import PetListItem from "../components/common/PetListItem.jsx";

const API_BASE =
  import.meta.env?.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:4000";

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
  const hh = String(t.getHours()).padStart(2, "0");
  const mi = String(t.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

function fmtDate(input) {
  if (!input) return "";
  const t = new Date(input);
  if (Number.isNaN(t.getTime())) return "";
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  const hh = String(t.getHours()).padStart(2, "0");
  const mi = String(t.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
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
          return {
            id: r.id, // REPORT_NUM AS id
            type: r.type || "witness",
            title,
            name: title,
            status: "제보",
            location: r.location || "",
            time: timeAgo(r.date),
            img: r.img || r.img_path || "/images/placeholders/report.png",
            latlng:
              r.lat != null && r.lon != null
                ? [Number(r.lat), Number(r.lon)]
                : null,
            date: fmtDate(r.date),
            description,
            raw: r,
          };
        });

        mapped.sort(
          (a, b) => new Date(b.raw?.date || 0) - new Date(a.raw?.date || 0)
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
                      <span className="px-2 py-0.5 text-xs rounded-full bg-sky-100 text-sky-700 font-semibold">
                        목격 제보
                      </span>
                      {selectedPet.time && (
                        <span className="text-xs text-slate-500">
                          {selectedPet.time}
                        </span>
                      )}
                    </div>

                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {selectedPet.title}
                    </p>

                    {selectedPet.location && (
                      <p className="text-sm text-slate-700 mt-1">
                        <span className="font-medium">목격 위치: </span>
                        {selectedPet.location}
                      </p>
                    )}

                    {selectedPet.date && (
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">목격 일시: </span>
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
