// src/main.js (또는 main.jsx)

import React from "react";
import ReactDOM from "react-dom/client"; // React DOM 클라이언트를 불러옵니다.
import App from "./App.jsx"; // 1. 메인 App 컴포넌트를 불러옵니다.
import { AuthProvider } from "./contexts/AuthContext.jsx"; // 2. 로그인 Context를 불러옵니다.
import "./index.css";

// 3. index.html에서 id가 'root'인 요소를 찾습니다.
const rootElement = document.getElementById("root");

// 4. React가 제어할 수 있는 Root를 생성합니다.
const root = ReactDOM.createRoot(rootElement);

// 5. Root에 React 앱을 렌더링합니다.
// <AuthProvider>로 <App>을 감싸서 앱 전체에서 로그인 상태를 공유합니다.
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
