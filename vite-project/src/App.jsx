// src/App.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router";
import Layout from "./components/layout/Layout.jsx";
import { BrowserRouter } from "react-router-dom";

// ✅ 수정된 부분: 정확한 경로 (src/contexts/AuthContext.jsx)에서 AuthProvider를 import 합니다.
import { AuthProvider } from "./contexts/AuthContext";

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

// 마이페이지
import EditProfilePage from "./pages/mypage/EditProfilePage.jsx";
import MyPetsPage from "./pages/mypage/MyPetsPage.jsx";

function App() {
  return (
    <BrowserRouter>
      {/* ✅ AuthProvider로 Routes 전체를 감싸서 useAuth 훅이 정상 작동하도록 합니다. */}
      <AuthProvider>
        <Routes>
          {/* 공통 레이아웃 (Header/Footer 포함) */}
          <Route path="/" element={<Layout />}>
            {/* 홈 */}
            <Route index element={<MainPage />} />

            {/* 소개 */}
            <Route path="IntroPage" element={<IntroPage />} />

            {/* 실종/제보/유기 */}
            <Route path="register-pet" element={<RegisterPetPage />} />
            <Route path="report-sighting" element={<ReportPage />} />
            <Route path="reported-pets" element={<LiveCheckPage />} />
            <Route path="abandoned-pets" element={<StrayDogPage />} />

            {/* ✅ 보호소 / 병원 페이지 추가 */}
            <Route path="shelters" element={<ShelterPage />} />
            <Route path="hospitals" element={<HospitalPage />} />

            {/* ✅ 마이페이지 */}
            <Route path="mypage/edit" element={<EditProfilePage />} />
            <Route path="mypage/pets" element={<MyPetsPage />} />
            <Route path="shelters" element={<ShelterPage />} />
            <Route path="hospitals" element={<HospitalPage />} />

            {/* ✅ 커뮤니티 상세 페이지 */}
            <Route path="community" element={<CommunityListPage />} />
            <Route path="community/:postId" element={<CommunityDetailPage />} />

            {/* 잘못된 경로 → 홈으로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
