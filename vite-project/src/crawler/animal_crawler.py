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

# ====================================================================
# 1. 환경 설정 (DB 접속 정보 및 기타 설정)
# ====================================================================
# MySQL 접속 정보 (이미지: image_c00623.png, image_c0063f.png 기반)
DB_CONFIG = {
    "host": "project-db-campus.smhrd.com",
    "port": 3307, # 💡 포트 3307 명시 (image_c0063f.png)
    "user": "campus_24IS_CLOUD3_p3_1",
    "password": "smhrd1", 
    "database": "campus_24IS_CLOUD3_p3_1",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}

# 크롤링할 대상 URL (유기동물 공고 갤러리 목록)
CRAWL_URL = "https://www.kcanimal.or.kr/board_gallery01/board_list.asp"
BASE_DOMAIN = "https://www.kcanimal.or.kr" 

# DB에 저장할 테이블 컬럼명 (DB와 순서 일치 필수)
ANIMAL_COLUMNS = ["NAME", "SPECIES", "GENDER", "FEATURE", "PHOTO", 
                  "RESCUE_DATE", "RESCUE_LOCATION", "AGE"]

# UPSERT의 기준이 되는 UNIQUE KEY 컬럼
UNIQUE_KEY_COLUMNS = ["NAME", "SPECIES", "RESCUE_DATE"]
UNIQUE_KEY_NAME = "unique_animal_record"


# ====================================================================
# 2. 데이터 파싱 도우미 함수
# ====================================================================

def parse_date(date_str):
    """날짜 문자열을 datetime.date 객체로 변환합니다."""
    date_str = date_str.strip().replace('.', '-').replace('/', '-')
    match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if match:
        date_str = match.group(1)
    
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date() 
    except ValueError:
        return date.today()
        
def parse_age(age_str):
    """나이 문자열에서 숫자만 추출하여 int로 반환합니다. ('년생', '개월', '주' 포함 시 0 반환)"""
    age_str = age_str.strip()
    
    if '년생' in age_str or '개월' in age_str or '주' in age_str:
        return 0 

    match = re.search(r'(\d+)\s*살', age_str) 
    if match:
        return int(match.group(1))

    return 0

# ====================================================================
# 3. 상세 페이지 크롤링 함수 (SPECIES, FEATURE 추출 개선)
# ====================================================================

def fetch_detail_species(detail_url):
    """상세 페이지에서 품종(SPECIES), 특징(FEATURE), 특이사항을 추출합니다."""
    
    if not detail_url.startswith("http"):
        # BASE_DOMAIN과 detail_url을 안전하게 결합
        detail_url = BASE_DOMAIN + detail_url 
        
    try:
        # User-Agent 헤더 추가 (fetch_data와 동일하게 적용)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(detail_url, timeout=10, headers=headers)
        response.encoding = 'euc-kr' 
        response.raise_for_status()
        soup = bs(response.text, 'html.parser')

        # 1. 품종(SPECIES) 추출 (축종과 품종 모두 고려: image_c06815.png)
        species_th = soup.select_one("th:contains('축종')")
        species = species_th.find_next_sibling('td').text.strip() if species_th else "품종미상"
        
        species_detail_th = soup.select_one("th:contains('품종')")
        species_detail = species_detail_th.find_next_sibling('td').text.strip() if species_detail_th else ""
        
        # 상세 종류(품종)이 있다면 이를 최종 SPECIES로 사용합니다.
        if species_detail and species_detail != "-":
            species = species_detail 
            
        # 2. 특징 (특징, 특이사항) 추출 (image_c06815.png, image_c06838.png)
        features = []
        
        # '특징' 추출
        feature_th = soup.select_one("th:contains('특징')")
        feature_text = feature_th.find_next_sibling('td').text.strip() if feature_th else ""
        if feature_text:
            features.append(f"특징:{feature_text}")

        # '특이사항' 추출
        special_th = soup.select_one("th:contains('특이사항')")
        if special_th:
            special_text = special_th.find_next_sibling('td').text.strip()
            if special_text:
                 features.append(f"특이사항:{special_text}")

        final_feature_detail = ", ".join(features)
        
        return species, final_feature_detail

    except requests.exceptions.RequestException as e:
        return "품종미상", ""
    except Exception as e:
        return "품종미상", ""

# ====================================================================
# 4. 목록 크롤링 메인 함수 (User-Agent 헤더 추가)
# ====================================================================

def fetch_data(url):
    """
    지정된 URL에서 동물 데이터를 크롤링하고 상세 페이지에서 종 정보를 추가로 추출합니다.
    """
    try:
        # 💡 User-Agent 헤더 추가 (크롤링 실패(항목 수 0개) 방지: image_c01508.png)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, timeout=10, headers=headers)
        response.encoding = 'euc-kr' 
        response.raise_for_status()
        soup = bs(response.text, 'html.parser')

        items = soup.select("#goodsBox > ul > li") 
        print(f"    [DEBUG] 발견된 항목 수: {len(items)}개")
        
        data = []
        
        # 상세 페이지 크롤링 병렬 처리
        with ThreadPoolExecutor(max_workers=5) as executor:
            def process_item(item):
                try:
                    link = item.select_one('a')
                    if not link:
                        return None
                    
                    # --- 목록 크롤링 ---
                    p_text = item.select_one("div p").text.strip()
                    match_name = re.match(r'(.+?)\s*\(\d{2}-\d+\)', p_text)
                    name = match_name.group(1).strip() if match_name and match_name.group(1).strip() else "(이름없음)"
                    feature_status = p_text.split(')')[-1].strip()

                    span_text = item.select_one("div span").text.strip().split('|')

                    rescue_loc = span_text[0].strip()
                    rescue_date_str = span_text[1].strip()
                    age_str = span_text[2].strip()
                    gender = span_text[3].strip()
                    weight = span_text[4].strip()
                    
                    photo_url = BASE_DOMAIN + item.select_one("img")['src'].strip() 
                    detail_url = link['href'] 

                    # --- 2단계: 상세 페이지 크롤링 (SPECIES, FEATURE) ---
                    species_detail, feature_detail = fetch_detail_species(detail_url)

                    # --- 3. 데이터 정제 및 튜플 생성 ---
                    rescue_date = parse_date(rescue_date_str)
                    age = parse_age(age_str)
                    
                    # FEATURE: 목록 상태 정보 + 무게 + 상세 페이지 특징 정보 결합
                    feature = f"상태:{feature_status}, 무게:{weight}, 상세특징:[{feature_detail}]"
                    
                    return (name, species_detail, gender, feature, photo_url, 
                            rescue_date, rescue_loc, age)
                            
                except Exception:
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
        ALTER TABLE ANIMALS
        ADD UNIQUE KEY {UNIQUE_KEY_NAME} ({key_columns_str});
        """
        
        curs.execute(sql_add_unique_key)
        conn.commit()
        print(f"✅ UNIQUE KEY '{UNIQUE_KEY_NAME}' 설정 완료: ({key_columns_str})")

    except pymysql.err.ProgrammingError as e:
        # 1061 에러 코드는 키가 이미 존재함을 의미 (image_c07686.png)
        if e.args[0] == 1061: 
            print(f"⚠️ UNIQUE KEY '{UNIQUE_KEY_NAME}'가 이미 존재합니다. (초기화 건너뛰기)")
        else:
            print(f"❌ DB 초기화 오류: {e}")
            print("❗ 'animals' 테이블이 존재하는지 확인하세요.")
    except Exception as e:
        print(f"❌ DB 연결/초기화 중 치명적인 오류 발생: {e}")
        
    finally:
        if curs:
            curs.close()
        if conn:
            conn.close()
            print("✅ DB 연결 종료.")

def job_crawl_and_save():
    """메인 작업 함수: 크롤링 -> 데이터 정제 -> DB 저장 (UPSERT)"""
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n=======================================================")
    print(f"🚀 스케줄링된 동물 데이터 크롤링 작업 시작: {current_time}")
    print(f"=======================================================")

    # 1. 크롤링 데이터 수집 (fetch_data 함수 호출)
    urls = [CRAWL_URL] 
    all_data = []
    
    results = map(fetch_data, urls)
    for result in results:
        all_data.extend(result)
            
    data_list = list(set(all_data))
    
    if not data_list:
        print("⚠️ 크롤링된 데이터가 없어 DB 작업을 건너뜁니다.")
        return

    # 2. 데이터 처리 및 CSV 저장
    df = pd.DataFrame(data_list, columns=ANIMAL_COLUMNS)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"animals_{timestamp_str}.csv"
    
    try:
        df.to_csv(csv_filename, header=True, index=False, quoting=csv.QUOTE_ALL, encoding='utf-8')
        print(f"✅ Data saved successfully to {csv_filename}")
    except Exception as e:
        print(f"❌ CSV 저장 중 오류 발생: {e}")

    # 3. MySQL 연결 및 저장 (UPSERT)
    conn = None
    curs = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()
        
        # 3.1. DB UPSERT 쿼리 생성
        column_names = ANIMAL_COLUMNS
        value_placeholders = ', '.join(['%s'] * len(column_names))
        
        update_cols = [
            f'`{c}` = VALUES(`{c}`)' 
            for c in column_names 
            if c not in UNIQUE_KEY_COLUMNS
        ]
        update_set_clause = ', '.join(update_cols)
        
        sql_upsert = f"""
        INSERT INTO ANIMALS ({', '.join(f'`{c}`' for c in column_names)}) 
        VALUES({value_placeholders})
        ON DUPLICATE KEY UPDATE
            {update_set_clause};
        """ 
        
        data_to_insert = [tuple(row) for row in df.values]
        
        rows_processed = curs.executemany(sql_upsert, data_to_insert)
          
        conn.commit()
        
        print(f"✅ DB UPSERT 완료. 총 {rows_processed}개 레코드를 처리했습니다 (삽입/업데이트 포함).")

    except Exception as e:
        print(f"❌ DB 작업 중 치명적인 오류 발생: {e}")
        if conn:
            conn.rollback()
            print("❌ DB 롤백 완료.")
            
    finally:
        if curs:
            curs.close()
        if conn:
            conn.close()
            print("✅ DB 연결 종료.")

# ====================================================================
# 6. 스케줄 설정 및 실행 루프
# ====================================================================

if __name__ == '__main__':
    initialize_db_schema() 
    
    # ⚠️ 테스트를 위해 매 1분마다 실행 (필요에 따라 주기를 조정하세요)
    schedule.every(1).minutes.do(job_crawl_and_save) 
    print("=======================================================")
    print(f"Scheduler 활성화됨. 스크립트가 실행되는 동안 주기적으로 작업을 확인합니다.")
    print("=======================================================")

    while True:
        schedule.run_pending()
        time.sleep(10)