import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import re
from collections import Counter
import os

# 1. 파일 읽기
filename = 'test.txt'

if not os.path.exists(filename):
    print(f"오류: '{filename}' 파일이 존재하지 않습니다.")
else:
    with open(filename, 'r', encoding='cp949') as f:
        text = f.read()

    # 2. 전처리 (특수문자 및 공백 제거)
    clean_text = re.sub(r'[\s.\n\t]', '', text)

    # 3. 빈도수 계산
    char_count = Counter(clean_text)
    sorted_char_count = char_count.most_common()

    # 4. 히스토그램 시각화 설정
    # 윈도우 한글 폰트 설정 (맑은 고딕)
    plt.rc('font', family='Malgun Gothic')
    plt.rcParams['axes.unicode_minus'] = False

    chars = [item[0] for item in sorted_char_count]
    counts = [item[1] for item in sorted_char_count]

    plt.figure(figsize=(15, 6))
    plt.bar(chars, counts, color='blue')
    plt.xlabel('글자')
    plt.ylabel('빈도수')
    plt.title('글자별 빈도수 분석 결과')
    plt.xticks(rotation=45)
    
    # 그래프를 이미지 파일로 저장
    plt.savefig('analysis_result.png')
    print("그래프가 'analysis_result.png'로 저장되었습니다.")

    # 5. 상위 5개 출력
    print("\n[상위 5개 글자 분석 결과]")
    for char, count in sorted_char_count[:5]:
        print(f"글자: {char}, 빈도수: {count}")
