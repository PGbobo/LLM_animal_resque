// src/contexts/AuthContext.jsx (전체 코드)

import React, { useState, useEffect } from "react";
import { AuthContext } from "../hooks/useAuth.js";
import {
  loginUser,
  logoutUser as apiLogout,
  googleLogin,
} from "../services/api";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(sessionStorage.getItem("authToken"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ⭐️ [수정된 useEffect] 로직 결함을 수정한 코드
  useEffect(() => {
    // (A) 토큰이 없는 경우 (로그아웃 상태)
    if (!token) {
      setUser(null);
      setLoading(false); // ◀ 로딩 끝 (앱 표시)
      return; // (B) 실행 안 함
    }

    // (B) 토큰이 있는 경우 (로그인 상태 또는 새로고침)
    const fetchUserOnLoad = async () => {
      try {
        // 1. API를 호출하여 토큰이 유효한지 '검증'합니다.
        const response = await fetch(
          "http://211.188.57.154:4000/api/users/me",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();

        if (data.success) {
          // 2. (성공) 최신 유저 정보를 저장합니다.
          setUser(data.user);
          sessionStorage.setItem("authUser", JSON.stringify(data.user));
        } else {
          // 3. (실패) 토큰이 만료되었거나 유효하지 않습니다.
          throw new Error(data.message);
        }
      } catch (error) {
        // 4. (예외) API 호출 실패 시, 모든 인증 정보를 삭제합니다.
        console.error("자동 로그인(토큰 검증) 실패:", error.message);
        setUser(null);
        setToken(null); // ◀ token을 null로 바꿔서 이 useEffect가 다시 실행되게 함 (A)
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("authUser");
      } finally {
        // 5. (핵심) API가 성공하든, 실패하든, 로딩을 'false'로 설정합니다.
        setLoading(false); // ◀ 로딩 끝 (앱 표시)
      }
    };

    fetchUserOnLoad(); // (B) 함수 실행
  }, [token]);

  // 5. ⭐️ [수정] 일반 로그인 함수
  const login = async (id, password) => {
    // (setLoading(true/false) 코드를 '전부' 제거합니다.)
    try {
      const response = await loginUser({ id, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      // ⭐️ (수정) sessionStorage에 먼저 저장
      sessionStorage.setItem("authToken", receivedToken);
      sessionStorage.setItem("authUser", JSON.stringify(receivedUser));

      // ⭐️ (수정) setToken을 '마지막에' 호출합니다.
      // 1. 이 함수가 'useEffect' 훅을 트리거합니다.
      // 2. 'useEffect' 훅이 알아서 loading 상태를 관리하고 user를 설정할 것입니다.
      setToken(receivedToken);

      return true;
    } catch (error) {
      // ⭐️ (수정) 실패 시, 모든 상태를 null로 초기화
      apiLogout();
      setUser(null);
      setToken(null);
      setLoading(false); // (실패 시에는 로딩을 수동으로 꺼줌)
      throw error;
    }
  };

  // 6. ⭐️ [수정] 구글 로그인 함수 (login과 동일하게 수정)
  const loginWithGoogle = async (credential) => {
    // (setLoading(true/false) 코드를 '전부' 제거합니다.)
    try {
      const response = await googleLogin(credential);
      const { token: receivedToken, user: receivedUser } = response.data;

      sessionStorage.setItem("authToken", receivedToken);
      sessionStorage.setItem("authUser", JSON.stringify(receivedUser));

      // ⭐️ setToken을 마지막에 호출 (useEffect 트리거)
      setToken(receivedToken);

      return true;
    } catch (error) {
      apiLogout();
      setUser(null);
      setToken(null);
      setLoading(false);
      throw error;
    }
  };

  // 로그아웃
  const logout = () => {
    apiLogout();
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    setToken(null); // useEffect 트리거
    alert("로그아웃 되었습니다.");
  };

  const value = {
    isLoggedIn: !!token,
    user,
    token,
    loading,
    login,
    loginWithGoogle,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
