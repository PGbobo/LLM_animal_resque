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
      // 1. 토큰이 존재하면, API를 호출하여 토큰이 유효한지 '검증'합니다.
      // (sessionStorage의 유저 정보가 오래되었을 수 있으므로, API 호출은 필요합니다.)
      try {
        const response = await fetch("http://localhost:4000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.success) {
          // 2. (성공) 토큰이 유효하므로, 최신 유저 정보를 저장합니다.
          setUser(data.user);
          sessionStorage.setItem("authUser", JSON.stringify(data.user));
        } else {
          // 3. (실패) 토큰이 만료되었거나 유효하지 않습니다.
          throw new Error(data.message);
        }
      } catch (error) {
        // 4. (예외) API 호출에 실패하면(네트워크 오류, 만료된 토큰 등)
        console.error("자동 로그인(토큰 검증) 실패:", error.message);
        // 모든 인증 정보를 삭제합니다.
        setToken(null);
        setUser(null);
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("authUser");
      } finally {
        // 5. ⭐️ (핵심) API가 성공하든, 실패하든, finally 블록은 '반드시' 실행됩니다.
        // 여기서 로딩 상태를 false로 바꿔 "무한 로딩" 버그를 해결합니다.
        setLoading(false);
      }
    };

    // 6. ⭐️ (수정된 조건)
    if (token) {
      // 토큰이 있으면 '검증' 함수를 실행합니다.
      fetchUserOnLoad();
    } else {
      // 토큰이 아예 없으면, 검증할 필요도 없으므로 즉시 로딩을 해제합니다.
      setLoading(false);
    }

    // 7. 의존성 배열은 [token]으로 유지합니다.
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
