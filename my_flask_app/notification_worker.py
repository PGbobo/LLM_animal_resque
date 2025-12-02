# notification_worker.py
import time
import sys
import json
import hmac
import hashlib
import uuid
import datetime
import requests
import pymysql
import os

# =========================================================
# 1. 환경 설정
# =========================================================
SOLAPI_API_KEY = "NCSWBQ1HGHP4CRPS"
SOLAPI_API_SECRET = "TCSOONQXJXZRYRBYW0QBBA0YC9XJJAEQ"
SENDER_PHONE = "01056340499"

DB_CONFIG = {
    "host": "project-db-campus.smhrd.com",
    "port": 3307,
    "user": "campus_24IS_CLOUD3_p3_1",
    "password": "smhrd1",
    "database": "campus_24IS_CLOUD3_p3_1",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}

def get_kst_now():
    return datetime.datetime.utcnow() + datetime.timedelta(hours=9)

def send_sms_solapi(to_phone, content):
    # 1. 전화번호 정제
    clean_phone = str(to_phone).replace("-", "").strip()
    
    # 2. [중요] 번호 형식 체크 (너무 짧거나 이상하면 'INVALID' 반환)
    if len(clean_phone) < 10: 
        print(f"  🚫 [형식 오류] 유효하지 않은 번호: {to_phone}")
        return "INVALID" # False 대신 명확한 신호 리턴

    url = "https://api.solapi.com/messages/v4/send"
    
    date_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    salt = str(uuid.uuid4().hex)
    combined = date_iso + salt
    signature = hmac.new(
        SOLAPI_API_SECRET.encode("utf-8"),
        combined.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    header = {
        "Authorization": f"HMAC-SHA256 apiKey={SOLAPI_API_KEY}, date={date_iso}, salt={salt}, signature={signature}",
        "Content-Type": "application/json"
    }

    body = {
        "message": {
            "to": clean_phone,
            "from": SENDER_PHONE,
            "text": content,
            "type": "LMS"
        }
    }

    try:
        res = requests.post(url, headers=header, json=body)
        if res.status_code == 200:
            print(f"  ✅ [SMS 발송 성공] -> {clean_phone}")
            return True
        else:
            print(f"  ❌ [SMS API 에러] {res.text}")
            return False
    except Exception as e:
        print(f"  ❌ [네트워크 에러] {e}")
        return False

def job():
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        curs = conn.cursor()

        kst_now = get_kst_now()
        now_hour = kst_now.hour
        
        sql_fetch = """
            SELECT 
                N.notification_id, N.user_num, N.message, N.type, U.phone
            FROM NOTIFICATIONS N
            JOIN USERS U ON N.user_num = U.USER_NUM
            WHERE N.status = 'pending'
            ORDER BY N.created_at ASC
            LIMIT 10
        """
        curs.execute(sql_fetch)
        rows = curs.fetchall()

        if not rows: return

        print(f"📬 [Worker] 대기 중인 알림 {len(rows)}건 확인.")

        for row in rows:
            noti_id = row['notification_id']
            noti_type = row.get('type') or 'IMMEDIATE' 
            user_phone = row['phone']
            msg = row['message']

            # 예약 발송 시간 체크
            if noti_type == 'SCHEDULED':
                if now_hour >= 22 or now_hour < 8:
                    print(f"  ⏳ [예약 대기] 야간 보류 (ID: {noti_id})")
                    continue 

            if not user_phone:
                print(f"  ⚠️ [Skip] 전화번호 없음 -> 'failed' 처리")
                curs.execute("UPDATE NOTIFICATIONS SET status='failed' WHERE notification_id=%s", (noti_id,))
                conn.commit()
                continue

            # --- [핵심 수정 부분] ---
            result = send_sms_solapi(user_phone, msg)

            if result == True:
                # 성공 -> sent
                curs.execute("UPDATE NOTIFICATIONS SET status='sent', sent_at=NOW() WHERE notification_id=%s", (noti_id,))
                conn.commit()
                print(f"  🚀 [DB 업데이트] 알림 #{noti_id} 발송 완료")
            
            elif result == "INVALID":
                # 번호 오류 -> failed (재시도 안 함!)
                curs.execute("UPDATE NOTIFICATIONS SET status='failed' WHERE notification_id=%s", (noti_id,))
                conn.commit()
                print(f"  🗑️ [DB 정리] 알림 #{noti_id} 번호 오류로 폐기 처리")
            
            else:
                # API 에러 등 -> pending 유지 (나중에 재시도)
                print(f"  ⚠️ [재시도 대기] 알림 #{noti_id} 일시적 오류")

    except Exception as e:
        print(f"❌ [Worker 에러] {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    print(f"🚀 알림 발송 워커 시작 (KST 기준: {get_kst_now()})")
    print("   (Ctrl+C로 종료)")

    try:
        while True:
            job()
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n👋 워커 종료")
        sys.exit()
