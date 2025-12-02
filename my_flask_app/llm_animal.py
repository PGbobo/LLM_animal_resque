# -*- coding: utf-8 -*-
import base64
import glob
import json
import re
import numpy as np
import os
import sys  # ◀◀ (추가) 터미널 인자를 받기 위해 import
import time # ◀◀ (추가) 시간 측정을 위해 import
import io

import boto3
from openai import OpenAI
import faiss  # ◀◀ (추가) FAISS import
import re

# --- (신규) ◀◀ 전역 상수 설정 ---
VECTOR_DIMENSION = 3072
K_CANDIDATES = 100 # FAISS 예선 후보 수
K_FINAL = 10       # 최종 결과 수

DB_FILE = "./dog_cat_features_attr_emb.json"
ID_MAP_FILE = "id_map.json"
INDEX_FILE = "animal_vectors.index"

# --- 0. 클라이언트 초기화 ---
try:
    # 1. OpenAI 키 로드 및 클라이언트 초기화
    with open('./API-Key.txt','r') as f:
        os.environ['OPENAI_API_KEY'] = f.read().strip()
    client = OpenAI()
    
    # 2. NCP 키/버킷 정보 로드 (환경 변수로만 설정)
    with open('./ACCESS_KEY.txt','r') as f:
        os.environ['NCP_ACCESS_KEY'] = f.read().strip()
        
    # (수정됨) ◀◀ 변수명 `api_key` 덮어쓰기 버그 수정
    with open('./SECRET_KEY.txt','r') as f:
        ncp_secret_key = f.read().strip() # ◀ 'api_key'가 아닌 새 변수명 사용
        
    # (수정됨) ◀◀ 하드코딩된 변수 대신 파일에서 읽은 'ncp_secret_key' 사용
    os.environ['NCP_SECRET_KEY'] = ncp_secret_key
    
    # 3. NCP 전역 설정 (boto3가 사용할 정보)
    endpoint_url = "https://kr.object.ncloudstorage.com"
    region_name = "kr-standard"
    bucket_name = "animal-bucket"

except Exception as e:
    print(f"❌ 키 파일 로드 실패. (API-Key.txt, ACCESS_KEY.txt, SECRET_KEY.txt, BUCKET_NAME.txt가 모두 있는지 확인하세요): {e}")
    sys.exit()

# --- 1. 프롬프트 정의 ---
prompt = """
반드시 아래 JSON 구조 외의 어떤 말도 하지 마라.
응답이 JSON 외의 문자를 포함하면 즉시 실패 처리된다.
너는 이미지 속 동물의 외형적 특징을 분석하는 전문가다.
품종 유사도를 높이기 위해 개체의 세밀한 특징(털 패턴, 귀 각도, 체형 비율, 눈 크기 등)을 정확히 기술하라.
반드시 모든 시각적 특징을 가능한 한 정제된 형용사로 기술하라.
단순히 색상명이나 형태명만 기입하지 말고, 구체적 질감·명도·패턴·상대적 비율을 함께 서술하라.
이미지에서 관찰할 수 있는 세부적인 외형 특징을 아래 형식의 JSON으로 **정확히** 출력하라.
다른 이미지와 비교해 유사도를 계산할 예정이므로,
동일한 속성에 대해서는 일관된 어휘 체계를 유지하라.
예: '짧은 털', '짧음', '짧은 모'는 모두 '짧은 털'로 통일하라.

주의:
- JSON 외의 문장은 절대 출력하지 마라.
- 모든 필드는 반드시 채워라.
- **품종 추정은 매우 중요하다** 모든 시각적 증거(머리 모양, 귀 모양, 귀 세트, 털, 신체 구조)를 바탕으로 가장 가능성이 높은 1차 품종을 추측하라
- 품종 추정의 확률이 너무 낮은 경우 '믹스'로 표기하라
- 단위(예: cm, kg 등)는 쓰지 마라.
- 관찰 가능한 시각적 특징만 기술하라. (행동, 감정, 품종 추정 배경 등은 금지)
- 출력은 JSON 하나로만 해야 한다. 텍스트나 설명을 절대 섞지 마라.
- 각 항목의 값은 단어 1~2개가 아니라, 가능한 한 완전한 묘사 문장으로 기술한다.

출력 예시:

{
"dog_or_cat_or_other": "개",
"breed_guess": "포메라니안",
"body_size": "소형견으로 전체적으로 작고 둥근 체형",
"body_proportion": "몸통은 짧고 통통한 형태로, 목이 짧고 가슴이 넓으며 다리가 짧음",
"leg_length": "짧음",
"fur_color_primary": "밝은 황금빛에 약간의 크림톤이 섞인 따뜻한 금색 계열의 털색",
"fur_color_secondary": "얼굴 주변과 가슴, 꼬리 밑부분에 희미한 흰색이 섞임",
"fur_pattern": "몸통은 거의 단색에 가까우며 얼굴과 귀 주변만 살짝 밝음",
"fur_length": "길고 풍성하며 몸 전체를 감싸는 형태",
"fur_texture": "안쪽은 솜털처럼 가볍지만 겉부분은 살짝 거침",
"ear_shape": "작고 삼각형으로 귀 끝이 살짝 둥글며 전체적으로 균형 잡힌 형태",
"ear_position": "머리 윗부분 중앙에 가깝게 위치하며, 서로 약간 떨어져 있음",
"ear_type": "반 쯤 서있는 형태",
"ear_tip_shape": "끝이 살짝 둥글고 부드러운 형태",
"eye_shape": "둥글지만 가장자리로 갈수록 살짝 아몬드형으로 좁아짐",
"eye_color": "짙은 다크브라운으로, 빛에 따라 미세하게 호박색 톤이 섞임",
"eye_size_ratio": "얼굴 대비 눈이 크고, 코와의 간격이 좁음",
"snout_length": "짧고 둥근 형태로, 코 끝이 살짝 위로 들려 있음",
"snout_shape": "주둥이는 작고 둥글며 털로 인해 윤곽이 부드러움",
"nose_color": "짙은 검정색으로 반들반들한 질감",
"tail_shape": "꼬리는 등 위로 말려 올라가며 부채꼴로 퍼진 형태",
"tail_fur": "매우 풍성하고 길며, 꼬리 끝부분은 바깥쪽으로 부드럽게 말려 있음",
"age_hint": "성견으로 보임",
"unique_traits": "귀 끝 부분이 다른 털보다 살짝 짙은 색을 띠며, 오른쪽 볼에 희미한 밝은색 털 얼룩이 있음"
}

"""

# --- 2. 헬퍼 함수 정의 ---
def attribute_to_text(attr_key, attr_value):
    if isinstance(attr_value, list):
        return f"{attr_key}: " + ",".join(map(str, attr_value))
    else:
        return f"{attr_key}: {attr_value}"

def extract_json_from_text(text):
    # 코드 블록 또는 불필요한 문장 제거
    text = text.strip()
    # 백틱 제거
    text = re.sub(r"^```(?:json)?", "", text)
    text = re.sub(r"```$", "", text)
    # JSON 부분만 추출
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return match.group(0)
    else:
        return None

# --- 3. 이미지 분석 (LLM 호출) ---
def analyze_image_bytes(image_data_base64, image_name_for_log):
    """
    Base64 인코딩된 이미지 바이트를 받아 LLM 분석을 수행합니다. (S3/로컬 공용)
    """
    print(f"[LLM 분석중] {image_name_for_log}")
    final_prompt = prompt
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[ { "role": "user", "content": [ {"type": "text", "text": final_prompt}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}} ] } ],
            temperature=0
        )
        text = resp.choices[0].message.content
        json_str = extract_json_from_text(text)
        if not json_str:
            print(f"[경고] JSON 감지 실패: {image_name_for_log}")
            return None
        return json.loads(json_str)
    except Exception as e:
        print(f"❌ [LLM 오류] {image_name_for_log} 분석 중 오류: {e}")
        return None

def analyze_image_with_llm(image_path):
    """
    로컬 파일 경로를 받아 바이트로 변환 후, 메인 분석 함수를 호출합니다.
    """
    if not os.path.exists(image_path):
        print(f"❌ [오류] 쿼리 이미지 파일을 찾을 수 없습니다: {image_path}")
        return None
    
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    
    # (핵심) S3용으로 만든 함수를 여기서 재사용
    return analyze_image_bytes(image_data, image_path)

# --- 입양용 프롬프트 및 코드 ---
# ◀◀ [신규 추가] 자연어 -> JSON 번역용 프롬프트
prompt_for_text_query = """
반드시 아래 JSON 구조 외의 어떤 말도 하지 마라.
응답이 JSON 외의 문자를 포함하면 즉시 실패 처리된다.
당신은 사용자의 자연어 요구사항을 분석하여, 동물의 특징을 나타내는 JSON 객체로 변환하는 전문가다.
사용자의 요청에서 유추할 수 있는 **모든** 특징을 아래 JSON 구조에 맞춰 **정확히** 출력하라.
사용자가 언급하지 않은 속성은 `null`이나 빈 문자열 `""`로 남겨두세요.
절대 JSON 외의 다른 말을 하거나 설명을 덧붙이지 마세요.

[사용자 요청]
{user_query}

[출력 JSON 형식]
{
"dog_or_cat_or_other": "개/고양이/기타 중 하나",
"breed_guess": "추정 품종 (예: 푸들, 코리안 숏헤어)",
"body_size": "체형 (예: 소형, 중형, 대형)",
"body_proportion": "체형 비율 (예: 다리가 짧음, 날씬함)",
"leg_length": "다리 길이 (예: 짧음, 보통, 김)",
"fur_color_primary": "주요 털 색 (예: 흰색, 검은색, 갈색, 치즈태비)",
"fur_color_secondary": "보조 털 색 (예: 가슴에 흰색 반점)",
"fur_pattern": "털 무늬 (예: 단색, 줄무늬, 점박이)",
"fur_length": "털 길이 (예: 단모, 장모)",
"fur_texture": "털 질감 (예: 복슬복슬함, 부드러움, 거침)",
"ear_shape": "귀 모양 (예: 뾰족함, 접힘)",
"ear_position": "귀 위치",
"ear_type": "귀 타입 (예: 쫑긋함, 축 늘어짐)",
"ear_tip_shape": "귀 끝 모양",
"eye_shape": "눈 모양 (예: 둥근, 아몬드형)",
"eye_color": "눈 색 (예: 파란색, 갈색)",
"eye_size_ratio": "얼굴 대비 눈 크기",
"snout_length": "주둥이 길이 (예: 짧음, 김)",
"snout_shape": "주둥이 모양",
"nose_color": "코 색",
"tail_shape": "꼬리 모양",
"tail_fur": "꼬리 털",
"age_hint": "나이대 (예: 새끼, 성견/성묘, 노견/노묘)",
"unique_traits": "기타 사용자가 요청한 고유 특징"
}
"""

# ◀◀ [2. 신규 추가] JSON 키(Key) 청소 함수
def clean_json_keys(d):
    """
    LLM이 반환한 딕셔너리의 키(key)를 강제로 정리합니다.
    (예: '\n"key"' -> 'key')
    """
    if not isinstance(d, dict):
        return d
    
    clean_dict = {}
    for k, v in d.items():
        # 1. ◀◀ (수정됨) 키(key)에서 모든 공백, 줄바꿈, 따옴표를 '강제' 제거
        clean_k = k.replace('"', '').replace("'", "").replace("\n", "").strip()
        
        # 2. 값(value)이 딕셔너리라면 재귀적으로 청소
        clean_v = clean_json_keys(v)
        
        clean_dict[clean_k] = clean_v
    return clean_dict
    
# ◀◀ [수정됨] 자연어 -> JSON 번역 함수 (키 청소 로직 추가)
def analyze_text_with_llm(user_query_text):
    """
    사용자의 자연어 쿼리를 받아 LLM을 통해 JSON 속성으로 변환하고,
    결과 JSON의 키(key)를 정리(clean)합니다.
    """
    print(f"[LLM 텍스트 분석중] {user_query_text}")
    
    # 1. 프롬프트 완성
    final_prompt = prompt_for_text_query.replace("{user_query}", user_query_text)
    
    try:
        # 2. LLM 호출
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[ { "role": "user", "content": final_prompt } ],
            temperature=0
        )
        text = resp.choices[0].message.content
        
        # 3. JSON 파싱
        json_str = extract_json_from_text(text)
        if not json_str:
            print(f"[경고] JSON 감지 실패 (텍스트 쿼리): {user_query_text}")
            return None
        
        raw_obj = json.loads(json_str)
        
        # 4. ◀◀ [핵심 수정] LLM이 반환한 JSON의 키(Key)를 강제로 정리합니다.
        clean_obj = clean_json_keys(raw_obj)
        
        return clean_obj # ◀ 정리된(clean) 객체를 반환
    
    except Exception as e:
        print(f"❌ [LLM 오류] 텍스트 쿼리 분석/파싱 중 오류: {e}")
        return None

# --- 4. 속성별 임베딩 생성 ---
def get_embeddings_for_attributes(attr_dict):
    """
    JSON 객체를 받아, 유효한(비어있지 않은) 값만 임베딩합니다.
    """
    attr_embeds = {} # ◀ 빈 딕셔너리로 시작
    valid_embeddings_for_merge = [] # ◀ 평균('__merged__') 계산을 위한 유효한 벡터 리스트

    # ◀ (수정) .keys()와 .values()를 함께 순회
    for key, value in attr_dict.items():
        
        # ◀ (핵심) 유효성 검사: 값이 None이거나, 빈 문자열("")이 아닌지 확인
        text_value = str(value) # str(None)은 "None"이 됨
        
        if value is None or text_value.strip() == "" or text_value.strip() == "None":
            attr_embeds[key] = None # ◀ 이 속성의 벡터는 None (검색 시 skip됨)
            continue # ◀ 다음 키로 넘어감 (임베딩 API 호출 안 함)

        # ◀ (정상) 유효한 값이므로 API 호출
        try:
            emb = client.embeddings.create(model="text-embedding-3-large", input=[text_value]).data[0].embedding
            attr_embeds[key] = emb
            
            # ◀ '__merged__' 계산용 리스트에 추가 (단, __merged__ 키 자체는 제외)
            if key != "__merged__":
                valid_embeddings_for_merge.append(emb)
                
        except Exception as e:
            # (방어 코드) 만약 API가 특정 값(예: "알수없음")을 거부할 경우
            print(f"⚠️ [임베딩 경고] '{key}' 값 '{text_value}'의 임베딩 실패: {e}")
            attr_embeds[key] = None

    # ◀ (수정) 유효한 벡터가 하나라도 있을 때만 '__merged__' 생성
    if valid_embeddings_for_merge:
        merged_emb = np.mean(np.array(valid_embeddings_for_merge), axis=0).tolist()
        attr_embeds["__merged__"] = merged_emb
    else:
        # (방어 코드) 유효한 값이 하나도 없으면 __merged__도 None
        attr_embeds["__merged__"] = None

    return attr_embeds

# --- 5. 코사인 유사도 ---
def cosine(a,b):
    a = np.array(a); b = np.array(b)
    return float(np.dot(a,b) / (np.linalg.norm(a)*np.linalg.norm(b)+1e-10))

# --- 6. 가중치 설정 ---
weights = {

    # 품종 추정
    "breed_guess": 0.250,

    # 체형 관련
    "body_size": 0.090,
    "body_proportion": 0.070,
    "leg_length": 0.030,

    # 털 관련
    "fur_color_primary": 0.800,
    "fur_color_secondary": 0.220,
    "fur_pattern": 0.100,
    "fur_length": 0.050,
    "fur_texture": 0.040,

    # 얼굴 요소
    "ear_shape": 0.080,
    "ear_position": 0.040,
    "ear_type": 0.060,
    "ear_tip_shape": 0.060,
    "eye_shape": 0.050,
    "eye_color": 0.080,
    "eye_size_ratio": 0.030,
    "snout_length": 0.060,
    "snout_shape": 0.080,
    "nose_color": 0.030,

    # 꼬리 요소
    "tail_shape": 0.080,
    "tail_fur": 0.050,

    # 개체식별 강화
    "unique_traits": 0.100,
    "age_hint": 0.200,

    # 보조요소
    "__merged__": 0.080
}

# --- 7. 유사도 계산 함수 수정 ---
def compare_query_to_item(query_attr_emb, item, exponent=3.0):
    score, total_w = 0.0, 0.0
    
    # 1. weights 딕셔너리를 순회
    for k, w in weights.items():
        
        # 2. 쿼리와 DB 아이템 양쪽에 모두 해당 키가 있는지 확인
        if k in query_attr_emb and k in item["attr_embeddings"]:
            
            # 3. ◀◀ [핵심 수정] 쿼리 벡터(vec_a) 또는 DB 벡터(vec_b)가
            #    (get_embeddings_for_attributes에서 생성된) 'None'이 아닌지 확인
            vec_a = query_attr_emb[k]
            vec_b = item["attr_embeddings"][k]
            
            if vec_a is None or vec_b is None:
                continue # ◀ 둘 중 하나라도 None이면, 이 속성 비교는 건너뛴다
            
            # 4. (안전) 두 벡터가 모두 유효하므로 코사인 유사도 계산
            sim = cosine(vec_a, vec_b)

            # 5. (안전) 점수 보정 및 가중치 합산
            calibrated_sim = ((sim + 1) / 2) ** exponent
            score += w * calibrated_sim
            total_w += w

    if total_w == 0: # (방어 코드) 만약 유효한 비교가 하나도 없었다면 0 반환
        return 0.0
        
    return score / (total_w + 1e-8)

def get_s3_client():
    print("NCS (S3) 클라이언트 생성 중... (환경 변수 사용)")
    # (수정) ◀◀ 하드코딩된 키 대신 os.environ을 사용
    s3 = boto3.client('s3',
                       endpoint_url=endpoint_url,
                       region_name=region_name,
                       aws_access_key_id=os.environ.get("NCP_ACCESS_KEY"),
                       aws_secret_access_key=os.environ.get("NCP_SECRET_KEY")
                     )
    return s3

# llm_animal.py의 update_db_from_s3 함수 (덮어쓰기)

def update_db_from_s3(s3_folder_path, db_file, id_map_file):
    s3 = get_s3_client()
    
    # 1. ◀◀ [수정] 기존 DB 로드 -> "맵(Map)"으로 변환 (빠른 조회를 위함)
    print(f"'{db_file}'에서 기존 DB 로드 중...")
    old_db_map = {}
    if os.path.exists(db_file):
        try:
            with open(db_file, "r", encoding="utf-8") as f:
                db_full_old = json.load(f)
                # 파일명을 key로, item 전체를 value로 하는 맵 생성
                old_db_map = {item['filename']: item for item in db_full_old}
            print(f"현재 DB 항목: {len(old_db_map)}개 (맵으로 로드)")
        except Exception as e:
            print(f"⚠️ 경고: 기존 {db_file} 로드/파싱 실패. DB를 처음부터 다시 생성합니다. {e}")
            db_full_old = [] # (Just in case)
    else:
        db_full_old = [] # (Just in case)
        print("기존 DB 파일 없음. DB를 새로 생성합니다.")
    
    # 2. S3 목록 가져오기 (원본 동일)
    print(f"NCS 버킷 '{bucket_name}'의 '{s3_folder_path}' 폴더에서 **현재** 파일 목록 조회...")
    try:
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix=s3_folder_path)
        if 'Contents' not in response:
            print(f"❌ [오류] S3 폴더 '{s3_folder_path}'에 파일이 없습니다.")
            # (수정) ◀ S3 폴더가 비어있다면, 빈 DB를 저장하고 성공으로 처리
            with open(db_file, "w", encoding="utf-8") as f:
                json.dump([], f)
            with open(id_map_file, "w", encoding="utf-8") as f:
                json.dump([], f)
            print(f"✅ S3 폴더가 비어있어, '{db_file}'을(를) 빈 파일로 저장했습니다.")
            return True # ◀ FAISS 재구축 신호
        
        image_keys = [obj['Key'] for obj in response['Contents'] if obj['Key'].lower().endswith(('.jpg', '.jpeg', '.png'))]
        print(f"S3에서 총 {len(image_keys)}개의 이미지를 발견했습니다. (삭제된 파일은 제외됨)")
        
    except Exception as e:
        print(f"❌ [S3 오류] 스토리지 연결 또는 목록 조회를 실패했습니다: {e}")
        return False

    # 3. ◀◀ [신규] "새로운 DB"를 담을 빈 리스트 초기화
    new_db_full = []
    new_id_to_filename = []
    new_item_count = 0
    synced_item_count = 0
    
    # 4. (핵심) "현재 S3 목록 (image_keys)"을 기준으로 새 DB를 재구성
    #    (S3에서 삭제된 파일은 이 루프에 포함되지 않음)
    for i, s3_key in enumerate(image_keys):
        
        # --- (A) 이미 DB에 존재하는 파일 (데이터 재사용, 비용 절약) ---
        if s3_key in old_db_map:
            print(f"  [{i+1}/{len(image_keys)}] (Sync) 기존 데이터 재사용: {s3_key}")
            new_db_full.append(old_db_map[s3_key]) # ◀ 기존 item을 그대로 추가
            new_id_to_filename.append(s3_key)
            synced_item_count += 1
        
        # --- (B) S3에 새로 추가된 파일 (LLM/임베딩 실행, 비용 발생) ---
        else:
            print(f"  [{i+1}/{len(image_keys)}] (New) 신규 처리: {s3_key}")
            
            try:
                # 3-1. S3 다운로드
                obj = s3.get_object(Bucket=bucket_name, Key=s3_key)
                image_bytes = obj['Body'].read()
                image_data_b64 = base64.b64encode(image_bytes).decode("utf-8")
                
                # 3-2. LLM 분석 (비용 발생 부분)
                obj_attr = analyze_image_bytes(image_data_b64, s3_key)
                if obj_attr is None: continue
                
                # (user_num 파싱 로직은 원본 그대로 유지)
                parsed_user_num = None
                if s3_folder_path in s3_key: 
                    filename_only = s3_key.split('/')[-1] 
                    match = re.match(r'^(\d+)_', filename_only) 
                    if match:
                        parsed_user_num = int(match.group(1))
                        obj_attr['user_num'] = parsed_user_num
                        print(f"    [Info] 파일명에서 user_num: {parsed_user_num} 추출 완료.")
                    else:
                        print(f"    [Warn] 파일명 {filename_only}에서 user_num을 파싱할 수 없습니다.")

                # 3-3. 임베딩 (비용 발생 없음)
                emb = get_embeddings_for_attributes(obj_attr)
                if emb is None: continue
                    
                # 3-4. "새 리스트"에 Append
                new_item = {
                    "filename": s3_key,
                    "attributes": obj_attr,
                    "attr_embeddings": emb
                }
                new_db_full.append(new_item) # ◀ "새 리스트"에 추가
                new_id_to_filename.append(s3_key) # ◀ "새 리스트"에 추가
                new_item_count += 1
                
            except Exception as e:
                print(f"❌ [오류] {s3_key} 처리 중 실패: {e}")

    # 5. ◀◀ [수정] 변경 사항 감지 및 저장
    deleted_item_count = len(old_db_map) - synced_item_count
    
    if new_item_count == 0 and deleted_item_count == 0:
        print(f"\n✅ DB 갱신 완료. (추가: 0, 삭제: 0). {db_file}을(를) 수정하지 않았습니다.")
        # (중요) ◀ 변경이 없어도 FAISS 재구축은 필요할 수 있으므로 True 반환
        return True 

    # 6. JSON 파일 저장 (변경된 경우 "new_db_full"로 덮어쓰기)
    print(f"\n{new_item_count}개 추가, {deleted_item_count}개 삭제됨. 새 DB 저장 중...")
    with open(db_file, "w", encoding="utf-8") as f:
        json.dump(new_db_full, f, ensure_ascii=False, indent=2)
    with open(id_map_file, "w", encoding="utf-8") as f:
        json.dump(new_id_to_filename, f, ensure_ascii=False, indent=2)
        
    print(f"✅ DB 저장 완료 (총 {len(new_db_full)}개 항목)")
    return True # ◀ DB 변경되었으므로 FAISS 재구축 신호

def rebuild_faiss_index(db_file, index_file, id_map_file):
    print(f"\n--- FAISS 인덱스 재구축 시작 ---")
    try:
        with open(db_file, "r", encoding="utf-8") as f:
            db = json.load(f)
        with open(id_map_file, "r", encoding="utf-8") as f:
            id_to_filename_check = json.load(f)
    except Exception as e:
        print(f"❌ {db_file} 또는 {id_map_file} 로드 실패: {e}")
        return

    all_vectors = []
    id_map_for_faiss = []
    
    for item in db:
        vector = item.get("attr_embeddings", {}).get("__merged__")
        if vector:
            all_vectors.append(vector)
            id_map_for_faiss.append(item.get("filename"))
            
    if id_map_for_faiss != id_to_filename_check:
        print("❌ [치명적 오류] DB와 ID맵의 순서가 불일치합니다. 인덱스 생성을 중단합니다.")
        return

    print(f"총 {len(all_vectors)}개의 벡터로 인덱스 생성...")
    all_vectors_np = np.array(all_vectors).astype('float32')
    
    faiss.normalize_L2(all_vectors_np)
    
    # (중요) ◀◀ 전역 변수 VECTOR_DIMENSION 사용
    index = faiss.IndexFlatIP(VECTOR_DIMENSION) 
    index.add(all_vectors_np)
    
    faiss.write_index(index, index_file)
    print(f"✅ FAISS 인덱스 저장 완료 → {index_file} (총 {index.ntotal}개)")

# ◀◀ [신규 추가] DB 덮어쓰기 전용 함수 (app.py에서 호출)
def refresh_missing_data_from_db():
    """
    S3의 'abandon/missing' 폴더를 스캔하여
    실종동물 DB(missing_pets.json)와 인덱스를 강제로 최신화합니다.
    """
    print("🔄 [Hot Reload] 실종 동물 DB 동기화 시작...")

    # (주의) 경로 설정이 중요합니다. app.py가 실행되는 위치 기준입니다.
    s3_folder = "abandon/missing"  # S3 폴더명
    db_file = "missing_pets.json"
    map_file = "missing_map.json"
    index_file = "missing_vectors.index"

    # 1. DB 갱신 (update_db_from_s3 함수 재사용)
    success = update_db_from_s3(s3_folder, db_file, map_file)

    # 2. 인덱스 재구축
    if success:
        rebuild_faiss_index(db_file, index_file, map_file)
        print("✅ [Hot Reload] 파일 갱신 완료.")
        return True
    else:
        print("❌ [Hot Reload] 파일 갱신 실패.")
        return False

# ◀◀ [신규] 크롤링 데이터(입양/보호소) 전용 자동 업데이트 함수
def refresh_crawled_data():
    """
    크롤러가 실행된 후 호출됩니다.
    S3의 'crawled_data' 폴더를 스캔하여 입양 DB와 인덱스를 최신화합니다.
    """
    print("🔄 [Crawler Trigger] 입양/보호소 동물 AI 데이터 갱신 시작...")

    # 사용자가 수동으로 입력하던 그 경로들을 하드코딩합니다.
    s3_folder = "crawled_data"
    db_file = "dog_cat_features_attr_emb.json"
    map_file = "id_map.json"
    index_file = "animal_vectors.index"

    # 1. DB 및 맵 파일 갱신
    success = update_db_from_s3(s3_folder, db_file, map_file)

    # 2. 벡터 인덱스 재구축
    if success:
        rebuild_faiss_index(db_file, index_file, map_file)
        print("✅ [Crawler Trigger] 파일 갱신 완료.")
        return True
    else:
        print("❌ [Crawler Trigger] 파일 갱신 실패.")
        return False

# --- 6. (수정됨) 메인 실행 로직 ---
if __name__ == "__main__":
    
    if len(sys.argv) < 2:
        print("❌ [실행 오류] 실행 모드를 입력하세요.")
        print("   (DB 갱신 예시) python llm_animal.py update test-cat")
        print("   (검색 예시)   python llm_animal.py search ./test_cat.jpg")
        sys.exit()

    mode = sys.argv[1] # 실행 모드 (update 또는 search)
    
    # --- (A) DB 갱신 모드 ---
    if mode == 'update':
        if len(sys.argv) < 6:
            print("❌ [실행 오류] 'update' 모드는 4개의 인자가 필요합니다.")
            print("   (예시) python llm_animal.py update [S3폴더] [DB파일] [맵파일] [인덱스파일]")
            print("   (입양) python llm_animal.py update test-cat dog_cat_features_attr_emb.json id_map.json animal_vectors.index")
            print("   (실종) python llm_animal.py update abondon/missing missing_pets.json missing_map.json missing_vectors.index")
            sys.exit()
            
        # 1. (수정) ◀ 터미널에서 4개의 인자를 동적으로 받음
        s3_folder_to_scan = sys.argv[2] # 예: 'abondon/missing'
        db_file_arg = sys.argv[3]       # 예: 'missing_pets.json'
        id_map_file_arg = sys.argv[4]     # 예: 'missing_map.json'
        index_file_arg = sys.argv[5]      # 예: 'missing_vectors.index'
        
        print(f"--- [DB 갱신 시작]: {db_file_arg} ---")
        
        # 2. (수정) ◀ 동적 인자를 사용해 DB에 Append
        success = update_db_from_s3(s3_folder_to_scan, db_file_arg, id_map_file_arg)
        
        # 3. (수정) ◀ 동적 인자를 사용해 FAISS 인덱스 재구축
        if success:
            rebuild_faiss_index(db_file_arg, index_file_arg, id_map_file_arg)
        
        print(f"--- [DB 갱신 완료]: {db_file_arg} ---")
            
    # --- (B) 하이브리드 검색 모드 ---
    elif mode == 'search':
        if len(sys.argv) < 3:
            print("❌ [실행 오류] 'search' 모드는 쿼리 이미지 파일 경로가 필요합니다.")
            sys.exit()
            
        query_filename = sys.argv[2]
        
        print(f"'{INDEX_FILE}'에서 FAISS 인덱스를 로드합니다.")
        try:
            index = faiss.read_index(INDEX_FILE)
        except Exception as e:
            print(f"❌ [오류] FAISS 인덱스({INDEX_FILE}) 로드 실패: {e}")
            sys.exit()
        
        print(f"'{MAP_FILE}'에서 ID-파일명 맵을 로드합니다.")
        try:
            with open(MAP_FILE, "r", encoding="utf-8") as f:
                id_to_filename = json.load(f)
        except Exception as e:
            print(f"❌ [오류] ID 맵({MAP_FILE}) 로드 실패: {e}")
            sys.exit()
            
        print(f"'{DB_FILE}'에서 2단계 재정렬을 위한 원본 DB 로드 중...")
        try:
            with open(DB_FILE,"r",encoding="utf-8") as f:
                db_full = json.load(f)
            print(f"✅ 원본 DB 로드 완료 ({len(db_full)}개 항목)")
        except Exception as e:
            print(f"❌ 원본 DB({DB_FILE}) 로드 실패: {e}")
            sys.exit()

        print(f"\n[업로드 완료] '{query_filename}' 파일로 하이브리드 검색을 시작합니다.")
        (start_time_total) = time.time()
        
        query_obj = analyze_image_with_llm(query_filename)
        if query_obj:
            query_attr_emb = get_embeddings_for_attributes(query_obj)
            if query_attr_emb and "__merged__" in query_attr_emb:
                print(f"✅ 쿼리 벡터 생성 완료 (처리 시간: {time.time() - start_time_total:.2f}초)")
                
                print(f"\n--- [1단계: FAISS 예선] 시작 (후보 {K_CANDIDATES}개 탐색) ---")
                (start_time_faiss) = time.time()
                query_merged_vector = query_attr_emb["__merged__"]
                query_vector_np = np.array([query_merged_vector]).astype('float32')
                faiss.normalize_L2(query_vector_np)
                D_faiss, I_faiss = index.search(query_vector_np, K_CANDIDATES)
                candidate_indices = I_faiss[0]
                print(f"✅ FAISS 예선 완료 (처리 시간: {time.time() - start_time_faiss:.2f}초)")
                
                print(f"\n--- [2단계: 원본 로직 본선] 시작 (후보 {len(candidate_indices)}개 재정렬) ---")
                (start_time_rerank) = time.time()
                query_species = query_obj.get("dog_or_cat_or_other")
                final_results = []
                for idx in candidate_indices:
                    item = db_full[idx]
                    if item.get("attributes", {}).get("dog_or_cat_or_other") == query_species:
                        score = compare_query_to_item(query_attr_emb, item)
                        final_results.append((item["filename"], score))
                final_results.sort(key=lambda x: x[1], reverse=True)
                print(f"✅ 원본 로직 본선 완료 (처리 시간: {time.time() - start_time_rerank:.2f}초)")
                
                print("\n" + "="*40)
                print(f"🚀 [최종 매칭 결과 (Top {K_FINAL})] 🚀")
                print(f"(총 처리 시간: {time.time() - start_time_total:.2f}초)")
                print(f"쿼리 이미지: {query_filename}")
                print("="*40)
                for i, (filename, score) in enumerate(final_results[:K_FINAL]):
                    print(f"  {i+1}순위: {filename} (유사도: {score:.4f})")
            else:
                print("❌ [실행 중단] 쿼리 이미지의 임베딩 생성에 실패했습니다.")
        else:
            print("❌ [실행 중단] 쿼리 이미지의 LLM 분석에 실패했습니다.")
            
    else:
        print(f"❌ [실행 오류] 알 수 없는 모드입니다: '{mode}'")
        print("   (사용 가능 모드: 'update' 또는 'search')")
