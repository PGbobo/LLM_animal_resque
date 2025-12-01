// index.js (최종 안정화: 병합 충돌 제거, 컬럼/엔드포인트 정리, 업로드/토큰 적용)
const axios = require("axios");
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library"); // ⭐️ 구글 인증 라이브러리
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand, // ◀◀ S3 파일 삭제를 위해 추가
} = require("@aws-sdk/client-s3");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// -------------------------------
// DB / JWT / S3(NCP) 설정
// -------------------------------
const dbConfig = {
  host: "project-db-campus.smhrd.com",
  user: "campus_24IS_CLOUD3_p3_1",
  password: "smhrd1",
  database: "campus_24IS_CLOUD3_p3_1",
  port: 3307,
};

// ⭐ 커뮤니티에서 사용할 공용 커넥션 풀 추가
const db = mysql.createPool(dbConfig);

const JWT_SECRET_KEY = "my-project-secret-key";
const MISSING_TABLE = "MISSING";
const REPORTS_TABLE = "REPORTS";
const USERS_TABLE = "USERS";

// ⭐️ 구글 OAuth 클라이언트 설정
const GOOGLE_CLIENT_ID =
  "803832164097-u1ih0regpfsemh8truu5pn9kgb65qg1t.apps.googleusercontent.com"; // 🔥 Google Cloud Console에서 받은 클라이언트 ID
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// NCP Object Storage (S3 호환)
const s3Client = new S3Client({
  region: "kr-standard",
  endpoint: "https://kr.object.ncloudstorage.com",
  credentials: {
    accessKeyId: "ncp_iam_BPASKR1sw2SGmOlPmsRj",
    secretAccessKey: "ncp_iam_BPKSKRQnHoLFxrkSHbtrO0EToslgdZpg8O",
  },
});
const BUCKET_NAME = "animal-bucket";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// -------------------------------
// 인증 미들웨어
// -------------------------------
const verifyToken = (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "인증 토큰이 필요합니다." });
    const token = h.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "토큰이 만료되었습니다." });
    }
    return res
      .status(401)
      .json({ success: false, message: "유효하지 않은 토큰입니다." });
  }
};

const verifyAdmin = (req, res, next) => {
  // 1. 먼저, 유효한 토큰인지 검사 (기존 미들웨어 재사용)
  verifyToken(req, res, () => {
    // 2. 토큰이 유효하면, ROLE을 검사
    if (req.user.role === "ADMIN") {
      // 3. (성공) 관리자이면 다음 단계로 진행
      next();
    } else {
      // 4. (실패) 관리자가 아니면 403 Forbidden (접근 거부)
      return res.status(403).json({
        success: false,
        message: "접근 권한이 없습니다. (관리자 전용)",
      });
    }
  });
};

// -------------------------------
// 회원가입 / 로그인
// -------------------------------
app.post("/register", async (req, res) => {
  const { id, password, nickname, name, phone } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const conn = await mysql.createConnection(dbConfig);
    const sql = `
      INSERT INTO ${USERS_TABLE}
        (ID, PASSWORD, NICKNAME, NAME, PHONE, SOCIAL_LOGIN_TYPE, CREATED_AT)
      VALUES (?, ?, ?, ?, ?, 'GENERAL', NOW())
    `;
    await conn.execute(sql, [id, hashed, nickname, name, phone]);
    await conn.end();
    return res.status(201).json({ success: true, message: "회원가입 성공" });
  } catch (error) {
    console.error("회원가입 에러:", error);
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

app.post("/login", async (req, res) => {
  const { id, password } = req.body;
  let conn;
  try {
    if (!id || !password)
      return res
        .status(400)
        .json({ success: false, message: "아이디/비밀번호를 입력하세요." });

    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT * FROM ${USERS_TABLE} WHERE ID = ?`,
      [id]
    );
    if (rows.length === 0) {
      await conn.end();
      return res.status(401).json({
        success: false,
        message: "아이디 또는 비밀번호가 일치하지 않습니다.",
      });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.PASSWORD);
    if (!ok) {
      await conn.end();
      return res.status(401).json({
        success: false,
        message: "아이디 또는 비밀번호가 일치하지 않습니다.",
      });
    }

    const payload = {
      userId: user.ID,
      userNum: user.USER_NUM,
      nickname: user.NICKNAME,
      role: user.ROLE,
    };
    const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: "1h" });
    await conn.end();

    return res.status(200).json({
      success: true,
      message: "로그인 성공!",
      token,
      user: {
        id: user.ID,
        userNum: user.USER_NUM,
        nickname: user.NICKNAME,
        name: user.NAME,
        email: user.EMAIL,
        phone: user.PHONE,
        address: user.ADDRESS,
        role: user.ROLE,
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

app.get("/api/users/me", verifyToken, async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user.userId,
      userNum: req.user.userNum,
      nickname: req.user.nickname,
      role: req.user.role,
    },
  });
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
      {
        userId: user.ID,
        nickname: user.NICKNAME,
        userNum: user.USER_NUM,
        role: user.ROLE,
      }, // userNum, role 추가
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
        userNum: user.USER_NUM, // userNum 추가
        displayName: user.NICKNAME || user.NAME,
        name: user.NAME,
        nickname: user.NICKNAME,
        email: email, // 구글에서 받은 이메일 사용 (DB에 저장 안 함)
        phone: user.PHONE || null,
        address: user.ADDRESS || null,
        role: user.ROLE,
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

// -------------------------------
// 실종동물 등록 (멀티파트 + NCP 업로드)
// -------------------------------
app.post(
  "/lost-pets",
  verifyToken,
  upload.single("photo"),
  async (req, res) => {
    console.log("실종동물 등록 요청 (이미지 포함)");
    const userNum = req.user.userNum;

    const {
      petName,
      species,
      petGender,
      petAge,
      lostDate,
      lostLocation,
      contactNumber,
      features: description,
      lat,
      lon,
      status,
    } = req.body;

    if (!petName || !lostDate || !lostLocation) {
      return res.status(400).json({
        success: false,
        message: "이름, 실종날짜, 장소는 필수입니다.",
      });
    }

    // 이미지 업로드
    let imageUrl = null;
    if (req.file) {
      try {
        const fileName = `abandon/missing/${userNum}_${petName.replace(
          /\s/g,
          "_"
        )}_${Date.now()}.${req.file.mimetype.split("/")[1]}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: "public-read",
          })
        );
        imageUrl = `https://kr.object.ncloudstorage.com/${BUCKET_NAME}/${fileName}`;
      } catch (e) {
        console.error("NCP 업로드 실패:", e);
        return res
          .status(500)
          .json({ success: false, message: "이미지 업로드 실패" });
      }
    }

    let conn;
    try {
      conn = await mysql.createConnection(dbConfig);
      const sql = `
      INSERT INTO ${MISSING_TABLE}
        (USER_NUM, PET_NAME, SPECIES, PET_GENDER, PET_AGE,
         LOST_DATE, LOST_LOCATION, CONTACT_NUMBER, DESCRIPTION,
         PET_IMAGE_URL, LAT, LON, STATUS, CREATED_AT)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
      await conn.execute(sql, [
        userNum,
        petName,
        species,
        petGender,
        petAge ? parseInt(petAge) : null,
        lostDate || null,
        lostLocation,
        contactNumber,
        description,
        imageUrl,
        lat ? parseFloat(lat) : null,
        lon ? parseFloat(lon) : null,
        status || "0",
      ]);
      await conn.end();
      return res.status(201).json({ success: true, message: "실종 등록 완료" });
    } catch (error) {
      console.error("실종동물 DB 저장 에러:", error);
      if (conn) await conn.end();
      return res
        .status(500)
        .json({ success: false, message: `DB 저장 오류: ${error.message}` });
    }
  }
);

// -------------------------------
// 우리동네 제보 등록 (멀티파트 + NCP 업로드)
// -------------------------------
app.post("/reports", verifyToken, upload.single("photo"), async (req, res) => {
  console.log("목격 제보 등록 요청 (이미지 포함)");
  const userNum = req.user.userNum;

  const {
    reportDate,
    reportLocation,
    content = "",
    lat = null,
    lon = null,
    title,
    contact: phone,
    species: dogCat, // 'DOG' | 'CAT' | 'OTHER'
  } = req.body;

  if (!title || !reportDate || !reportLocation || !phone) {
    return res.status(400).json({
      success: false,
      message: "제목, 날짜, 장소, 연락처는 필수입니다.",
    });
  }

  let imageUrl = null;
  if (req.file) {
    try {
      const fileName = `abandon/reports/${userNum}_${Date.now()}.${
        req.file.mimetype.split("/")[1]
      }`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: "public-read",
        })
      );
      imageUrl = `https://kr.object.ncloudstorage.com/${BUCKET_NAME}/${fileName}`;
    } catch (e) {
      console.error("NCP 업로드 실패(제보):", e);
      // 이미지 실패 시에도 텍스트 저장은 진행 (imageUrl = null)
    }
  }

  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const sql = `
      INSERT INTO ${REPORTS_TABLE}
        (USER_NUM, TITLE, DOG_CAT, REPORT_DATE, REPORT_LOCATION, CONTENT, PHONE, PHOTO, LAT, LON, CREATED_AT)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await conn.execute(sql, [
      userNum,
      title || "",
      dogCat || "DOG", // NOT NULL 보호
      reportDate || null,
      reportLocation || "",
      content || "",
      phone || "",
      imageUrl || null,
      lat ? parseFloat(lat) : null,
      lon ? parseFloat(lon) : null,
    ]);
    await conn.end();
    return res.status(201).json({ success: true, message: "제보 등록 완료" });
  } catch (error) {
    console.error("제보 DB 저장 에러:", error);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `DB 저장 오류: ${error.message}` });
  }
});

// ----------------------------------------------------
// ⭐️ 내 실종 동물 목록 조회 (MypetsPage.jsx 용)
// ----------------------------------------------------
app.get("/mypets", verifyToken, async (req, res) => {
  console.log("[GET /mypets] 내 실종 동물 목록 요청");
  const userNum = req.user.userNum;
  let conn;

  try {
    if (!userNum) {
      return res
        .status(401)
        .json({ success: false, message: "사용자 정보가 유효하지 않습니다." });
    }

    conn = await mysql.createConnection(dbConfig);

    const sql = `
      SELECT
        MISSING_NUM      AS id,          -- 게시글 번호
        PET_NAME         AS petName,     -- 실종견 이름
        PET_AGE          AS petAge,      -- 실종견 나이
        SPECIES          AS species,     -- 품종
        LOST_DATE        AS lostDate,    -- 잃어버린 날짜
        LOST_LOCATION    AS lostLocation,-- 실종 장소
        PET_IMAGE_URL    AS petImageUrl, -- 이미지 URL
        STATUS           AS status,      -- 실종 상태 ('0': 진행중, '1': 종료)
        CONTACT_NUMBER   AS contactNumber,
        PET_GENDER       AS petGender,
        LAT              AS lat,
        LON              AS lon,
        NOTIFY_ACTIVE    AS notifyActive,
        USER_NUM         AS userNum      -- 소유자 확인용
      FROM ${MISSING_TABLE}
      WHERE USER_NUM = ?
      ORDER BY LOST_DATE DESC, MISSING_NUM DESC
    `;

    const [rows] = await conn.execute(sql, [userNum]);
    await conn.end();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("/mypets 에러:", error);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

// ----------------------------------------------------------------------------------------------------------------------
// ⭐️ [재수정] 내 실종 동물 삭제 API (NCP S3 파일 삭제 로직 보강)
// ----------------------------------------------------------------------------------------------------------------------
app.delete("/mypets/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const userNum = req.user.userNum;

  console.log(`[DELETE] 내 실종 동물 #${id} 삭제 요청 (요청자: ${userNum})`);

  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // 1. 요청자가 해당 게시물의 소유자인지 확인하고, 이미지 URL을 가져옴
    const selectSql = `
      SELECT PET_IMAGE_URL, USER_NUM
      FROM ${MISSING_TABLE}
      WHERE MISSING_NUM = ?
    `;
    const [rows] = await conn.execute(selectSql, [id]);

    if (rows.length === 0) {
      await conn.end();
      return res.status(404).json({
        success: false,
        message: "삭제할 실종 등록을 찾을 수 없습니다.",
      });
    }

    const petData = rows[0];

    // ⭐️ [중요] 소유자 권한 확인
    if (petData.USER_NUM !== userNum) {
      await conn.end();
      return res.status(403).json({
        success: false,
        message: "삭제 권한이 없습니다. (본인의 게시물만 삭제 가능)",
      });
    }

    const s3FullUrl = petData.PET_IMAGE_URL;

    // 2. S3 스토리지에서 이미지 삭제
    if (s3FullUrl) {
      try {
        // Full URL (https://.../bucket-name/key)에서 Key (abandon/missing/...) 부분만 추출
        const s3Key = s3FullUrl.split(BUCKET_NAME + "/")[1];

        if (s3Key) {
          console.log(`  [S3] 삭제 시도: ${s3Key}`);
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: s3Key,
            })
          );
          console.log(`  [S3] 삭제 성공.`);
        }
      } catch (s3Error) {
        // (중요) S3 삭제에 실패해도 (파일이 이미 없거나 권한 문제)
        // DB 삭제는 계속 진행해야 데이터 불일치 문제가 해결됩니다.
        console.error(
          `  [S3] 삭제 실패 (DB 삭제는 계속 진행): ${s3Error.message}`
        );
      }
    } else {
      console.log("  [S3] DB에 이미지 URL이 없어 S3 삭제를 건너뜁니다.");
    }

    // 3. DB에서 데이터 삭제
    const deleteSql = `DELETE FROM ${MISSING_TABLE} WHERE MISSING_NUM = ?`;
    await conn.execute(deleteSql, [id]);
    console.log(`  [DB] ${MISSING_TABLE} 테이블에서 #${id} 삭제 성공.`);

    await conn.end();
    return res.status(200).json({
      success: true,
      message: "실종 등록이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error(`[DELETE /mypets/:id] API 에러: ${error.message}`);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

// ===================================
// (신규) 관리자 페이지용 통합 삭제 API
// ===================================
app.delete(
  "/api/admin/delete/:type/:id",
  verifyAdmin, // ◀ 관리자 권한 확인
  async (req, res) => {
    const { type, id } = req.params;
    const userNum = req.user.userNum;

    console.log(
      `[DELETE] 관리자 삭제 요청: ${type} #${id} (요청자: ${userNum})`
    );

    let tableName, idColumn, s3KeyColumn;

    // 1. 요청 타입에 따라 테이블과 컬럼명 매핑
    if (type === "missing") {
      tableName = MISSING_TABLE; // MISSING
      idColumn = "MISSING_NUM"; // PK
      s3KeyColumn = "PET_IMAGE_URL"; // 이미지 컬럼
    } else if (type === "reports") {
      tableName = REPORTS_TABLE; // REPORTS
      idColumn = "REPORT_NUM"; // PK
      s3KeyColumn = "PHOTO"; // 이미지 컬럼
    } else {
      return res
        .status(400)
        .json({ success: false, message: "잘못된 타입입니다." });
    }

    let conn;
    try {
      conn = await mysql.createConnection(dbConfig);

      // 2. (삭제 전) DB에서 이미지 URL 조회
      const selectSql = `SELECT ${s3KeyColumn} FROM ${tableName} WHERE ${idColumn} = ?`;
      const [rows] = await conn.execute(selectSql, [id]);

      if (rows.length === 0) {
        await conn.end();
        return res.status(404).json({
          success: false,
          message: "삭제할 데이터를 찾을 수 없습니다.",
        });
      }

      const s3FullUrl = rows[0][s3KeyColumn]; // 예: https://kr.object.../bucket/abandon/missing/image.jpg

      // 3. S3 스토리지에서 파일 삭제
      if (s3FullUrl) {
        try {
          // URL에서 '버킷명/' 뒷부분(=파일 키)만 추출
          const s3Key = s3FullUrl.split(BUCKET_NAME + "/")[1];

          if (s3Key) {
            console.log(`  [S3] 삭제 시도: ${s3Key}`);
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
              })
            );
            console.log(`  [S3] 삭제 성공.`);
          }
        } catch (s3Error) {
          // 파일이 이미 없거나 권한 문제 등으로 실패해도 DB 삭제는 진행
          console.error(
            `  [S3] 삭제 실패 (DB 삭제는 계속 진행): ${s3Error.message}`
          );
        }
      }

      // 4. DB에서 레코드 삭제
      const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} = ?`;
      await conn.execute(deleteSql, [id]);
      console.log(`  [DB] ${tableName} 테이블에서 #${id} 삭제 성공.`);

      // 5. (중요) AI 서버 인덱스 새로고침 요청
      // 실종(missing) 데이터가 삭제되었을 때만 AI 갱신이 필요할 수 있지만,
      // 제보(reports) 데이터도 검색 대상이라면 둘 다 갱신해주는 것이 안전함.
      try {
        // WAS 서버 주소 (로컬 또는 사설 IP)
        // const WAS_URL = "http://10.1.2.6:5000"; // 상단에 선언된 상수 사용
        await axios.post(`${WAS_URL}/api/refresh_index`);
        console.log("  [AI] 인덱스 새로고침 요청 성공");
      } catch (aiError) {
        console.warn(
          "  [AI] 새로고침 실패 (AI 서버 확인 필요):",
          aiError.message
        );
      }

      await conn.end();
      return res
        .status(200)
        .json({ success: true, message: "삭제되었습니다." });
    } catch (error) {
      console.error(`[DELETE] 에러: ${error.message}`);
      if (conn) await conn.end();
      return res
        .status(500)
        .json({ success: false, message: `서버 오류: ${error.message}` });
    }
  }
);

// -------------------------------
// 유기견 목록 (StrayDogPage 용)
// -------------------------------
app.get("/stray-dogs", async (req, res) => {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM ANIMALS ORDER BY RESCUE_DATE DESC"
    );
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

// -------------------------------
// 실시간 목록 (LiveCheckPage 용)
// -------------------------------
app.get("/live-posts", async (req, res) => {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    const missingSql = `
      SELECT
        MISSING_NUM AS id,
        PET_NAME     AS title,
        CONCAT(PET_NAME, ' (', IFNULL(SPECIES,''), ')') AS name,
        '실종'       AS status,
        LOST_LOCATION AS location,
        COALESCE(LOST_DATE, CREATED_AT) AS date,
        PET_IMAGE_URL AS img,
        LAT AS lat, LON AS lon,
        'missing' AS type
      FROM ${MISSING_TABLE}
      WHERE STATUS = '0'
      ORDER BY COALESCE(LOST_DATE, CREATED_AT) DESC
    `;

    const reportsSql = `
      SELECT
        REPORT_NUM AS id,              -- ✅ REPORT_N 오타 수정
        TITLE      AS title,
        DOG_CAT    AS name,
        '목격'     AS status,
        REPORT_LOCATION AS location,
        COALESCE(REPORT_DATE, CREATED_AT) AS date,
        PHOTO      AS img,
        LAT AS lat, LON AS lon,
        'witness'  AS type
      FROM ${REPORTS_TABLE}
      ORDER BY COALESCE(REPORT_DATE, CREATED_AT) DESC
    `;

    const [missingRows] = await conn.execute(missingSql);
    const [reportsRows] = await conn.execute(reportsSql);
    await conn.end();

    return res
      .status(200)
      .json({ success: true, data: [...missingRows, ...reportsRows] });
  } catch (error) {
    console.error("실시간 목록 조회 에러:", error);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `서버 오류: ${error.message}` });
  }
});

// =======================
// 실종 동물 목록 (MISSING)
// =======================
app.get("/missing-posts", async (req, res) => {
  console.log("[GET /missing-posts] 실종 동물 목록 요청");
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    const sql = `
      SELECT
        MISSING_NUM      AS id,          -- 게시글 번호(프론트에서 id로 사용)
        USER_NUM         AS userNum,
        PET_NAME         AS petName,     -- 반려동물 이름
        SPECIES          AS species,     -- 종
        PET_GENDER       AS petGender,   -- 성별
        PET_AGE          AS age,         -- 나이
        LOST_DATE        AS date,        -- 실종 날짜/시간
        LOST_LOCATION    AS location,    -- 실종 장소
        CONTACT_NUMBER   AS contactNumber,-- 연락처 번호
        DESCRIPTION      AS content,     -- 내용
        PET_IMAGE_URL    AS img,         -- 사진 경로/URL
        LAT              AS lat,         -- 위도
        LON              AS lon,         -- 경도
        STATUS           AS status,       -- 상태
        CREATED_AT       AS createdAt,
        'missing'        AS type         -- 프론트에서 구분용
      FROM MISSING
      ORDER BY LOST_DATE DESC, MISSING_NUM DESC
    `;

    const [rows] = await conn.execute(sql);
    await conn.end();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("/missing-posts 에러:", error);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

// =======================
// 목격 제보 목록 (REPORTS)
// =======================
app.get("/witness-posts", async (req, res) => {
  console.log("[GET /witness-posts] 목격 제보 목록 요청");
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    const sql = `
      SELECT
        REPORT_NUM       AS id,          -- 게시글 번호
        USER_NUM         AS userNum,
        TITLE            AS title,       -- 제목
        DOG_CAT          AS dogCat,      -- 견/묘 구분
        REPORT_DATE      AS date,        -- 목격 날짜/시간
        REPORT_LOCATION  AS location,    -- 목격 장소
        CONTENT          AS content,     -- 내용
        PHONE            AS phone,
        PHOTO            AS img,         -- 사진 경로/URL
        LAT              AS lat,         -- 위도
        LON              AS lon,         -- 경도
        CREATED_AT       AS createdAt,
        'witness'        AS type         -- 프론트에서 구분용
      FROM REPORTS
      ORDER BY REPORT_DATE DESC, REPORT_NUM DESC
    `;

    const [rows] = await conn.execute(sql);
    await conn.end();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("/witness-posts 에러:", error);
    if (conn) await conn.end();
    return res
      .status(500)
      .json({ success: false, message: `서버 내부 오류: ${error.message}` });
  }
});

// ===================================
// (신규) 관리자 페이지용 통합 삭제 API
// ===================================
app.delete(
  "/api/admin/delete/:type/:id", // (예: /api/admin/delete/missing/5)
  verifyAdmin, // ◀ 관리자(로그인) 인증
  async (req, res) => {
    const { type, id } = req.params;
    const userNum = req.user.userNum; // ◀ (보안) 삭제를 요청한 사용자

    console.log(`[DELETE] ${type} #${id} (요청자: ${userNum})`);

    let tableName, idColumn, s3KeyColumn;

    // 1. 타입에 따라 테이블/컬럼 이름 설정
    if (type === "missing") {
      tableName = MISSING_TABLE;
      idColumn = "MISSING_NUM";
      s3KeyColumn = "PET_IMAGE_URL";
    } else if (type === "reports") {
      tableName = REPORTS_TABLE;
      idColumn = "REPORT_NUM";
      s3KeyColumn = "PHOTO";
    } else {
      return res
        .status(400)
        .json({ success: false, message: "잘못된 삭제 타입입니다." });
    }

    let conn;
    try {
      conn = await mysql.createConnection(dbConfig);

      // 2. (먼저) DB에서 S3 이미지 URL(Key) 확보
      const selectSql = `SELECT ${s3KeyColumn} FROM ${tableName} WHERE ${idColumn} = ?`;
      const [rows] = await conn.execute(selectSql, [id]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "삭제할 데이터를 찾을 수 없습니다.",
        });
      }

      const s3FullUrl = rows[0][s3KeyColumn];

      // 3. S3 스토리지에서 이미지 삭제
      if (s3FullUrl) {
        try {
          // Full URL (https://.../bucket-name/key)에서 Key (abandon/missing/...) 부분만 추출
          const s3Key = s3FullUrl.split(BUCKET_NAME + "/")[1];

          if (s3Key) {
            console.log(`  [S3] 삭제 시도: ${s3Key}`);
            await s3Client.send(
              new DeleteObjectCommand({
                // ◀ [신규] 삭제 명령
                Bucket: BUCKET_NAME,
                Key: s3Key,
              })
            );
            console.log(`  [S3] 삭제 성공.`);
          }
        } catch (s3Error) {
          // (중요) S3 삭제에 실패해도 (파일이 이미 없거나 권한 문제)
          // DB 삭제는 계속 진행해야 데이터 불일치 문제가 해결됩니다.
          console.error(
            `  [S3] 삭제 실패 (DB 삭제는 계속 진행): ${s3Error.message}`
          );
        }
      } else {
        console.log("  [S3] DB에 이미지 URL이 없어 S3 삭제를 건너뜁니다.");
      }

      // 4. DB에서 데이터 삭제
      const deleteSql = `DELETE FROM ${tableName} WHERE ${idColumn} = ?`;
      await conn.execute(deleteSql, [id]);
      console.log(`  [DB] ${tableName} 테이블에서 #${id} 삭제 성공.`);

      await conn.end();
      return res.status(200).json({
        success: true,
        message: "데이터가 성공적으로 삭제되었습니다.",
      });
    } catch (error) {
      console.error(`[DELETE] API 에러: ${error.message}`);
      if (conn) await conn.end();
      return res
        .status(500)
        .json({ success: false, message: `서버 내부 오류: ${error.message}` });
    }
  }
);

// ======================================================
// (신규) AI 서버(WAS) 프록시 설정 (복구)
// ======================================================

const WAS_URL = "http://10.1.2.6:5000"; // ◀ WAS 서버 사설 IP 확인!

// 1. 이미지 검색 프록시
app.post("/api/proxy/search", async (req, res) => {
  try {
    console.log("Proxying to WAS (/api/search)..."); // 로그 추가
    const response = await axios.post(`${WAS_URL}/api/search`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("WAS /api/search 에러:", error.message);
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "AI Server Error" });
  }
});

// 2. 텍스트 검색 프록시
app.post("/api/proxy/adapt", async (req, res) => {
  try {
    const response = await axios.post(`${WAS_URL}/api/adapt`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("WAS /api/adapt 에러:", error.message);
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "AI Server Error" });
  }
});

// 3. 제보 분석 프록시
app.post("/api/proxy/report_sighting", async (req, res) => {
  try {
    const response = await axios.post(
      `${WAS_URL}/api/report_sighting`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    console.error("WAS /api/report_sighting 에러:", error.message);
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "AI Server Error" });
  }
});

// ----------------------------------------------------
// 1. 회원 정보 수정 (닉네임, 전화번호, 안심번호, 프사)
// ----------------------------------------------------
app.put(
  "/api/users/me",
  verifyToken,
  upload.single("profileImage"),
  async (req, res) => {
    const userNum = req.user.userNum;
    const { nickname, phone, useSafeNumber } = req.body; // name, id는 수정 불가

    // 이미지 처리
    let profileImageUrl = undefined; // undefined면 DB 업데이트 안 함
    if (req.file) {
      try {
        const fileName = `profile/${userNum}_${Date.now()}.${
          req.file.mimetype.split("/")[1]
        }`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: "public-read",
          })
        );
        profileImageUrl = `https://kr.object.ncloudstorage.com/${BUCKET_NAME}/${fileName}`;
      } catch (e) {
        console.error("프로필 이미지 업로드 실패:", e);
      }
    }

    let conn;
    try {
      conn = await mysql.createConnection(dbConfig);

      // 동적 쿼리 생성 (변경된 값만 업데이트)
      let sql = "UPDATE USERS SET ";
      const params = [];

      if (nickname) {
        sql += "NICKNAME = ?, ";
        params.push(nickname);
      }
      if (phone) {
        sql += "PHONE = ?, ";
        params.push(phone);
      }
      // useSafeNumber는 '1' or '0' 문자열로 옴
      if (useSafeNumber !== undefined) {
        sql += "USE_SAFE_NUMBER = ?, ";
        params.push(useSafeNumber === "1" ? 1 : 0);
      }
      if (profileImageUrl) {
        sql += "PROFILE_IMAGE_URL = ?, ";
        params.push(profileImageUrl);
      }

      // 마지막 쉼표 제거
      sql = sql.slice(0, -2);
      sql += " WHERE USER_NUM = ?";
      params.push(userNum);

      await conn.execute(sql, params);

      // 업데이트된 최신 정보 조회해서 반환
      const [rows] = await conn.execute(
        "SELECT * FROM USERS WHERE USER_NUM = ?",
        [userNum]
      );
      const updatedUser = rows[0];

      await conn.end();

      return res.json({
        success: true,
        message: "회원정보가 수정되었습니다.",
        user: {
          // 갱신된 유저 정보 반환
          id: updatedUser.ID,
          userNum: updatedUser.USER_NUM,
          nickname: updatedUser.NICKNAME,
          name: updatedUser.NAME,
          email: updatedUser.ID,
          phone: updatedUser.PHONE,
          useSafeNumber: !!updatedUser.USE_SAFE_NUMBER,
          profileImageUrl: updatedUser.PROFILE_IMAGE_URL,
        },
      });
    } catch (error) {
      console.error("회원정보 수정 에러:", error);
      if (conn) await conn.end();
      return res
        .status(500)
        .json({ success: false, message: "서버 오류 발생" });
    }
  }
);

// ----------------------------------------------------
// 2. 실종 상태 및 알림 설정 변경 (토글)
// ----------------------------------------------------
app.put("/mypets/:id/status", verifyToken, async (req, res) => {
  const userNum = req.user.userNum;
  const petId = req.params.id;
  const { status, notifyActive } = req.body; // status: '0'/'1', notifyActive: 1/0

  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // 본인 게시물인지 확인
    const [check] = await conn.execute(
      "SELECT USER_NUM FROM MISSING WHERE MISSING_NUM = ?",
      [petId]
    );
    if (check.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "게시물을 찾을 수 없습니다." });
    if (check[0].USER_NUM !== userNum)
      return res
        .status(403)
        .json({ success: false, message: "권한이 없습니다." });

    // 업데이트 수행
    let sql = "UPDATE MISSING SET ";
    const params = [];

    if (status !== undefined) {
      sql += "STATUS = ?, ";
      params.push(status);
    }
    if (notifyActive !== undefined) {
      sql += "NOTIFY_ACTIVE = ?, ";
      params.push(notifyActive ? 1 : 0);
    }

    sql = sql.slice(0, -2);
    sql += " WHERE MISSING_NUM = ?";
    params.push(petId);

    await conn.execute(sql, params);
    await conn.end();

    res.json({ success: true, message: "상태가 변경되었습니다." });
  } catch (error) {
    console.error("상태 변경 에러:", error);
    if (conn) await conn.end();
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// ----------------------------------------------
//  커뮤니티 게시판 / 댓글 API
//  테이블:
//    COMMUNITY_POSTS (POST_NUM, USER_NUM, TITLE, CONTENT, CATEGORY, CREATED_AT, UPDATED_AT)
//    COMMUNITY_COMMENTS (COMMENT_NUM, POST_NUM, USER_NUM, CONTENT, CREATED_AT, UPDATED_AT)
// ----------------------------------------------

// 공통: 응답 에러 헬퍼
function sendServerError(res, error) {
  console.error(error);
  res
    .status(500)
    .json({ message: "서버 오류가 발생했습니다.", error: String(error) });
}

/**
 * [GET] /community/posts
 * - 게시글 전체 목록 조회
 * - 최신 글이 위로 오도록 POST_NUM DESC 정렬
 */
app.get("/community/posts", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        p.POST_NUM       AS postNum,
        p.USER_NUM       AS userNum,
        u.NICKNAME       AS nickname,
        p.TITLE          AS title,
        p.CONTENT        AS content,
        p.CATEGORY       AS category,
        p.CREATED_AT     AS createdAt,
        p.UPDATED_AT     AS updatedAt,
        -- 댓글 개수 함께 조회
        (
          SELECT COUNT(*)
          FROM COMMUNITY_COMMENTS c
          WHERE c.POST_NUM = p.POST_NUM
        ) AS commentCount
      FROM COMMUNITY_POSTS p
      LEFT JOIN USERS u ON p.USER_NUM = u.USER_NUM
      ORDER BY p.POST_NUM DESC
      `
    );
    res.json(rows);
  } catch (error) {
    sendServerError(res, error);
  }
});

/**
 * [POST] /community/posts
 * - 새 게시글 작성
 * - (verifyToken 미들웨어를 통해 로그인 유저만 접근 가능)
 */
app.post("/community/posts", verifyToken, async (req, res) => {
  // 🟢 수정 1: verifyToken 미들웨어 추가
  try {
    const { title, content, category } = req.body; // userNum 제거 (토큰에서 가져옴)

    if (!title || !content) {
      return res.status(400).json({ message: "제목과 내용은 필수입니다." });
    }

    // 🟢 수정 2: 토큰에서 추출된 userNum, nickname 사용
    const finalUserNum = req.user.userNum;
    const nickname = req.user.nickname;

    const [result] = await db.query(
      `
      INSERT INTO COMMUNITY_POSTS (USER_NUM, TITLE, CONTENT, CATEGORY, CREATED_AT, UPDATED_AT)
      VALUES (?, ?, ?, ?, NOW(), NOW())
      `,
      [finalUserNum, title, content, category || null]
    );

    const insertedId = result.insertId;

    // 방금 저장된 글 다시 조회해서 프론트로 돌려주기 (USERS 테이블 JOIN)
    const [rows] = await db.query(
      `
      SELECT
        p.POST_NUM   AS postNum,
        p.USER_NUM   AS userNum,
        u.NICKNAME   AS nickname,
        p.TITLE      AS title,
        p.CONTENT    AS content,
        p.CATEGORY   AS category,
        p.CREATED_AT AS createdAt,
        p.UPDATED_AT AS updatedAt,
        0            AS commentCount
      FROM COMMUNITY_POSTS p
      LEFT JOIN USERS u ON p.USER_NUM = u.USER_NUM
      WHERE p.POST_NUM = ?
      `,
      [insertedId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    sendServerError(res, error);
  }
});

/**
 * [GET] /community/posts/:postNum
 * - 단일 게시글 상세 조회
 */
app.get("/community/posts/:postNum", async (req, res) => {
  try {
    const { postNum } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        p.POST_NUM   AS postNum,
        p.USER_NUM   AS userNum,
        u.NICKNAME   AS nickname,
        p.TITLE      AS title,
        p.CONTENT    AS content,
        p.CATEGORY   AS category,
        p.CREATED_AT AS createdAt,
        p.UPDATED_AT AS updatedAt
      FROM COMMUNITY_POSTS p
      LEFT JOIN USERS u ON p.USER_NUM = u.USER_NUM
      WHERE p.POST_NUM = ?
      `,
      [postNum]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 게시글입니다." });
    }

    // 댓글 개수까지 같이 내려주고 싶다면 여기서 추가 쿼리 가능
    const [commentRows] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM COMMUNITY_COMMENTS
      WHERE POST_NUM = ?
      `,
      [postNum]
    );

    const post = rows[0];
    post.commentCount = commentRows[0].count;

    res.json(post);
  } catch (error) {
    sendServerError(res, error);
  }
});

/**
 * [PUT] /community/posts/:postNum
 * - 게시글 수정
 * - 본인의 글만 수정 가능 (verifyToken 미들웨어 사용)
 */
app.put("/community/posts/:postNum", verifyToken, async (req, res) => {
  try {
    const { postNum } = req.params;
    const { title, content, category } = req.body;
    const currentUserNum = req.user.userNum;

    if (!title || !content) {
      return res.status(400).json({ message: "제목과 내용은 필수입니다." });
    }

    // 게시글 작성자 확인
    const [checkRows] = await db.query(
      `SELECT USER_NUM FROM COMMUNITY_POSTS WHERE POST_NUM = ?`,
      [postNum]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 게시글입니다." });
    }

    if (checkRows[0].USER_NUM !== currentUserNum) {
      return res.status(403).json({
        message: "수정 권한이 없습니다. 본인의 글만 수정할 수 있습니다.",
      });
    }

    // 게시글 수정
    await db.query(
      `
      UPDATE COMMUNITY_POSTS
      SET TITLE = ?, CONTENT = ?, CATEGORY = ?, UPDATED_AT = NOW()
      WHERE POST_NUM = ?
      `,
      [title, content, category || null, postNum]
    );

    // 수정된 게시글 조회
    const [rows] = await db.query(
      `
      SELECT
        p.POST_NUM   AS postNum,
        p.USER_NUM   AS userNum,
        u.NICKNAME   AS nickname,
        p.TITLE      AS title,
        p.CONTENT    AS content,
        p.CATEGORY   AS category,
        p.CREATED_AT AS createdAt,
        p.UPDATED_AT AS updatedAt
      FROM COMMUNITY_POSTS p
      LEFT JOIN USERS u ON p.USER_NUM = u.USER_NUM
      WHERE p.POST_NUM = ?
      `,
      [postNum]
    );

    res.json({ message: "게시글이 수정되었습니다.", post: rows[0] });
  } catch (error) {
    sendServerError(res, error);
  }
});

/**
 * [DELETE] /community/posts/:postNum
 * - 게시글 삭제
 * - FK에 ON DELETE CASCADE 가 없다면 댓글도 함께 수동 삭제
 */
app.delete("/community/posts/:postNum", verifyToken, async (req, res) => {
  try {
    const { postNum } = req.params;
    const currentUserNum = req.user.userNum;

    // 게시글 작성자 확인
    const [checkRows] = await db.query(
      `SELECT USER_NUM FROM COMMUNITY_POSTS WHERE POST_NUM = ?`,
      [postNum]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ message: "삭제할 게시글이 없습니다." });
    }

    if (checkRows[0].USER_NUM !== currentUserNum) {
      return res.status(403).json({
        message: "삭제 권한이 없습니다. 본인의 글만 삭제할 수 있습니다.",
      });
    }

    // 댓글 먼저 삭제 (안전하게 처리)
    await db.query(`DELETE FROM COMMUNITY_COMMENTS WHERE POST_NUM = ?`, [
      postNum,
    ]);

    const [result] = await db.query(
      `DELETE FROM COMMUNITY_POSTS WHERE POST_NUM = ?`,
      [postNum]
    );

    res.json({ message: "게시글이 삭제되었습니다." });
  } catch (error) {
    sendServerError(res, error);
  }
});

/**
 * [GET] /community/posts/:postNum/comments
 * - 특정 게시글의 댓글 목록 조회
 */
app.get("/community/posts/:postNum/comments", async (req, res) => {
  try {
    const { postNum } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        c.COMMENT_NUM AS commentNum,
        c.POST_NUM    AS postNum,
        c.USER_NUM    AS userNum,
        u.NICKNAME    AS nickname,
        c.CONTENT     AS content,
        c.CREATED_AT  AS createdAt,
        c.UPDATED_AT  AS updatedAt
      FROM COMMUNITY_COMMENTS c
      LEFT JOIN USERS u ON c.USER_NUM = u.USER_NUM
      WHERE c.POST_NUM = ?
      ORDER BY c.COMMENT_NUM ASC
      `,
      [postNum]
    );

    res.json(rows);
  } catch (error) {
    sendServerError(res, error);
  }
});

/**
 * [POST] /community/posts/:postNum/comments
 * - 특정 게시글에 댓글 작성
 * - (verifyToken 미들웨어를 통해 로그인 유저만 접근 가능)
 */
app.post(
  "/community/posts/:postNum/comments",
  verifyToken,
  async (req, res) => {
    // 🟢 수정 3: verifyToken 미들웨어 추가
    try {
      const { postNum } = req.params;
      const { content } = req.body; // userNum 제거 (토큰에서 가져옴)

      if (!content) {
        return res.status(400).json({ message: "댓글 내용은 필수입니다." });
      }

      // 🟢 수정 4: 토큰에서 추출된 userNum 사용
      const finalUserNum = req.user.userNum;

      const [result] = await db.query(
        `
      INSERT INTO COMMUNITY_COMMENTS (POST_NUM, USER_NUM, CONTENT, CREATED_AT, UPDATED_AT)
      VALUES (?, ?, ?, NOW(), NOW())
      `,
        [postNum, finalUserNum, content]
      );

      const insertedId = result.insertId;

      const [rows] = await db.query(
        `
      SELECT
        c.COMMENT_NUM AS commentNum,
        c.POST_NUM    AS postNum,
        c.USER_NUM    AS userNum,
        u.NICKNAME    AS nickname,
        c.CONTENT     AS content,
        c.CREATED_AT  AS createdAt,
        c.UPDATED_AT  AS updatedAt
      FROM COMMUNITY_COMMENTS c
      LEFT JOIN USERS u ON c.USER_NUM = u.USER_NUM
      WHERE c.COMMENT_NUM = ?
      `,
        [insertedId]
      );

      res.status(201).json(rows[0]);
    } catch (error) {
      sendServerError(res, error);
    }
  }
);

/**
 * [PUT] /community/comments/:commentNum
 * - 개별 댓글 수정
 * - 본인의 댓글만 수정 가능 (verifyToken 미들웨어 사용)
 */
app.put("/community/comments/:commentNum", verifyToken, async (req, res) => {
  try {
    const { commentNum } = req.params;
    const { content } = req.body;
    const currentUserNum = req.user.userNum;

    console.log(
      `[댓글 수정 요청] commentNum: ${commentNum}, userNum: ${currentUserNum}`
    );

    if (!content) {
      console.log("[댓글 수정 실패] 내용 없음");
      return res.status(400).json({ message: "댓글 내용은 필수입니다." });
    }

    // 댓글 작성자 확인
    const [checkRows] = await db.query(
      `SELECT USER_NUM FROM COMMUNITY_COMMENTS WHERE COMMENT_NUM = ?`,
      [commentNum]
    );

    if (checkRows.length === 0) {
      console.log("[댓글 수정 실패] 댓글을 찾을 수 없음");
      return res.status(404).json({ message: "존재하지 않는 댓글입니다." });
    }

    if (checkRows[0].USER_NUM !== currentUserNum) {
      console.log(
        `[댓글 수정 실패] 권한 없음 - 작성자: ${checkRows[0].USER_NUM}, 요청자: ${currentUserNum}`
      );
      return res.status(403).json({
        message: "수정 권한이 없습니다. 본인의 댓글만 수정할 수 있습니다.",
      });
    }

    // 댓글 수정
    await db.query(
      `UPDATE COMMUNITY_COMMENTS SET CONTENT = ?, UPDATED_AT = NOW() WHERE COMMENT_NUM = ?`,
      [content, commentNum]
    );

    console.log("[댓글 수정 성공] DB 업데이트 완료");

    // 수정된 댓글 조회
    const [rows] = await db.query(
      `
      SELECT
        c.COMMENT_NUM AS commentNum,
        c.POST_NUM    AS postNum,
        c.USER_NUM    AS userNum,
        u.NICKNAME    AS nickname,
        c.CONTENT     AS content,
        c.CREATED_AT  AS createdAt,
        c.UPDATED_AT  AS updatedAt
      FROM COMMUNITY_COMMENTS c
      LEFT JOIN USERS u ON c.USER_NUM = u.USER_NUM
      WHERE c.COMMENT_NUM = ?
      `,
      [commentNum]
    );

    console.log("[댓글 수정 성공] 응답 전송");
    res.json({ message: "댓글이 수정되었습니다.", comment: rows[0] });
  } catch (error) {
    console.error("[댓글 수정 에러]", error);
    sendServerError(res, error);
  }
});

/**
 * [DELETE] /community/comments/:commentNum
 * - 개별 댓글 삭제
 * - 본인의 댓글만 삭제 가능 (verifyToken 미들웨어 사용)
 */
app.delete("/community/comments/:commentNum", verifyToken, async (req, res) => {
  try {
    const { commentNum } = req.params;
    const currentUserNum = req.user.userNum;

    // 댓글 작성자 확인
    const [checkRows] = await db.query(
      `SELECT USER_NUM FROM COMMUNITY_COMMENTS WHERE COMMENT_NUM = ?`,
      [commentNum]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ message: "삭제할 댓글이 없습니다." });
    }

    if (checkRows[0].USER_NUM !== currentUserNum) {
      return res.status(403).json({
        message: "삭제 권한이 없습니다. 본인의 댓글만 삭제할 수 있습니다.",
      });
    }

    const [result] = await db.query(
      `DELETE FROM COMMUNITY_COMMENTS WHERE COMMENT_NUM = ?`,
      [commentNum]
    );

    res.json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    sendServerError(res, error);
  }
});

// -------------------------------
// 🔍 [임시 디버깅] USERS 테이블 데이터 확인용 엔드포인트
// -------------------------------
app.get("/debug/users", async (req, res) => {
  try {
    // 전체 사용자 수 확인
    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM USERS`);

    // NICKNAME이 NULL인 사용자 수 확인
    const [nullNicknameRows] = await db.query(
      `SELECT COUNT(*) as nullCount FROM USERS WHERE NICKNAME IS NULL`
    );

    // 최근 20명의 사용자 샘플 데이터 확인
    const [sampleRows] = await db.query(
      `SELECT USER_NUM, ID, NICKNAME, NAME, SOCIAL_LOGIN_TYPE, CREATED_AT
       FROM USERS
       ORDER BY CREATED_AT DESC
       LIMIT 20`
    );

    // NICKNAME 컬럼 정보 확인
    const [columnInfo] = await db.query(
      `SHOW COLUMNS FROM USERS WHERE Field = 'NICKNAME'`
    );

    res.json({
      totalUsers: countRows[0].total,
      usersWithNullNickname: nullNicknameRows[0].nullCount,
      nicknameColumnInfo: columnInfo[0],
      recentUsersSample: sampleRows,
    });
  } catch (error) {
    console.error("디버깅 엔드포인트 오류:", error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------
// 서버 기동
// -------------------------------
app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
