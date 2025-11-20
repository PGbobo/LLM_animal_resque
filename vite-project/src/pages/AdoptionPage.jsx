// src/pages/AdoptionPage.jsx (최종 개선판)

import React, { useState, useEffect } from "react"; // useEffect 추가
import { useNavigate } from "react-router-dom";

// ---------------------------------------------------------------------
// 1. (버그 해결) 컴포넌트들을 메인 함수 밖으로 이동
// ---------------------------------------------------------------------

// 헬퍼: File -> Base64
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

// 헬퍼: 탭 버튼
const TabButton = ({ title, isActive, onClick }) => (
  <button
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

// 헬퍼: SelectBox UI (함수 밖으로 이동하여 포커스 잃는 버그 해결)
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

// 헬퍼: TextInput UI (함수 밖으로 이동하여 포커스 잃는 버그 해결)
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
// 2. 탭 내부 컴포넌트들
// ---------------------------------------------------------------------

// [사진으로 찾기]
function ImageSearchTab({ setIsLoading, navigate }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

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

  const handleSubmitImageSearch = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      alert("유사도를 검색할 사진을 업로드해 주세요.");
      return;
    }
    setIsLoading(true);

    try {
      const imageBase64 = await fileToBase64(photoFile);
      const aiResp = await fetch(`http://localhost:4000/api/proxy/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });

      if (!aiResp.ok) {
        const errorData = await aiResp.json().catch(() => ({}));
        throw new Error(errorData.error || `AI 서버 오류: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();
      navigate("/search-results", {
        state: {
          results: aiData.results,
          source: "adopt",
          returnTo: "/adopt",
        },
      });
    } catch (err) {
      console.error("AI 검색 실패:", err);
      alert("AI 서버 요청 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmitImageSearch} className="animate-fade-in">
      <p className="text-slate-600 mb-4">
        원하는 동물과 가장 닮은 사진을 올려주세요. AI가 분석하여 비슷한 친구를
        찾아드립니다.
      </p>
      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-sky-300 border-dashed rounded-lg cursor-pointer bg-sky-50 hover:bg-sky-100 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="미리보기"
              className="max-h-48 rounded-md mb-4 object-contain"
            />
          ) : (
            <>
              <svg
                className="w-10 h-10 mb-4 text-sky-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-slate-500">
                <span className="font-semibold">클릭하여 사진 업로드</span>
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
          className="px-8 py-4 text-xl font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
          disabled={!photoFile}
        >
          사진으로 찾기
        </button>
      </div>
    </form>
  );
}

// [조건 + 문장 하이브리드 찾기]
function CriteriaSearchTab({ setIsLoading, navigate }) {
  // 폼 상태
  const [species, setSpecies] = useState("개");
  const [age, setAge] = useState("");
  const [bodySize, setBodySize] = useState("");
  const [furColor, setFurColor] = useState("");
  const [furLength, setFurLength] = useState("");
  const [breed, setBreed] = useState("");

  // ◀◀ [신규] 최종 검색어 (TextArea용)
  const [finalQuery, setFinalQuery] = useState("");

  // ◀◀ [신규] 폼이 바뀔 때마다 문장을 자동으로 조합 (자동완성)
  useEffect(() => {
    let parts = [];
    // (자연스러운 문장 연결을 위해 조사 처리 등은 생략하고 간단히 나열)
    parts.push(species);
    if (age) parts.push(`${age} 나이대의`);
    if (bodySize) parts.push(`${bodySize} 체형의`);
    if (furLength) parts.push(`${furLength}의`);
    if (furColor) parts.push(`${furColor} 털을 가진`);
    if (breed) parts.push(`품종은 ${breed}인`);

    // 기본 문장 생성
    let autoSentence = parts.join(" ") + " 동물을 찾고 싶어요.";
    setFinalQuery(autoSentence);
  }, [species, age, bodySize, furLength, furColor, breed]);

  // 검색 제출
  const handleCriteriaSubmit = async (e) => {
    e.preventDefault();

    // (유효성 검사: 너무 짧으면 거절)
    if (finalQuery.trim().length < 5) {
      alert("검색 내용을 조금 더 자세히 적어주세요.");
      return;
    }

    setIsLoading(true);
    console.log("최종 전송 쿼리:", finalQuery);

    try {
      const aiResp = await fetch(`http://localhost:4000/api/proxy/adapt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query_text: finalQuery }), // ◀ 수정한 문장을 그대로 전송
      });

      if (!aiResp.ok) {
        const errorData = await aiResp.json().catch(() => ({}));
        throw new Error(errorData.error || `AI 서버 오류: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();

      navigate("/search-results", {
        state: {
          results: aiData.results,
          source: "adopt",
          returnTo: "/adopt",
        },
      });
    } catch (err) {
      console.error("AI 추천 실패:", err);
      alert("AI 서버 요청 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-8 animate-fade-in" onSubmit={handleCriteriaSubmit}>
      {/* 1. 조건 선택 영역 (배경색으로 구분) */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
          <span className="bg-sky-400 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">
            1
          </span>
          기본 조건 선택
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <FormSelect
            label="종류"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            <option value="개">개 (Dog)</option>
            <option value="고양이">고양이 (Cat)</option>
          </FormSelect>

          <FormSelect
            label="나이"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="">(선택 안 함)</option>
            <option value="새끼">새끼 (Baby)</option>
            <option value="성체">성체 (Adult)</option>
          </FormSelect>

          <FormSelect
            label="체형"
            value={bodySize}
            onChange={(e) => setBodySize(e.target.value)}
          >
            <option value="">(선택 안 함)</option>
            <option value="소형">소형</option>
            <option value="중형">중형</option>
            <option value="대형">대형</option>
          </FormSelect>

          <FormSelect
            label="털 길이"
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
            label="털 색"
            value={furColor}
            onChange={(e) => setFurColor(e.target.value)}
            placeholder="예) 흰색, 갈색, 검정"
          />
          <FormInput
            label="품종"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="예) 말티즈, 리트리버"
          />
        </div>
      </div>

      {/* 2. 문장 확인 및 수정 영역 (핵심 기능) */}
      <div className="bg-sky-50 p-6 rounded-xl border border-sky-100">
        <h3 className="text-lg font-bold text-sky-600 mb-2 flex items-center">
          <span className="bg-sky-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">
            2
          </span>
          AI에게 보낼 요청 메시지 (수정 가능)
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          위에서 선택한 조건이 아래에 자동으로 문장으로 만들어집니다.
          <br />
          <strong>원하는 내용을 자유롭게 추가하거나 수정해보세요!</strong> (예:
          "귀가 쫑긋했으면 좋겠어")
        </p>
        <textarea
          className="w-full h-32 p-4 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white text-lg text-slate-800 resize-none"
          value={finalQuery}
          onChange={(e) => setFinalQuery(e.target.value)} // ◀ 사용자가 직접 수정 가능
        ></textarea>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-4 text-xl font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
        >
          AI 추천 받기
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// 3. 메인 페이지 컴포넌트
// ---------------------------------------------------------------------
export default function AdoptionPage() {
  const [searchMode, setSearchMode] = useState("image");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="pt-28 pb-16 bg-slate-50 min-h-screen">
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
          <div className="text-white text-xl font-bold p-8 bg-sky-500 rounded-lg shadow-xl flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-white mb-4"
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
            <span>AI가 열심히 분석하고 있어요...</span>
          </div>
        </div>
      )}

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
