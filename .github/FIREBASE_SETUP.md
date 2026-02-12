# Firebase 자동 배포 설정 가이드

GitHub Actions를 통한 Firebase 자동 배포가 설정되었습니다! 🎉

## 🔧 필수 설정 단계

### 1️⃣ Firebase CI 토큰 생성

로컬 터미널에서 다음 명령 실행:

```bash
cd /home/user/placement
firebase login:ci
```

- 브라우저가 열리면 Google 계정으로 로그인
- 로그인 성공 후 터미널에 **토큰이 출력됨** (복사해두세요!)
- 예시: `1//0eHd1...` 형식의 긴 문자열

### 2️⃣ GitHub Secrets 설정

GitHub 저장소에서:
1. Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 다음 Secrets 추가:

#### 필수 Secrets:

**FIREBASE_TOKEN**
- Value: 위에서 생성된 CI 토큰 전체를 붙여넣기

**VITE_GOOGLE_API_KEY**
- Value: `AIzaSyBk5K6wbMF6XDjRkfJdVnR3C0PNmbmrWU4`

**VITE_GOOGLE_CLIENT_ID**
- Value: `313604133572-jqncekhe945qp4quaavlpoi7g0175pt2.apps.googleusercontent.com`

**VITE_SPREADSHEET_ID**
- Value: `1Bc7xZXdSsPmcZcd0NPXWaEIiAwxmptDuhzqVZldBqgs`

### 3️⃣ 배포 트리거

이제 다음과 같은 경우에 자동으로 배포됩니다:

✅ `main` 또는 `master` 브랜치에 푸시할 때
✅ `web-app/` 폴더의 파일이 변경될 때
✅ GitHub Actions 탭에서 수동으로 실행 (workflow_dispatch)

## 📋 현재 .env 값 확인

터미널에서 확인:
```bash
cd /home/user/placement/web-app
cat .env
```

## 🎯 배포 상태 확인

- GitHub 저장소 → Actions 탭에서 배포 진행 상황 확인 가능
- 배포 완료 후 Firebase Hosting URL에서 자동 반영

## ⚡ 수동 배포

GitHub Actions 탭 → "Deploy to Firebase Hosting" → "Run workflow" 클릭

---

## 🚨 중요 참고사항

- **FIREBASE_TOKEN**은 민감한 정보이므로 절대 공개 저장소에 커밋하지 마세요!
- 토큰이 유출되면 즉시 `firebase logout` 후 새 토큰을 생성하세요
- 토큰은 만료되지 않으므로 한 번만 생성하면 됩니다
