import pymysql.cursors
import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import csv
import time
import schedule
from datetime import datetime
from datetime import date 
import re
import sys
import math

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


# ====================================================================
# 2. 데이터 파싱 도우미 함수 
# ====================================================================
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
        species_th = soup.find("th", text="축종")
        species = species_th.find_next_sibling('td').text.strip() if species_th else "미상"
        
        breed_th = soup.find("th", text="품종")
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
                src = img.get('src', '').strip()
                if src:
                    if src.startswith('/'):
                        full_url = BASE_DOMAIN + src
                    elif src.startswith('http'):
                        full_url = src
                    else:
                        continue 
                    
                    if full_url not in photo_urls:
                        photo_urls.append(full_url)
                
                if len(photo_urls) >= 3:
                    break
            
            if len(photo_urls) >= 3:
                break
        
        photo1 = photo_urls[0] if len(photo_urls) > 0 else None
        photo2 = photo_urls[1] if len(photo_urls) > 1 else None
        photo3 = photo_urls[2] if len(photo_urls) > 2 else None


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
        
        return species, breed, final_feature_detail, photo1, photo2, photo3

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
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(fetch_data, urls)
        for result in results:
            all_data.extend(result)
            
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

# ====================================================================
# 6. 스케줄 설정 및 실행 루프 
# ====================================================================

if __name__ == '__main__':
    # 💡 실행 전 MySQL 테이블에 BOARD_IDX 컬럼이 추가되어 있어야 하며, AGE 컬럼은 VARCHAR 타입으로 변경되어 있어야 합니다!
    initialize_db_schema() 
    
    # 스케줄 간격 1분마다 실행
    schedule.every(30).minutes.do(job_crawl_and_save) 

    print("=======================================================")
    print(f"Scheduler 활성화됨. 1분마다 작업을 확인하고 실행합니다.")
    print("=======================================================")

    # 최초 1회 실행
    job_crawl_and_save()

    while True:
        schedule.run_pending()
        time.sleep(10)