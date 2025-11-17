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
  const [user, setUser] = useState(() => {
    try {
      const storedUser = sessionStorage.getItem("authUser");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // ⭐️ [수정된 useEffect] 초기 로딩 시에만 토큰 검증을 수행하도록 로직 개선
  useEffect(() => {
    const fetchUserOnLoad = async () => {
      // ⚠️ loading 상태가 이미 false라면 초기화 로직을 다시 실행하지 않음
      if (!loading && token) {
        setLoading(true); // 다시 로딩 시작
      }

      if (token) {
        try {
          const response = await fetch("http://localhost:4000/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();

          if (data.success) {
            setUser(data.user);
            sessionStorage.setItem("authUser", JSON.stringify(data.user));
          } else {
            throw new Error(data.message);
          }
        } catch (error) {
          console.error("자동 로그인(토큰 검증) 실패:", error.message);
          setToken(null);
          setUser(null);
          sessionStorage.removeItem("authToken");
          sessionStorage.removeItem("authUser");
        }
      }
      // ⭐️ 토큰 검증 완료 후 loading을 false로 설정 (가장 중요)
      setLoading(false);
    };

    // 토큰이 있지만 user 정보가 로드되지 않은 상태이거나 초기 로드일 때 실행
    if (token && !user) {
      fetchUserOnLoad();
    } else if (!token) {
      // 토큰이 없으면 바로 로딩 해제
      setLoading(false);
    }
    // 의존성 배열에서 user를 제거하고 token만 유지. (user는 fetchUserOnLoad 안에서 설정)
  }, [token]);

  // 일반 로그인
  const login = async (id, password) => {
    try {
      const response = await loginUser({ id, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      // ⭐️ [핵심 수정] 로그인 성공 시, loading을 일시적으로 true로 설정하여
      //    아래 setToken에 의해 useEffect가 재실행되어도 토큰을 바로 무효화하는 것을 방지
      setLoading(true);

      setToken(receivedToken);
      setUser(receivedUser);
      sessionStorage.setItem("authToken", receivedToken);
      sessionStorage.setItem("authUser", JSON.stringify(receivedUser));

      // ⭐️ [핵심 수정] 모든 상태 설정이 끝난 후, loading을 false로 되돌립니다.
      setLoading(false);

      return true;
    } catch (error) {
      console.error("AuthContext 로그인 에러:", error);
      apiLogout();
      setUser(null);
      setToken(null);
      setLoading(false); // 실패 시에도 loading은 false로 해제
      throw error;
    }
  };

  // 구글 로그인
  const loginWithGoogle = async (credential) => {
    try {
      const response = await googleLogin(credential);
      const { token: receivedToken, user: receivedUser } = response.data;

      // ⭐️ [핵심 수정] 로그인 성공 시, loading을 일시적으로 true로 설정
      setLoading(true);

      setToken(receivedToken);
      setUser(receivedUser);
      sessionStorage.setItem("authToken", receivedToken);
      sessionStorage.setItem("authUser", JSON.stringify(receivedUser));

      // ⭐️ [핵심 수정] 모든 상태 설정이 끝난 후, loading을 false로 되돌립니다.
      setLoading(false);

      return true;
    } catch (error) {
      console.error("AuthContext 구글 로그인 에러:", error);
      apiLogout();
      setUser(null);
      setToken(null);
      setLoading(false); // 실패 시에도 loading은 false로 해제
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
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
