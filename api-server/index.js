// index.js (최종 안정화: 병합 충돌 제거, 컬럼/엔드포인트 정리, 업로드/토큰 적용)

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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
    },
  });
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

// -------------------------------
// 서버 기동
// -------------------------------
app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
