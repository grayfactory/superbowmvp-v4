// src/routes/api/chat/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openai } from '$lib/server/openai';
import { queryProducts, getProductById, getContextById, getAllContexts } from '$lib/server/db/queries';
import { logRecommendation } from '$lib/server/utils/logger';
import { contextToHardFilters, parseOwnerPreferences } from '$lib/server/utils/context';
import { deepMerge } from '$lib/utils/state';
import { getSystemPrompt } from '$lib/server/prompts';
import {
  UPDATE_STATE_TOOL,
  MATCH_CONTEXT_TOOL,
  QUERY_PRODUCTS_TOOL,
  RANK_PRODUCTS_TOOL
} from '$lib/server/tools';
import type { ChatRequest, ChatResponse, ProductRecommendation } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
  const { message, currentState }: ChatRequest = await request.json();

  // Context 목록 조회
  const allContexts = await getAllContexts();

  // LLM 호출 with Tool Calling
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: getSystemPrompt(allContexts) },
      { role: "user", content: message }
    ],
    tools: [
      UPDATE_STATE_TOOL,
      MATCH_CONTEXT_TOOL,
      QUERY_PRODUCTS_TOOL,
      RANK_PRODUCTS_TOOL
    ]
  });

  let newState = currentState;
  let recommendations: ProductRecommendation[] | undefined;
  let candidateProducts: any[] = [];

  // Tool Call 처리
  const toolCalls = response.choices[0].message.tool_calls;
  if (toolCalls) {
    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments);

      switch (toolCall.function.name) {
        case 'update_state':
          newState = deepMerge(newState, args.updates);
          break;

        case 'match_context':
          if (args.confidence >= 0.7 && args.selected_context_id) {
            // Context 매칭 성공
            const matchedContext = await getContextById(args.selected_context_id);
            if (matchedContext) {
              newState.context.context_id = matchedContext.context_id;
              newState.context.occasion = matchedContext.occasion;
              newState.context.matched = true;

              // Context 규칙을 hard_filters로 변환
              const contextFilters = contextToHardFilters(matchedContext);
              newState.filters.hard_filters = {
                ...newState.filters.hard_filters,
                ...contextFilters
              };

              // owner_pref를 soft_preferences로 변환
              const ownerPrefs = parseOwnerPreferences(matchedContext.owner_pref);
              newState.filters.soft_preferences = [
                ...newState.filters.soft_preferences,
                ...ownerPrefs
              ];
            }
          } else {
            // Context 매칭 실패
            newState.context.matched = false;
            // missing_info에 필수 질문 추가
            newState.session.missing_info = [
              'jaw_hardness_fit',
              'crumb_level',
              'noise_level',
              'shelf_stable',
              'ask_soft_prefs'
            ];
          }
          break;

        case 'query_products':
          // 제품 쿼리
          candidateProducts = await queryProducts(args.hard_filters);
          break;

        case 'rank_products':
          // 4단계: 최종 추천 완료
          const rankings = args.rankings;
          recommendations = await Promise.all(
            rankings.map(async (r: any) => {
              const product = await getProductById(r.product_id);
              if (!product) {
                throw new Error(`Product not found: ${r.product_id}`);
              }
              return {
                product,
                score: r.score,
                reasoning: r.reasoning
              };
            })
          );

          // 비동기 로그 저장 (Fire-and-Forget)
          if (recommendations.length > 0) {
            logRecommendation(newState, recommendations);
          }
          break;
      }
    }
  }

  const chatResponse: ChatResponse = {
    reply: response.choices[0].message.content || '',
    newState,
    recommendations
  };

  return json(chatResponse);
};
