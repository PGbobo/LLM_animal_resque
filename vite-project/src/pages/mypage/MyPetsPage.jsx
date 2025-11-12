// src/pages/mypage/MyPetsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router"; // 프로젝트가 react-router v7 사용 중이라면 여기서 import

// ⚙️ 로컬 스토리지 키 상수 (서버 연동 전 임시 보관용)
// - 실제 서버 연동 시 삭제하고 API 호출로 대체하면 됨.
const LS_KEY = "my_lost_pets";

/**
 * MyPetsPage
 * - 내가 등록한 실종 동물 리스트를 보여주고,
 *   각 항목별로 "실종 상태 유지(모니터링/알림 ON)" 또는
 *   "실종 종료(모니터링/알림 OFF)"를 선택/토글할 수 있는 페이지.
 * - 변경 사항은 임시로 localStorage에 저장되며, 추후 API 연동 위치를 주석으로 표시함.
 */
export default function MyPetsPage() {
  const navigate = useNavigate();

  // 🐾 내 실종 등록 동물 목록
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  // ▶ 초기 로드: localStorage에서 불러오기 (없으면 더미 데이터 채워줌)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        setPets(JSON.parse(raw));
      } else {
        // 🚩 더미 데이터 (최초 1회)
        const seed = [
          {
            id: 101,
            name: "푸들",
            age: "3살",
            breed: "토이푸들",
            lostDate: "2025-10-16",
            lostLocation: "광주 서구 풍암호수공원",
            thumbnail:
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhalmPMX2psjXDU8BbhNuSGJjAuDwjUkvpPA&s",
            // 상태 플래그들
            isLostActive: true, // 실종 상태 유지 여부 (true면 모니터링 대상)
            notifySimilar: true, // 유사 이미지 알림 수신
          },
          {
            id: 102,
            name: "코숏",
            age: "1살 추정",
            breed: "코리안 숏헤어",
            lostDate: "2025-10-08",
            lostLocation: "광주 서구 금호동",
            thumbnail:
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhalmPMX2psjXDU8BbhNuSGJjAuDwjUkvpPA&s",
            isLostActive: true,
            notifySimilar: false,
          },
          {
            id: 103,
            name: "믹스견",
            age: "5살",
            breed: "믹스",
            lostDate: "2025-10-01",
            lostLocation: "광주 남구 월드컵경기장",
            thumbnail:
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhalmPMX2psjXDU8BbhNuSGJjAuDwjUkvpPA&s",
            isLostActive: false,
            notifySimilar: false,
          },
        ];
        setPets(seed);
        localStorage.setItem(LS_KEY, JSON.stringify(seed));
      }
    } catch (e) {
      console.error("load pets error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 💾 저장 유틸 (로컬스토리지 + 추후 API 자리)
  const persist = (next) => {
    setPets(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    // TODO: 서버 연동 시 아래 예시처럼 교체
    // await fetch("/api/mypage/pets", { method: "PUT", headers: {...}, body: JSON.stringify(next) });
  };

  // 🔁 실종 상태 토글
  const toggleLostActive = (id) => {
    const next = pets.map((p) => {
      if (p.id !== id) return p;
      const newIsLostActive = !p.isLostActive;
      return {
        ...p,
        isLostActive: newIsLostActive,
        // 실종 종료(false)라면 알림도 자동 OFF
        notifySimilar: newIsLostActive ? p.notifySimilar : false,
      };
    });
    persist(next);
  };

  // 🔔 유사 이미지 알림 토글
  const toggleNotify = (id) => {
    const next = pets.map((p) => {
      if (p.id !== id) return p;
      // 실종 상태가 꺼져 있으면 알림을 켤 수 없음
      if (!p.isLostActive) return p;
      return { ...p, notifySimilar: !p.notifySimilar };
    });
    persist(next);
  };

  // 🗑️ (선택) 삭제
  const removePet = (id) => {
    if (!confirm("이 실종 등록을 목록에서 제거할까요? (복구 불가)")) return;
    const next = pets.filter((p) => p.id !== id);
    persist(next);
  };

  if (loading) {
    return (
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
            실종 동물 관리
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            내가 등록한 실종 동물의 상태와 유사 이미지 알림 수신 여부를
            관리합니다.
          </p>

          {/* 리스트 */}
          <div className="space-y-4">
            {pets.length === 0 && (
              <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500">
                등록된 실종 동물이 없습니다.
              </div>
            )}

            {pets.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4"
              >
                {/* 썸네일 */}
                <img
                  src={p.thumbnail}
                  alt={`${p.name} 썸네일`}
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                />

                {/* 기본 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-800 truncate">
                      {p.name} / {p.age} ({p.breed})
                    </span>
                    {p.isLostActive ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-pink-100 text-pink-600">
                        실종 진행중
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                        실종 종료
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {p.lostDate} · {p.lostLocation}
                  </div>

                  {/* 스위치 영역 */}
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* 실종 상태 유지 토글 */}
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={p.isLostActive}
                        onChange={() => toggleLostActive(p.id)}
                      />
                      {/* 간단 토글 UI */}
                      <span className="w-10 h-6 rounded-full bg-slate-300 peer-checked:bg-pink-500 relative transition-colors">
                        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                      </span>
                      <span className="text-sm text-slate-700">
                        실종 상태 유지
                      </span>
                    </label>

                    {/* 알림 토글 (실종 종료 시 비활성) */}
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={p.notifySimilar}
                        onChange={() => toggleNotify(p.id)}
                        disabled={!p.isLostActive}
                      />
                      <span
                        className={`w-10 h-6 rounded-full relative transition-colors ${
                          p.isLostActive
                            ? "bg-sky-400 peer-checked:bg-sky-600"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            p.notifySimilar ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                      <span
                        className={`text-sm ${
                          p.isLostActive ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        유사 이미지 알림
                      </span>
                    </label>
                  </div>
                </div>

                {/* 우측 액션들 */}
                <div className="flex flex-col items-end gap-2">
                  {/* (선택) 상세/수정 이동 버튼 — 라우트 준비되면 연결 */}
                  {/* <button className="px-3 py-1 rounded-md border text-sm">상세보기</button> */}
                  <button
                    onClick={() => removePet(p.id)}
                    className="px-3 py-1 rounded-md border text-sm text-slate-600 hover:bg-slate-50"
                    title="목록에서 제거"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 하단 액션 (선택) */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-slate-100 rounded-md"
            >
              메인으로
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
