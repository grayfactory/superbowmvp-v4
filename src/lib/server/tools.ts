// src/lib/server/tools.ts
// Simplified Tool Definitions (v2 Architecture)

export const QUERY_PRODUCTS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'query_products',
    description: `제품 데이터베이스에서 필터 조건에 맞는 간식을 조회합니다.
    
대화를 통해 수집한 정보를 바탕으로 필터를 구성하세요:
- age_fit: 반려견 나이대 (puppy/adult/senior)
- jaw_hardness_fit: 씹는 힘 (low/high)
- shelf_stable: 상온보관 가능 여부 (true/false)
- crumb_level: 부스러기 정도 (low/high)
- noise_level: 소음 정도 (low/high)

매칭된 Context의 조건도 필터에 포함시키세요.`,
    parameters: {
      type: 'object',
      properties: {
        age_fit: {
          type: 'string',
          enum: ['puppy', 'adult', 'senior'],
          description: '반려견 생애주기 (강아지/성견/노견)'
        },
        jaw_hardness_fit: {
          type: 'string',
          enum: ['low', 'high'],
          description: '씹는 힘/치아 상태 (low=약함/부드러운, high=강함/딱딱한)'
        },
        shelf_stable: {
          type: 'boolean',
          description: '상온보관 가능 여부 (true=상온, false=냉장)'
        },
        crumb_level: {
          type: 'string',
          enum: ['low', 'high'],
          description: '부스러기 정도 (low=적음, high=많음)'
        },
        noise_level: {
          type: 'string',
          enum: ['low', 'high'],
          description: '소음 정도 (low=조용함, high=시끄러움)'
        },
        strong_aroma: {
          type: 'boolean',
          description: '강한 향 여부'
        },
        allergens_to_avoid: {
          type: 'array',
          items: { type: 'string' },
          description: '피해야 할 알러지 성분 목록'
        },
        max_price: {
          type: 'number',
          description: '최대 가격'
        },
        soft_preferences: {
          type: 'array',
          items: { type: 'string' },
          description: '사용자가 언급한 추가 선호사항 (저칼로리, 귀여운 모양 등)'
        }
      },
      required: [] // 모든 필터 optional
    }
  }
};
