// src/routes/api/chat/+server.ts
// Multi-stage Processing Architecture

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openai } from '$lib/server/openai';
import { queryProducts, getProductById, getAllContexts } from '$lib/server/db/queries';
import { getSystemPrompt, getFilterGenerationPrompt, getRankingPrompt } from '$lib/server/prompts';
import type { ChatRequest, ChatResponse, ProductRecommendation } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
  const { messages }: ChatRequest = await request.json();

  console.log('=== Chat API Request ===');
  console.log('Messages count:', messages.length);
  console.log('Last message:', messages[messages.length - 1]);

  // Context 목록 조회
  const allContexts = await getAllContexts();
  console.log('All Contexts:', allContexts.length);

  // ==========================================
  // Stage 1: 대화 (정보 수집)
  // ==========================================
  console.log('[Stage 1] Conversation...');
  const conversationResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: getSystemPrompt(allContexts) },
      ...messages
    ],
    temperature: 0.7
  });

  const reply = conversationResponse.choices[0].message.content || '';
  console.log('Conversation reply:', reply);

  // ==========================================
  // Stage 2: 정보 수집 완료 감지
  // ==========================================
  // 완료 신호: [READY] 키워드 또는 재시도 표현
  const isReadyForRecommendation = /\[READY\]|다시.*찾아볼게요|다시.*추천|재검색/.test(reply);
  console.log('Ready for recommendation?', isReadyForRecommendation);

  if (!isReadyForRecommendation) {
    // 아직 정보 수집 중 → 대화만 반환
    const chatResponse: ChatResponse = {
      reply,
      recommendations: undefined
    };
    console.log('=== Returning conversation only ===');
    return json(chatResponse);
  }

  // [READY] 키워드 제거 (사용자에게는 보이지 않게)
  const cleanReply = reply.replace('[READY]', '').trim();

  // ==========================================
  // Stage 3: 필터 생성 (Context 매칭 포함)
  // ==========================================
  console.log('[Stage 3] Generating filters...');
  const conversationHistory = messages
    .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('');
  
  console.log('📝 Conversation History for Filter Generation:');
  console.log(conversationHistory);
  console.log('');
  
  const filterPrompt = getFilterGenerationPrompt(conversationHistory, allContexts);
  console.log('🔧 Filter Generation Prompt (first 500 chars):');
  console.log(filterPrompt.substring(0, 500) + '...');
  console.log('');

  const filterResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { 
        role: 'system', 
        content: filterPrompt
      },
      { 
        role: 'user', 
        content: '위 대화를 분석하여 필터를 생성하세요. JSON만 출력하세요.' 
      }
    ],
    temperature: 0.3 // 낮은 temperature로 일관성 확보
  });

  const filterText = filterResponse.choices[0].message.content || '{}';
  console.log('Filter response:', filterText);

  let filters: any;
  try {
    // JSON 추출 (코드 블록 제거)
    const jsonMatch = filterText.match(/\{[\s\S]*\}/);
    filters = JSON.parse(jsonMatch ? jsonMatch[0] : filterText);
  } catch (e) {
    console.error('Filter parsing error:', e);
    filters = {};
  }

  console.log('Parsed filters:', JSON.stringify(filters, null, 2));
  
  // 🎯 Context 매칭 결과 로그
  if (filters.matched_context_id) {
    console.log('');
    console.log('✅ Context Matched!');
    console.log(`   Context ID: ${filters.matched_context_id}`);
    console.log(`   Context Name: ${filters.matched_context_name}`);
  } else {
    console.log('');
    console.log('⚪ No Context Matched');
  }
  console.log('');

  // LLM 출력을 HardFilters 형식으로 변환
  const hardFilters: any = {
    age_fit: filters.age_fit || null,
    jaw_hardness_fit: filters.jaw_hardness_fit || null,
    allergens_exclude: filters.allergens_to_avoid || [],  // 이름 변환
    shelf_stable: filters.shelf_stable !== null ? filters.shelf_stable : null,
    crumb_level: filters.crumb_level || null,
    noise_level: filters.noise_level || null,
    category: filters.category || null,
    price_lte: filters.max_price || null  // 이름 변환
  };
  console.log('Converted to HardFilters:', JSON.stringify(hardFilters, null, 2));

  // ==========================================
  // Stage 4: 제품 쿼리
  // ==========================================
  console.log('[Stage 4] Querying products...');
  const products = await queryProducts(hardFilters);
  console.log(`Found ${products.length} products`);
  
  // 🔍 디버깅: 조건을 하나씩 완화해서 테스트
  if (products.length === 0) {
    console.log('⚠️ No products found. Testing with relaxed filters...');
    
    // Test 1: age_fit만
    const test1 = await queryProducts({ age_fit: hardFilters.age_fit });
    console.log(`  Test 1 (age_fit only): ${test1.length} products`);
    
    // Test 2: jaw_hardness_fit만
    const test2 = await queryProducts({ jaw_hardness_fit: hardFilters.jaw_hardness_fit });
    console.log(`  Test 2 (jaw only): ${test2.length} products`);
    
    // Test 3: age + jaw
    const test3 = await queryProducts({ 
      age_fit: hardFilters.age_fit,
      jaw_hardness_fit: hardFilters.jaw_hardness_fit 
    });
    console.log(`  Test 3 (age + jaw): ${test3.length} products`);
    
    // ✅ 자동 완화: age + jaw 조합이 없으면 jaw 조건 제거
    if (test3.length === 0 && test1.length > 0) {
      console.log('  → Auto-relaxing: Removing jaw_hardness_fit constraint');
      hardFilters.jaw_hardness_fit = null;
      const relaxedProducts = await queryProducts(hardFilters);
      console.log(`  → Relaxed query found: ${relaxedProducts.length} products`);
      
      if (relaxedProducts.length > 0) {
        // 완화된 필터로 계속 진행
        products.length = 0;
        products.push(...relaxedProducts);
      }
    }
  }

  if (products.length === 0) {
    return json({
      reply: cleanReply + '\n\n죄송해요, 조건에 맞는 제품을 찾지 못했어요. 조건을 조금 완화해볼까요?',
      recommendations: undefined
    });
  }

  // ==========================================
  // Stage 5: 랭킹 (Top 3 선정)
  // ==========================================
  console.log('[Stage 5] Ranking products...');
  const rankingResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: getRankingPrompt(conversationHistory, products)
      },
      {
        role: 'user',
        content: '위 제품들을 랭킹하세요. JSON만 출력하세요.'
      }
    ],
    temperature: 0.5
  });

  const rankingText = rankingResponse.choices[0].message.content || '{}';
  console.log('Ranking response:', rankingText);

  let rankingData: any;
  try {
    const jsonMatch = rankingText.match(/\{[\s\S]*\}/);
    rankingData = JSON.parse(jsonMatch ? jsonMatch[0] : rankingText);
  } catch (e) {
    console.error('Ranking parsing error:', e);
    rankingData = { rankings: [], message: '제품을 찾았어요!' };
  }

  // ==========================================
  // Stage 6: 최종 응답 구성
  // ==========================================
  const recommendations: ProductRecommendation[] = await Promise.all(
    rankingData.rankings.slice(0, 3).map(async (r: any) => {
      const product = products.find(p => p.product_id === r.product_id);
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

  const finalReply = rankingData.message || cleanReply;

  const chatResponse: ChatResponse = {
    reply: finalReply,
    recommendations
  };

  console.log('=== Chat API Response ===');
  console.log('Final reply length:', finalReply.length);
  console.log('Recommendations:', recommendations.length);

  return json(chatResponse);
};
