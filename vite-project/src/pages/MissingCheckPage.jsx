// src/pages/MissingCheckPage.jsx
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

const MissingCheckPage = () => {
  const [selectedPet, setSelectedPet] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

          return {
            id: r.id, // MISSING_NUM AS id
            title: name || "실종 동물", // 카드 상단에 보여줄 제목
            name, // PetListItem에서 사용할 이름
            status: r.status || "실종",
            location: r.location || "",
            time: timeAgo(r.date), // LOST_DATE AS date
            img: r.img || "/images/placeholders/missing.png", // PET_IMAGE_URL AS img
            latlng:
              r.lat != null && r.lon != null
                ? [Number(r.lat), Number(r.lon)]
                : null,
            date: fmtDate(r.date),
            type,
            raw: r,
          };
        });

        // 최신순 정렬
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

  // 이 페이지는 실종 전용이니까 그냥 전체 사용
  const missingPosts = useMemo(() => pets, [pets]);

  const handleListItemClick = (pet) => setSelectedPet(pet);

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
              <KakaoMap pets={missingPosts} selectedPet={selectedPet} />
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

          {/* 리스트 영역 */}
          <div className="lg:col-span-1 space-y-6">
            <div
              id="missing-list-card"
              className="bg-white p-4 rounded-xl shadow-lg border border-slate-200"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-3">
                실종 동물
              </h2>
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
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default MissingCheckPage;
