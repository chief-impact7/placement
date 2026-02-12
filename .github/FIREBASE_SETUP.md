# Firebase 자동 배포 설정 가이드

GitHub Actions를 통한 Firebase 자동 배포가 설정되었습니다! 🎉

## 🔧 필수 설정 단계

### 1️⃣ Firebase Service Account 키 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: **inputplacement**
3. ⚙️ 설정 → 프로젝트 설정 → 서비스 계정 탭
4. "새 비공개 키 생성" 클릭
5. JSON 파일 다운로드 (전체 내용을 복사해둡니다)

### 2️⃣ GitHub Secrets 설정

GitHub 저장소에서:
1. Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 다음 Secrets 추가:

#### 필수 Secrets:

**FIREBASE_SERVICE_ACCOUNT**
- Value: 위에서 다운로드한 JSON 파일의 전체 내용을 붙여넣기

**VITE_GOOGLE_API_KEY**
- Value: 현재 `.env` 파일의 값

**VITE_GOOGLE_CLIENT_ID**
- Value: 현재 `.env` 파일의 값

**VITE_SPREADSHEET_ID**
- Value: 현재 `.env` 파일의 값

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

**참고**: FIREBASE_SERVICE_ACCOUNT는 민감한 정보이므로 절대 공개 저장소에 커밋하지 마세요!
