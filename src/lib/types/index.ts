// ============================================
// Simplified API Types (v2 Architecture)
// ============================================

// Standard Chat Message
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  recommendations?: ProductRecommendation[];  // Optional: inline recommendations with this message
}

// API Request: Simple message array
export interface ChatRequest {
  messages: Message[];
}

// API Response: Reply + optional recommendations
export interface ChatResponse {
  reply: string;
  recommendations?: ProductRecommendation[];
}

// Product Recommendation
export interface ProductRecommendation {
  product: Product;
  score: number; // 1-10
  reasoning: string;
}

// ============================================
// Database Types
// ============================================

export interface Product {
  product_id: string;
  name: string;
  category: string;
  protein_sources: string | null;
  ingredient: string | null;
  ingredient2: string | null;
  ingredient3: string | null;
  allergens: string[] | null;
  texture: string | null;
  piece_size_cm: number | null;
  moisture_type: string | null;
  functional_tags: string[] | null;
  packaging: string | null;
  feature: string | null;
  shelf_stable: boolean;
  strong_aroma: boolean | null;
  crumb_level: string | null;
  noise_level: string | null;
  price: number;
  age_fit: string | null;
  jaw_hardness_fit: string | null;
  protein_percent: string | null;
  moisture_percent: string | null;
  fiber_percent: string | null;
  ash_percent: string | null;
  fat_percent: string | null;
}

export interface Context {
  context_id: string;
  occasion: string;
  location_type: string | null;
  duration_min: number | null;
  messy_ok: boolean | null;
  noise_sensitive: boolean | null;
  storage: string | null;
  budget_max: number | null;
  season: string | null;
  owner_pref: string | null;
}

// ============================================
// Pet Analyzer Types (Keep existing)
// ============================================

export interface AnalyzePetRequest {
  breed: string;
  monthsOld: number;
  currentWeight?: number;
}

export interface AnalyzePetResponse {
  success: boolean;
  result: PetAnalysisResult | null;
  error?: string;
}

export interface PetAnalysisResult {
  age_fit: 'puppy' | 'adult' | 'senior';
  jaw_hardness_fit: 'low' | 'medium' | 'high';
  weight_status?: 'underweight' | 'normal' | 'overweight';
}

// ============================================
// Logging Types (Keep existing)
// ============================================

export interface LogRecommendationRequest {
  conversation_summary: string;
  recommendations: ProductRecommendation[];
}

export interface LogRecommendationResponse {
  success: boolean;
  log_id?: string;
  error?: string;
}

// ============================================
// Breed Data Types (Keep existing)
// ============================================

export interface BreedDataRange {
  monthRange: [number, number];
  lifeStage: 'puppy' | 'adult' | 'senior';
  biteForceRange: [number, number];
  weightRange: [number, number];
}

export interface BreedData {
  [breedName: string]: {
    ranges: BreedDataRange[];
  };
}
