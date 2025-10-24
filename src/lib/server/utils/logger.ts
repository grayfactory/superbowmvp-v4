// src/lib/server/utils/logger.ts
import { db } from '../db/client';
import { recommendationLogsTable } from '../db/schema';
import type { ConversationState, ProductRecommendation } from '$lib/types';

/**
 * 추천 로그 저장 (비동기, Fire-and-Forget)
 *
 * 사용 시점: Chat API에서 4단계(rank_products) 완료 직후
 *
 * 주의사항:
 * - await 하지 않음 (사용자 응답 속도 보장)
 * - try-catch로 보호 (로깅 실패가 추천 실패로 이어지지 않도록)
 */
export function logRecommendation(
  state: ConversationState,
  recommendations: ProductRecommendation[]
): void {
  // Fire-and-Forget 비동기 실행
  (async () => {
    try {
      await db.insert(recommendationLogsTable).values({
        // State 스냅샷
        profile_snapshot: state.profile,
        context_snapshot: state.context,
        filters_snapshot: state.filters,

        // 추천 결과
        recommended_products: recommendations.map(r => ({
          product_id: r.product.product_id,
          score: r.score,
          reasoning: r.reasoning
        })),

        // 인덱싱용 필드 (쿼리 최적화)
        context_id: state.context.context_id,
        age_fit: state.profile.age_fit,
        jaw_hardness_fit: state.profile.jaw_hardness_fit,

        // 추천 메트릭
        top_product_id: recommendations[0].product.product_id,
        top_product_score: recommendations[0].score
      });

      console.log('[Log] Recommendation logged successfully');
    } catch (error) {
      // 로깅 실패는 사용자에게 영향 없음 (조용히 기록만)
      console.error('[Log] Failed to log recommendation:', error);
    }
  })();
}
