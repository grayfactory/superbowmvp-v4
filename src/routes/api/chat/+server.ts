// src/routes/api/chat/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openai } from '$lib/server/openai';
import { queryProducts, getProductById, getContextById, getAllContexts } from '$lib/server/db/queries';
import { logRecommendation } from '$lib/server/utils/logger';
import { contextToHardFilters, parseOwnerPreferences } from '$lib/server/utils/context';
import { deepMerge } from '$lib/utils/state';
import { getSystemPrompt, getConversationPrompt } from '$lib/server/prompts';
import {
  UPDATE_STATE_TOOL,
  MATCH_CONTEXT_TOOL,
  QUERY_PRODUCTS_TOOL,
  RANK_PRODUCTS_TOOL
} from '$lib/server/tools';
import type { ChatRequest, ChatResponse, ProductRecommendation } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
  const { message, currentState }: ChatRequest = await request.json();

  console.log('=== Chat API Request ===');
  console.log('Message:', message);
  console.log('CurrentState:', JSON.stringify(currentState, null, 2));

  // Context 목록 조회
  const allContexts = await getAllContexts();
  console.log('All Contexts:', allContexts.length);

  // LLM 호출 with Tool Calling
  console.log('Calling OpenAI API...');
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
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

  console.log('OpenAI Response:', JSON.stringify(response.choices[0], null, 2));

  let newState = currentState;
  let recommendations: ProductRecommendation[] | undefined;
  let candidateProducts: any[] = [];

  // 매 대화마다 state 업데이트를 위한 별도 LLM 호출 (강제 실행)
  console.log('Calling OpenAI for state extraction...');
  const stateExtractionResponse = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `당신은 사용자 메시지에서 정보를 추출하는 전문가입니다.
사용자 메시지를 분석하여 update_state 도구를 호출하세요.

## 현재 상태
missing_info: ${JSON.stringify(currentState.session.missing_info)}
user_request_history: ${JSON.stringify(currentState.session.user_request_history)}

## 추출 규칙
1. user_request_history: 기존 배열에 현재 메시지 추가 (덮어쓰지 말고 추가!)
2. jaw_hardness_fit: "딱딱한", "부드러운", "씹는 힘" 등 → profile.jaw_hardness_fit을 "high" 또는 "low"로 설정
3. crumb_level: "부스러기" 언급 → filters.hard_filters.crumb_level을 "low" 또는 "high"로
4. noise_level: "소음", "조용", "시끄러" 언급 → filters.hard_filters.noise_level을 "quiet" 또는 "noisy"로
5. shelf_stable: "상온", "냉장" 언급 → filters.hard_filters.shelf_stable을 true 또는 false로
6. missing_info에서 수집된 항목만 제거 (나머지는 유지!)

**중요:** user_request_history는 기존 배열을 유지하고 새 메시지를 추가해야 합니다!
**중요:** missing_info는 이번에 수집한 정보만 제거하고, 나머지는 그대로 유지해야 합니다!

항상 update_state를 호출하세요!`
      },
      { role: "user", content: `현재 메시지: "${message}"\n\n이 메시지를 분석하여 state를 업데이트하세요.` }
    ],
    tools: [UPDATE_STATE_TOOL],
    tool_choice: { type: "function", function: { name: "update_state" } } // 강제로 update_state 호출
  });

  console.log('State Extraction Response:', JSON.stringify(stateExtractionResponse.choices[0], null, 2));

  // State 업데이트 적용
  if (stateExtractionResponse.choices[0].message.tool_calls) {
    const stateToolCall = stateExtractionResponse.choices[0].message.tool_calls[0];
    const stateUpdates = JSON.parse(stateToolCall.function.arguments);
    newState = deepMerge(newState, stateUpdates.updates);
    console.log('State updated from extraction:', JSON.stringify(newState, null, 2));
  }

  // Tool Call 처리
  const toolCalls = response.choices[0].message.tool_calls;
  const toolMessages: any[] = [];

  if (toolCalls) {
    console.log('Processing tool calls...');
    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments);
      let toolResult: any = { success: true };

      switch (toolCall.function.name) {
        case 'update_state':
          // State는 이미 위에서 업데이트됨, 스킵
          toolResult.message = 'State already updated via extraction';
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

              toolResult.message = `Context matched: ${matchedContext.occasion}`;
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
            toolResult.message = 'Context matching failed, need more information';
          }
          break;

        case 'query_products':
          // 제품 쿼리
          candidateProducts = await queryProducts(args.hard_filters);
          toolResult.message = `Found ${candidateProducts.length} products`;
          toolResult.products = candidateProducts;
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

          toolResult.message = `Ranked ${recommendations.length} products`;
          break;
      }

      // Tool 실행 결과를 메시지 배열에 추가
      toolMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      });
    }
  }

  // Tool이 호출되었고 content가 null인 경우, LLM에게 다시 요청하여 텍스트 응답 생성
  let finalReply = response.choices[0].message.content || '';

  if (toolCalls && !finalReply) {
    console.log('Calling OpenAI again with conversation prompt...');

    // 대화 전용 프롬프트 사용
    const conversationPrompt = getConversationPrompt(newState, message);
    console.log('Conversation Prompt:', conversationPrompt);

    const secondResponse = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: conversationPrompt },
        { role: "user", content: message }
      ]
    });

    finalReply = secondResponse.choices[0].message.content || '';
    console.log('Second OpenAI Response:', JSON.stringify(secondResponse.choices[0], null, 2));
  }

  const chatResponse: ChatResponse = {
    reply: finalReply,
    newState,
    recommendations
  };

  console.log('=== Chat API Response ===');
  console.log('Reply:', chatResponse.reply);
  console.log('NewState:', JSON.stringify(chatResponse.newState, null, 2));
  console.log('Recommendations:', chatResponse.recommendations?.length || 0);

  return json(chatResponse);
};
