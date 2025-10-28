// src/routes/api/chat/+server.ts
// Multi-stage Processing Architecture

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openai } from '$lib/server/openai';
import { queryProducts, getProductById, getAllContexts, getContextById } from '$lib/server/db/queries';
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
  
  // Occasion 목록만 추출
  const contextOccasions = allContexts.map(c => ({
    context_id: c.context_id,
    occasion: c.occasion
  }));
  
  console.log('🎯 Available Contexts (occasions only):');
  console.log(JSON.stringify(contextOccasions, null, 2));
  console.log('');
  
  const filterPrompt = getFilterGenerationPrompt(conversationHistory, contextOccasions);
  console.log('🔧 Filter Generation Prompt (first 500 chars):');
  console.log(filterPrompt);
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
  
  // 🎯 Context 매칭 처리
  let matchedContext = null;
  if (filters.matched_context_id) {
    console.log('');
    console.log('✅ Context Matched!');
    console.log(`   Context ID: ${filters.matched_context_id}`);
    
    // DB에서 전체 Context 조회
    matchedContext = await getContextById(filters.matched_context_id);
    
    if (matchedContext) {
      console.log(`   Occasion: ${matchedContext.occasion}`);
      console.log(`   Full Context:`, JSON.stringify(matchedContext, null, 2));
    } else {
      console.log(`   ⚠️ Context not found in DB`);
    }
  } else {
    console.log('');
    console.log('⚪ No Context Matched');
  }
  console.log('');

  // LLM 출력을 HardFilters 형식으로 변환
  const hardFilters: any = {
    age_fit: filters.age_fit || null,
    jaw_hardness_fit: filters.jaw_hardness_fit || null,
    allergens_exclude: filters.allergens_to_avoid || [],
    shelf_stable: null,
    crumb_level: null,
    noise_level: null,
    category: null,
    price_lte: filters.max_price || null
  };
  
  // Context 조건을 필터에 반영
  if (matchedContext) {
    console.log('🔧 Applying Context conditions to filters...');
    
    // messy_ok: false → crumb_level: low
    if (matchedContext.messy_ok === false) {
      hardFilters.crumb_level = 'low';
      console.log('   messy_ok: false → crumb_level: low');
    }
    
    // noise_sensitive: true → noise_level: low
    if (matchedContext.noise_sensitive === true) {
      hardFilters.noise_level = 'low';
      console.log('   noise_sensitive: true → noise_level: low');
    }
    
    // storage: only_shelf_stable → shelf_stable: true
    if (matchedContext.storage === 'only_shelf_stable') {
      hardFilters.shelf_stable = true;
      console.log('   storage: only_shelf_stable → shelf_stable: true');
    }
    
    // budget_max → price_lte
    if (matchedContext.budget_max && !hardFilters.price_lte) {
      hardFilters.price_lte = matchedContext.budget_max;
      console.log(`   budget_max: ${matchedContext.budget_max} → price_lte: ${matchedContext.budget_max}`);
    }
    
    console.log('');
  }
  console.log('Converted to HardFilters:', JSON.stringify(hardFilters, null, 2));

  // ==========================================
  // Stage 4: 제품 쿼리 (이전 추천 포함)
  // ==========================================
  console.log('[Stage 4] Querying products...');

  // 4-1: 새 필터로 제품 쿼리
  const newProducts = await queryProducts(hardFilters);
  console.log(`Found ${newProducts.length} new products from query`);

  // 4-2: 이전 추천이 있으면 가져오기 (재추천 시나리오)
  const previousProductIds: string[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0) {
      // 가장 최근 추천의 product_ids 추출
      msg.recommendations.forEach(rec => {
        previousProductIds.push(rec.product.product_id);
      });
      console.log(`📌 Found previous recommendations: ${previousProductIds.join(', ')}`);
      break;
    }
  }

  // 4-3: 이전 추천 제품들을 DB에서 다시 조회
  let previousProducts: Product[] = [];
  if (previousProductIds.length > 0) {
    console.log('🔄 Re-querying previous recommendations...');
    previousProducts = await Promise.all(
      previousProductIds.map(id => getProductById(id))
    ).then(results => results.filter(p => p !== null) as Product[]);
    console.log(`   Retrieved ${previousProducts.length} previous products`);
  }

  // 4-4: 새 제품 + 이전 제품 합치기 (중복 제거)
  const allProductsMap = new Map<string, Product>();
  [...previousProducts, ...newProducts].forEach(p => {
    allProductsMap.set(p.product_id, p);
  });
  const allCandidates = Array.from(allProductsMap.values());

  console.log(`📦 Total candidates: ${allCandidates.length} (${previousProducts.length} previous + ${newProducts.length} new)`);

  // 4-5: 합친 제품들을 새 필터 조건으로 재필터링 (특히 알러지!)
  let products = allCandidates;
  if (hardFilters.allergens_exclude && hardFilters.allergens_exclude.length > 0) {
    console.log('🔍 Re-filtering for allergens...');
    products = allCandidates.filter(p => {
      for (const allergen of hardFilters.allergens_exclude!) {
        // allergens 배열 체크
        if (p.allergens && p.allergens.some((a: string) => a.toLowerCase().includes(allergen.toLowerCase()))) {
          console.log(`   ❌ ${p.product_id} (${p.name}): allergen found in allergens`);
          return false;
        }
        // protein_sources 체크
        if (p.protein_sources && p.protein_sources.toLowerCase().includes(allergen.toLowerCase())) {
          console.log(`   ❌ ${p.product_id} (${p.name}): allergen found in protein_sources`);
          return false;
        }
        // ingredient 체크
        if (p.ingredient && p.ingredient.toLowerCase().includes(allergen.toLowerCase())) {
          console.log(`   ❌ ${p.product_id} (${p.name}): allergen found in ingredient`);
          return false;
        }
        if (p.ingredient2 && p.ingredient2.toLowerCase().includes(allergen.toLowerCase())) {
          console.log(`   ❌ ${p.product_id} (${p.name}): allergen found in ingredient2`);
          return false;
        }
        if (p.ingredient3 && p.ingredient3.toLowerCase().includes(allergen.toLowerCase())) {
          console.log(`   ❌ ${p.product_id} (${p.name}): allergen found in ingredient3`);
          return false;
        }
      }
      console.log(`   ✅ ${p.product_id} (${p.name}): no allergens`);
      return true;
    });
    console.log(`   After allergen filtering: ${products.length} products`);
  }

  console.log('');

  if (products.length > 0) {
    console.log('📦 Products found:');
    products.forEach(p => {
      console.log(`   - ${p.product_id}: ${p.name} (${p.price}원, age: ${p.age_fit}, jaw: ${p.jaw_hardness_fit})`);
    });
    console.log('');
  }
  
  // 🔍 디버깅: 조건을 하나씩 완화해서 테스트
  if (products.length === 0) {
    console.log('⚠️ No products found. Testing with relaxed filters...');

    // Test 1: 핵심 조건만 (age + jaw + allergens)
    const coreFilters: any = {
      age_fit: hardFilters.age_fit,
      jaw_hardness_fit: hardFilters.jaw_hardness_fit,
      allergens_exclude: hardFilters.allergens_exclude
    };
    const test1 = await queryProducts(coreFilters);
    console.log(`  Test 1 (age + jaw + allergens): ${test1.length} products`);

    if (test1.length > 0) {
      console.log('  → Auto-relaxing: Removing Context-based constraints (shelf_stable, noise_level, price)');
      products.length = 0;
      products.push(...test1);
    } else {
      // Test 2: age + allergens만
      const test2 = await queryProducts({
        age_fit: hardFilters.age_fit,
        allergens_exclude: hardFilters.allergens_exclude
      });
      console.log(`  Test 2 (age + allergens only): ${test2.length} products`);

      if (test2.length > 0) {
        console.log('  → Auto-relaxing: Removing jaw_hardness_fit constraint');
        products.length = 0;
        products.push(...test2);
      } else {
        // Test 3: allergens만 (최소 조건)
        const test3 = await queryProducts({
          allergens_exclude: hardFilters.allergens_exclude
        });
        console.log(`  Test 3 (allergens only): ${test3.length} products`);

        if (test3.length > 0) {
          console.log('  → Auto-relaxing: Using allergen filter only');
          products.length = 0;
          products.push(...test3);
        }
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

  // 랭킹을 위한 선호도 정보 준비
  const ownerPref = matchedContext?.owner_pref || null;
  const softPrefs = filters.soft_preferences || [];

  // 재추천 여부 감지
  const isReRecommendation = previousProductIds.length > 0;
  const newConstraints: string[] = [];
  if (isReRecommendation && hardFilters.allergens_exclude && hardFilters.allergens_exclude.length > 0) {
    newConstraints.push(`알러지 제외: ${hardFilters.allergens_exclude.join(', ')}`);
  }

  console.log('🎯 Ranking preferences:');
  console.log(`   Is re-recommendation: ${isReRecommendation}`);
  if (isReRecommendation) {
    console.log(`   New constraints: ${newConstraints.join(', ')}`);
  }
  console.log(`   Owner pref (from Context): ${ownerPref}`);
  console.log(`   Soft preferences: ${JSON.stringify(softPrefs)}`);
  console.log('');

  const rankingResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: getRankingPrompt(conversationHistory, products, ownerPref, softPrefs, isReRecommendation, newConstraints)
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

  // 🚨 Safety check: 제품이 있는데 rankings가 비어있으면 경고
  if (products.length > 0 && (!rankingData.rankings || rankingData.rankings.length === 0)) {
    console.error('⚠️ ERROR: Products found but LLM returned empty rankings!');
    console.error(`   Products count: ${products.length}`);
    console.error(`   LLM response: ${rankingText}`);
    console.error('   This should not happen. Check ranking prompt.');
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
