// src/pages/mypage/MyPetsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth"; // AuthContext를 사용한다고 가정
import { getMyLostPets, deleteMyLostPet } from "../../services/api"; // API 함수 import

// ⚙️ 로컬 스토리지 키 상수 (서버 연동 전 임시 보관용) - 서버 연동으로 대체하여 사용하지 않습니다.
// const LS_KEY = "my_lost_pets";

/**
 * MyPetsPage
 * - 내가 등록한 실종 동물 리스트를 보여주고,
 * 각 항목별로 "실종 상태 유지(모니터링/알림 ON)" 또는
 * "실종 종료(모니터링/알림 OFF)"를 선택/토글할 수 있는 페이지.
 * - 실제 DB (MISSING 테이블) 연동 로직으로 수정되었습니다.
 */
export default function MyPetsPage() {
  const navigate = useNavigate();
  // 경로 수정: `../../hooks/useAuth` -> `../../../hooks/useAuth` 또는 `../../hooks/useAuth` (프로젝트 구조에 따라 다름)
  // 현재 에러는 `../../hooks/useAuth`가 실패했으므로, `mypage`에서 한 단계 더 올라가야 할 가능성이 높습니다.
  // 안전하게 프로젝트 루트(src) 기준으로 상대 경로를 다시 맞추기 위해, `src/pages/mypage/MyPetsPage.jsx`에서 `src/hooks/useAuth.js`를 가리키려면 `../../../hooks/useAuth` 또는 `/hooks/useAuth`가 필요합니다.
  // 여기서는 `./`로 시작하는 상대 경로를 수정합니다.
  const { user, loading: authLoading } = useAuth(); // 사용자 정보 가져오기

  // 🐾 내 실종 등록 동물 목록
  // petName, petAge, species, lostDate, lostLocation, petImageUrl, id(MISSING_NUM) 필드를 사용
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  // ▶ 초기 로드: 서버에서 데이터 불러오기 (로그인된 USER_NUM 기준)
  const fetchMyPets = async () => {
    // ⭐️ 경로 수정
    // `src/pages/mypage/MyPetsPage.jsx` 기준, `src/hooks/useAuth.js`로 접근하기 위해 `../../hooks/useAuth` 대신 `../../../hooks/useAuth` 또는 구조에 맞는 경로를 사용해야 합니다.
    // 임시로, `../..` 대신 `../../..`로 한 번 더 올라가서 `hooks`와 `services`를 찾아보도록 경로를 수정합니다.
    // 만약 `src/hooks`와 `src/services`라면 `../`를 세 번 사용해야 합니다.
    // `src/pages/mypage/` -> `src/pages/` -> `src/` -> `.` (루트)
    // 따라서 `../../../hooks/useAuth`가 올바른 경로입니다.

    // **참고: 실제 프로젝트 구조에 따라 경로가 다를 수 있으나, 컴파일 오류 해결을 위해 경로를 `../../../`로 수정합니다.**
    // **그러나, 기존 파일에 `../../hooks/useAuth`가 명시되었고, `api.js`가 `src/services/api.js`로 가정되므로, `../../`가 맞을 가능성이 높습니다. 컴파일 환경 문제일 수 있으니, 먼저 `../../`를 유지하고 코드를 다시 제공합니다.**

    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // getMyLostPets는 `api.js`에 정의되어 있으므로 경로는 수정하지 않습니다.
      const response = await getMyLostPets();
      if (response.data.success) {
        // DB 필드명과 프론트에서 사용하던 필드명 매핑
        const mappedPets = response.data.data.map((p) => ({
          id: p.id, // MISSING_NUM
          name: p.petName, // 실종견 이름
          age: p.petAge ? `${p.petAge}살` : "나이 미상", // 실종견 나이
          breed: p.species || "미상", // 실종견 품종
          lostDate: p.lostDate
            ? new Date(p.lostDate).toLocaleDateString("ko-KR")
            : "날짜 미상",
          lostLocation: p.lostLocation, // 실종 장소
          thumbnail:
            p.petImageUrl ||
            "https://placehold.co/96x96/cccccc/000000?text=NO+IMAGE", // 이미지 URL
          // DB Status: '0' (진행중), '1' (종료)
          isLostActive: p.status === "0",
          notifySimilar: p.status === "0", // 기본적으로 실종 진행중이면 알림 ON으로 설정 (필요 시 DB에 별도 컬럼 추가 필요)
        }));
        setPets(mappedPets);
      } else {
        console.error("Failed to fetch my pets:", response.data.message);
      }
    } catch (e) {
      console.error("Error fetching my pets:", e);
      // 서버에서 401 Unauthorized 응답 시 로그인 페이지로 리다이렉트 (axios 인터셉터 또는 useAuth에서 처리 가능)
      if (e.response && e.response.status === 401) {
        window.alert("인증 정보가 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // user 또는 authLoading 상태가 바뀔 때 다시 로드

  // 💾 저장 유틸 (API 호출로 대체)
  const persist = (next) => {
    setPets(next);
    // TODO: 실종 상태(isLostActive) 토글/알림 토글 시
    // 해당 pet의 id와 새로운 status를 서버에 업데이트하는 API 호출 로직 구현 필요
    // (현재는 목록 불러오기 및 삭제 기능만 구현 요청됨)
    // 예시: updateLostPetStatus(id, { status: newStatus, notify: newNotify });
  };

  // 🔁 실종 상태 토글 (임시 로직, 서버 업데이트 API 필요)
  const toggleLostActive = (id) => {
    const next = pets.map((p) => {
      if (p.id !== id) return p;
      const newIsLostActive = !p.isLostActive;
      const newStatus = newIsLostActive ? "0" : "1";

      // TODO: 서버 API 호출: 실종 상태 업데이트
      // updateLostPetStatus(id, { status: newStatus, notifySimilar: newIsLostActive ? p.notifySimilar : false });

      return {
        ...p,
        isLostActive: newIsLostActive,
        // 실종 종료(false)라면 알림도 자동 OFF
        notifySimilar: newIsLostActive ? p.notifySimilar : false,
      };
    });
    persist(next);
  };

  // 🔔 유사 이미지 알림 토글 (임시 로직, 서버 업데이트 API 필요)
  const toggleNotify = (id) => {
    const next = pets.map((p) => {
      if (p.id !== id) return p;
      // 실종 상태가 꺼져 있으면 알림을 켤 수 없음
      if (!p.isLostActive) return p;

      // TODO: 서버 API 호출: 알림 상태 업데이트
      // updateLostPetNotify(id, !p.notifySimilar);

      return { ...p, notifySimilar: !p.notifySimilar };
    });
    persist(next);
  };

  // 🗑️ 실종 등록 삭제
  const removePet = async (id) => {
    // ⭐️ window.confirm 대신 커스텀 UI 사용이 원칙이나, 기존 코드를 따라 alert/confirm을 window.alert/window.confirm으로 수정합니다.
    if (!window.confirm("이 실종 등록을 목록에서 제거할까요? (복구 불가)"))
      return;

    try {
      await deleteMyLostPet(id);
      window.alert("실종 등록이 삭제되었습니다.");
      // 삭제 성공 후 목록 새로고침
      await fetchMyPets();
    } catch (e) {
      console.error("삭제 실패:", e);
      window.alert(
        "삭제 중 오류가 발생했습니다: " +
          (e.response?.data?.message || e.message)
      );
    }
  };

  if (loading) {
    return (
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          내 등록 동물 목록을 불러오는 중...
        </div>
      </main>
    );
  }

  // 로그인되지 않은 경우 (useAuth에서 처리되지만 안전 장치)
  if (!user) {
    return (
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500">
            로그인이 필요합니다.
            <button
              onClick={() => navigate("/login")}
              className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition"
            >
              로그인 페이지로 이동
            </button>
          </div>
        </div>
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
                  // ⭐️ DB에서 가져온 petImageUrl 사용
                  src={p.thumbnail}
                  alt={`${p.name} 썸네일`}
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://placehold.co/96x96/cccccc/000000?text=NO+IMAGE";
                  }}
                />

                {/* 기본 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* ⭐️ DB에서 가져온 petName, petAge, species 사용 */}
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
                  {/* ⭐️ DB에서 가져온 lostDate, lostLocation 사용 */}
                  <div className="text-sm text-slate-600 mt-1">
                    {p.lostDate} · {p.lostLocation}
                  </div>

                  {/* 스위치 영역 (상태 업데이트 API 부재로 기능은 유지하지만 실제 서버 반영은 안 됨) */}
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
                      {/* ⭐️ 토글 배경: bg-pink-500 (켜짐) / bg-slate-300 (꺼짐) */}
                                           {" "}
                      <span
                        className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${
                          p.isLostActive ? "bg-pink-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                            p.isLostActive ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                                           {" "}
                      <span className="text-sm text-slate-700">
                                                실종 상태 유지                  
                           {" "}
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
                            ? "bg-slate-300 peer-checked:bg-sky-400"
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
                  {/* ⭐️ 삭제 버튼: deleteMyLostPet API 호출 연결 */}
                  <button
                    onClick={() => removePet(p.id)}
                    className="px-3 py-1 rounded-md border text-sm text-slate-600 hover:bg-red-100 hover:border-red-400 transition"
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
