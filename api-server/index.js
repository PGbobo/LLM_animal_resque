// index.js (최종 안정화: 병합 충돌 제거, 컬럼/엔드포인트 정리, 업로드/토큰 적용)

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
  DeleteObjectCommand, // ◀◀ [신규] S3 파일 삭제를 위해 추가
} = require("@aws-sdk/client-s3");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      { userId: user.ID, nickname: user.NICKNAME, userNum: user.USER_NUM }, // userNum 추가
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

// -------------------------------
// 서버 기동
// -------------------------------
app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
