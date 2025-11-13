import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 헬퍼 함수: File 객체를 Base64 문자열로 변환 (RegisterPetPage에서 가져옴)
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

// 탭 버튼 컴포넌트
const TabButton = ({ title, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-6 text-lg font-bold ${
      isActive
        ? "border-b-4 border-sky-400 text-sky-500"
        : "text-slate-500 hover:text-sky-400"
    }`}
  >
    {title}
  </button>
);

// --- 메인 페이지 컴포넌트 ---
export default function AdoptionPage() {
  const [searchMode, setSearchMode] = useState("image"); // 'image' | 'criteria'
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      {/* --- 로딩 오버레이 (RegisterPetPage에서 가져옴) --- */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-xl font-bold p-8 bg-sky-500 rounded-lg shadow-xl">
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
            <br />
            (최대 30초 소요)
          </div>
        </div>
      )}
      {/* --- 로딩 오버레이 끝 --- */}

      <section className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-6">
            AI 입양 추천
          </h1>

          {/* 탭 버튼 */}
          <div className="flex border-b border-slate-200 mb-8">
            <TabButton
              title="사진으로 찾기"
              isActive={searchMode === "image"}
              onClick={() => setSearchMode("image")}
            />
            <TabButton
              title="조건으로 찾기"
              isActive={searchMode === "criteria"}
              onClick={() => setSearchMode("criteria")}
            />
          </div>

          {/* 탭 내용 */}
          {searchMode === "image" ? (
            <ImageSearchTab setIsLoading={setIsLoading} navigate={navigate} />
          ) : (
            <CriteriaSearchTab
              setIsLoading={setIsLoading}
              navigate={navigate}
            />
          )}
        </div>
      </section>
    </main>
  );
}

// --- 1. 사진으로 찾기 탭 컴포넌트 ---
function ImageSearchTab({ setIsLoading, navigate }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // 사진 변경 (RegisterPetPage 로직 재사용)
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

  // 사진으로 검색 제출 (RegisterPetPage의 AI 로직 재사용)
  const handleSubmitImageSearch = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      alert("유사도를 검색할 사진을 업로드해 주세요.");
      return;
    }
    setIsLoading(true);

    try {
      const imageBase64 = await fileToBase64(photoFile);

      // AI 서버(`/api/search`) 호출
      const aiResp = await fetch(`http://211.188.57.154:5000/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });

      if (!aiResp.ok) {
        const errorData = await aiResp.json().catch(() => ({}));
        throw new Error(errorData.error || `AI 서버 오류: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();

      // 결과 페이지(SearchResultPage.jsx)로 이동
      navigate("/search-results", { state: { results: aiData.results } });
    } catch (err) {
      console.error("AI 검색 실패:", err);
      alert("AI 서버 요청 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmitImageSearch}>
      <p className="text-slate-600 mb-4">
        입양을 원하는 동물과 가장 닮은 사진을 업로드해 주세요. AI가 생김새가
        비슷한 동물을 찾아드립니다.
      </p>
      {/* 사진 등록 UI (RegisterPetPage 재사용) */}
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
              {/* ... (SVG 아이콘 등은 RegisterPetPage에서 복사) ... */}
              <p className="text-sm text-slate-500">
                <span className="font-semibold">클릭하여 파일 선택</span>
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
      <div className="flex justify-end pt-6">
        <button
          type="submit"
          className="px-8 py-3 text-lg font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500 disabled:opacity-50"
          disabled={!photoFile} // 사진이 있어야 버튼 활성화
        >
          사진으로 검색
        </button>
      </div>
    </form>
  );
}

// --- 2. 조건으로 찾기 탭 컴포넌트 ---
function CriteriaSearchTab({ setIsLoading, navigate }) {
  // 폼 상태 (Task 3 가이드라인 기반)
  const [species, setSpecies] = useState("개"); // (필수)
  const [age, setAge] = useState("");
  const [bodySize, setBodySize] = useState("");
  const [furColor, setFurColor] = useState("");
  const [furLength, setFurLength] = useState("");
  const [breed, setBreed] = useState("");

  // 조건으로 검색 제출 (Task 4)
  const handleCriteriaSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. (핵심) 폼 데이터를 기반으로 '자연어 문장' 자동 생성
    let queryParts = [];
    if (species) queryParts.push(`${species}`);
    if (age) queryParts.push(`${age} 나이대의`);
    if (bodySize) queryParts.push(`${bodySize} 체형의`);
    if (furColor) queryParts.push(`${furColor} 털을 가진`);
    if (furLength) queryParts.push(`${furLength}의`);
    if (breed.trim()) queryParts.push(`품종은 ${breed.trim()}을(를) 닮은`);

    // "개 성체 나이대의 소형 체형의 흰색 털을 가진 단모의 동물을 찾고 싶어요."
    const query_text = queryParts.join(" ") + " 동물을 찾고 싶어요.";

    if (queryParts.length === 0) {
      alert("하나 이상의 조건을 선택/입력해주세요.");
      setIsLoading(false);
      return;
    }

    console.log("생성된 쿼리:", query_text);

    try {
      // 2. '/api/adapt' 호출
      const aiResp = await fetch(`http://211.188.57.154:5000/api/adapt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query_text }), // ◀ 자동 생성된 텍스트 전송
      });

      if (!aiResp.ok) {
        const errorData = await aiResp.json().catch(() => ({}));
        throw new Error(errorData.error || `AI 서버 오류: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();

      // 3. (Task 4) 동일한 결과 페이지(SearchResultPage.jsx)로 이동
      navigate("/search-results", { state: { results: aiData.results } });
    } catch (err) {
      console.error("AI 추천 실패:", err);
      alert("AI 서버 요청 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 헬퍼: SelectBox UI
  const FormSelect = ({ label, value, onChange, children }) => (
    <div>
      <label className="block text-lg font-bold text-slate-800 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white"
      >
        {children}
      </select>
    </div>
  );

  // 헬퍼: TextInput UI
  const FormInput = ({ label, value, onChange, placeholder }) => (
    <div>
      <label className="block text-lg font-bold text-slate-800 mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form className="space-y-6" onSubmit={handleCriteriaSubmit}>
      <p className="text-slate-600 mb-4">
        원하는 동물의 특징을 선택해 주세요. AI가 사용자의 조건과 가장 일치하는
        동물을 추천해 드립니다.
      </p>

      {/* 폼 항목 (Task 3 가이드라인) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSelect
          label="종류 (필수)"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        >
          <option value="개">개</option>
          <option value="고양이">고양이</option>
        </FormSelect>

        <FormSelect
          label="나이 (선택)"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        >
          <option value="">(선택 안 함)</option>
          <option value="새끼">새끼 (Baby)</option>
          <option value="성체">성체 (Adult)</option>
          <option value="노견/노묘">노견/노묘 (Senior)</option>
        </FormSelect>

        <FormSelect
          label="체형 (선택)"
          value={bodySize}
          onChange={(e) => setBodySize(e.target.value)}
        >
          <option value="">(선택 안 함)</option>
          <option value="소형">소형</option>
          <option value="중형">중형</option>
          <option value="대형">대형</option>
        </FormSelect>

        <FormSelect
          label="털 길이 (선택)"
          value={furLength}
          onChange={(e) => setFurLength(e.target.value)}
        >
          <option value="">(선택 안 함)</option>
          <option value="단모(짧은 털)">단모 (짧은 털)</option>
          <option value="장모(긴 털)">장모 (긴 털)</option>
        </FormSelect>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="털 색 (선택)"
          value={furColor}
          onChange={(e) => setFurColor(e.target.value)}
          placeholder="예) 흰색, 갈색, 치즈"
        />
        <FormInput
          label="품종 (선택)"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          placeholder="예) 푸들, 코숏"
        />
      </div>

      <div className="flex justify-end pt-6">
        <button
          type="submit"
          className="px-8 py-3 text-lg font-bold text-white bg-sky-400 rounded-lg hover:bg-sky-500"
        >
          조건으로 검색
        </button>
      </div>
    </form>
  );
}
