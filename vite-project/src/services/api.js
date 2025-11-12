import axios from "axios";

// 1단계에서 켠 백엔드 API 서버의 주소
const API_BASE_URL = "http://localhost:4000";

// 1. 기본 axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// [중요] API 요청을 보낼 때마다 자동으로 토큰을 헤더에 추가
api.interceptors.request.use(
  (config) => {
    // 🔽 [수정] localStorage -> sessionStorage
    const token = sessionStorage.getItem("authToken"); // 브라우저에 저장된 토큰
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ------------------------------------
// API 호출 함수들 (export가 붙어있는지 확인!)
// ------------------------------------

/**
 * 회원가입 API 호출
 */
export const registerUser = (userData) => {
  return api.post("/register", userData);
};

/**
 * 로그인 API 호출
 */
export const loginUser = (loginData) => {
  return api.post("/login", loginData);
};

/**
 * 로그아웃 (토큰 삭제)
 */
export const logoutUser = () => {
  // 🔽 [수정] localStorage -> sessionStorage
  sessionStorage.removeItem("authToken");
  // (필요시) 로그인 페이지로 강제 이동
  // window.location.href = '/login';
};

/**
 * [신규] 유기동물 목록 데이터 가져오기 (StrayDogPage용)
 */
export const getStrayDogs = () => {
  return api.get("/stray-dogs");
};

export default api;
