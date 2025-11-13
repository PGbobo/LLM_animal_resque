// src/contexts/AuthContext.jsx

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

  // 일반 로그인
  const login = async (id, password) => {
    try {
      const response = await loginUser({ id, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      setToken(receivedToken);
      setUser(receivedUser);
      sessionStorage.setItem("authToken", receivedToken);

      return true;
    } catch (error) {
      console.error("AuthContext 로그인 에러:", error);
      apiLogout();
      setUser(null);
      setToken(null);
      throw error;
    }
  };

  // ⭐️ 구글 로그인
  const loginWithGoogle = async (credential) => {
    try {
      const response = await googleLogin(credential);
      const { token: receivedToken, user: receivedUser } = response.data;

      setToken(receivedToken);
      setUser(receivedUser);
      sessionStorage.setItem("authToken", receivedToken);

      return true;
    } catch (error) {
      console.error("AuthContext 구글 로그인 에러:", error);
      apiLogout();
      setUser(null);
      setToken(null);
      throw error;
    }
  };

  // 로그아웃
  const logout = () => {
    apiLogout();
    setUser(null);
    setToken(null);
    alert("로그아웃 되었습니다.");
  };

  useEffect(() => {
    if (token) {
      console.log("기존 토큰이 있어 로그인 상태로 시작합니다.");
    }
    setLoading(false);
  }, [token]);

  const value = {
    isLoggedIn: !!token,
    user,
    token,
    login,
    loginWithGoogle, // ⭐️ 구글 로그인 함수 추가
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
