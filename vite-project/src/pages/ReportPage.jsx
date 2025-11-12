// src/pages/ReportPage.jsx (목격 날짜/장소 세로 배치 수정본)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

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

      alert("제보가 등록되었습니다");
      navigate("/");
    } catch (err) {
      console.error("제보 등록 실패:", err);
      alert("저장 중 오류: " + err.message);
    }
  };

  // 렌더
  return (
    <main className="pt-28 pb-16 bg-slate-50 text-slate-800">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-2">
            우리 동네 동물 제보
          </h1>
          <p className="text-slate-600 mb-8">
            목격하신 동물 정보를 정확히 작성해 주세요. 빠른 연결에 큰 도움이
            됩니다.
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
                설명
              </label>
              <textarea
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="크기, 색상, 특징, 행동 등을 자세히 적어주세요."
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
                className="px-8 py-3 text-lg font-bold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-8 py-3 text-lg font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500"
              >
                제보 등록
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
