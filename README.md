# 🐾 이어주개 (ConnectDog)
LLM 기반 유기동물 매칭 및 실종 신고 플랫폼

가족 같은 반려동물을 잃어버리셨나요? 혹은 새로운 가족을 맞이하고 싶으신가요?
**이어주개**는 AI 이미지 분석 기술과 자연어 처리(LLM)를 활용하여, 잃어버린 반려동물과 보호소의 유기동물을 매칭해주고, 사용자 맞춤형 입양을 추천해주는 지능형 플랫폼입니다.

---
## ✨ 주요 기능 (Core Features)
- **AI 이미지 매칭**: 잃어버린 반려동물의 사진을 올리면, AI가 특징(벡터)을 분석하여 보호소에 있는 유사한 동물(유사도 80% 이상)을 찾아냅니다.
- **자연어 입양 추천**: "귀가 크고 흰색 털을 가진 소형견을 찾아요"라고 말하면, AI가 요구사항을 분석해 딱 맞는 아이를 추천합니다.
- **실종/목격 골든타임 알림**: 실종된 동물과 유사한 동물이 보호소에 입소하거나 제보되면, 견주에게 **즉시(LMS)** 또는 **예약(오전 10시)** 문자로 알림을 발송합니다.
- **커뮤니티**: 게시판과 댓글 기능으로 실종 동물 정보를 공유하고 소통할 수 있습니다.  
- **자동 데이터 수집**: 매일 새벽 4시, 전국의 동물보호관리시스템 데이터를 크롤링하여 최신 보호소 정보를 갱신합니다.
- **지능형 제보 시스템**: 목격자가 사진이나 글로 제보하면, 실종 등록된 동물들과 실시간으로 대조하여 주인을 찾아줍니다.

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분        | 기술 |
|-------------|--------------------------------|
| **Frontend** | React, Tailwind CSS |
| **Backend** | Python Flask, node.js, jwt, Express, Nginx |
| **AI / API** | OpenAI GPT-4o, FAISS (Vector DB), Kakao Map API, Solapi |
| **Infra** | Naver Cloud Platform (NCP), AWS S3 (Object Storage) |
| **Database** | MySQL |
| **IDE & Tools** | GitHub, Figma, Notion, Colab, VS Code |

---

## 📌 테이블 개요

| 테이블명        | ID              | 설명                        |
|-----------------|-----------------|-----------------------------|
| **회원**        | USERS          | 회원 정보           |
| **유기 동물**      | ANIMALS            | 유기동물 정보         |
| **실종 동물 신고**    | MISSING        | 실종신고 데이터               |
| **제보**      | REPORTS  | 제보 데이터       |
| **알림**        | NOTIFICATIONS           | 알림 상태           |
| **커뮤니티**    | COMMUNITY_POSTS      | 커뮤니티       |
| **댓글**        | COMMUNITY_COMMENTS    | 댓글 작성           |
---

## 🚀 시작하기 (Getting Started)

### 1. 환경 변수 설정
프로젝트 루트에 API 키 파일 생성 (API-Key.txt, ACCESS_KEY.txt 등)
- OpenAI API Key
- NCP Access/Secret Key
- Solapi (SMS) API Key

### 2. 백엔드 서버 실행 (Flask)
```
# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 워커(문자 발송) 백그라운드 실행
nohup python notification_worker.py &

# 메인 API 서버 실행
python app.py

```
### 3. 프론트엔드 실행 (React)
```
cd frontend
npm install
npm start
```

---

## 📚 유스케이스 다이어그램
<img width="742" height="681" alt="image" src="https://github.com/user-attachments/assets/9cc56e7c-7f30-4c7e-b2a0-d96e60d51f96" />

---

## 📗 메뉴 구성도
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/9f01170c-08e7-45bc-850e-43cec3396fec" />

---

## 🏛️ 시스템 아키텍쳐
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/9cc9cf6f-96d3-4308-9fb9-6db7f6021f53" />

---

## ☁️ 클라우드 아키텍쳐
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/6214ed33-ba53-4821-80f1-875f0c2cdbbe" />

---

## 💻 ER 다이어그램
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/3d8e311f-f4bb-4bcd-9cd3-202fe0159ed2" />

---

## 📝 화면 설계
### 메인 화면
<img width="751" height="380" alt="image" src="https://github.com/user-attachments/assets/211dd208-87cb-4de4-9506-cc46ce9a0c53" />

### 실종 등록 화면
<img width="458" height="543" alt="image" src="https://github.com/user-attachments/assets/b947d36b-c5f7-4093-9c59-9851fc88e388" />

### 제보 화면
<img width="444" height="543" alt="image" src="https://github.com/user-attachments/assets/497d948f-d851-42a7-a80d-8a155e7686a5" />

### 제보 위치 화면
<img width="751" height="500" alt="image" src="https://github.com/user-attachments/assets/c3d53048-a376-432e-b5c3-f588ce3d3c53" />

### 입양 추천 화면
<img width="650" height="543" alt="image" src="https://github.com/user-attachments/assets/7455481d-f300-41b6-8c14-fa952e9e3334" />

### 결과 화면
<img width="426" height="543" alt="image" src="https://github.com/user-attachments/assets/8fe566d9-bf03-4ac2-b515-c902e5200f50" />

---

## 🚨 트러블 슈팅

### 외부 이미지 URL 접근 차단
:x: **문제 현상**:
GPT-4o Vision API와 FAISS 벡터화 과정이 동기식으로 처리되어, 실종 동물 등록 시 사용자가 약 1분 30초 이상 대기해야 하는 문제가 발생했습니다.

✔️ **해결 과정**:
1. **프론트엔드 최적화**: browser-image-compression 라이브러리를 도입하여 이미지 업로드 시 1MB 이하로 압축, 전송 시간을 단축했습니다.

2. **비동기 스레딩(Threading)**: app.py에서 가장 오래 걸리는 '인덱스 재구축(Refresh Index)' 작업을 백그라운드 데몬 스레드로 분리했습니다. -> 결과적으로 사용자 응답 시간을 90초에서 3초 이내로 단축했습니다.

### 알림 발송 타이밍 이슈 (새벽 문자 발송)
:x: **문제 현상**:
새벽 4시에 크롤러가 돌면서 매칭된 데이터에 대해 즉시 문자를 발송하여, 사용자 경험(UX)을 저해하는 문제가 있었습니다.

✔️ **해결 과정**: 알림 시스템을 **이원화**했습니다.
- **제보(IMMEDIATE)**: 실시간성이 중요하므로 즉시 발송.

- **크롤링 매칭(SCHEDULED)**: DB에 type='SCHEDULED'로 저장하고, 상시 가동되는 notification_worker.py가 오전 10시 ~ 오후 10시 사이에만 큐를 조회하여 일괄 발송하도록 로직을 개선했습니다.

### 데이터 불일치 현상
:x: **문제 현상**:
마이페이지에서 실종 동물을 삭제할 때 DB에서는 정상적으로 삭제되지만, 스토리지에 저장된 이미지 파일은 지워지지 않아 데이터 불일치 문제가 발생했습니다.

🔍 **원인 분석**:
삭제 API에서 DB 삭제와 스토리지 파일 삭제 순서가 명확하지 않았고, 파일 삭제 요청이 누락되거나 예외 처리가 부족해 파일이 남는 상황이 발생했습니다

✔️ **해결 과정**:
DB 삭제 전에 이미지 URL로 파일 조회해 먼저 파일 삭제를 수행한 뒤, 마지막 단계에서 DB 레코드를 제거하는 방식으로 전체 데이터 무결성을 확보했습니다.

### 메모리 부족 현상
:x: **문제 현상**:
고화질 이미지(5MB 이상)를 업로드할 때 업로드 시간이 길어지고, Node.js에서 멀티파트 데이터를 처리하는 과정에서 메모리 부족으로 요청 실패가 발생했습니다. 또한 이미지 업로드 이후 AI 분석 응답까지 시간이 오래 걸려 사용자에게 진행 상황이 전달되지 않는 문제가 있었습니다.

🔍 **원인 분석**:
서버가 대용량 파일을 메모리 기반으로 처리하여 부하가 발생했고, 이미지 업로드와 AI 분석 요청이 모두 동기적으로 처리되어 장시간 처리 과정에서 UI 안내 요소가 없어 사용자가 상황을 파악할 수 없었습니다.

✔️ **해결 과정**:
Multer의 파일 크기 제한을 10MB로 설정해 서버 안정성을 강화하고, 이미지 업로드 후 Base64 변환을 통해 AI 서버로 비동기 요청이 가능하도록 구조를 개선했습니다. 또한 AI 분석 단계에서 로딩 오버레이와 상태 메시지를 제공해 사용자 경험을 향상시켰습니다

### 새로고침 시 토큰 만료 현상
:x: **문제 현상**:
로그인 후 화면을 새로고침하면 사용자 정보가 잠시 사라지고, loading 상태가 비정상적으로 길게 유지되며 토큰 만료 시 자동 로그아웃이 매끄럽게 처리되지 않는 문제가 발생했습니다.

🔍 **원인 분석**:
화면 렌더링이 사용자 정보 로딩보다 먼저 진행되어 상태가 일치하지 않았고, 사용자 상태(user)만으로 로그인 여부를 판단하면서 토큰 만료와 사용자 정보 동기화가 즉시 이루어지지 않았습니다.

✔️ **해결 과정**:
인증 구조를 토큰 중심으로 재설계하여 authToken 변화를 감지하고 /api/users/me 호출로 사용자 정보를 재검증하도록 수정했습니다. 또한 인증 검증이 완료된 후에만 loading을 종료하고, 토큰 만료 시 즉시 토큰 삭제와 사용자 상태 초기화를 수행해 무효화 문제를 해결했습니다

---

## 👥 팀원 및 역할

| 이름 | 역할 |
|------------------------|------------------------------------|
| **김명보**   | 팀장, 개발 총괄, AI 파이프라인 설계, 클라우드 아키텍처 구축, 비동기 알림 시스템 설계, 트러블 슈팅 |
| **진승준**   | 프론트엔드 개발, 주요 페이지 구현, 반응형 웹 디자인 적용, 메인화면 이미지, 마커, 기본 이미지 디자인 |
| **권동환**   | 프론트엔드 개발, 클라우드 개발, 디자인 초안 CSS 설정, 회원가입, 로그인 기능 구현, 클라우드 퍼블릭 서버 구현 |
| **장상연**   | 백엔드 개발, DB 설계, 소셜 로그인 기능 구현, SMS 알람 기능 구현, 데이터베이스 설계, API 관리 |
