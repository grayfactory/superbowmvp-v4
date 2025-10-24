// Export all types from state
export * from './state';

// API Request/Response Types
export interface ChatRequest {
  message: string;
  currentState: import('./state').ConversationState;
}

export interface ChatResponse {
  reply: string;
  newState: import('./state').ConversationState;
  recommendations?: ProductRecommendation[];
}

export interface ProductRecommendation {
  product: Product;
  score: number; // 1-10
  reasoning: string;
}

// Pet Analyzer Types
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

// Log Recommendation Types
export interface LogRecommendationRequest {
  state: import('./state').ConversationState;
  recommendations: ProductRecommendation[];
}

export interface LogRecommendationResponse {
  success: boolean;
  log_id?: string;
  error?: string;
}

// Database Types (from schema)
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

// Breed Data Types
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
