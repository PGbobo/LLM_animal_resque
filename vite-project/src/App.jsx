// src/App.jsx

import React, { useEffect, useRef } from "react"; // ⭐️ useRef를 import합니다.
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";

// AuthProvider, useAuth 훅을 가져옵니다.
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth.js";

// 페이지들
import MainPage from "./pages/MainPage.jsx";
import IntroPage from "./pages/IntroPage.jsx";
import RegisterPetPage from "./pages/RegisterPetPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import StrayDogPage from "./pages/StrayDogPage.jsx";
import LiveCheckPage from "./pages/LiveCheckPage.jsx";
import ShelterPage from "./pages/ShelterPage.jsx";
import HospitalPage from "./pages/HospitalPage.jsx";
import CommunityListPage from "./pages/community/CommunityListPage.jsx";
import CommunityDetailPage from "./pages/community/CommunityDetailPage.jsx";
import SearchResultPage from "./pages/SearchResultPage.jsx";
import AdoptionPage from "./pages/AdoptionPage.jsx";
import EditProfilePage from "./pages/mypage/EditProfilePage.jsx";
import MyPetsPage from "./pages/mypage/MyPetsPage.jsx";

// =========================================================================
// ⭐️ ProtectedRoute 컴포넌트 최종 수정: useRef를 사용하여 메시지 출력 횟수 제어
// =========================================================================
const ProtectedRoute = ({ element: Element, ...rest }) => {
  const { isLoggedIn, loading } = useAuth();

  // ⭐️ [추가] alert 메시지 출력 여부를 기록하는 Ref
  const isAlertShown = useRef(false);

  if (loading) {
    return null;
  }

  // ⭐️ [수정] 로그인되지 않은 경우
  if (!isLoggedIn) {
    useEffect(() => {
      // Ref를 확인하여 이 경로에 들어왔을 때 메시지를 한 번도 출력하지 않았으면 실행
      if (!isAlertShown.current) {
        // 경고 메시지 출력
        alert("로그인이 필요한 서비스입니다.");

        // Ref 값을 true로 설정하여 다시는 출력되지 않도록 합니다.
        isAlertShown.current = true;
      }
    }, [isLoggedIn]); // isLoggedIn이 false인 상태에서 한 번 실행

    // 로그인 실패 시 홈으로 리다이렉션
    return <Navigate to="/" replace />;
  }

  // ⭐️ [추가] 로그인 성공 시 (isLoggedIn이 true일 때):
  // Ref 값을 false로 재설정하여, 로그아웃 후 다시 접근할 때 메시지가 나오도록 준비
  useEffect(() => {
    isAlertShown.current = false;
  }, [isLoggedIn]); // isLoggedIn이 true로 바뀔 때 실행

  // 로그인된 경우, 요청한 컴포넌트를 렌더링합니다.
  return <Element {...rest} />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 공통 레이아웃 (Header/Footer 포함) */}
          <Route path="/" element={<Layout />}>
            {/* 홈 */}
            <Route index element={<MainPage />} />
            <Route path="IntroPage" element={<IntroPage />} />

            {/* 실종/제보/유기 - 로그인 보호 적용 */}
            <Route
              path="register-pet"
              element={<ProtectedRoute element={RegisterPetPage} />}
            />
            <Route
              path="report-sighting"
              element={<ProtectedRoute element={ReportPage} />}
            />

            {/* 로그인 없이 접근 가능 */}
            <Route path="reported-pets" element={<LiveCheckPage />} />
            <Route path="abandoned-pets" element={<StrayDogPage />} />

            {/* 보호소 / 병원 페이지 */}
            <Route path="shelters" element={<ShelterPage />} />
            <Route path="hospitals" element={<HospitalPage />} />

            {/* 마이페이지 */}
            <Route path="mypage/edit" element={<EditProfilePage />} />
            <Route path="mypage/pets" element={<MyPetsPage />} />

            {/* 커뮤니티 - 로그인 보호 적용 */}
            <Route
              path="community"
              element={<ProtectedRoute element={CommunityListPage} />}
            />
            <Route
              path="community/:postId"
              element={<ProtectedRoute element={CommunityDetailPage} />}
            />

            {/* 소셜 로그인 콜백 */}
            <Route
              path="auth/google/callback"
              element={<Navigate to="/" replace />}
            />

            {/* 검색 결과 페이지 */}
            <Route path="search-results" element={<SearchResultPage />} />

            {/* 입양 페이지 - 로그인 보호 적용 */}
            <Route
              path="adopt"
              element={<ProtectedRoute element={AdoptionPage} />}
            />

            {/* 잘못된 경로 → 홈으로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
