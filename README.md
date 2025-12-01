# ✔️ MindMesh Test Guide

## 1. 환경 요구사항(Requirements)
- Python 3.10+
- Node.js 18+ (npm/yarn/pnpm)
- Docker + Docker Compose (선택)
- PostgreSQL (Docker 사용 시 자동 설치)

---

## 2. 프로젝트 구조(Project Structure)

MindMesh/
├── backend/        # FastAPI 서버
├── frontend/       # React + Vite 프론트엔드
└── docker-compose.yml

---

## 3. 로컬 개발 환경 실행 방법(Local Dev Setup)

### 3.1 백엔드(FastAPI) 실행

(1) 의존성 설치  
cd backend  
pip install -r requirements.txt

(2) 환경 변수 설정  
backend 폴더에 .env 생성:  
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/mindmesh  
OPENAI_API_KEY=your_openai_key

(3) 데이터베이스 초기화  
alembic upgrade head

(4) 서버 실행  
uvicorn app.main:app --reload --port 8000

(5) API 테스트  
curl http://127.0.0.1:8000/health

---

### 3.2 프론트엔드(React/Vite) 실행

(1) 의존성 설치  
cd frontend  
npm install

(2) 개발 서버 실행  
npm run dev

프론트 URL → http://localhost:5173

---

## 4. Docker Compose로 전체 실행(Docker)

(1) 실행  
docker compose up --build

(2) 서비스 확인  
백엔드 → http://localhost:8000  
프론트엔드 → http://localhost:5173  

(3) 종료  
docker compose down

---

## 5. WebSocket 기능 테스트

JS 테스트 코드:

const ws = new WebSocket("ws://localhost:8000/ws/session/demo-session");
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "utterance",
    user: "test-user",
    text: "hello mindmesh"
  }));
};
ws.onmessage = (e) => console.log("MSG:", e.data);

---

## 6. 임베딩 기능 테스트

curl -X POST "http://127.0.0.1:8000/embed" -H "Content-Type: application/json" -d '{"texts": ["hello", "mindmesh"]}'

---

## 7. 링크 생성 기능 테스트

curl -X POST "http://127.0.0.1:8000/links/generate" -H "Content-Type: application/json" -d '{"session_id": "demo", "nodes": ["node1", "node2"]}'

---

## 8. 테스트 체크리스트(Test Checklist)

| 체크 항목 | 설명 |
|----------|------|
| 백엔드 실행 여부 | http://localhost:8000/health 200 OK |
| 프론트 UI 출력 | npm run dev 후 정상 출력 |
| WebSocket 송수신 | 메시지 send/receive 정상 작동 |
| 임베딩 API | 벡터 배열 반환 확인 |
| 링크 생성 | cosine similarity 기반 링크 생성 확인 |
| Docker 전체 실행 | docker compose up 정상 작동 |
