// src/hooks/useAuth.jsx (수정된 최종본)

import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 1. Context 생성 (기존 useAuth.js의 내용 포함)
const AuthContext = createContext(null);

// 2. AuthProvider 컴포넌트 (기존 AuthContext.jsx의 내용 포함)
export function AuthProvider({ children }) {
  const [token, setToken] = useState(sessionStorage.getItem("authToken"));
  // ⭐️ [수정] user 상태는 백엔드가 주는 user 객체 전체를 저장
  // (예: { id, userNum, nickname, ... })
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // [수정] 앱 첫 로드 시 토큰으로 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserOnLoad = async () => {
      if (token) {
        try {
          // ⭐️ 백엔드 /api/users/me 호출 (index.js에 구현됨)
          const response = await fetch("http://localhost:4000/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();

          if (data.success) {
            // ⭐️ [수정] id, nickname만 저장하는 대신, user 객체 전체(userNum 포함)를 저장
            setUser(data.user);
          } else {
            throw new Error(data.message);
          }
        } catch (error) {
          console.error("자동 로그인(토큰 검증) 실패:", error.message);
          setToken(null);
          setUser(null);
          sessionStorage.removeItem("authToken");
        }
      }
      setLoading(false);
    };

    fetchUserOnLoad();
  }, [token]);

  // 4. login 함수 (LoginModal.jsx에서 호출)
  // (index.js의 /login API가 성공했을 때 호출됨)
  const login = (loginData) => {
    // loginData는 { token, user } 객체입니다. (user 객체엔 userNum이 포함되어 있음)
    const { token: receivedToken, user: receivedUser } = loginData;

    setToken(receivedToken);
    // ⭐️ [수정] receivedUser 객체 전체(userNum 포함)를 상태에 저장
    setUser(receivedUser);
    sessionStorage.setItem("authToken", receivedToken);

    return true;
  };

  // 5. logout 함수 (기존과 동일)
  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("authToken");
    alert("로그아웃 되었습니다.");
    navigate("/");
  };

  // 6. Context 값 제공 (기존과 동일)
  const value = {
    token,
    user, // ⭐️ user 객체 전체 (id, userNum, nickname 등)
    loading,
    isLoggedIn: !!token,
    login,
    logout,
  };

  // 7. loading 중일 때 children 렌더링 방지 (기존과 동일)
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 8. useAuth 훅 (기존 useAuth.js의 내용 포함)
export const useAuth = () => {
  return useContext(AuthContext);
};
