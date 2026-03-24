#!/usr/bin/env python3
"""
RUNCREW 자동 패치 스크립트
사용법: python3 patch_runcrew.py
위치:   ~/Downloads/runtrack/ 에서 실행하거나 경로를 인자로 전달
        python3 patch_runcrew.py /path/to/runtrack
"""

import sys
import os
import shutil
from datetime import datetime

# ── 프로젝트 경로 결정 ──────────────────────────────────────────
PROJECT_ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/runtrack")

ANALYZE_RUN  = os.path.join(PROJECT_ROOT, "src/lib/analyzeRun.js")
COMMUNITY    = os.path.join(PROJECT_ROOT, "src/components/CommunityApp.js")

# ── 유틸 ────────────────────────────────────────────────────────
def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def backup(path):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = path + f".bak_{ts}"
    shutil.copy2(path, dest)
    print(f"  📦 백업: {os.path.basename(dest)}")

def patch(path, old, new, label):
    content = read(path)
    if old not in content:
        print(f"  ⚠️  [{label}] 이미 적용됐거나 대상 코드를 찾을 수 없음 — 스킵")
        return False
    write(path, content.replace(old, new, 1))
    print(f"  ✅ [{label}] 패치 완료")
    return True

# ════════════════════════════════════════════════════════════════
# 패치 1 — analyzeRun.js : 가민 파싱 프롬프트 강화
# ════════════════════════════════════════════════════════════════
ANALYZE_OLD = '''            type: "text",
            text: `Analyze this running workout screenshot (Garmin, Nike Run Club, Apple Watch, Strava, etc).

Return ONLY a raw JSON object, no markdown, no explanation:
{"distance":<km decimal>,"duration":<total seconds int>,"pace":<"M'SS\\\\"">,"calories":<total kcal int>,"date":<"YYYY-MM-DD" or null>,"appName":<app name or null>,"confidence":<"high"|"medium"|"low">,"error":<null or "not_running">}

RULES:
- distance: "러닝 거리" / "Running Distance" / km value (e.g. "5,280.00 m" = 5.28km, "5.28 km"). Miles → km (×1.609). DO NOT confuse with pace.
- duration: "총 시간" / "러닝 시간" / "Elapsed Time". HH:MM:SS or MM:SS → total seconds
- pace: "러닝 페이스" / "평균 페이스" / "Avg Pace" → format M'SS" e.g. 5'42". This is min/km, NOT a distance value.
- calories: "총 칼로리" / "활성 칼로리" / "Total Calories" — prefer 총 over 활성
- Garmin specific: "운동 요약" section has "러닝 거리" in meters (e.g. 5,280.00 m) and "러닝 페이스" in min/km. Convert meters to km.
- If not a running record: {"error":"not_running"}`,'''

ANALYZE_NEW = '''            type: "text",
            text: `You are analyzing a running workout screenshot. Extract the key metrics and return ONLY a raw JSON object (no markdown, no explanation, no backticks).

OUTPUT FORMAT:
{"distance":<km decimal>,"duration":<total seconds int>,"pace":<"M'SS\\\\"">,"calories":<total kcal int>,"date":<"YYYY-MM-DD" or null>,"appName":<string or null>,"confidence":<"high"|"medium"|"low">,"error":<null or "not_running">}

=== DISTANCE RULES ===
- Look for "러닝 거리" (in 운동 요약 section) or "Running Distance"
- If in meters (e.g. "3,100.00 m" or "5,280.00 m"): divide by 1000 → km (3,100m = 3.1km)
- If in km (e.g. "5.28 km"): use as-is
- If in miles: multiply by 1.609
- NEVER use pace value as distance. Pace looks like "5:24 /km" and is always under 20.

=== DURATION RULES ===
- Look for "총 시간" or "러닝 시간" (in 운동 요약 section) or "Elapsed Time" or "Moving Time"
- Format HH:MM:SS → hours×3600 + min×60 + sec
- Format MM:SS (e.g. "16:43") → min×60 + sec = 1003 seconds
- IGNORE "이동 시간", "경과 시간" if "총 시간" exists

=== PACE RULES ===
- Priority order: "러닝 페이스" (운동 요약) > "평균 페이스" (페이스 섹션) > "Avg Pace"
- Format is always M:SS /km → output as M'SS" (e.g. "5:24 /km" → "5'24\\"")
- IGNORE "최대 페이스" / "Max Pace" / "평균 이동 페이스" — these are NOT average pace
- "최대 페이스" like "0:45 /km" is a sprint value, never use it

=== CALORIES RULES ===
- Prefer "총 칼로리" over "활성 칼로리" over "소모 칼로리"
- If only one calorie value exists, use it

=== DATE RULES ===
- Look at the top of the screen for date like "3월 24일 (화)" or "Mar 24"
- Current year is 2026. If only month/day visible, assume 2026
- Format: YYYY-MM-DD (e.g. "3월 24일" → "2026-03-24")

=== APP NAME RULES ===
- Garmin Connect: screen has Korean labels like "러닝 거리", "평균 페이스", "운동 요약" → "Garmin"
- Nike Run Club, Strava, Apple Watch: detect from UI style
- "트랙 러닝" is the ACTIVITY TYPE, not the app name

=== GARMIN SPECIFIC ===
This screenshot appears to be Garmin Connect Korean. The layout has:
- Top section: "페이스" with 평균/이동/최대 페이스 (use 평균 페이스 here only if 운동 요약 not visible)
- Bottom section "운동 요약": has "러닝 시간", "러닝 거리" (in meters!), "러닝 페이스" ← USE THESE
- "운동 요약" values are the most accurate — always prefer them

=== ERROR CASES ===
- If not a running workout screenshot: {"error":"not_running"}
- If image is too blurry to read: {"error":"not_running"}`,'''

# ════════════════════════════════════════════════════════════════
# 패치 2 — CommunityApp.js : 파싱 결과 콘솔 로깅 추가
# ════════════════════════════════════════════════════════════════
COMMUNITY_OLD = '''        const r = await analyzeRunImage(b64, f.type);
        if (r.error === "not_running") {'''

COMMUNITY_NEW = '''        const r = await analyzeRunImage(b64, f.type);
        console.log("[AI 파싱 결과]", JSON.stringify(r, null, 2));
        if (r.error === "not_running") {'''

# ════════════════════════════════════════════════════════════════
# 실행
# ════════════════════════════════════════════════════════════════
def main():
    print(f"\n🔧 RUNCREW 패치 시작")
    print(f"   프로젝트 경로: {PROJECT_ROOT}\n")

    # 경로 검증
    for path in [ANALYZE_RUN, COMMUNITY]:
        if not os.path.exists(path):
            print(f"❌ 파일을 찾을 수 없어요: {path}")
            print("   프로젝트 경로를 확인하거나 인자로 전달해 주세요:")
            print("   python3 patch_runcrew.py /path/to/runtrack")
            sys.exit(1)

    # analyzeRun.js 패치
    print("📄 analyzeRun.js")
    backup(ANALYZE_RUN)
    patch(ANALYZE_RUN, ANALYZE_OLD, ANALYZE_NEW, "가민 파싱 프롬프트 강화")

    # CommunityApp.js 패치
    print("\n📄 CommunityApp.js")
    backup(COMMUNITY)
    patch(COMMUNITY, COMMUNITY_OLD, COMMUNITY_NEW, "파싱 결과 콘솔 로깅")

    print("\n🚀 완료! 이제 배포하세요:")
    print("   cd ~/Downloads/runtrack && deploy\n")

if __name__ == "__main__":
    main()
