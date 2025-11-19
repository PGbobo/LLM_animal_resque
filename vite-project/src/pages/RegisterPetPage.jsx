// src/pages/RegisterPetPage.jsx (디자인 반영 최종본)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth"; // 로그인 훅

// ◀◀ [1. 신규 추가] Base64 헬퍼 함수
// AI 서버(`/api/search`)에 Base64 문자열을 보내기 위해 필요합니다.
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // "data:image/jpeg;base64," 부분을 잘라내고 순수 Base64만 반환
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });

export default function RegisterPetPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // 상태
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("미상");
  const [age, setAge] = useState("");
  const [features, setFeatures] = useState("");
  const [lostDate, setLostDate] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [coords, setCoords] = useState({ lat: null, lon: null });

  // 로딩 상태 (API 호출 중에 true가 됨)
  const [isLoading, setIsLoading] = useState(false);

  // Kakao Map
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const kakaoLoaded = useRef(false);

  const KAKAO_APP_KEY = useMemo(() => "7fc0573eaaceb31b52e3a3c9fa97c024", []);
  const API_BASE = "http://localhost:4000";

  // 사진 변경
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    setPhotoFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(String(ev.target?.result || ""));
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview("");
    }
  };

  // Kakao 지도 로드
  useEffect(() => {
    if (window.kakao && window.kakao.maps && !kakaoLoaded.current) {
      kakaoLoaded.current = true;
      initMap();
      return;
    }
    if (!kakaoLoaded.current) {
      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        window.kakao.maps.load(() => {
          kakaoLoaded.current = true;
          initMap();
        });
      };
      document.head.appendChild(script);
    }
  }, [KAKAO_APP_KEY]);

  const initMap = () => {
    const kakao = window.kakao;
    if (!kakao || !mapRef.current) return;

    const center = new kakao.maps.LatLng(35.160085, 126.851433);
    const map = new kakao.maps.Map(mapRef.current, { center, level: 4 });

    geocoderRef.current = new kakao.maps.services.Geocoder();

    markerRef.current = new kakao.maps.Marker({ position: center });
    markerRef.current.setMap(map);

    kakao.maps.event.addListener(map, "click", (mouseEvent) => {
      const latlng = mouseEvent.latLng;
      markerRef.current.setPosition(latlng);

      const lat = latlng.getLat();
      const lon = latlng.getLng();
      setCoords({ lat, lon });

      geocoderRef.current.coord2Address(lon, lat, (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
          const addr =
            result[0].road_address?.address_name ??
            result[0].address?.address_name ??
            "";
          setAddress(addr || "");
        } else {
          setAddress("");
        }
      });
    });
  };

  // 제출
  const onSubmit = async (e) => {
    e.preventDefault();

    // 로딩 중 중복 실행 방지
    if (isLoading) return;

    if (!user || !token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (!name.trim()) return alert("이름을 입력해 주세요.");
    if (!breed.trim()) return alert("품종을 입력해 주세요.");
    if (!lostDate) return alert("실종 날짜를 선택해 주세요.");
    if (!coords.lat || !address)
      return alert("지도에서 실종 장소를 선택해 주세요.");

    // 로딩 상태 '시작'
    setIsLoading(true);

    const formData = new FormData();
    formData.append("petName", name);
    formData.append("species", breed);
    formData.append("petGender", gender);
    formData.append("petAge", age);
    formData.append("features", features);
    formData.append("lostDate", lostDate);
    formData.append("lostLocation", address);
    formData.append("contactNumber", contact);
    formData.append("lat", coords.lat);
    formData.append("lon", coords.lon);
    formData.append("status", "0");
    if (photoFile) formData.append("photo", photoFile, photoFile.name); // 서버에서 PET_IMAGE_URL에 매핑

    try {
      const resp = await fetch(`${API_BASE}/lost-pets`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const contentType = resp.headers.get("content-type") || "";
      if (!resp.ok) {
        const msg = contentType.includes("application/json")
          ? (await resp.json().catch(() => ({}))).message ||
            `HTTP ${resp.status}`
          : await resp.text().catch(() => `HTTP ${resp.status}`);
        throw new Error(msg);
      }
      const data = contentType.includes("application/json")
        ? await resp.json()
        : {};
      if (!data?.success) throw new Error(data?.message || "저장 실패");

      // --- [신규 로직] 2. 'AI 유사도 검색' 요청 ---
      // (중요) 사진이 첨부된 경우(photoFile)에만 AI 검색을 실행합니다.
      if (photoFile) {
        console.log("실종 등록 성공. AI 유사도 분석을 시작합니다.");

        // 2-1. Base64 변환 (1단계에서 추가한 함수 사용)
        const imageBase64 = await fileToBase64(photoFile);

        // 2-2. AI 서버(`/api/search`) 호출
        const aiResp = await fetch(`http://211.188.57.154:5000/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: imageBase64 }),
        });

        if (!aiResp.ok) {
          const errorData = await aiResp.json().catch(() => ({}));
          // AI 검색이 실패해도, 실종 등록은 이미 성공했으므로
          // 오류만 알리고 홈으로 이동시킵니다.
          throw new Error(errorData.error || `AI 서버 오류: ${aiResp.status}`);
        }

        const aiData = await aiResp.json();

        // 2-3. (Task 2) AI 검색 성공! 결과 페이지로 이동
        // alert("실종등록이 완료되었으며, AI 분석 결과 페이지로 이동합니다.");
        // SearchResultPage.jsx로 results 데이터를 state로 전달
        navigate("/search-results", {
          state: {
            results: aiData.results,
            source: "register", // ◀◀ 추가
            returnTo: "/", // (끝나면 홈으로)
          },
        });
      } else {
        // (기존 로직) 사진이 없으므로, 등록만 하고 홈으로 이동
        alert("실종등록이 완료되었습니다");
        navigate("/");
      }
    } catch (err) {
      console.error("등록 실패:", err);
      alert("저장 중 오류: " + err.message);
    } finally {
      // 로딩 상태 '끝'
      setIsLoading(false);
    }
  };

  // 렌더
  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      {/* ◀◀ [신규 추가] 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-xl font-bold p-8 bg-sky-500 rounded-lg shadow-xl">
            {/* (간단한 스피너 애니메이션) */}
            <svg
              className="animate-spin h-8 w-8 text-white mx-auto mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
            AI가 분석 중입니다...
          </div>
        </div>
      )}
      {/* ◀◀ 로딩 오버레이 끝 */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-2">
            실종 동물 정보 등록
          </h1>
          <p className="text-slate-600 mb-8">
            실종된 반려동물의 정보를 정확히 입력해주세요.
          </p>

          <form className="space-y-6" onSubmit={onSubmit}>
            {/* 사진 등록 */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                사진 등록 (필수)
              </label>
              <div className="mt-2 flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-sky-300 border-dashed rounded-lg cursor-pointer bg-sky-50 hover:bg-sky-100">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="미리보기"
                      className="max-h-48 rounded-md mb-4"
                    />
                  ) : (
                    <>
                      <svg
                        className="w-10 h-10 mb-4 text-sky-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-slate-500">
                        <span className="font-semibold">
                          클릭하여 파일 선택
                        </span>{" "}
                        또는 드래그 앤 드롭
                      </p>
                      <p className="text-xs text-slate-500">
                        PNG, JPG, GIF (최대 10MB)
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPhotoChange}
                  />
                </label>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-bold text-slate-800 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="예) 초코, 보리 등"
                />
              </div>
              <div>
                <label className="block text-lg font-bold text-slate-800 mb-2">
                  품종
                </label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="예) 푸들, 코숏 등"
                />
              </div>
              <div>
                <label className="block text-lg font-bold text-slate-800 mb-2">
                  성별
                </label>
                <div className="flex gap-4 mt-3">
                  {["수컷", "암컷", "미상"].map((g) => (
                    <label className="flex items-center" key={g}>
                      <input
                        type="radio"
                        name="pet-gender"
                        value={g}
                        checked={gender === g}
                        onChange={(e) => setGender(e.target.value)}
                        className="mr-2 h-5 w-5 text-sky-500 focus:ring-sky-300"
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-lg font-bold text-slate-800 mb-2">
                  나이
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="숫자만 입력"
                />
              </div>
            </div>

            {/* 특징 */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                특징
              </label>
              <textarea
                rows={4}
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="털색, 체형, 성격 등 상세히 작성"
              />
            </div>

            {/* 날짜 */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                실종 날짜
              </label>
              <input
                type="date"
                value={lostDate}
                onChange={(e) => setLostDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
              />
            </div>

            {/* 지도/주소 */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                실종 장소
              </label>
              <p className="text-sm text-slate-500 mb-3">
                지도에서 위치를 클릭하면 주소가 자동 입력됩니다.
              </p>
              <div
                ref={mapRef}
                className="w-full h-[350px] rounded-lg border border-sky-300 mb-3"
              />
              <input
                type="text"
                value={address}
                readOnly
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100"
                placeholder="지도에서 위치를 선택하세요"
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                연락처
              </label>
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="예) 010-1234-5678"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate("/")}
                disabled={isLoading}
                className="px-8 py-3 text-lg font-bold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 text-lg font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500"
              >
                {isLoading ? "처리 중..." : "등록하기"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
