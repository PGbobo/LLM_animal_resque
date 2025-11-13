// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google"; // 🔥 구글 OAuth Provider
import "./index.css";

// 🔥 구글 클라이언트 ID (백엔드와 동일한 ID 사용)
const GOOGLE_CLIENT_ID =
  "803832164097-u1ih0regpfsemh8truu5pn9kgb65qg1t.apps.googleusercontent.com";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* 🔥 GoogleOAuthProvider로 전체 앱을 감싸기 */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
