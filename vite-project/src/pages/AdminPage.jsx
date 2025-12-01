// src/pages/AdminPage.jsx (파일 전체를 덮어쓰세요)

import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";

// ◀◀ [신규] 4000번 서버 API 주소
const API_BASE = "http://211.188.57.154:4000";

// ---------------------------------------------------
// ◀◀ [신규] 관리자 페이지용 아이템 카드 (내부 컴포넌트)
// ---------------------------------------------------
const AdminItemCard = ({ item, type, onDelete }) => {
  // item 객체는 'missing'과 'reports'가 서로 다른 키 이름을 가지므로 정규화합니다.
  const title =
    type === "missing"
      ? `${item.petName} (${item.species || "정보없음"})`
      : `${item.title} (${item.dogCat || "정보없음"})`;

  const location = item.location || "장소 정보 없음";
  const imageUrl = item.img || "https://placehold.co/100x100?text=No+Img";

  return (
    <div className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* 1. 이미지 */}
      <img
        src={imageUrl}
        alt={title}
        className="w-24 h-24 rounded-md object-cover flex-shrink-0"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://placehold.co/100x100?text=Error";
        }}
      />
      {/* 2. 정보 (중간 영역) */}
      <div className="flex-grow overflow-hidden min-w-0">
        <h3 className="text-lg font-bold truncate" title={title}>
          {title}
        </h3>
        <p className="text-sm text-gray-600 truncate">
          <span className="font-semibold">ID:</span> {item.id}
        </p>
        <p className="text-sm text-gray-600 truncate">
          <span className="font-semibold">위치:</span> {location}
        </p>
      </div>
      {/* 3. 삭제 버튼 (오른쪽) */}
      <button
        onClick={() => onDelete(item.id)}
        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 self-start h-fit"
      >
        삭제
      </button>
    </div>
  );
};

// ---------------------------------------------------
// ◀◀ [수정] AdminPage 메인 컴포넌트
// ---------------------------------------------------
function AdminPage() {
  const { token } = useAuth();

  // ◀◀ [신규] 두 목록을 위한 상태
  const [missingPosts, setMissingPosts] = useState([]);
  const [reportPosts, setReportPosts] = useState([]);

  // ◀◀ [신규] 로딩 및 에러 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ◀◀ [신규] 페이지 로드 시 데이터를 한 번에 가져옴
  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. 실종 동물 목록 가져오기
        const missingRes = await fetch(`${API_BASE}/missing-posts`);
        const missingData = await missingRes.json();
        if (!missingData.success) throw new Error("실종 동물 목록 로딩 실패");
        setMissingPosts(missingData.data);

        // 2. 목격 제보 목록 가져오기
        const reportsRes = await fetch(`${API_BASE}/witness-posts`);
        const reportsData = await reportsRes.json();
        if (!reportsData.success) throw new Error("제보 목록 로딩 실패");
        setReportPosts(reportsData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []); // [] : 페이지가 처음 렌더링될 때 한 번만 실행

  // (수정) 실종 동물 삭제 함수
  const handleDeleteMissing = async (petId) => {
    if (!window.confirm(`[실종] ${petId}번 항목을 정말 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/delete/missing/${petId}`, // ◀ API 주소
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      alert("삭제 성공!");

      // ◀◀ [신규] 삭제 성공 시, API 다시 부르지 않고 React 상태에서만 제거 (빠른 반응)
      setMissingPosts((currentPosts) =>
        currentPosts.filter((pet) => pet.id !== petId)
      );
    } catch (err) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  // (수정) 제보 삭제 함수
  const handleDeleteReport = async (petId) => {
    if (!window.confirm(`[제보] ${petId}번 항목을 정말 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/delete/reports/${petId}`, // ◀ API 주소
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      alert("삭제 성공!");

      // ◀◀ [신규] 삭제 성공 시, React 상태에서 즉시 제거
      setReportPosts((currentPosts) =>
        currentPosts.filter((report) => report.id !== petId)
      );
    } catch (err) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  // ◀◀ [수정] 렌더링 (로딩/에러 처리 및 2단 그리드)
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
      <h1 className="text-3xl font-bold mb-6">관리자 페이지</h1>

      {/* 로딩 및 에러 핸들러 */}
      {loading && <p className="text-lg text-sky-600">데이터 로딩 중...</p>}
      {error && <p className="text-lg text-red-600">오류: {error}</p>}

      {/* 2단 그리드 레이아웃 (lg 이상) */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. 왼쪽 열 (실종 동물) */}
          <section id="admin-missing-list">
            <h2 className="text-2xl font-bold mb-4">
              실종 동물 목록 ({missingPosts.length}건)
            </h2>
            {/* 스크롤 가능한 목록 영역 */}
            <div className="space-y-4 max-h-[80vh] overflow-y-auto p-2 bg-gray-50 rounded-lg border">
              {missingPosts.length > 0 ? (
                missingPosts.map((pet) => (
                  <AdminItemCard
                    key={`missing-${pet.id}`}
                    item={pet}
                    type="missing"
                    onDelete={handleDeleteMissing}
                  />
                ))
              ) : (
                <p className="text-gray-500 p-4">
                  실종 등록된 동물이 없습니다.
                </p>
              )}
            </div>
          </section>

          {/* 2. 오른쪽 열 (목격 제보) */}
          <section id="admin-reports-list">
            <h2 className="text-2xl font-bold mb-4">
              목격 제보 목록 ({reportPosts.length}건)
            </h2>
            {/* 스크롤 가능한 목록 영역 */}
            <div className="space-y-4 max-h-[80vh] overflow-y-auto p-2 bg-gray-50 rounded-lg border">
              {reportPosts.length > 0 ? (
                reportPosts.map((report) => (
                  <AdminItemCard
                    key={`report-${report.id}`}
                    item={report}
                    type="reports"
                    onDelete={handleDeleteReport}
                  />
                ))
              ) : (
                <p className="text-gray-500 p-4">등록된 제보가 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
