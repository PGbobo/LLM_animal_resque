// src/hooks/useAuth.js

import { useContext, createContext } from "react"; // 1. createContext를 import합니다.

// 2. AuthContext를 여기서 생성하고 export합니다.
export const AuthContext = createContext();

// 3. useAuth 훅을 여기서 정의하고 export합니다.
export const useAuth = () => {
  return useContext(AuthContext);
};
