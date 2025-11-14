// src/pages/ReportPage.jsx (목격 날짜/장소 세로 배치 수정본)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

// ◀◀ [1. 신규 추가] Base64 헬퍼 함수
// AI 서버(`/api/report_sighting`)에 Base64 문자열을 보내기 위해 필요합니다.
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

export default function ReportPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // 상태
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [species, setSpecies] = useState("dog"); // UI: dog/cat/etc → 서버: DOG/CAT/OTHER
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [seenDate, setSeenDate] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [coords, setCoords] = useState({ lat: null, lon: null });

  // 로딩 상태
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

    const center = new kakao.maps.LatLng(35.16006, 126.85143);
    const map = new kakao.maps.Map(mapRef.current, { center, level: 4 });

    geocoderRef.current = new kakao.maps.services.Geocoder();
    markerRef.current = new kakao.maps.Marker({ position: center });
    markerRef.current.setMap(map);

    kakao.maps.event.addListener(map, "click", (evt) => {
      const latlng = evt.latLng;
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
          setAddress(addr || "주소를 가져올 수 없습니다.");
        } else {
          setAddress("주소를 가져올 수 없습니다.");
        }
      });
    });
  };

  // 제출
  const onSubmit = async (e) => {
    e.preventDefault();

    // ◀ [신규] 로딩 중 중복 클릭 방지
    if (isLoading) return;

    if (!user || !token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (!title.trim()) return alert("제목을 입력해 주세요.");
    if (!seenDate) return alert("목격 날짜를 선택해 주세요.");
    if (!coords.lat || !address || address === "주소를 가져올 수 없습니다.") {
      return alert("지도에서 목격 장소를 선택해 주세요.");
    }
    if (!contact.trim()) return alert("연락처를 입력해 주세요.");

    // ◀ [신규] AI 분석을 위한 최소 조건 검사
    const hasPhoto = !!photoFile;
    const hasText = desc && desc.trim() !== "";
    if (!hasPhoto && !hasText) {
      return alert(
        "AI 분석을 위해 '사진' 또는 '설명' 중 하나는 반드시 입력해야 합니다."
      );
    }

    // ◀ [신규] 로딩 상태 '시작'
    setIsLoading(true);

    const dogCat =
      species === "dog" ? "DOG" : species === "cat" ? "CAT" : "OTHER";

    // CONTENT에 제목/종류/연락처 포함
    const mergedContent =
      `[제목] ${title || "(무제)"}\n` +
      `[종류] ${
        species === "dog" ? "개" : species === "cat" ? "고양이" : "기타"
      }\n` +
      (contact ? `[연락처] ${contact}\n` : "") +
      `[설명]\n${desc || ""}`;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("reportDate", seenDate);
    formData.append("reportLocation", address);
    formData.append("content", mergedContent);
    formData.append("contact", contact); // PHONE
    formData.append("species", dogCat); // DOG_CAT
    formData.append("lat", coords.lat);
    formData.append("lon", coords.lon);
    if (photoFile) formData.append("photo", photoFile, photoFile.name); // PHOTO

    let teamReportSuccess = false;

    // --- 1. (기존) 팀 백엔드 '제보 등록' 시도 ---
    try {
      const resp = await fetch(`${API_BASE}/reports`, {
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

      console.log("팀 백엔드 제보 등록 성공.");
      teamReportSuccess = true;
    } catch (err) {
      // ◀◀ [수정됨] 'alert' 대신 'console.warn' (조용한 경고)으로 변경
      console.warn(
        `[1/2] 팀 서버 제보 등록 실패 (AI 분석은 계속 진행): ${err.message}`
      );
      // ◀ "동물 제보 API 미구현" 오류가 여기서 잡힘 (이제 alert 안 뜸)
      // alert(
      //   `[1/2] 팀 서버 제보 등록 실패: ${err.message}\n\n(AI 분석을 계속합니다)`
      // );
    }

    // --- 2. (신규) 'AI 실종동물 매칭' 시도 ---
    try {
      console.log("AI 실종동물 매칭을 시작합니다.");

      const aiPayload = {};
      if (hasPhoto) {
        aiPayload.image_base64 = await fileToBase64(photoFile);
      }
      if (hasText) {
        aiPayload.query_text = desc;
      }

      const aiResp = await fetch(
        `http://211.188.57.154:5000/api/report_sighting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiPayload),
        }
      );

      if (!aiResp.ok) {
        const errorData = await aiResp.json().catch(() => ({}));
        throw new Error(errorData.error || `AI 서버 오류: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();

      // ◀◀ [수정됨] AI 분석 성공 시, 'alert' 없이 바로 결과 페이지로 이동
      // alert("[2/2] 제보 등록 및 AI 분석 성공! 결과 페이지로 이동합니다.");
      navigate("/search-results", {
        state: {
          results: aiData.results,
          returnTo: "/report",
        },
      });
    } catch (err) {
      // ◀◀ [수정됨] AI 서버가 실패했을 때의 오류 (알림창 문구 정리)
      console.error("AI 분석 실패:", err);
      alert(`AI 분석 중 심각한 오류가 발생했습니다: ${err.message}`);

      if (teamReportSuccess) {
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 렌더
  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      {/* ◀◀ [4. 신규 추가] 로딩 오버레이 */}
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
            제보 등록 및 AI 분석 중...
          </div>
        </div>
      )}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-2">
            우리 동네 동물 제보
          </h1>
          <p className="text-slate-600 mb-8">
            목격하신 동물 정보를 정확히 작성해 주세요. (사진 또는 설명 필수)
          </p>

          <form className="space-y-6" onSubmit={onSubmit}>
            {/* 사진 */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                사진 (선택)
              </label>
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-sky-300 border-dashed rounded-lg cursor-pointer bg-sky-50 hover:bg-sky-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
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
                        viewBox="0 0 20 16"
                        fill="none"
                      >
                        <path
                          stroke="currentColor"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="text-sm text-slate-500">
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
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoChange}
                />
              </label>
            </div>

            {/* 제목 / 종류 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-bold text-slate-800 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="예) 검은 푸들 목격"
                />
              </div>
              <div>
                <label className="block text-lg font-bold text-slate-800 mb-2">
                  종류
                </label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="dog">개</option>
                  <option value="cat">고양이</option>
                  <option value="etc">기타</option>
                </select>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                설명 (사진이 없을시 필수)
              </label>
              <textarea
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="크기, 색상, 특징, 행동 등을 자세히 적어주세요. (AI 분석에 사용됩니다)"
              />
            </div>

            {/* 날짜 (세로 1섹션) */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                목격 날짜
              </label>
              <input
                type="date"
                value={seenDate}
                onChange={(e) => setSeenDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
              />
            </div>

            {/* 장소 (세로 1섹션) */}
            <div>
              <label className="block text-lg font-bold text-slate-800 mb-2">
                목격 장소
              </label>
              <p className="text-sm text-slate-500 mb-3">
                지도를 클릭하면 주소가 자동 입력됩니다.
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
                {isLoading ? "처리 중..." : "제보 등록"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
