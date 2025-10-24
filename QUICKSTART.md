# 🚀 Quick Start Guide

빠른 시작을 위한 단계별 가이드입니다.

## Prerequisites

- Node.js 18+ 설치
- Supabase 계정
- OpenAI API 키

## 1. 환경 변수 설정 (5분)

### 1.1 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. New Project 생성
3. Project Settings → API 에서 다음 복사:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_KEY`

### 1.2 OpenAI API 키 발급
1. https://platform.openai.com/api-keys 접속
2. Create new secret key
3. 키 복사 → `OPENAI_API_KEY`

### 1.3 .env 파일 생성
```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-xxxxx
DATABASE_URL=postgresql://postgres:[SUPABASE_PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**DATABASE_URL 주의사항**:
- `[SUPABASE_PASSWORD]`는 Supabase 프로젝트 생성 시 설정한 데이터베이스 비밀번호
- `xxxxx`는 Project URL에서 추출 (예: `https://abcdef.supabase.co` → `abcdef`)

## 2. 데이터베이스 설정 (10분)

### 2.1 마이그레이션 생성 및 실행
```bash
# 의존성 설치 (아직 안했다면)
npm install

# 마이그레이션 생성
npx drizzle-kit generate:pg

# 마이그레이션 실행
npx drizzle-kit push:pg
```

### 2.2 샘플 데이터 삽입

Supabase Dashboard → SQL Editor에서 다음 SQL 실행:

#### Products 테이블 샘플 데이터
```sql
INSERT INTO products (
  product_id, name, category, allergens, shelf_stable,
  crumb_level, noise_level, price, age_fit, jaw_hardness_fit,
  functional_tags, feature
) VALUES
  ('P0001', '양떡심말이', '간식', ARRAY['Lamb'], TRUE, 'low', 'high', 8000, 'all', 'high',
   ARRAY['single-protein', 'hypoallergenic'], '져키형, 지퍼백으로 보관 용이'),
  ('P0002', '컵케이크', '케이크', ARRAY['dairy','egg'], FALSE, 'medium', 'low', 5000, 'puppy', 'low',
   ARRAY['protein-rich', 'digestive-health'], '케이크형, 선물용 상자 포장'),
  ('P0003', '댕파스타', '밀키트', ARRAY[]::text[], FALSE, 'medium', 'low', 9000, 'senior', 'low',
   ARRAY['antioxidant', 'immune-support'], '화식형, 진공 포장으로 신선도 유지');
```

#### Contexts 테이블 샘플 데이터
```sql
INSERT INTO contexts (
  context_id, occasion, location_type, messy_ok, noise_sensitive,
  storage, budget_max, owner_pref
) VALUES
  ('C001', 'training', 'cafe', FALSE, TRUE, 'only_shelf_stable', 10000, '저칼로리, 개별포장'),
  ('C002', '노즈워크', 'home', TRUE, FALSE, 'refrigeration_ok', 15000, '향 진한, 오래 먹는'),
  ('C006', '병원대기', 'hospital', FALSE, TRUE, 'only_shelf_stable', 12000, '저소음, 저부스러기');
```

## 3. 로컬 개발 서버 실행 (1분)

### 방법 1: npm (표준)
```bash
npm run dev
```

### 방법 2: Vercel CLI (권장)
```bash
# Vercel CLI 설치 (한번만)
npm install -g vercel

# Vercel 프로젝트 링크 (한번만)
vercel link

# 개발 서버 실행
vercel dev
```

**Vercel CLI 장점**:
- Vercel 클라우드의 환경변수 자동 주입
- 실제 배포 환경과 동일한 서버리스 환경 테스트

브라우저에서 http://localhost:5173 (또는 표시된 주소) 접속

## 4. 테스트 시나리오 (5분)

### 시나리오 A: 프로필 폼 사용 (정밀 추천)
1. 메인 페이지에서 프로필 폼 작성:
   - 견종: `골든리트리버`
   - 개월 수: `24`
   - 몸무게: `28` (선택)
2. "프로필 분석" 버튼 클릭
3. 대화 시작: `병원 대기실에서 줄 간식 추천해줘`
4. LLM이 Context C006 매칭 → 자동 필터 적용 → 추천

### 시나리오 B: 바로 추천받기 (빠른 추천)
1. "건너뛰기 (바로 추천받기)" 버튼 클릭
2. 대화 시작: `카페에서 훈련할 때 쓸 간식 필요해`
3. LLM이 Context C001 매칭 → 추천
4. 추가 질문에 답변하며 정보 보완

### 시나리오 C: Context 매칭 실패 (수동 질문)
1. "건너뛰기" 버튼 클릭
2. 대화 시작: `그냥 맛있는 거 추천해줘`
3. LLM이 매칭 실패 → 필수 질문 시작:
   - 치악력(딱딱한 정도)
   - 부스러기 허용 여부
   - 소음 민감도
   - 상온보관 여부
   - 선호사항
4. 모든 질문 답변 후 추천

## 5. 데이터베이스 확인 (선택)

Supabase Dashboard에서 추천 로그 확인:

```sql
SELECT
  created_at,
  context_id,
  age_fit,
  recommended_products,
  top_product_id,
  top_product_score
FROM recommendation_logs
ORDER BY created_at DESC
LIMIT 10;
```

## 6. Vercel 배포 (10분)

### 6.1 GitHub 저장소 생성
```bash
git init
git add .
git commit -m "Initial implementation"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 6.2 Vercel 배포
1. https://vercel.com 접속
2. "Add New Project" → GitHub 저장소 Import
3. Environment Variables 추가:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `OPENAI_API_KEY`
4. Deploy 버튼 클릭
5. 배포 완료 후 URL 확인

### 6.3 자동 배포 설정
- 이후 `git push`할 때마다 자동 재배포
- Preview URL로 PR 테스트 가능

## 문제 해결

### "Module not found" 에러
```bash
npm install
```

### Database connection 실패
- `.env` 파일의 `DATABASE_URL` 확인
- Supabase 프로젝트 Paused 상태 → Resume
- Database password 정확한지 확인

### OpenAI API 에러
- API 키 유효성 확인
- OpenAI 계정 크레딧 잔액 확인
- 요청 제한(Rate Limit) 확인

### TypeScript 에러
```bash
npm run check
```

## 다음 단계

1. **더 많은 제품 데이터 추가**: `products` 테이블에 실제 제품 삽입
2. **더 많은 Context 추가**: `contexts` 테이블에 다양한 상황 규칙 추가
3. **더 많은 견종 데이터**: `src/lib/data/pet_breed_data.json`에 견종 추가
4. **UI 커스터마이징**: `src/routes/+page.svelte`에서 스타일 변경
5. **Analytics 구축**: `recommendation_logs` 테이블 분석 대시보드 구축

## 도움말

- [README](README.md) - 프로젝트 개요 및 구조
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - 구현 상세
- [DSL v5](docs/dsl5.md) - 기술 스펙
- [Project Plan](docs/plan4.md) - 프로젝트 기획

---

**문제가 발생하면**:
1. 콘솔 에러 메시지 확인
2. `.env` 파일 재확인
3. `npm install` 재실행
4. Supabase 연결 상태 확인
