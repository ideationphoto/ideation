# 구도 가이드 앱

풍경을 촬영하면 AI가 인물 배치 구도 3가지를 추천하고, 선택한 구도를 카메라 화면에 반투명 실루엣으로 오버레이해 누구나 쉽게 좋은 구도의 인물 사진을 찍을 수 있게 해주는 모바일 앱.

---

## 사용 흐름

1. 앱에서 풍경 촬영 (또는 갤러리에서 선택)
2. 서버가 이미지를 분석해 구도 후보 3가지 생성
3. 구도 선택 화면에서 마음에 드는 구도 선택
4. 가이드 화면에서 실루엣에 맞춰 인물 사진 촬영 → 갤러리 자동 저장

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 모바일 앱 | React Native (Expo) |
| 백엔드 | Python 3.11 + FastAPI |
| AI 모델 | NIMA (미적 점수), MiDaS (깊이 추정) |
| 컨테이너 | Docker Compose |

---

## 프로젝트 구조

```
ideathon/
├── app/              # React Native 앱 (Expo)
│   ├── app/          # 화면 (index, preview, guide)
│   ├── components/   # 재사용 컴포넌트
│   ├── services/     # API 클라이언트, 상태 관리
│   └── assets/       # 아이콘 이미지
├── server/           # FastAPI 백엔드
│   └── app/
│       ├── pipeline/ # 분석 파이프라인 (깊이, 세그멘테이션, NIMA, NMS)
│       ├── compositor/ # 실루엣 합성
│       └── routers/  # API 엔드포인트
├── .env              # 서버 환경변수 (git 제외)
├── .env.example      # 환경변수 템플릿
└── docker-compose.yml
```

---

## 시작하기

### 사전 준비

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치
- [Node.js 18+](https://nodejs.org/) 설치
- [Expo Go](https://expo.dev/go) 앱 설치 (테스트용 스마트폰에)

---

### 1. 환경변수 설정

```bash
# 루트 .env (서버용)
cp .env.example .env
```

`.env` 파일을 열어 값 입력:
```
OPENAI_API_KEY=sk-...  # OpenAI API 키
```

```bash
# 앱 .env (프론트엔드용)
cp app/.env.example app/.env
```

`app/.env` 파일을 열어 PC의 로컬 IP 입력:
```
EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:8000
```

> PC IP 확인: Windows는 `ipconfig`, Mac/Linux는 `ifconfig`

---

### 2. 백엔드 서버 실행

```bash
docker compose up --build
```

서버가 뜨면 `http://localhost:8000/health` 에서 `{"status":"ok"}` 응답 확인.

---

### 3. 앱 실행 (개발용 - Expo Go)

```bash
cd app
npm install
npx expo start
```

터미널에 QR코드가 뜨면 스마트폰 Expo Go 앱으로 스캔.

> **주의**: 스마트폰과 PC가 **같은 와이파이**에 연결되어 있어야 합니다.

---

### 4. APK 빌드 (배포용)

> EAS CLI 설치 및 로그인 필요: `npm install -g eas-cli && eas login`

```bash
cd app
eas build --platform android --profile preview
```

빌드 완료 후 다운로드 링크가 발급됩니다. APK를 스마트폰에 설치해 Expo Go 없이 실행 가능.

---

## API

### `POST /analyze`

풍경 이미지를 분석해 구도 후보 3개를 반환합니다.

**요청**: `multipart/form-data`
- `image`: 이미지 파일 (JPEG/PNG, 최대 20MB)

**응답**:
```json
{
  "request_id": "uuid",
  "candidates": [
    {
      "rank": 1,
      "nima_score": 7.42,
      "position": { "x": 0.33, "y": 0.66 },
      "scale": 0.42,
      "preview_base64": "data:image/jpeg;base64,..."
    }
  ]
}
```

---

## 개발 시 참고

### 코드 수정 후 재빌드가 필요한 경우
- 네이티브 모듈 추가/변경 (`expo-camera`, `expo-media-library` 등)
- `app.json` 플러그인 변경

### 재빌드 없이 바로 반영되는 경우
- JS/TS 코드 변경 (화면 UI, 로직 등) → Expo Go 저장 시 자동 반영

### 서버 IP 변경 시
`app/.env`의 `EXPO_PUBLIC_BACKEND_URL` 값만 수정 후 Expo Go 재시작.
