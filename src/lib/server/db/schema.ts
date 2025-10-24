// src/lib/server/db/schema.ts
import { pgTable, varchar, integer, boolean, text, json, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { PetProfile, ContextInfo, ProductFilters } from '$lib/types';

/**
 * 제품 테이블
 */
export const productTable = pgTable('products', {
  product_id: varchar('product_id', { length: 20 }).primaryKey(), // 'P0001'
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // '간식', '케이크', '밀키트'

  // 원재료
  protein_sources: varchar('protein_sources', { length: 100 }), // 'Lamb', 'duck', 'egg'
  ingredient: text('ingredient'),
  ingredient2: text('ingredient2'),
  ingredient3: text('ingredient3'),

  // 알레르기 정보 (PostgreSQL array 타입)
  allergens: text('allergens').array(), // ['Lamb', 'dairy', 'egg']

  // 물리적 특성
  texture: varchar('texture', { length: 20 }), // '하드', '부드러움', '중간'
  piece_size_cm: integer('piece_size_cm'),
  moisture_type: varchar('moisture_type', { length: 20 }), // '드라이', '웨트', '세미모이스트'

  // 기능성 태그 (PostgreSQL array 타입)
  functional_tags: text('functional_tags').array(),
  // ['single-protein', 'hypoallergenic', 'weight-control']

  // 포장/보관
  packaging: varchar('packaging', { length: 50 }), // 'zip_pouch', 'box_pack'
  feature: text('feature'),
  shelf_stable: boolean('shelf_stable').notNull(), // true/false

  // 사용성 특성
  strong_aroma: boolean('strong_aroma'), // true/false
  crumb_level: varchar('crumb_level', { length: 10 }), // 'low', 'medium', 'high'
  noise_level: varchar('noise_level', { length: 10 }), // 'low', 'high'

  // 가격
  price: integer('price').notNull(),

  // 적합성 필터
  age_fit: varchar('age_fit', { length: 20 }), // 'all', 'puppy', 'adult', 'senior'
  jaw_hardness_fit: varchar('jaw_hardness_fit', { length: 10 }), // 'low', 'medium', 'high'

  // 영양 성분 (%)
  protein_percent: varchar('protein_percent', { length: 10 }), // '66.2'
  moisture_percent: varchar('moisture_percent', { length: 10 }), // '24.9'
  fiber_percent: varchar('fiber_percent', { length: 10 }),
  ash_percent: varchar('ash_percent', { length: 10 }),
  fat_percent: varchar('fat_percent', { length: 10 })
});

export type Product = typeof productTable.$inferSelect;
export type NewProduct = typeof productTable.$inferInsert;

/**
 * Context 테이블 (상황별 추천 규칙)
 */
export const contextTable = pgTable('contexts', {
  context_id: varchar('context_id', { length: 20 }).primaryKey(), // 'C001'
  occasion: varchar('occasion', { length: 100 }).notNull(), // '훈련', '노즈워크', '병원대기'

  // 상황 특성
  location_type: varchar('location_type', { length: 50 }), // 'cafe', 'home', 'hospital'
  duration_min: integer('duration_min'), // 30, 60, 120

  // 제약 조건
  messy_ok: boolean('messy_ok'), // 부스러기 허용 여부
  noise_sensitive: boolean('noise_sensitive'), // 소음 민감도
  storage: varchar('storage', { length: 50 }), // 'only_shelf_stable', 'refrigeration_ok'
  budget_max: integer('budget_max'),
  season: varchar('season', { length: 20 }), // 'any', 'hot', 'cold'

  // 사용자 선호도 (soft_preferences로 변환됨)
  owner_pref: text('owner_pref') // '저칼로리, 개별포장'
});

export type Context = typeof contextTable.$inferSelect;

/**
 * 추천 로그 테이블
 * 4단계 완료 시마다 자동 저장 (비동기)
 *
 * 목적:
 * - 어떤 state가 어떤 제품을 추천받았는지 분석
 * - 추천 품질 개선을 위한 데이터 축적
 * - Context/Profile 패턴과 실제 추천의 상관관계 파악
 */
export const recommendationLogsTable = pgTable('recommendation_logs', {
  // Primary Key
  log_id: uuid('log_id').primaryKey().defaultRandom(),

  // 타임스탬프
  created_at: timestamp('created_at').defaultNow().notNull(),

  // State 스냅샷 (JSONB로 저장)
  profile_snapshot: json('profile_snapshot').$type<PetProfile>().notNull(),
  context_snapshot: json('context_snapshot').$type<ContextInfo>().notNull(),
  filters_snapshot: json('filters_snapshot').$type<ProductFilters>().notNull(),

  // 추천 결과 (JSONB 배열)
  recommended_products: json('recommended_products')
    .$type<Array<{
      product_id: string;
      score: number;
      reasoning: string;
    }>>()
    .notNull(),

  // 분석용 필드 (인덱싱)
  context_id: varchar('context_id', { length: 20 }), // state.context.context_id
  age_fit: varchar('age_fit', { length: 20 }), // state.profile.age_fit
  jaw_hardness_fit: varchar('jaw_hardness_fit', { length: 10 }), // state.profile.jaw_hardness_fit

  // 추천 다양성 메트릭
  top_product_id: varchar('top_product_id', { length: 20 }).notNull(), // recommendations[0].product_id
  top_product_score: integer('top_product_score').notNull() // recommendations[0].score (1-10)
});

export type RecommendationLog = typeof recommendationLogsTable.$inferSelect;
export type NewRecommendationLog = typeof recommendationLogsTable.$inferInsert;
