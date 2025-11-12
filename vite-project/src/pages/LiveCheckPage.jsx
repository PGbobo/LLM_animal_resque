// src/pages/LiveCheckPage.jsx
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

const LiveCheckPage = () => {
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
        const res = await fetch(`${API_BASE}/live-posts`);
        if (!res.ok) throw new Error(`/live-posts 요청 실패: ${res.status}`);
        const j = await res.json();
        const rows = j?.data || [];

        const mapped = rows.map((r) => ({
          id: r.id,
          title: r.title || (r.type === "missing" ? "실종 동물" : "목격 제보"),
          name:
            r.type === "missing"
              ? r.title || `실종 (${r.location || "미상"})`
              : r.title || `목격 (${r.location || "미상"})`,
          status: r.status,
          location: r.location || "",
          time: timeAgo(r.date),
          img:
            r.img ||
            (r.type === "missing"
              ? "/images/placeholders/missing.png"
              : "/images/placeholders/report.png"),
          latlng:
            r.lat != null && r.lon != null
              ? [Number(r.lat), Number(r.lon)]
              : null,
          date: fmtDate(r.date),
          type: r.type,
          raw: r,
        }));

        // 최신순
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

  const missingPosts = useMemo(
    () => pets.filter((p) => p.type === "missing"),
    [pets]
  );
  const witnessPosts = useMemo(
    () => pets.filter((p) => p.type === "witness"),
    [pets]
  );

  const handleListItemClick = (pet) => setSelectedPet(pet);

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section id="map-view" className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          지도에서 실종 및 목격된 동물들의 위치를 확인하세요
        </h1>

        {loading && (
          <div className="mb-4 text-slate-700">데이터 불러오는 중...</div>
        )}
        {!!error && <div className="mb-4 text-red-600">오류: {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-lg border border-slate-200">
            <div className="w-full h-[600px] rounded-lg">
              <KakaoMap pets={pets} selectedPet={selectedPet} />
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm font-medium">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2 bg-red-500"></span>
                <span className="text-slate-700">
                  실종 동물 ({missingPosts.length})
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2 bg-blue-500"></span>
                <span className="text-slate-700">
                  목격 정보 ({witnessPosts.length})
                </span>
              </div>
            </div>
          </div>

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
                className="space-y-2 max-h-[300px] overflow-y-auto"
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
              </div>
            </div>

            <div
              id="witness-list-card"
              className="bg-white p-4 rounded-xl shadow-lg border border-slate-200"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-3">
                목격 정보
              </h2>
              <div
                id="witness-posts-container"
                className="space-y-2 max-h-[300px] overflow-y-auto"
              >
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LiveCheckPage;
