// src/contexts/AuthContext.jsx (수정된 전체 코드)

import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "../hooks/useAuth.js";
// 1. api.js에서 실제 API 함수들을 가져옵니다.
import { loginUser, logoutUser as apiLogout } from "../services/api";
// import api from "../services/api"; // (토큰 검증용)

// 2. AuthProvider만 export 하는 것은 동일합니다.
export function AuthProvider({ children }) {
  // 3. 로그인 상태를 'isLoggedIn'(boolean) 대신 'token'과 'user' 객체로 관리합니다.
  // 🔽 [수정] localStorage -> sessionStorage
  const [token, setToken] = useState(sessionStorage.getItem("authToken"));
  const [user, setUser] = useState(null); // 사용자 정보(닉네임 등) 저장
  const [loading, setLoading] = useState(true); // 앱 첫 로딩 시 인증 확인용

  // 4. [핵심] login 함수를 API 호출용 async 함수로 수정
  const login = async (id, password) => {
    try {
      // 4-1. api.js의 loginUser 함수로 백엔드에 로그인 요청
      const response = await loginUser({ id, password });

      const { token: receivedToken, user: receivedUser } = response.data;

      // 4-2. 로그인 성공: Context 상태 및 sessionStorage에 저장
      setToken(receivedToken);
      setUser(receivedUser);
      // 🔽 [수정] localStorage -> sessionStorage
      sessionStorage.setItem("authToken", receivedToken);

      return true; // LoginModal.jsx에 성공(true) 반환
    } catch (error) {
      // 4-3. 로그인 실패
      console.error("AuthContext 로그인 에러:", error);
      apiLogout(); // 토큰/상태 모두 클리어
      setUser(null);
      setToken(null);
      throw error; // LoginModal.jsx가 에러를 잡을 수 있게 전달
    }
  };

  // 5. [핵심] logout 함수도 sessionStorage 기준으로 수정
  const logout = () => {
    apiLogout(); // api.js의 logoutUser (sessionStorage 토큰 삭제)
    setUser(null);
    setToken(null);
    alert("로그아웃 되었습니다.");
  };

  // 6. (선택사항) 앱이 처음 켜질 때, 토큰이 유효한지 검사하는 기능
  useEffect(() => {
    if (token) {
      // TODO: 백엔드에 /me API(내 정보 API)를 만들어
      // 토큰이 진짜 유효한지 검사하고, user 정보를 받아오는 로직이 필요합니다.
      // (현재는 로그인 시 받아온 user 정보가 다음 접속 시 null인 상태로 시작됩니다.
      //  -> 이 부분은 이번 요청에서 index.js를 수정하여 해결했습니다.)
      console.log("기존 토큰이 있어 로그인 상태로 시작합니다.");
    }
    setLoading(false); // 로딩 완료
  }, [token]);

  // 7. 앱 전체에 공유할 값들 (isLoggedIn, user, token 등)
  const value = {
    isLoggedIn: !!token, // token이 있으면 true
    user,
    token,
    login,
    logout,
  };

  // loading이 false일 때만 자식 컴포넌트(앱)를 렌더링
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
