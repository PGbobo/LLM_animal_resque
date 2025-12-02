from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import time
import threading # ◀◀ [추가] 백그라운드 작업을 위한 스레딩 모듈

# -----------------------------------------------
# (중요) llm_animal.py의 핵심 로직을 import
# (llm_animal.py가 같은 폴더에 있다고 가정)
import llm_animal
# -----------------------------------------------

import faiss
import json
import numpy as np
import pymysql

# 1. Flask 앱 생성 및 CORS 설정
app = Flask(__name__)
CORS(app) # ◀◀ 모든 도메인에서의 요청을 허용 (React 테스트용)

# MySQL DB 설정 (animal_crawler.py와 동일하게)
DB_CONFIG = {
    "host": "project-db-campus.smhrd.com",
    "port": 3307,
    "user": "campus_24IS_CLOUD3_p3_1",
    "password": "smhrd1",
    "database": "campus_24IS_CLOUD3_p3_1",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}
# 2. (필수) 하이브리드 검색에 필요한 DB/인덱스 전역 로드
g_adopt_index = None
g_adopt_db_full = None
g_missing_index = None
g_missing_db_full = None

def load_ai_models(): # ◀◀ 함수로 묶기
    global g_adopt_index, g_adopt_db_full, g_missing_index, g_missing_db_full
    print("--- AI 모델 로드 시작 ---")
    try:
        # --- DB 1: 입양동물 (Adoption) DB 로드 ---
        print(f"'{llm_animal.INDEX_FILE}' (입양DB) 로드 중...")
        g_adopt_index = faiss.read_index(llm_animal.INDEX_FILE)

        print(f"'{llm_animal.ID_MAP_FILE}' (입양DB 맵) 로드 중...")
        with open(llm_animal.ID_MAP_FILE, "r", encoding="utf-8") as f:
            # (변수명 주의: g_adopt_id_map은 전역변수 선언 안 해도 됨, 내부 사용)
            json.load(f)

        print(f"'{llm_animal.DB_FILE}' (입양DB 원본) 로드 중...")
        with open(llm_animal.DB_FILE,"r",encoding="utf-8") as f:
            g_adopt_db_full = json.load(f)
        print(f"✅ 입양DB 로드 완료 (총 {len(g_adopt_db_full)}개 항목)")

        # --- DB 2: 실종동물 (Missing) DB 로드 ---
        MISSING_INDEX_FILE = "missing_vectors.index"
        MISSING_MAP_FILE = "missing_map.json"
        MISSING_DB_FILE = "missing_pets.json"

        print(f"'{MISSING_INDEX_FILE}' (실종DB) 로드 중...")
        g_missing_index = faiss.read_index(MISSING_INDEX_FILE)

        print(f"'{MISSING_MAP_FILE}' (실종DB 맵) 로드 중...")
        with open(MISSING_MAP_FILE, "r", encoding="utf-8") as f:
            json.load(f)

        print(f"'{MISSING_DB_FILE}' (실종DB 원본) 로드 중...")
        with open(MISSING_DB_FILE,"r",encoding="utf-8") as f:
            g_missing_db_full = json.load(f)
        print(f"✅ 실종DB 로드 완료 (총 {len(g_missing_db_full)}개 항목)")

    except Exception as e:
        print(f"❌ [치명적 오류] DB 파일 로드 실패: {e}")

# ◀◀ 서버 시작 시 최초 1회 실행
load_ai_models()
print("\n✅ 모든 DB 로드 완료. API 서버 대기 중...")
# -----------------------------------------------------------------

# "신호 주기" 헬퍼 함수
def create_notification_signal(user_num, message):
    """
    NOTIFICATIONS 테이블에 'pending' 상태로 새 알림을 INSERT합니다.
    """
    conn = None
    curs = None

    try:
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()

        sql = """
        INSERT INTO NOTIFICATIONS (user_num, message, status)
        VALUES (%s, %s, 'pending')
        """
        curs.execute(sql, (user_num, message))
        conn.commit()
        print(f"  [🔔 알림 신호 생성] User {user_num}에게 '{message[:20]}...' 전송 예약")

    except Exception as e:
        print(f"  [❌ 알림 신호 실패] User {user_num} DB INSERT 실패: {e}")
        if conn: conn.rollback()
    finally:
        if curs: curs.close()
        if conn: conn.close()

def get_user_details_from_db(user_num):
    """
    USERS 테이블에서 user_id로 연락처 정보를 가져옵니다.
    """
    conn = None
    curs = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()

        # (주의: USERS 테이블과 user_id 컬럼명이 실제와 일치해야 함)
        curs.execute("SELECT phone, telegram_chat_id FROM USERS WHERE USER_NUM = %s", (user_num,))
        user_details = curs.fetchone()

        if user_details:
            return user_details
        else:
            return None

    except Exception as e:
        print(f"  [❌ DB 조회 실패] USERS 테이블 조회 실패: {e}")
        return None
    finally:
        if curs: curs.close()
        if conn: conn.close()

# 헬스 체크(Health Check) 엔드포인트
@app.route('/', methods=['GET'])
def health_check():
    print("[요청 수신] / (Health Check)")
    # 이 주소로 접속하면 "ok" 메시지를 반환합니다.
    return jsonify({"status": "ok", "message": "API 서버가 정상 작동 중입니다."})

# 3. (핵심) 이미지 검색 API 엔드포인트 생성
@app.route('/api/search', methods=['POST'])
def handle_search():
    print("\n[요청 수신] /api/search")

    # 1. React가 보낸 이미지 데이터(Base64) 받기
    data = request.json
    if 'image_base64' not in data:
        return jsonify({"error": "이미지 데이터가 없습니다."}), 400

    image_data_b64 = data['image_base64']
    (start_time_total) = time.time()

    try:
        # 2. 쿼리 이미지 분석 (llm_animal.py의 함수 재사용)
        # (analyze_image_bytes 함수는 Base64를 인자로 받으므로 완벽함)
        query_obj = llm_animal.analyze_image_bytes(image_data_b64, "api_query.jpg")
        if not query_obj:
            return jsonify({"error": "LLM 분석 실패"}), 500

        query_attr_emb = llm_animal.get_embeddings_for_attributes(query_obj)
        if not (query_attr_emb and "__merged__" in query_attr_emb):
            return jsonify({"error": "임베딩 생성 실패"}), 500

        print(f"✅ 쿼리 벡터 생성 완료")

        # 3. FAISS + 하이브리드 검색 실행 (llm_animal.py의 로직 재사용)
        query_merged_vector = query_attr_emb["__merged__"]
        query_vector_np = np.array([query_merged_vector]).astype('float32')
        faiss.normalize_L2(query_vector_np)

        D_faiss, I_faiss = g_adopt_index.search(query_vector_np, llm_animal.K_CANDIDATES)
        candidate_indices = I_faiss[0]

        query_species = query_obj.get("dog_or_cat_or_other")
        final_results_data = [] # ◀ JSON으로 반환할 리스트

        for idx in candidate_indices:
            item = g_adopt_db_full[idx]
            if item.get("attributes", {}).get("dog_or_cat_or_other") == query_species:
                score = llm_animal.compare_query_to_item(query_attr_emb, item)
                final_results_data.append({
                    "filename": item["filename"],
                    "score": score
                })

        final_results_data.sort(key=lambda x: x["score"], reverse=True)

        print(f"✅ 하이브리드 검색 완료 (총 {time.time() - start_time_total:.2f}초)")

        # 4. React에게 Top 10 결과를 JSON으로 응답
        return jsonify({
            "message": "검색 성공",
            "results": final_results_data[:llm_animal.K_FINAL] #
        })

    except Exception as e:
        print(f"❌ /api/search 처리 중 심각한 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 4. 자연어 기반 입양 추천 API 엔드포인트
@app.route('/api/adapt', methods=['POST'])
def handle_adapt_recommendation():
    print("\n[요청 수신] /api/adapt") # ◀ 주소 변경

    # 1. React가 보낸 '텍스트' 데이터 받기
    data = request.json
    if 'query_text' not in data: # ◀ 'image_base64' 대신 'query_text'
        return jsonify({"error": "텍스트 쿼리가 없습니다."}), 400

    query_text = data['query_text'] # ◀ 'image_base64' 대신 'query_text'
    (start_time_total) = time.time()

    try:
        # 2. 텍스트 쿼리를 -> JSON으로 번역
        query_obj = llm_animal.analyze_text_with_llm(query_text)
        if not query_obj:
            return jsonify({"error": "LLM 텍스트 분석 실패"}), 500

        # 3. 번역된 JSON을 -> 벡터로 변환
        query_attr_emb = llm_animal.get_embeddings_for_attributes(query_obj)
        if not (query_attr_emb and "__merged__" in query_attr_emb):
            return jsonify({"error": "임베딩 생성 실패"}), 500

        print(f"✅ 쿼리 벡터 생성 완료")

        # 4. FAISS + 하이브리드 검색 실행
        query_merged_vector = query_attr_emb["__merged__"]
        query_vector_np = np.array([query_merged_vector]).astype('float32')
        faiss.normalize_L2(query_vector_np)

        D_faiss, I_faiss = g_adopt_index.search(query_vector_np, llm_animal.K_CANDIDATES)
        candidate_indices = I_faiss[0]

        # 5. '종' 필터링 및 가중치 재정렬
        query_species = query_obj.get("dog_or_cat_or_other")
        final_results_data = []

        for idx in candidate_indices:
            item = g_adopt_db_full[idx]

            # (중요) LLM이 '개'라고 번역했으면, 고양이는 여기서 자동 필터링됨
            if item.get("attributes", {}).get("dog_or_cat_or_other") == query_species:

                # (중요) `weights`가 여기서 100% 동일하게 적용됨
                score = llm_animal.compare_query_to_item(query_attr_emb, item)
                final_results_data.append({
                    "filename": item["filename"],
                    "score": score
                })

        final_results_data.sort(key=lambda x: x["score"], reverse=True)

        print(f"✅ 하이브리드 검색 완료 (총 {time.time() - start_time_total:.2f}초)")

        # 6. (100% 동일) ◀◀ React에게 Top 10 결과를 JSON으로 응답
        return jsonify({
            "message": "검색 성공",
            "results": final_results_data[:llm_animal.K_FINAL]
        })

    except Exception as e:
        print(f"❌ /api/adapt 처리 중 심각한 오류: {e}")
        return jsonify({"error": str(e)}), 500

# 실종동물 제보 API (사진/텍스트 겸용)
# -----------------------------------------------------------------
@app.route('/api/report_sighting', methods=['POST'])
def handle_sighting_report():
    print("\n[요청 수신] /api/report_sighting (실종DB 검색)")
    data = request.json

    # ◀ 사진 또는 텍스트를 받음
    image_data_b64 = data.get('image_base64') # (Optional)
    query_text = data.get('query_text')       # (Optional)
    (start_time_total) = time.time()

    try:
        query_obj = None

        # 1. 쿼리 분석 (사진/텍스트 분기 처리)
        if image_data_b64:
            print("[제보 유형] 사진")
            query_obj = llm_animal.analyze_image_bytes(image_data_b64, "api_query_sighting.jpg")
        elif query_text:
            print("[제보 유형] 텍스트")
            query_obj = llm_animal.analyze_text_with_llm(query_text)
        else:
            return jsonify({"error": "이미지 또는 텍스트 쿼리가 필요합니다."}), 400

        if not query_obj: return jsonify({"error": "LLM 쿼리 분석 실패"}), 500

        # 2. 임베딩 (공통 로직 재사용)
        query_attr_emb = llm_animal.get_embeddings_for_attributes(query_obj)
        if not (query_attr_emb and "__merged__" in query_attr_emb):
            return jsonify({"error": "임베딩 생성 실패"}), 500

        print(f"✅ 제보 쿼리 벡터 생성 완료")

        # 3. ◀◀ [핵심] 하이브리드 검색 (g_missing_... 변수 사용)
        query_merged_vector = query_attr_emb["__merged__"]
        query_vector_np = np.array([query_merged_vector]).astype('float32')
        faiss.normalize_L2(query_vector_np)

        # (중요) ◀ '실종동물' 인덱스를 검색
        D_faiss, I_faiss = g_missing_index.search(query_vector_np, llm_animal.K_CANDIDATES)
        candidate_indices = I_faiss[0]

        query_species = query_obj.get("dog_or_cat_or_other")
        final_results_data = []

        alerted_user_ids = set() # ◀ 중복 알림 방지용 Set

        # DB 연결
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()

        for idx in candidate_indices:
            # (중요) ◀ '실종동물' DB에서 아이템 조회
            item = g_missing_db_full[idx]
            if item.get("attributes", {}).get("dog_or_cat_or_other") == query_species:
                score = llm_animal.compare_query_to_item(query_attr_emb, item)

                # --- [신규 4] ◀ "신호 주기" 로직 ---
                if score >= 0.80: # ◀ 80% 이상 매칭!

                    # (가정) ◀ 실종동물 DB의 attributes에 user_num (PK)이 저장되어 있어야 함
                    owner_user_num = item.get("attributes", {}).get("user_num")

                    if owner_user_num and owner_user_num not in alerted_user_ids:
                        print(f"  [🔔 80% 매칭 발견!] 실종동물: {item.get('filename')}, 주인 ID: {owner_user_num}")

                        # ◀◀ [수정] 파일명에서 이름 추출 로직
                        full_path = item.get('filename', '') # 예: abandon/missing/5_뽀삐_1234.jpg
                        pet_name = "반려동물" # 기본값
                        try:
                            # 1. 경로 떼고 파일명만 (5_뽀삐_1234.jpg)
                            file_only = full_path.split('/')[-1]
                            # 2. 언더바(_)로 쪼개서 두 번째 덩어리(이름) 가져오기
                            pet_name = file_only.split('_')[1]
                        except:
                            pass # 이름 파싱 실패 시 기본값 사용

                        # 1. 알림 메시지 생성
                        message = f"[이어주개] 회원님의 실종동물 '{pet_name}'과(와) {score*100:.0f}% 유사한 동물이 제보되었습니다! \n\n▶홈페이지 확인하기\nhttp://connectdog.kro.kr/"

                        # 2. (수정) ◀ 초간단 "신호" INSERT (연락처 조회 안 함)
                        create_notification_signal(owner_user_num, message)

                        alerted_user_ids.add(owner_user_num)

                # DB에서 '이름'과 '장소' 조회
                # (S3 키는 "abandon/missing/..." 형식이므로 LIKE 검색)
                s3_key = item["filename"]
                pet_name_db = "이름 미상"
                lost_loc_db = "위치 정보 없음"

                try:
                    # PET_IMAGE_URL에 s3_key가 포함된 레코드를 찾음
                    sql = "SELECT PET_NAME, LOST_LOCATION FROM MISSING WHERE PET_IMAGE_URL LIKE %s"
                    curs.execute(sql, (f"%{s3_key}",))
                    row = curs.fetchone()
                    if row:
                        pet_name_db = row['PET_NAME']
                        lost_loc_db = row['LOST_LOCATION']
                except Exception as e:
                    print(f"  [DB 조회 에러] {s3_key}: {e}")

                final_results_data.append({
                    "filename": item["filename"],
                    "score": score,
                    "petName": pet_name_db,   # ◀ DB에서 가져온 이름
                    "location": lost_loc_db   # ◀ DB에서 가져온 위치
                })

        final_results_data.sort(key=lambda x: x["score"], reverse=True)

        print(f"✅ /api/report_sighting 검색 완료 (총 {time.time() - start_time_total:.2f}초)")
        return jsonify({"message": "검색 성공", "results": final_results_data[:llm_animal.K_FINAL]})

    except Exception as e:
        print(f"❌ /api/report_sighting 처리 중 심각한 오류: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # ◀◀ [핵심] 에러가 나든 성공하든 DB 연결을 반드시 닫음
        if curs: curs.close()
        if conn: conn.close()

# ◀◀ [핵심 수정] 새로고침 API (비동기 처리)
@app.route('/api/refresh_index', methods=['POST', 'GET'])
def refresh_index():
    print("\n[요청 수신] /api/refresh_index (Hot Reload - Background)")

    # 1. 백그라운드에서 실행할 내부 함수 정의
    def background_task():
        try:
            print("⏳ [Background] 인덱스 갱신 및 AI 모델 리로드 시작...")
            
            # (오래 걸리는 작업) S3 스캔 -> JSON/Index 재생성
            success = llm_animal.refresh_missing_data_from_db()
            
            if success:
                # (메모리 로드) 전역변수 교체
                load_ai_models()
                print("✅ [Background] 인덱스 최신화 완료! 이제 검색에 반영됩니다.")
            else:
                print("❌ [Background] 인덱스 갱신 실패")
        except Exception as e:
            print(f"❌ [Background] 백그라운드 작업 중 에러: {e}")

    # 2. 스레드 생성 및 시작 (즉시 리턴됨)
    thread = threading.Thread(target=background_task)
    thread.daemon = True # 메인 프로세스가 죽으면 같이 죽도록 설정
    thread.start()

    # 3. 기다리지 않고 바로 성공 응답 반환 (0.1초 소요)
    return jsonify({"message": "백그라운드에서 인덱스 갱신이 시작되었습니다. (잠시 후 반영됨)"})

# 7. API 서버 실행
if __name__ == '__main__':
    # 디버그 모드는 끈(False) 상태로 배포합니다.
    app.run(host='0.0.0.0', port=5000, debug=False)
