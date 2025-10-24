// src/lib/types/state.ts

/**
 * 펫 프로필 정보
 * petAnalyzer 또는 사용자 입력으로 채워짐
 */
export interface PetProfile {
  pet_id: string | null;
  age_fit: 'puppy' | 'adult' | 'senior' | null;
  jaw_hardness_fit: 'low' | 'medium' | 'high' | null;
  weight_status: 'underweight' | 'normal' | 'overweight' | null;
  allergens_exclude: string[]; // ['duck', 'egg', 'dairy']
}

/**
 * Context 매칭 정보
 * LLM이 사용자 발화를 Context 테이블과 매칭한 결과
 */
export interface ContextInfo {
  context_id: string | null; // 'C006'
  occasion: string | null; // '병원대기'
  matched: boolean; // true/false
}

/**
 * 제품 필터링 조건
 */
export interface ProductFilters {
  // 3단계: DB 쿼리 WHERE 조건 (null이 아닌 것만 AND 조건)
  hard_filters: HardFilters;
  // 4단계: LLM 랭킹 가중치 (사용자 선호도)
  soft_preferences: string[]; // ['저칼로리', '개별포장']
}

/**
 * 하드 필터 (DB 쿼리 조건)
 */
export interface HardFilters {
  jaw_hardness_fit?: 'low' | 'medium' | 'high' | null;
  age_fit?: 'puppy' | 'adult' | 'senior' | null;
  allergens_exclude?: string[];
  shelf_stable?: boolean | null;
  crumb_level?: 'low' | 'medium' | 'high' | null;
  noise_level?: 'low' | 'high' | null;
  category?: string | null; // '간식', '케이크', '밀키트'
  price_lte?: number | null;
}

/**
 * 세션 관리 정보
 */
export interface SessionInfo {
  // LLM이 다음에 물어볼 질문의 큐
  missing_info: string[]; // ['context', 'jaw_hardness_fit', 'ask_soft_prefs']
  // 사용자 원본 발화 히스토리
  user_request_history: string[];
}

/**
 * 전체 대화 상태 (메인 State 객체)
 * 클라이언트(Svelte Store)가 관리, 매 API 요청마다 전송
 */
export interface ConversationState {
  profile: PetProfile;
  context: ContextInfo;
  filters: ProductFilters;
  session: SessionInfo;
}

/**
 * State 초기화 함수
 */
export function createInitialState(): ConversationState {
  return {
    profile: {
      pet_id: null,
      age_fit: null,
      jaw_hardness_fit: null,
      weight_status: null,
      allergens_exclude: []
    },
    context: {
      context_id: null,
      occasion: null,
      matched: false
    },
    filters: {
      hard_filters: {},
      soft_preferences: []
    },
    session: {
      missing_info: ['context'], // 첫 질문: Context 매칭
      user_request_history: []
    }
  };
}
