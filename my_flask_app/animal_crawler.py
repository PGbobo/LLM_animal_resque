import pymysql.cursors
import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import csv
from datetime import datetime
from datetime import date 
import re
import sys
import math
import boto3
import os
from io import BytesIO
import llm_animal
import faiss
import numpy as np
import json
import base64

try:
    with open('./API-Key.txt','r') as f:
        os.environ['OPENAI_API_KEY'] = f.read().strip()
    with open('./ACCESS_KEY.txt','r') as f:
        os.environ['NCP_ACCESS_KEY'] = f.read().strip()
    with open('./SECRET_KEY.txt','r') as f:
        os.environ['NCP_SECRET_KEY'] = f.read().strip()
except Exception as e:
    print(f"❌ [치명적 오류] 키 파일(API-Key.txt, ACCESS_KEY.txt, SECRET_KEY.txt) 로드 실패: {e}")
    sys.exit()

# ====================================================================
# 1. 환경 설정 
# ====================================================================
DB_CONFIG = {
    "host": "project-db-campus.smhrd.com",
    "port": 3307, 
    "user": "campus_24IS_CLOUD3_p3_1",
    "password": "smhrd1", 
    "database": "campus_24IS_CLOUD3_p3_1",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}

CRAWL_URL = "https://www.kcanimal.or.kr/board_gallery01/board_list.asp"
BASE_DOMAIN = "https://www.kcanimal.or.kr" 

DB_TABLE_NAME = "ANIMALS"

# 💡 DB 테이블 컬럼 목록 (총 14개 컬럼: BOARD_IDX 포함)
ANIMAL_COLUMNS = ["BOARD_IDX", "NAME", "SPECIES", "BREED", "GENDER", "FEATURE", "PHOTO1", "PHOTO2", "PHOTO3", 
                 "RESCUE_DATE", "RESCUE_LOCATION", "AGE", "CRAWL_URL", "LAST_CRAWLED_AT"]

# 💡 UPSERT를 위한 고유 키 (BOARD_IDX만 사용)
UNIQUE_KEY_COLUMNS = ["BOARD_IDX"]
UNIQUE_KEY_NAME = "unique_animal_record_v9_idx" # 키 이름 변경
ITEMS_PER_PAGE = 12 

try:
    NCP_CONFIG = {
        "endpoint_url": "https://kr.object.ncloudstorage.com",
        "region_name": "kr-standard",
        "aws_access_key_id": os.environ['NCP_ACCESS_KEY'], # (app.py와 동일한 환경변수 사용)
        "aws_secret_access_key": os.environ['NCP_SECRET_KEY']
    }
    S3_BUCKET_NAME = "animal-bucket" # (app.py와 동일한 버킷)
    S3_CRAWL_DIR = "crawled_data" # ◀ S3에 저장할 기본 폴더명
    
    # S3 클라이언트 생성
    s3_client = boto3.client('s3', **NCP_CONFIG)
    print("✅ NCP (S3) 클라이언트 생성 완료.")

except KeyError:
    print("❌ [치명적 오류] NCP 환경변수(NCP_ACCESS_KEY, NCP_SECRET_KEY)가 설정되지 않았습니다.")
    sys.exit()
except Exception as e:
    print(f"❌ [치명적 오류] NCP (S3) 클라이언트 생성 실패: {e}")
    sys.exit()

print("--- [Trigger 1] 알림 서비스를 위해 '실종동물 DB' 로드 시작 ---")
g_missing_index = None
g_missing_db_full = None
try:
    MISSING_INDEX_FILE = "missing_vectors.index"
    MISSING_MAP_FILE = "missing_map.json"
    MISSING_DB_FILE = "missing_pets.json"
    
    print(f"'{MISSING_INDEX_FILE}' (실종DB) 로드 중...")
    g_missing_index = faiss.read_index(MISSING_INDEX_FILE)
    # (맵 파일은 크롤러에서는 필요 없으므로 로드 안 함)
    print(f"'{MISSING_DB_FILE}' (실종DB 원본) 로드 중...")
    with open(MISSING_DB_FILE,"r",encoding="utf-8") as f:
        g_missing_db_full = json.load(f)
    print(f"✅ [Trigger 1] 실종DB 로드 완료 (총 {len(g_missing_db_full)}개 항목)")
except Exception as e:
    print(f"⚠️ [Trigger 1] 실종DB 파일 로드 실패. 알림 서비스(Trigger 1)가 비활성화됩니다: {e}")
    # (실패해도 크롤링은 계속되어야 하므로 sys.exit() 안 함)

# ====================================================================
# 2. 데이터 파싱 도우미 함수 
# ====================================================================

def create_notification_signal(user_num, message, noti_type="IMMEDIATE"):

    conn = None
    curs = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()
        sql = "INSERT INTO NOTIFICATIONS (user_num, message, status, type) VALUES (%s, %s, 'pending', %s)"
        curs.execute(sql, (user_num, message, noti_type))
        conn.commit()
        print(f"  [🔔 알림 신호 생성 (Trigger 1)] User {user_num}에게 '{message[:20]}...' 전송 예약")
        print(f"  [🔔 DB 저장] User {user_num}에게 '{noti_type}' 알림 저장 완료")
    except Exception as e:
        print(f"  [❌ 알림 신호 실패 (Trigger 1)] User {user_num} DB INSERT 실패: {e}")
        if conn: conn.rollback()
    finally:
        if curs: curs.close()
        if conn: conn.close()

def parse_date(date_str):
    date_str = date_str.strip().replace('.', '-').replace('/', '-')
    match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if match:
        date_str = match.group(1)
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date() 
    except ValueError:
        return date.today()
        
def parse_age(age_str):
    """
    나이 문자열을 분석하지 않고, 앞뒤 공백만 제거한 후 원본 문자열을 그대로 반환합니다.
    """
    cleaned_age_str = age_str.strip()
    
    if not cleaned_age_str:
        return '미상'
        
    return cleaned_age_str

# ◀◀ [신규 추가] S3 업로드 헬퍼 함수
def upload_image_to_s3(image_url, board_idx, image_index):
    """
    원본 이미지 URL을 다운로드하여 S3에 업로드하고, S3 Key(경로)를 반환합니다.
    """
    if not image_url:
        return None
        
    try:
        # 1. 원본 이미지 다운로드
        img_response = requests.get(image_url, timeout=10)
        img_response.raise_for_status()
        img_data = BytesIO(img_response.content) # ◀ 메모리에 이미지 저장
        
        # 2. S3 키 생성 (예: crawled_data/38576/image_1.jpg)
        # (파일 확장자를 원본 URL에서 가져오거나, .jpg로 고정)
        file_ext = os.path.splitext(image_url.split('?')[0])[-1] or '.jpg'
        s3_key = f"{S3_CRAWL_DIR}/{board_idx}/image_{image_index}{file_ext}"
        
        # 3. S3에 업로드 (ACL='public-read'로 설정해야 <img> 태그에서 보임)
        s3_client.upload_fileobj(
            img_data,
            S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ACL': 'public-read'} # ◀ (중요) 이미지를 공개로 설정
        )
        
        # 4. (중요) DB에 저장할 최종 URL이 아닌, "S3 Key"만 반환
        # (React에서는 S3_BUCKET_BASE_URL + s3_key로 조합해서 사용)
        return s3_key 
        
    except requests.exceptions.RequestException:
        print(f"  [Fail] S3 업로드 실패 (이미지 다운로드 오류): {image_url}")
        return None
    except Exception as e:
        print(f"  [Fail] S3 업로드 실패 (Boto3 오류): {e}")
        return None

# ====================================================================
# 3. 상세 페이지 크롤링 함수 (사진 URL 추출 로직 재강화)
# ====================================================================
def fetch_detail_info(board_idx):
    if not board_idx or not str(board_idx).isdigit():
        return "미상", "미상", "board_idx 오류", None, None, None
        
    detail_url = f"{BASE_DOMAIN}/board_gallery01/board_content.asp?board_idx={board_idx}&tname=board_gallery01"
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(detail_url, timeout=10, headers=headers)
        response.encoding = 'euc-kr' 
        response.raise_for_status()
        soup = bs(response.text, 'html.parser')

        # 축종/품종 추출
        species_th = soup.find("th", string="축종")
        species = species_th.find_next_sibling('td').text.strip() if species_th else "미상"
        
        breed_th = soup.find("th", string="품종")
        breed = breed_th.find_next_sibling('td').text.strip() if breed_th else "미상"
        if breed == "-": breed = "미상" 

        # 💡 사진 URL 3개 추출 로직 💡
        photo_urls = []
        selectors = [
            '.board_content_img img', 
            'td[colspan="4"] img',
            'div.board_content_img_box img' 
        ]

        for selector in selectors:
            for img in soup.select(selector):
                img_src = img.get('src')
                if not img_src or 'no_img' in img_src or '.gif' in img_src:
                    continue
                
                # 상대 경로를 절대 경로로 변환
                if img_src.startswith('/'):
                    full_url = BASE_DOMAIN + img_src
                elif not img_src.startswith('http'):
                    full_url = f"{BASE_DOMAIN}/board_gallery01/" + img_src
                else:
                    full_url = img_src
                    
                if full_url not in photo_urls:
                    photo_urls.append(full_url)
                if len(photo_urls) >= 3: break
            if len(photo_urls) >= 3: break

        # 추출된 원본 URL을 S3에 업로드하고, S3 Key로 교체
        s3_key_1 = upload_image_to_s3(photo_urls[0] if len(photo_urls) > 0 else None, board_idx, 1)
        s3_key_2 = upload_image_to_s3(photo_urls[1] if len(photo_urls) > 1 else None, board_idx, 2)
        s3_key_3 = upload_image_to_s3(photo_urls[2] if len(photo_urls) > 2 else None, board_idx, 3)

        # 특징 및 특이사항 추출 -> Feature로 통합
        features = []
            
        feature_th = soup.find("th", text="특징")
        feature_text = feature_th.find_next_sibling('td').text.strip() if feature_th else ""
        if feature_text: features.append(f"특징:{feature_text}")
            
        special_th = soup.find("th", text="특이사항")
        if special_th:
            special_text = special_th.find_next_sibling('td').text.strip()
            if special_text: features.append(f"특이사항:{special_text}")
                
        final_feature_detail = ", ".join(features)
        
        return species, breed, final_feature_detail, s3_key_1, s3_key_2, s3_key_3

    except requests.exceptions.RequestException:
        print(f"  [Fail] 상세 요청 실패: {detail_url} (네트워크/서버 오류)")
        return "미상", "미상", "상세 요청 오류", None, None, None 
    except Exception as e:
        print(f"  [Fail] 파싱 실패: {detail_url} ({e})")
        return "미상", "미상", "상세 파싱 오류", None, None, None

# ====================================================================
# 4. 동적 페이지 수 추출 및 목록 크롤링 함수 
# ====================================================================
def get_total_pages(url):
    """총 게시물 수를 파싱하여 총 페이지를 계산합니다. (파싱 안정성 강화)"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, timeout=10, headers=headers)
        response.encoding = 'euc-kr' 
        response.raise_for_status()
        soup = bs(response.text, 'html.parser')
        
        # 총 게시물 수 선택자 강화
        total_count_element = soup.select_one("td.list_total strong")
        total_items = 0 
        
        if total_count_element:
            match = re.search(r'(\d+)', total_count_element.text)
            if match:
                total_items = int(match.group(1))
        
        if total_items == 0:
            text_element = soup.find(text=re.compile(r'\d+\s*건'))
            if text_element:
                match = re.search(r'(\d+)', text_element)
                if match:
                    total_items = int(match.group(1))
            
        if total_items == 0:
            print("[Warning] 총 페이지 수를 자동으로 파악할 수 없습니다. 기본값 1페이지만 크롤링합니다.")
            return 1 
        else:
            total_pages = math.ceil(total_items / ITEMS_PER_PAGE)
        
        print(f"    [DEBUG] 웹사이트 총 게시물 수: {total_items}개, 페이지당 항목 수: {ITEMS_PER_PAGE}개")
        print(f"    [DEBUG] 계산된 총 페이지 수: {total_pages}개")
        
        return total_pages

    except requests.exceptions.RequestException:
        print(f"  [Error] 총 페이지 수 요청 오류. 1페이지로 설정합니다.")
        return 1
    except Exception as e:
        print(f"  [Error] 페이지 수 파싱 오류: {e}. 1페이지로 설정합니다.")
        return 1


def fetch_data(url):
    """지정된 URL에서 동물 데이터를 크롤링하고 상세 페이지 정보를 추가합니다. 
    반환 값에 board_idx와 상세 페이지 URL을 포함합니다."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, timeout=10, headers=headers)
        response.encoding = 'euc-kr' 
        response.raise_for_status()
        soup = bs(response.text, 'html.parser')

        # 목록 항목 선택자 대폭 강화 
        items = soup.select("ul.list_gallery_ul > li, #goodsBox > ul > li, .board_list_gallery > ul > li") 
            
        print(f"    [DEBUG] URL: {url} | 발견된 항목 수: {len(items)}개")
        
        data = []
        
        current_page_url = url # 목록 페이지 URL (사용하지 않음)
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            def process_item(item):
                board_idx = "N/A"
                try:
                    link = item.select_one('a')
                    if not link or not link.get('href'): return None
                    
                    # 상세 URL에서 board_idx 추출
                    detail_href = link['href']
                    match_idx = re.search(r'board_idx=(\d+)', detail_href)
                    if not match_idx: return None 
                    board_idx = match_idx.group(1) 
                    
                    # CRAWL_URL에 저장할 상세 URL을 생성
                    detail_url_to_save = f"{BASE_DOMAIN}/board_gallery01/board_content.asp?board_idx={board_idx}&tname=board_gallery01"
                    
                    # 목록에서 기본 정보 추출
                    p_text_el = item.select_one("div p")
                    if not p_text_el: return None
                    p_text = p_text_el.text.strip()
                    
                    match_name = re.match(r'(.+?)\s*\(\d{2}-\d+\)', p_text)
                    # 💡 [수정된 부분] 이름이 없으면 "(이름없음)"으로 설정하고 항목을 버리지 않습니다.
                    name = match_name.group(1).strip() if match_name and match_name.group(1).strip() else "(이름없음)"
                    
                    # 💡 이름이 "(이름없음)"인 경우에도 항목을 버리지 않도록 해당 `if` 구문을 제거했습니다.

                    feature_status = p_text.split(')')[-1].strip()
                    
                    span_text_el = item.select_one("div span")
                    if not span_text_el: return None
                    span_text = span_text_el.text.strip().split('|')

                    rescue_loc = span_text[0].strip() if len(span_text) > 0 else "미상"
                    rescue_date_str = span_text[1].strip() if len(span_text) > 1 else "미상"
                    age_str = span_text[2].strip() if len(span_text) > 2 else "0살"
                    gender = span_text[3].strip() if len(span_text) > 3 else "미상"
                    weight = span_text[4].strip() if len(span_text) > 4 else "0kg"
                    
                    # 상세 페이지에서 데이터 추출
                    species, breed, feature_detail, photo1, photo2, photo3 = fetch_detail_info(board_idx) 
                    
                    # 필수 데이터 유효성 재확인 (이름 제외)
                    # 축종, 구조일, 품종 정보는 반드시 있어야 DB에 저장합니다.
                    if species == "미상" or rescue_date_str == "미상" or breed == "미상":
                        return None 

                    rescue_date = parse_date(rescue_date_str)
                    age = parse_age(age_str)
                    feature = f"상태:{feature_status}, 무게:{weight}, 상세특징:[{feature_detail}]"
                    
                    # 최종 데이터 리턴 (이름이 없어도 저장됨)
                    return (board_idx, name, species, breed, gender, feature, photo1, photo2, photo3, 
                            rescue_date, rescue_loc, age, detail_url_to_save)
                            
                except Exception as item_e:
                    # print(f"    [Fail] 목록 항목 파싱 실패 (idx:{board_idx}): {item_e}")
                    return None

            results = executor.map(process_item, items)
            data = [result for result in results if result is not None]

        return data
        
    except requests.exceptions.RequestException as e:
        print(f"  [Error] 웹 요청 오류: {e}")
        return []
    except Exception as e:
        print(f"  [Error] 알 수 없는 오류: {e}")
        return []

# ====================================================================
# 5. DB 및 스케줄러 함수 
# ====================================================================

def initialize_db_schema():
    """DB에 연결하여 UPSERT를 위한 UNIQUE KEY가 존재하는지 확인하고 설정합니다."""
    print("🛠️ DB 초기화 (UNIQUE KEY 설정)를 시작합니다.")
    conn = None
    curs = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()
        
        key_columns_str = ', '.join(f'`{c}`' for c in UNIQUE_KEY_COLUMNS)
        sql_add_unique_key = f"""
        ALTER TABLE {DB_TABLE_NAME}
        ADD UNIQUE KEY {UNIQUE_KEY_NAME} ({key_columns_str});
        """
        
        # 기존 UNIQUE KEY 삭제 시도 (안정성 강화)
        try:
            print("  [DEBUG] 기존 UNIQUE KEY 삭제 시도...")
            # 이전 버전의 키 삭제 시도
            curs.execute(f"ALTER TABLE {DB_TABLE_NAME} DROP KEY unique_animal_num_id;")
            curs.execute(f"ALTER TABLE {DB_TABLE_NAME} DROP KEY unique_animal_record;")
            curs.execute(f"ALTER TABLE {DB_TABLE_NAME} DROP KEY unique_animal_record_no_breed;")
            curs.execute(f"ALTER TABLE {DB_TABLE_NAME} DROP KEY unique_animal_record_v6;")
            curs.execute(f"ALTER TABLE {DB_TABLE_NAME} DROP KEY unique_animal_record_test;")
            # 현재 키도 혹시 모를 중복 대비 삭제 시도
            curs.execute(f"ALTER TABLE {DB_TABLE_NAME} DROP KEY {UNIQUE_KEY_NAME};") 
            conn.commit()
            print("  [DEBUG] 이전 UNIQUE KEY 삭제 완료.")
        except pymysql.err.ProgrammingError as e:
             if e.args[0] != 1091: # 1091: KEY가 존재하지 않음 오류는 무시
                 print(f"  [DEBUG] 이전 KEY 삭제 실패: {e}")
             pass 
        except Exception:
             pass 

        # 새로운 UNIQUE KEY 설정
        curs.execute(sql_add_unique_key)
        conn.commit()
        print(f"✅ UNIQUE KEY '{UNIQUE_KEY_NAME}' 설정 완료: ({key_columns_str})")

    except pymysql.err.ProgrammingError as e:
        if e.args[0] == 1061: 
            print(f"⚠️ UNIQUE KEY '{UNIQUE_KEY_NAME}'가 이미 존재합니다. (초기화 건너뛰기)")
        elif e.args[0] == 1146:
            print(f"❌ DB 초기화 오류: 테이블 '{DB_TABLE_NAME}'를 찾을 수 없습니다. (테이블 생성 필요)")
        elif e.args[0] == 1072: # Key column 'BOARD_IDX' doesn't exist in table
             print(f"❌ DB 초기화 오류: 테이블에 BOARD_IDX 컬럼이 없습니다. 먼저 컬럼을 추가하세요! ({e})")
        else:
            print(f"❌ DB 초기화 오류: {e}")
    except Exception as e:
        print(f"❌ DB 연결/초기화 중 치명적인 오류 발생: {e}")
        
    finally:
        if curs: curs.close()
        if conn: conn.close()
        print("✅ DB 연결 종료.")


def job_crawl_and_save():
    job_timestamp = datetime.now() 
    current_time = job_timestamp.strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n=======================================================")
    print(f"🚀 스케줄링된 동물 데이터 크롤링 작업 시작: {current_time}")
    print(f"=======================================================")

    total_pages = get_total_pages(CRAWL_URL)

    if total_pages == 0:
        print("[INFO] 총 페이지 수를 파악할 수 없으므로 크롤링을 중단합니다.")
        return
    
    urls = []
    # 💡 페이지 제한을 total_pages로 변경하여 전체 크롤링 
    max_pages_to_crawl = total_pages
    
    for page in range(1, max_pages_to_crawl + 1): 
        if page == 1:
            urls.append(CRAWL_URL) 
        else:
            urls.append(f"{CRAWL_URL}?page={page}")
            
    print(f"[INFO] 크롤링할 최종 URL 수: {len(urls)}개 (총 {total_pages}페이지 모두 시도)")
    
    all_data = []
    
    global g_missing_index, g_missing_db_full, s3_client
    
    # (수정) ◀ "실종DB"가 로드되었는지(알림 기능 활성화) 확인
    trigger1_enabled = g_missing_index is not None and g_missing_db_full is not None
    if trigger1_enabled:
        print(f"✅ [Trigger 1] 활성화됨. 크롤링 데이터를 실시간으로 '실종DB'와 비교합니다.")
    else:
        print(f"⚠️ [Trigger 1] 비활성화됨. '실종DB' 로드에 실패했으므로 알림 비교를 건너뜁니다.")
        
    alerted_owners_for_board = {} # ◀ (신규) 중복 알림 방지용 (board_idx: {user_num, user_num})

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(fetch_data, urls)
        for result_list_per_page in results:
            
            # 1. (원본) ◀ 크롤링 데이터를 all_data 리스트에 추가
            all_data.extend(result_list_per_page) 
            
            # 2. (신규) ◀ Trigger 1 로직 (실종DB가 로드된 경우에만 실행)
            if trigger1_enabled and result_list_per_page:
                
                print(f"  [Trigger 1] {len(result_list_per_page)}개 신규 데이터 AI 비교 시작...")
                
                # 갓 크롤링된 페이지의 동물들(result_list_per_page)을 하나씩 순회
                for new_animal_tuple in result_list_per_page:
                    try:
                        # (참고: ANIMAL_COLUMNS 순서와 동일함)
                        # (board_idx, name, species, breed, gender, feature, 
                        #  photo1, photo2, photo3, rescue_date, ...)
                        board_idx = new_animal_tuple[0]
                        photo1_s3_key = new_animal_tuple[6] # ◀ 7번째 값 (PHOTO1 S3 Key)
                        
                        if not photo1_s3_key:
                            continue # ◀ 사진 없으면 비교 불가
                            
                        # 2-1. (느린 작업) ◀ S3에서 방금 올린 사진을 다시 다운로드
                        obj = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=photo1_s3_key)
                        image_bytes = obj['Body'].read()
                        image_data_b64 = base64.b64encode(image_bytes).decode("utf-8")

                        # 2-2. (느린 작업) ◀ LLM 분석으로 벡터 생성
                        query_obj = llm_animal.analyze_image_bytes(image_data_b64, f"crawl_{board_idx}.jpg")
                        if not query_obj: continue
                        query_attr_emb = llm_animal.get_embeddings_for_attributes(query_obj)
                        if not (query_attr_emb and "__merged__" in query_attr_emb):
                            continue
                            
                        # 2-3. (빠른 작업) ◀ "실종 DB" 검색
                        query_merged_vector = query_attr_emb["__merged__"]
                        query_vector_np = np.array([query_merged_vector]).astype('float32')
                        faiss.normalize_L2(query_vector_np)
                        
                        D_faiss, I_faiss = g_missing_index.search(query_vector_np, llm_animal.K_CANDIDATES)
                        candidate_indices = I_faiss[0]
                        
                        query_species = query_obj.get("dog_or_cat_or_other")
                        
                        # 2-4. 80% 이상 매칭 확인
                        for idx in candidate_indices:
                            missing_item = g_missing_db_full[idx]
                            
                            if missing_item.get("attributes", {}).get("dog_or_cat_or_other") == query_species:
                                score = llm_animal.compare_query_to_item(query_attr_emb, missing_item)
                                
                                if score >= 0.80:
                                    owner_user_num = missing_item.get("attributes", {}).get("user_num")
                                    if not owner_user_num: continue
                                        
                                    # ◀ 중복 알림 방지
                                    if board_idx not in alerted_owners_for_board:
                                        alerted_owners_for_board[board_idx] = set()

                                    if owner_user_num not in alerted_owners_for_board[board_idx]:
                                        # 1. 파일명에서 '이름'만 예쁘게 추출하기
                                        full_path = missing_item.get('filename', '') # 예: abandon/missing/15_천사_1764...jpg
                                        pet_name = "반려동물" # 기본값
                                        try:
                                            # 경로 떼고 파일명만 (15_천사_1764...jpg)
                                            file_only = full_path.split('/')[-1]
                                            # 언더바(_)로 쪼개서 두 번째 덩어리(이름) 가져오기
                                            pet_name = file_only.split('_')[1]
                                        except:
                                            pass # 이름 파싱 실패 시 기본값 사용

                                        print(f"  [🔔 80% 매칭 (Trigger 1)] 신규(idx:{board_idx}) ↔ 실종({pet_name})")
                                        
                                        # 2. 메시지 포맷을 '제보' 때와 똑같이 맞춤 (오타 수정 포함)
                                        message = f"[이어주개] 회원님의 실종동물'{pet_name}'과(와) {score*100:.0f}% 유사한 동물이 광주광역시 동물보호센터에서 발견되었습니다!\n\n▶공고 확인하기:\nhttps://www.kcanimal.or.kr/board_gallery01/board_content.asp?board_idx={board_idx}&tname=board_gallery01"

                                        # 2-5. "신호" INSERT
                                        create_notification_signal(owner_user_num, message, noti_type="SCHEDULED")

                                        alerted_owners_for_board[board_idx].add(owner_user_num)
                                           
                    except Exception as e:
                        print(f"  [❌ Trigger 1 오류] 신규 데이터(tuple: {new_animal_tuple[0]}) 비교 중 실패: {e}")
            
    # 데이터 리스트를 튜플로 변환하여 중복 제거
    data_list = list(set(tuple(row) for row in all_data))
    
    print(f"[INFO] 크롤링된 유효 데이터 항목 수 (중복 제거 후): {len(data_list)}개")
    
    if not data_list:
        print("⚠️ 크롤링된 유효 데이터가 없어 DB 작업을 건너뛰었습니다.")
        return

    # 3. 데이터프레임 생성 및 CSV 저장
    # 💡 크롤링된 데이터(13개: BOARD_IDX + 11개 항목 + CRAWL_URL)에 타임스탬프(1개)를 추가하여 14개 컬럼에 맞춤
    df = pd.DataFrame([row + (job_timestamp,) for row in data_list], columns=ANIMAL_COLUMNS) 
    timestamp_str = job_timestamp.strftime("%Y%m%d_%H%M%S")
    csv_filename = f"{DB_TABLE_NAME}_{timestamp_str}.csv"
    
    try:
        df.to_csv(csv_filename, header=True, index=False, quoting=csv.QUOTE_ALL, encoding='utf-8')
        print(f"✅ Data saved successfully to {csv_filename}")
    except Exception as e:
        print(f"❌ CSV 저장 중 오류 발생: {e}")

    # 4. MySQL 연결 및 저장 (UPSERT & DELETE)
    conn = None
    curs = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()
        
        # 4.1. DB UPSERT 쿼리 생성
        column_names = ANIMAL_COLUMNS
        value_placeholders = ', '.join(['%s'] * len(column_names))
        
        # LAST_CRAWLED_AT과 CRAWL_URL, NAME, SPECIES 등 비-고유 키 컬럼을 업데이트
        update_cols = [
            f'`{c}` = VALUES(`{c}`)' 
            for c in column_names 
            if c not in UNIQUE_KEY_COLUMNS # BOARD_IDX를 제외한 모든 컬럼 업데이트
        ]
        update_set_clause = ', '.join(update_cols)
        
        sql_upsert = f"""
        INSERT INTO {DB_TABLE_NAME} ({', '.join(f'`{c}`' for c in column_names)}) 
        VALUES({value_placeholders})
        ON DUPLICATE KEY UPDATE
            {update_set_clause};
        """ 
        
        data_to_insert = [tuple(row) for row in df.values]
        
        rows_processed = curs.executemany(sql_upsert, data_to_insert)
        
        conn.commit()
        
        print(f"✅ DB UPSERT 완료. 총 {rows_processed}개 레코드를 처리했습니다 (삽입/업데이트 포함).")
        
        # 4.2. 사라진 데이터 삭제 (DELETE)
        sql_delete_old = f"""
        DELETE FROM {DB_TABLE_NAME} 
        WHERE LAST_CRAWLED_AT < %s;
        """
        rows_deleted = curs.execute(sql_delete_old, (job_timestamp,))
        
        conn.commit()
        
        print(f"✅ 사라진 데이터 삭제 완료. 총 {rows_deleted}개 레코드를 삭제했습니다.")

    except Exception as e:
        print(f"❌ DB 작업 중 치명적인 오류 발생: {e}")
        if conn:
            conn.rollback()
            print("❌ DB 롤백 완료.")
            
    finally:
        if curs: curs.close()
        if conn: conn.close()
        print("✅ DB 연결 종료.")
    
    print("\n-------------------------------------------------------")
    print("🚀 [Step 2] AI 데이터(JSON/Index) 자동 갱신을 시작합니다.")
    print("-------------------------------------------------------")

    try:
        # 1. 파일 갱신 (llm_animal.py에 새로 만든 함수 호출)
        # 주의: llm_animal.py에 'refresh_crawled_data' 함수가 반드시 있어야 합니다.
        if hasattr(llm_animal, 'refresh_crawled_data'):
            success = llm_animal.refresh_crawled_data()
        else:
            print("❌ [오류] llm_animal.py에 'refresh_crawled_data' 함수가 없습니다.")
            success = False

        if success:
            # 2. 실행 중인 Flask 서버에게 "메모리 새로고침(Hot Reload)" 요청
            # (WAS 서버가 로컬호스트 5000번에 있다고 가정)
            print("📡 [Step 3] Flask 서버 메모리 새로고침 요청 중...")
            try:
                # 타임아웃을 넉넉하게 10분(600초)으로 설정
                response = requests.post("http://localhost:5000/api/refresh_index", timeout=600)

                if response.status_code == 200:
                    print(f"✅ 서버 메모리 갱신 성공: {response.json().get('message')}")
                else:
                    print(f"⚠️ 서버 응답 이상: {response.status_code}")
            except Exception as req_err:
                print(f"⚠️ 서버 연결 실패 (서버가 꺼져있을 수 있음): {req_err}")
        else:
            print("❌ AI 데이터 파일 갱신에 실패하여 서버 요청을 건너뜁니다.")

    except Exception as e:
        print(f"❌ 자동 갱신 프로세스 중 오류 발생: {e}")

# ====================================================================
# 6. 스케줄 설정 및 실행 루프 
# ====================================================================

if __name__ == '__main__':
    # 1. DB 스키마(UNIQUE KEY) 초기화
    initialize_db_schema()
    
    # 2. (수정) ◀ 스케줄링 없이, job_crawl_and_save 함수를 1회만 실행
    print("=======================================================")
    print(f"[MAIN] 동물 데이터 크롤링 작업을 1회 실행합니다.")
    print("=======================================================") 

    # 최초 1회 실행
    job_crawl_and_save()

    print("=======================================================")
    print(f"[MAIN] 모든 크롤링 작업이 완료되었습니다. 스크립트를 종료합니다.")
    print("=======================================================")
