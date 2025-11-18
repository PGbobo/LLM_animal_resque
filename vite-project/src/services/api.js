// src/services/api.js

import axios from "axios";

const API_BASE_URL = "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터: 모든 요청에 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 일반 로그인
export const loginUser = async (credentials) => {
  return await api.post("/login", credentials);
};

// ⭐️ 구글 소셜 로그인
export const googleLogin = async (credential) => {
  return await api.post("/auth/google", { credential });
};

// 로그아웃
export const logoutUser = () => {
  sessionStorage.removeItem("authToken");
};

// 회원가입
export const registerUser = async (userData) => {
  return await api.post("/register", userData);
};

// 실종동물 등록
export const registerLostPet = async (petData) => {
  return await api.post("/lost-pets", petData);
};

// 동물 제보 등록
export const registerReport = async (reportData) => {
  return await api.post("/reports", reportData);
};

// 유기견 목록 조회
export const getStrayDogs = async () => {
  return await api.get("/stray-dogs");
};

// ⭐️ [신규] 내 실종 동물 목록 조회 (USER_NUM 기준)
export const getMyLostPets = async () => {
  // 토큰은 인터셉터에서 자동으로 추가됩니다.
  return await api.get("/mypets");
};

// ⭐️ [신규] 내 실종 동물 삭제
export const deleteMyLostPet = async (petId) => {
  // petId를 경로에 포함하여 삭제 요청 (인증은 인터셉터에서 처리)
  return await api.delete(`/mypets/${petId}`);
};

export default api;
