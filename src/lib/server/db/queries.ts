// src/lib/server/db/queries.ts
import { db } from './client';
import { productTable, contextTable } from './schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import type { HardFilters, Product, Context } from '$lib/types';

/**
 * HardFilters로 동적 쿼리 생성 및 실행
 */
export async function queryProducts(filters: HardFilters): Promise<Product[]> {
  const conditions = [];

  // null이 아닌 필터만 조건 추가
  if (filters.jaw_hardness_fit) {
    conditions.push(eq(productTable.jaw_hardness_fit, filters.jaw_hardness_fit));
  }

  if (filters.age_fit) {
    conditions.push(eq(productTable.age_fit, filters.age_fit));
  }

  if (filters.allergens_exclude && filters.allergens_exclude.length > 0) {
    // 알러지 체크: allergens, protein_sources, ingredient 컬럼 모두 확인
    for (const allergen of filters.allergens_exclude) {
      conditions.push(
        sql`(
          (${productTable.allergens} IS NULL OR NOT (${productTable.allergens} @> ARRAY[${allergen}]::text[]))
          AND (${productTable.protein_sources} IS NULL OR ${productTable.protein_sources} NOT ILIKE ${`%${allergen}%`})
          AND (${productTable.ingredient} IS NULL OR ${productTable.ingredient} NOT ILIKE ${`%${allergen}%`})
          AND (${productTable.ingredient2} IS NULL OR ${productTable.ingredient2} NOT ILIKE ${`%${allergen}%`})
          AND (${productTable.ingredient3} IS NULL OR ${productTable.ingredient3} NOT ILIKE ${`%${allergen}%`})
        )`
      );
    }
  }

  if (filters.shelf_stable !== null && filters.shelf_stable !== undefined) {
    conditions.push(eq(productTable.shelf_stable, filters.shelf_stable));
  }

  if (filters.crumb_level) {
    conditions.push(eq(productTable.crumb_level, filters.crumb_level));
  }

  if (filters.noise_level) {
    conditions.push(eq(productTable.noise_level, filters.noise_level));
  }

  if (filters.category) {
    conditions.push(eq(productTable.category, filters.category));
  }

  if (filters.price_lte !== null && filters.price_lte !== undefined) {
    conditions.push(lte(productTable.price, filters.price_lte));
  }

  // 조건이 없으면 전체 조회 (최대 50개 제한)
  const query = conditions.length > 0
    ? db.select().from(productTable).where(and(...conditions)).limit(50)
    : db.select().from(productTable).limit(50);

  return await query;
}

/**
 * Product ID로 단일 제품 조회
 */
export async function getProductById(productId: string): Promise<Product | null> {
  const results = await db
    .select()
    .from(productTable)
    .where(eq(productTable.product_id, productId))
    .limit(1);

  return results[0] || null;
}

/**
 * 모든 Context 조회
 */
export async function getAllContexts(): Promise<Context[]> {
  return await db.select().from(contextTable);
}

/**
 * Context ID로 단일 Context 조회
 */
export async function getContextById(contextId: string): Promise<Context | null> {
  const results = await db
    .select()
    .from(contextTable)
    .where(eq(contextTable.context_id, contextId))
    .limit(1);

  return results[0] || null;
}
