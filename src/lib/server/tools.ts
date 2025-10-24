// src/lib/server/tools.ts
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * update_state Tool
 * LLM이 대화 중 state를 업데이트할 때 호출
 */
export const UPDATE_STATE_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "update_state",
    description: "대화 상태(state)를 업데이트합니다. 사용자 발화를 분석하여 profile, context, filters 등을 채웁니다.",
    parameters: {
      type: "object",
      properties: {
        updates: {
          type: "object",
          description: "업데이트할 state 필드들. 기존 state와 deep merge됩니다.",
          properties: {
            profile: {
              type: "object",
              properties: {
                age_fit: { type: "string", enum: ["puppy", "adult", "senior"] },
                jaw_hardness_fit: { type: "string", enum: ["low", "medium", "high"] },
                weight_status: { type: "string", enum: ["underweight", "normal", "overweight"] },
                allergens_exclude: { type: "array", items: { type: "string" } }
              }
            },
            context: {
              type: "object",
              properties: {
                context_id: { type: "string" },
                occasion: { type: "string" },
                matched: { type: "boolean" }
              }
            },
            filters: {
              type: "object",
              properties: {
                hard_filters: {
                  type: "object",
                  properties: {
                    jaw_hardness_fit: { type: "string", enum: ["low", "medium", "high"] },
                    age_fit: { type: "string", enum: ["puppy", "adult", "senior"] },
                    allergens_exclude: { type: "array", items: { type: "string" } },
                    shelf_stable: { type: "boolean" },
                    crumb_level: { type: "string", enum: ["low", "medium", "high"] },
                    noise_level: { type: "string", enum: ["low", "high"] },
                    category: { type: "string" },
                    price_lte: { type: "number" }
                  }
                },
                soft_preferences: { type: "array", items: { type: "string" } }
              }
            },
            session: {
              type: "object",
              properties: {
                missing_info: { type: "array", items: { type: "string" } },
                user_request_history: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      },
      required: ["updates"]
    }
  }
};

/**
 * match_context Tool
 * Context 테이블에서 매칭을 시도할 때
 */
export const MATCH_CONTEXT_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "match_context",
    description: "사용자 발화를 Context 목록과 비교하여 가장 적합한 상황을 선택합니다.",
    parameters: {
      type: "object",
      properties: {
        selected_context_id: {
          type: "string",
          description: "선택된 Context ID (예: 'C006'). 매칭 실패 시 null",
          nullable: true
        },
        confidence: {
          type: "number",
          description: "매칭 확신도 (0.0 ~ 1.0). 0.7 미만이면 매칭 실패로 간주",
          minimum: 0,
          maximum: 1
        }
      },
      required: ["selected_context_id", "confidence"]
    }
  }
};

/**
 * query_products Tool
 * 3단계: DB 쿼리 실행
 */
export const QUERY_PRODUCTS_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "query_products",
    description: "hard_filters 조건으로 제품 DB를 쿼리합니다. null이 아닌 필터만 WHERE 조건에 사용됩니다.",
    parameters: {
      type: "object",
      properties: {
        hard_filters: {
          type: "object",
          description: "DB 쿼리 조건. null 값은 무시됨",
          properties: {
            jaw_hardness_fit: { type: "string", enum: ["low", "medium", "high"], nullable: true },
            age_fit: { type: "string", enum: ["puppy", "adult", "senior"], nullable: true },
            allergens_exclude: { type: "array", items: { type: "string" } },
            shelf_stable: { type: "boolean", nullable: true },
            crumb_level: { type: "string", enum: ["low", "medium", "high"], nullable: true },
            noise_level: { type: "string", enum: ["low", "high"], nullable: true },
            category: { type: "string", nullable: true },
            price_lte: { type: "number", nullable: true }
          }
        }
      },
      required: ["hard_filters"]
    }
  }
};

/**
 * rank_products Tool
 * 4단계: LLM 랭킹
 */
export const RANK_PRODUCTS_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "rank_products",
    description: "후보 제품들을 soft_preferences와 pet profile 기반으로 랭킹합니다.",
    parameters: {
      type: "object",
      properties: {
        rankings: {
          type: "array",
          description: "랭킹 결과 (점수 높은 순으로 정렬)",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              score: {
                type: "number",
                minimum: 1,
                maximum: 10,
                description: "추천 점수 (1-10)"
              },
              reasoning: {
                type: "string",
                description: "추천 이유 (1-2문장)"
              }
            },
            required: ["product_id", "score", "reasoning"]
          }
        }
      },
      required: ["rankings"]
    }
  }
};
