// src/pages/ReportPage.jsx (디자인 업그레이드: 입양 페이지 스타일 적용)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

// ---------------------------------------------------------------------
// 1. 헬퍼 함수 & UI 컴포넌트
// ---------------------------------------------------------------------

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });

const TabButton = ({ title, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`py-3 px-6 text-lg font-bold transition-colors ${
      isActive
        ? "border-b-4 border-sky-400 text-sky-500"
        : "text-slate-500 hover:text-sky-400"
    }`}
  >
    {title}
  </button>
);

// (입양 페이지 스타일) SelectBox
const FormSelect = ({ label, value, onChange, children }) => (
  <div>
    <label className="block text-lg font-bold text-slate-800 mb-2">
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
    >
      {children}
    </select>
  </div>
);

// (입양 페이지 스타일) Input
const FormInput = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-lg font-bold text-slate-800 mb-2">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
      placeholder={placeholder}
    />
  </div>
);

// ---------------------------------------------------------------------
// 2. 공통 지도 컴포넌트
// ---------------------------------------------------------------------
const ReportMap = ({ setAddress, setCoords }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const kakaoLoaded = useRef(false);

  const KAKAO_APP_KEY = "7fc0573eaaceb31b52e3a3c9fa97c024";

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
  }, []);

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

  return (
    <div
      ref={mapRef}
      className="w-full h-[350px] rounded-lg border border-sky-200 mb-3"
    />
  );
};

// ---------------------------------------------------------------------
// 3. 메인 페이지 컴포넌트
// ---------------------------------------------------------------------
export default function ReportPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("photo");
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE = "http://211.188.57.154:4000";
  const AI_SERVER_URL = `${API_BASE}/api/proxy/report_sighting`;

  // --- 공통 제출 핸들러 ---
  const handleReportSubmit = async (formDataPayload, aiPayload) => {
    if (!user || !token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    setIsLoading(true);

    try {
      // 1. 백엔드 등록
      console.log("📝 [1/3] 제보 등록 시작...");
      const resp = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);

      const reportNum = data.reportNum;
      console.log("✅ [1/3] 제보 등록 성공");

      // 2. AI 분석
      console.log("🤖 [2/3] AI 분석 시작...");
      if (reportNum) aiPayload.report_num = reportNum;

      const aiResp = await fetch(AI_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPayload),
      });

      if (!aiResp.ok) throw new Error(`AI 서버 오류: ${aiResp.status}`);
      const aiData = await aiResp.json();
      const matches = aiData.results || aiData.matches || [];
      console.log(`✅ [2/3] AI 분석 완료. 매칭: ${matches.length}개`);

      // 3. SMS 발송 (생략)
      if (matches.length > 0) {
        console.log("📲 [3/3] SMS 발송 로직 실행 (백엔드 처리)");
      }

      // 4. 이동
      navigate("/search-results", {
        state: {
          results: matches,
          source: "report",
          returnTo: "/report-sighting",
        },
      });
    } catch (err) {
      console.error("제보 실패:", err);
      alert(`오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-xl font-bold p-8 bg-sky-500 rounded-lg shadow-xl text-center">
            <svg
              className="animate-spin h-10 w-10 text-white mx-auto mb-4"
              viewBox="0 0 24 24"
              fill="none"
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
            목격하신 동물의 정보를 알려주세요. 사진이 없어도 괜찮아요!
          </p>

          <div className="flex border-b border-slate-200 mb-6">
            <TabButton
              title="사진으로 제보"
              isActive={activeTab === "photo"}
              onClick={() => setActiveTab("photo")}
            />
            <TabButton
              title="글로 제보 (특징 선택)"
              isActive={activeTab === "text"}
              onClick={() => setActiveTab("text")}
            />
          </div>

          {activeTab === "photo" ? (
            <PhotoReportTab onSubmit={handleReportSubmit} />
          ) : (
            <TextReportTab onSubmit={handleReportSubmit} />
          )}
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------
// 4. [탭 1] 사진으로 제보 컴포넌트
// ---------------------------------------------------------------------
function PhotoReportTab({ onSubmit }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [title, setTitle] = useState("");
  const [seenDate, setSeenDate] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [contact, setContact] = useState("");
  const [desc, setDesc] = useState("");
  const [species, setSpecies] = useState("dog");

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    setPhotoFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(String(ev.target?.result));
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoFile) return alert("사진을 등록해 주세요.");
    if (!title.trim()) return alert("제목을 입력해 주세요.");
    if (!seenDate) return alert("날짜를 선택해 주세요.");
    if (!coords.lat) return alert("지도에서 위치를 선택해 주세요.");
    if (!contact.trim()) return alert("연락처를 입력해 주세요.");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("reportDate", seenDate);
    formData.append("reportLocation", address);
    formData.append("contact", contact);
    formData.append(
      "species",
      species === "dog" ? "DOG" : species === "cat" ? "CAT" : "OTHER"
    );
    formData.append("lat", coords.lat);
    formData.append("lon", coords.lon);
    formData.append("photo", photoFile);

    const content =
      `[제목] ${title}\n` +
      `[종류] ${
        species === "dog" ? "개" : species === "cat" ? "고양이" : "기타"
      }\n` +
      `[연락처] ${contact}\n` +
      `[설명]\n${desc}`;
    formData.append("content", content);

    const imageBase64 = await fileToBase64(photoFile);
    const aiPayload = { image_base64: imageBase64 };

    onSubmit(formData, aiPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-sky-300 border-dashed rounded-xl cursor-pointer bg-sky-50 hover:bg-sky-100 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="미리보기"
              className="max-h-56 rounded-lg shadow-sm object-contain"
            />
          ) : (
            <>
              <svg
                className="w-10 h-10 mb-3 text-sky-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              <p className="text-sm text-slate-500 font-semibold">
                클릭하여 사진 업로드
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 검은 강아지"
        />
        <FormSelect
          label="종류"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        >
          <option value="dog">개</option>
          <option value="cat">고양이</option>
          <option value="etc">기타</option>
        </FormSelect>
      </div>

      <div>
        <label className="block text-lg font-bold text-slate-800 mb-2">
          설명 (선택)
        </label>
        <textarea
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
          placeholder="특이사항이 있다면 적어주세요."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-lg font-bold text-slate-800 mb-2">
            목격 날짜
          </label>
          <input
            type="date"
            value={seenDate}
            onChange={(e) => setSeenDate(e.target.value)}
            onClick={(e) => e.target.showPicker()} // ◀ 날짜 클릭 시 달력 표시
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 cursor-pointer"
          />
        </div>
        <FormInput
          label="연락처"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="010-1234-5678"
        />
      </div>

      <div>
        <label className="block text-lg font-bold text-slate-800 mb-2">
          목격 장소
        </label>
        <div className="mb-2">
          <ReportMap setAddress={setAddress} setCoords={setCoords} />
        </div>
        <input
          type="text"
          value={address}
          readOnly
          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100"
          placeholder="지도에서 위치를 선택하세요"
        />
      </div>

      <button
        type="submit"
        className="w-full py-4 text-xl font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-transform active:scale-95"
      >
        제보 등록하기
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------
// 5. [탭 2] 글로 제보 컴포넌트 (입양 페이지 스타일 적용!)
// ---------------------------------------------------------------------
function TextReportTab({ onSubmit }) {
  // 1. 기본 정보 (제출용)
  const [title, setTitle] = useState("");
  const [seenDate, setSeenDate] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [contact, setContact] = useState("");

  // 2. 상세 특징 (입양 페이지와 동일한 6개 옵션 + 주요 특징)
  const [species, setSpecies] = useState("개");
  const [age, setAge] = useState(""); // (새끼/성체)
  const [bodySize, setBodySize] = useState(""); // (소형/중형/대형)
  const [furLength, setFurLength] = useState(""); // (단모/장모)
  const [furColor, setFurColor] = useState(""); // (색상 직접 입력)
  const [breed, setBreed] = useState(""); // (품종 직접 입력)
  const [feature, setFeature] = useState(""); // (주요 특징)

  const [desc, setDesc] = useState(""); // 자동 생성될 설명 (AI 전송용)

  // 3. 문장 자동 생성 로직 (AdoptionPage 로직 + 목격 제보형 어미)
  useEffect(() => {
    const parts = [];

    // (1) 나이: "새끼" -> "어린"으로 변환하여 자연스럽게
    if (age) {
      const ageTerm = age === "새끼" ? "어린" : age;
      parts.push(`${ageTerm} 나이대의`);
    }

    // (2) 체형
    if (bodySize) {
      parts.push(`${bodySize} 체형의`);
    }

    // (3) 털 (길이 + 색상 조합)
    let cleanFurLen = "";
    if (furLength.includes("단모")) cleanFurLen = "짧은";
    else if (furLength.includes("장모")) cleanFurLen = "긴";

    if (furColor && cleanFurLen) {
      parts.push(`${furColor}의 ${cleanFurLen} 털을 가진`);
    } else if (furColor) {
      parts.push(`${furColor} 털을 가진`);
    } else if (cleanFurLen) {
      parts.push(`${cleanFurLen} 털을 가진`);
    }

    // (4) 대상 (품종이 있으면 품종 우선, 없으면 종류)
    const target = breed && breed.trim() !== "" ? breed : species;

    // (5) 한글 조사 '을/를' 자동 처리
    const hasBatchim = (word) => {
      if (!word) return false;
      const lastChar = word.charCodeAt(word.length - 1);
      return (lastChar - 0xac00) % 28 > 0;
    };
    const particle = hasBatchim(target) ? "을" : "를";

    // (6) 문장 조합
    const mainDesc = parts.join(" ");
    let autoSentence = mainDesc
      ? `${mainDesc} ${target}${particle} 목격했습니다.`
      : `${target}${particle} 목격했습니다.`;

    // (7) 주요 특징 추가 (자연스럽게 연결)
    if (feature && feature.trim()) {
      autoSentence += `\n(특이 사항: ${feature} 등의 특징이 있습니다)`;
    }

    setDesc(autoSentence);
  }, [species, age, bodySize, furLength, furColor, breed, feature]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("제목을 입력해 주세요.");
    if (!desc.trim()) return alert("설명(특징)을 입력해 주세요.");
    if (!seenDate) return alert("날짜를 선택해 주세요.");
    if (!coords.lat) return alert("지도에서 위치를 선택해 주세요.");
    if (!contact.trim()) return alert("연락처를 입력해 주세요.");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("reportDate", seenDate);
    formData.append("reportLocation", address);
    formData.append("contact", contact);
    formData.append(
      "species",
      species === "개" ? "DOG" : species === "고양이" ? "CAT" : "OTHER"
    );
    formData.append("lat", coords.lat);
    formData.append("lon", coords.lon);

    const content =
      `[제목] ${title}\n` +
      `[종류] ${species}\n` +
      `[연락처] ${contact}\n` +
      `[설명]\n${desc}`;
    formData.append("content", content);

    const aiPayload = { query_text: desc };
    onSubmit(formData, aiPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
      {/* --- 섹션 1: 상세 특징 선택 (6가지 옵션 + 특징) --- */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
          <span className="bg-sky-400 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">
            1
          </span>
          목격한 동물 특징 묘사
        </h3>

        {/* 4분할 그리드 (종류, 나이, 체형, 털길이) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <FormSelect
            label="종류"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            <option value="개">개</option>
            <option value="고양이">고양이</option>
            <option value="기타">기타</option>
          </FormSelect>

          <FormSelect
            label="나이대(추정)"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="">(잘 모름)</option>
            <option value="새끼">새끼</option>
            <option value="성체">성체</option>
          </FormSelect>

          <FormSelect
            label="체형"
            value={bodySize}
            onChange={(e) => setBodySize(e.target.value)}
          >
            <option value="">(잘 모름)</option>
            <option value="소형">소형</option>
            <option value="중형">중형</option>
            <option value="대형">대형</option>
          </FormSelect>

          <FormSelect
            label="털 길이"
            value={furLength}
            onChange={(e) => setFurLength(e.target.value)}
          >
            <option value="">(잘 모름)</option>
            <option value="단모(짧은 털)">단모 (짧은 털)</option>
            <option value="장모(긴 털)">장모 (긴 털)</option>
          </FormSelect>
        </div>

        {/* 3분할 그리드 (색상, 품종, 주요특징) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormInput
            label="털 색상"
            value={furColor}
            onChange={(e) => setFurColor(e.target.value)}
            placeholder="예) 흰색, 갈색 점박이"
          />
          <FormInput
            label="품종(추정)"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="예) 말티즈, 리트리버"
          />
          <FormInput
            label="기타 주요 특징"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            placeholder="예) 꼬리가 김"
          />
        </div>
      </div>

      {/* --- 섹션 2: AI 메시지 확인 --- */}
      <div className="bg-sky-50 p-6 rounded-xl border border-sky-100">
        <h3 className="text-lg font-bold text-sky-600 mb-2 flex items-center">
          <span className="bg-sky-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">
            2
          </span>
          AI에게 보낼 제보 내용 (자동 생성)
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          선택한 특징을 바탕으로 문장을 만들었습니다. 내용이 맞는지
          확인해주세요.
          <br />
          <strong>필요하다면 내용을 직접 수정하셔도 됩니다!</strong>
        </p>
        <textarea
          rows={4}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full h-32 p-4 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white text-lg text-slate-800 resize-none"
          placeholder="위 특징을 선택하면 자동으로 작성됩니다."
        />
      </div>

      {/* --- 섹션 3: 필수 정보 --- */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <FormInput
            label="글 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) OO동 놀이터 강아지 목격"
          />
          <FormInput
            label="연락처"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="010-1234-5678"
          />
        </div>

        <div className="mb-4">
          <label className="block text-lg font-bold text-slate-800 mb-2">
            목격 날짜
          </label>
          <input
            type="date"
            value={seenDate}
            onChange={(e) => setSeenDate(e.target.value)}
            onClick={(e) => e.target.showPicker()}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-lg font-bold text-slate-800 mb-2">
            목격 장소
          </label>
          <div className="mb-2">
            <ReportMap setAddress={setAddress} setCoords={setCoords} />
          </div>
          <input
            type="text"
            value={address}
            readOnly
            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100"
            placeholder="지도에서 위치를 선택하세요"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-4 text-xl font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-transform active:scale-95"
      >
        글로 제보 등록하기
      </button>
    </form>
  );
}
