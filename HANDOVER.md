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

## 🚀 실행 방법 (개발 환경)

1. **디렉토리 이동**
   ```bash
   cd web-app
   ```

2. **의존성 설치 (최초 1회)**
   ```bash
   npm install
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   - 실행 후 터미널에 표시되는 URL (예: `http://localhost:5173`)로 접속합니다.

## 🔑 환경 변수 설정 (.env)
`web-app` 폴더 내 `.env` 파일에 다음 정보가 설정되어 있어야 합니다.
- `VITE_GOOGLE_API_KEY`: 구글 클라우드 콘솔에서 발급받은 API 키
- `VITE_GOOGLE_CLIENT_ID`: OAuth 2.0 클라이언트 ID
- `VITE_SPREADSHEET_ID`: 연동할 구글 스프레드시트의 ID

## ✨ 최근 주요 구현 기능
1. **과거 성적 추세 참조 시스템**
   - 시트 선택 시, 해당 시트의 데이터(lastmark)를 참조하여 이전 3학기 성적을 시각적으로 비교.
   - 참조 시트 이름은 현재 시트의 `lastmark` 열 2~4행에 자동 저장되어 영속성 유지.
   
2. **성적 입력 간소화**
   - `Raw` 키워드가 포함된 헤더만 입력 필드로 노출.
   - 불필요한 라벨 텍스트 제거 및 포맷 통일 (예: `L/C (Raw)`).

3. **UI/UX 개선**
   - 모바일 환경을 고려한 카드형 레이아웃 및 큰 버튼.
   - 실시간 데이터 반영 및 로딩 인디케이터 적용.

## ⚠️ 다음 작업자 확인 사항
- **`user_log.js`**: 상세한 개발 과정과 명령 실행 기록이 담겨있으니 트러블슈팅 시 참조하세요.
- **`PATCH_NOTES.js`**: 기능 추가/변경의 큰 흐름을 파악하기 좋습니다.
- **`Code.gs`**: 백엔드 로직 수정이 필요할 경우 이 파일을 수정 후 Apps Script 에디터에 붙여넣어 배포해야 합니다.

---
**마지막 업데이트**: 2026-02-08
**작성자**: Antigravity AI
