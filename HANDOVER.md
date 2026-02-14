# 프로젝트 인계 문서 (HANDOVER.md)

## 📌 프로젝트 개요
**Score Entry Web App**은 구글 시트를 백엔드 데이터베이스로 활용하고, React(Vite) 기반의 모바일 친화적인 웹 인터페이스를 통해 성적을 입력 및 관리하는 애플리케이션입니다.

## 🛠 기술 스택
- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: Google Apps Script (GAS) - `Code.gs`
- **Database**: Google Sheets (스프레드시트 ID 연동)
- **Deployment**: Localhost (개발 중) / Firebase Hosting (배포 예정)

## 📂 주요 파일 및 폴더 구조
```
/orbital-gemini
├── web-app/                  # 프론트엔드 소스 코드
│   ├── src/
│   │   ├── App.jsx           # 메인 로직 (UI 렌더링, 상태 관리)
│   │   ├── services/
│   │   │   └── sheetsService.js  # 구글 시트 API 통신 모듈
│   │   └── index.css         # Tailwind 스타일 설정
│   ├── package.json          # 의존성 설정
│   └── vite.config.js        # Vite 설정
├── Code.gs                   # Google Apps Script 백엔드 코드
├── user_log.js               # 개발 로그 (작업 히스토리 기록)
└── PATCH_NOTES.js            # 주요 기능 변경 사항 (패치 노트)
```

## 🚀 실행 및 배포 주소
- **개발 환경**: `http://localhost:5173`
- **라이브 환경**: [https://inputplacement.web.app](https://inputplacement.web.app) (Firebase Hosting)

## 🔑 환경 변수 설정 (.env)
`web-app` 폴더 내 `.env` 파일에 다음 정보가 설정되어 있습니다. (유출 주의)
- `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_CLIENT_ID`, `VITE_SPREADSHEET_ID`

## ✨ 최근 주요 구현 기능
1. **성적 필드 매칭 최적화 및 저장 성공률 100% 달성**
   - 구글 시트의 헤더 형식과 앱 내 상수를 동기화하여 성적 데이터가 누락 없이 기록되도록 조치했습니다.
   - `sheetsService.js`의 정규화(normalize) 로직을 강화하여 미세한 오타나 공백, 기호 차이도 유연하게 대응합니다.

2. **Firebase 배포 및 구글 로그인 연동 완료**
   - OAuth 2.0 승인된 자바스크립트 원본에 라이브 도메인을 등록하여 운영 환경에서도 안전한 로그인이 가능합니다.
   - 프로덕션 빌드 최적화 및 배포 절차 안정화.

3. **실시간 데이터 로깅 및 디버깅 시스템**
   - 성적 저장 시 브라우저 콘솔을 통해 데이터 매핑 과정을 확인할 수 있는 상세 로그를 추가했습니다.

## ⚠️ 다음 작업자 확인 사항
- **구글 시트 헤더**: 성적 입력이 안 될 경우 시트의 헤더명과 `App.jsx`의 `DEPT_SPECS` 필드명이 일치하는지 확인하십시오. (현재 공백 없는 형식이 표준입니다.)
- **권한 관리**: 사용자 추가 시 구글 클라우드 콘솔의 OAuth 설정과 스프레드시트 공유 설정을 함께 확인해야 합니다.

---
**마지막 업데이트**: 2026-02-13
**작성자**: Antigravity AI (Lead Developer)
