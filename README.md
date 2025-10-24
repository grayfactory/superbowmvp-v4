# 펫 간식 추천 AI (Superbow MVP v4)

LLM 기반 대화형 펫 간식 추천 시스템

## 프로젝트 개요

- **목표**: 사용자의 상황(Context)과 반려동물 프로필에 기반한 최적의 펫 간식 추천
- **핵심 전략**:
  - 이원화된 진입: 정밀 추천(프로필 폼) vs 빠른 추천(대화로 시작)
  - 상태 관리형 LLM: 대화 중 실시간 state 관리 및 정보 수집
  - 서버리스 아키텍처: 운영 관리가 거의 필요 없는 Zero-Ops 구조

## 기술 스택

- **Frontend**: SvelteKit 5 + TypeScript
- **Backend**: SvelteKit API Routes (서버리스 함수)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **LLM**: OpenAI GPT-4o (Tool Calling)
- **Deployment**: Vercel

## 프로젝트 구조

```
src/
├── lib/
│   ├── types/              # 타입 정의
│   │   ├── state.ts        # 대화 상태 타입
│   │   └── index.ts        # API, DB 타입
│   ├── stores/             # Svelte stores
│   │   ├── conversation.ts # 대화 상태 관리
│   │   └── petProfile.ts   # 펫 프로필 폼
│   ├── data/
│   │   └── pet_breed_data.json  # 견종 데이터
│   ├── server/
│   │   ├── db/
│   │   │   ├── client.ts   # Drizzle client
│   │   │   ├── schema.ts   # DB 스키마
│   │   │   └── queries.ts  # 쿼리 함수
│   │   ├── utils/
│   │   │   ├── context.ts  # Context 변환 유틸
│   │   │   └── logger.ts   # 추천 로깅
│   │   ├── openai.ts       # OpenAI client
│   │   ├── tools.ts        # Tool calling schemas
│   │   ├── prompts.ts      # LLM system prompts
│   │   └── petAnalyzer.ts  # 펫 분석 로직
│   └── utils/
│       └── state.ts        # Deep merge 유틸
├── routes/
│   ├── api/
│   │   ├── chat/+server.ts        # 대화 API
│   │   └── analyze-pet/+server.ts # 펫 분석 API
│   └── +page.svelte        # 메인 UI
└── app.html
```

## 개발 환경 설정

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Database (for migrations)
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 마이그레이션

```bash
# 스키마 생성
npx drizzle-kit generate:pg

# 마이그레이션 실행
npx drizzle-kit push:pg
```

### 4. 데이터베이스 시드 (선택사항)

Supabase 대시보드에서 SQL 에디터를 사용하여 Product와 Context 테이블에 샘플 데이터를 삽입합니다.

### 5. 개발 서버 실행

```bash
npm run dev
```

또는 Vercel CLI 사용 (환경 변수 자동 주입):

```bash
vercel dev
```

## 배포

### Vercel 배포

1. GitHub 저장소에 코드 푸시
2. Vercel 대시보드에서 저장소 Import
3. 환경 변수 설정 (Project > Settings > Environment Variables)
4. 자동 배포 완료

## 주요 기능

### 1. 펫 프로필 분석
- 견종, 개월 수, 몸무게 입력
- 자동 계산: age_fit, jaw_hardness_fit, weight_status

### 2. 대화형 추천
- LLM이 실시간으로 state 관리
- Context 매칭 또는 개별 질문을 통한 정보 수집
- 4단계 추천 프로세스

### 3. 추천 로깅
- 비동기 로그 저장 (Fire-and-Forget)
- 추천 품질 개선을 위한 데이터 축적

## 문서

- [프로젝트 기획안](docs/plan4.md)
- [DSL v5 (Implementation Spec)](docs/dsl5.md)

## License

ISC
