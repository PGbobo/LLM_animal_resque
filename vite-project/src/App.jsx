// src/App.jsx

import { useEffect, useRef } from "react"; // ⭐️ useRef를 import합니다.
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
import MissingCheckPage from "./pages/MissingCheckPage.jsx";
import WitnessCheckPage from "./pages/WitnessCheckPage.jsx";
import CommunityListPage from "./pages/community/CommunityListPage.jsx";
import CommunityDetailPage from "./pages/community/CommunityDetailPage.jsx";
import CommunityWritePage from "./pages/community/CommunityWritePage.jsx";
import CommunityEditPage from "./pages/community/CommunityEditPage.jsx";
import SearchResultPage from "./pages/SearchResultPage.jsx";
import AdoptionPage from "./pages/AdoptionPage.jsx";
import EditProfilePage from "./pages/mypage/EditProfilePage.jsx";
import MyPetsPage from "./pages/mypage/MyPetsPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

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
  useEffect(() => {
    if (!isLoggedIn && !isAlertShown.current) {
      // 경고 메시지 출력
      alert("로그인이 필요한 서비스입니다.");

      // Ref 값을 true로 설정하여 다시는 출력되지 않도록 합니다.
      isAlertShown.current = true;
    }

    // 로그인 성공 시 Ref 값을 false로 재설정
    if (isLoggedIn) {
      isAlertShown.current = false;
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    // 로그인 실패 시 홈으로 리다이렉션
    return <Navigate to="/" replace />;
  }

  // 로그인된 경우, 요청한 컴포넌트를 렌더링합니다.
  return <Element {...rest} />;
};

const AdminRoute = ({ element: Element, ...rest }) => {
  const { isLoggedIn, loading, user } = useAuth(); // (user를 추가로 가져옴)

  if (loading) {
    return null; // (로딩 중엔 아무것도 안 보여줌)
  }

  // 1. 로그인을 안 했거나, 2. 관리자(ADMIN)가 아닌 경우
  if (!isLoggedIn || user.role !== "ADMIN") {
    // (권한이 없으므로 경고창 띄우고 홈으로 쫓아냄)
    alert("접근 권한이 없습니다.");
    return <Navigate to="/" replace />;
  }

  // (성공) 관리자이면, 요청한 컴포넌트(AdminPage)를 렌더링
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
            <Route path="missing-pets" element={<MissingCheckPage />} />
            <Route path="witness-pets" element={<WitnessCheckPage />} />
            <Route path="abandoned-pets" element={<StrayDogPage />} />

            {/* 마이페이지 */}
            <Route path="mypage/edit" element={<EditProfilePage />} />
            <Route path="mypage/pets" element={<MyPetsPage />} />

            {/* 커뮤니티 - 로그인 보호 적용 */}
            <Route
              path="community"
              element={<ProtectedRoute element={CommunityListPage} />}
            />
            <Route
              path="community/:postNum"
              element={<ProtectedRoute element={CommunityDetailPage} />}
            />
            <Route
              path="community/write"
              element={<ProtectedRoute element={CommunityWritePage} />}
            />
            <Route
              path="community/edit/:postNum"
              element={<ProtectedRoute element={CommunityEditPage} />}
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

            {/* 관리자 페이지 라우트 추가 */}
            <Route path="admin" element={<AdminRoute element={AdminPage} />} />

            {/* 잘못된 경로 → 홈으로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
