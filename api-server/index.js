// [추가] Express 및 미들웨어 설정
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library"); // ⭐️ 구글 인증 라이브러리

const app = express();
const PORT = 4000;

// [추가] 필수 미들웨어 등록
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// 설정
// ----------------------------------------------------

const dbConfig = {
  host: "project-db-campus.smhrd.com",
  user: "campus_24IS_CLOUD3_p3_1",
  password: "smhrd1",
  database: "campus_24IS_CLOUD3_p3_1",
  port: 3307,
};

const JWT_SECRET_KEY = "my-project-secret-key";

// ⭐️ 구글 OAuth 클라이언트 설정
const GOOGLE_CLIENT_ID =
  "803832164097-u1ih0regpfsemh8truu5pn9kgb65qg1t.apps.googleusercontent.com"; // 🔥 Google Cloud Console에서 받은 클라이언트 ID
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ----------------------------------------------------
// 5) 회원가입 / 로그인
// ----------------------------------------------------

app.post("/register", async (req, res) => {
  console.log("회원가입 요청:", req.body);

  const { id, password, nickname, name, phone } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const conn = await mysql.createConnection(dbConfig);

    const sql = `
      INSERT INTO USERS
        (ID, PASSWORD, NICKNAME, NAME, PHONE, SOCIAL_LOGIN_TYPE, CREATED_AT)
      VALUES (?, ?, ?, ?, ?, 'GENERAL', NOW())
    `;

    await conn.execute(sql, [id, hashedPassword, nickname, name, phone]);
    await conn.end();

    return res.status(201).json({ success: true, message: "회원가입 성공" });
  } catch (error) {
    console.error("회원가입 에러:", error);
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

// 일반 로그인
app.post("/login", async (req, res) => {
  console.log("로그인 요청:", req.body);
  const { id, password } = req.body;
  let conn;

  if (!id || !password) {
    return res.status(400).json({
      success: false,
      message: "아이디와 비밀번호를 모두 입력해주세요.",
    });
  }

  try {
    conn = await mysql.createConnection(dbConfig);

    const sql = "SELECT * FROM USERS WHERE ID = ?";
    const [rows] = await conn.execute(sql, [id]);

    if (rows.length === 0) {
      await conn.end();
      console.log("로그인 실패: 아이디 없음");
      return res.status(401).json({
        success: false,
        message: "아이디 또는 비밀번호가 일치하지 않습니다.",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.PASSWORD);

    if (!isMatch) {
      await conn.end();
      console.log("로그인 실패: 비밀번호 불일치");
      return res.status(401).json({
        success: false,
        message: "아이디 또는 비밀번호가 일치하지 않습니다.",
      });
    }

    const token = jwt.sign(
      { userId: user.ID, nickname: user.NICKNAME },
      JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    await conn.end();

    console.log("로그인 성공:", user.ID);
    return res.status(200).json({
      success: true,
      message: "로그인 성공!",
      token: token,
      user: {
        id: user.ID,
        displayName: user.NICKNAME || user.NAME,
        name: user.NAME,
        nickname: user.NICKNAME,
        email: user.EMAIL,
        phone: user.PHONE,
        address: user.ADDRESS,
      },
    });
  } catch (error) {
    console.error("로그인 에러:", error);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

// ⭐️ 구글 소셜 로그인

app.post("/auth/google", async (req, res) => {
  console.log("구글 로그인 요청:", req.body);
  const { credential } = req.body; // 구글에서 받은 JWT 토큰

  let conn;

  try {
    // 1. 구글 토큰 검증
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub; // 구글 고유 ID
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture; // 프로필 이미지 URL

    console.log("구글 사용자 정보:", { googleId, email, name });

    conn = await mysql.createConnection(dbConfig);

    // 2. 기존 사용자 확인 (이메일을 ID로 사용)
    const userId = email; // 🔥 이메일을 ID로 사용
    let sql = "SELECT * FROM USERS WHERE ID = ?";
    let [rows] = await conn.execute(sql, [userId]);

    let user;

    if (rows.length === 0) {
      // 3. 신규 사용자 -> 자동 회원가입
      console.log("신규 구글 사용자 -> 자동 회원가입");

      const nickname = name; // 닉네임은 구글 이름 사용

      sql = `
        INSERT INTO USERS
          (ID, NICKNAME, NAME, SOCIAL_LOGIN_TYPE, CREATED_AT)
        VALUES (?, ?, ?, 'GOOGLE', NOW())
      `;

      await conn.execute(sql, [userId, nickname, name]);

      // 방금 생성한 사용자 정보 가져오기
      [rows] = await conn.execute("SELECT * FROM USERS WHERE ID = ?", [userId]);
      user = rows[0];
    } else {
      // 4. 기존 사용자 -> 로그인
      console.log("기존 구글 사용자 -> 로그인");
      user = rows[0];
    }

    // 5. JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.ID, nickname: user.NICKNAME },
      JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    await conn.end();

    // 6. 프론트엔드로 응답
    console.log("구글 로그인 성공:", user.ID);
    return res.status(200).json({
      success: true,
      message: "구글 로그인 성공!",
      token: token,
      user: {
        id: user.ID,
        displayName: user.NICKNAME || user.NAME,
        name: user.NAME,
        nickname: user.NICKNAME,
        email: email, // 구글에서 받은 이메일 사용 (DB에 저장 안 함)
        phone: user.PHONE || null,
        address: user.ADDRESS || null,
      },
    });
  } catch (error) {
    console.error("구글 로그인 에러:", error);
    if (conn) await conn.end();
    return res.status(500).json({
      success: false,
      message: `구글 로그인 실패: ${error.message}`,
    });
  }
});

// ----------------------------------------------------
// 6) 실종동물 등록
// ----------------------------------------------------
const MISSING_TABLE = "MISSING";
app.post("/lost-pets", async (req, res) => {
  console.log("실종동물 등록 요청:", req.body);
  return res
    .status(501)
    .json({ success: false, message: "실종동물 API 미구현" });
});

// ----------------------------------------------------
// 7) 우리동네 동물 제보 등록
// ----------------------------------------------------
const REPORTS_TABLE = "REPORTS";
app.post("/reports", async (req, res) => {
  console.log("동물 제보 등록 요청:", req.body);
  return res
    .status(501)
    .json({ success: false, message: "동물 제보 API 미구현" });
});

// ----------------------------------------------------
// 8) 유기견 목록 조회
// ----------------------------------------------------
app.get("/stray-dogs", async (req, res) => {
  console.log("[GET /stray-dogs] 유기견 목록 API 요청 받음");
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const sql = "SELECT * FROM ANIMALS ORDER BY RESCUE_DATE DESC";
    const [rows] = await conn.execute(sql);
    await conn.end();
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("유기견 목록 조회 에러:", error);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

// ----------------------------------------------------
// 서버 실행
// ----------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
