// src/lib/server/petAnalyzer.ts
import type { PetAnalysisResult } from '$lib/types';
import breedDataJson from '$lib/data/pet_breed_data.json';
import breedNameMapJson from '$lib/data/breed-name-map.json';

// Type definitions for the new JSON structure
interface MonthData {
  month: number;
  lifeStage: string;
  size: string;
  weightAvgKg: number;
  underweightKg: number;
  overweightKg: number;
  biteForceN: number;
  skullType: string;
}

interface BreedDatabase {
  [breedName: string]: {
    [month: string]: MonthData;
  };
}

const breedData: BreedDatabase = breedDataJson as BreedDatabase;
const breedNameMap: { [koreanName: string]: string } = breedNameMapJson;

/**
 * Normalize breed name from Korean to English
 * @param input - User input breed name (Korean or English)
 * @returns Normalized English breed name or null if not found
 */
function normalizeBreedName(input: string): string | null {
  // Trim and normalize whitespace
  const normalized = input.trim();

  // Check if it's already in English (exists in database)
  if (breedData[normalized]) {
    return normalized;
  }

  // Try Korean to English mapping (case-insensitive)
  const mapped = breedNameMap[normalized] || breedNameMap[normalized.toLowerCase()];
  if (mapped && breedData[mapped]) {
    return mapped;
  }

  // Not found
  return null;
}

/**
 * Map BiteForce value to jaw_hardness_fit
 * Updated thresholds: <200N = low, <450N = medium, ≥450N = high
 *
 * @param biteForceN - Bite force in Newtons
 * @returns 'low' | 'medium' | 'high'
 */
function mapBiteForceToJawHardness(biteForceN: number): 'low' | 'medium' | 'high' {
  if (biteForceN < 200) return 'low';
  if (biteForceN < 450) return 'medium';
  return 'high';
}

/**
 * Calculate weight status based on current weight and reference ranges
 *
 * @param inputWeight - Current weight in kg
 * @param underweightKg - Underweight threshold
 * @param overweightKg - Overweight threshold
 * @returns 'underweight' | 'normal' | 'overweight'
 */
function getWeightStatus(
  inputWeight: number,
  underweightKg: number,
  overweightKg: number
): 'underweight' | 'normal' | 'overweight' {
  if (inputWeight < underweightKg) return 'underweight';
  if (inputWeight > overweightKg) return 'overweight';
  return 'normal';
}

/**
 * Map lifeStage from CSV to age_fit type
 * @param lifeStage - CSV lifeStage value (e.g., "Kitten/Puppy", "Adult", "Senior")
 * @returns 'puppy' | 'adult' | 'senior'
 */
function mapLifeStageToAgeFit(lifeStage: string): 'puppy' | 'adult' | 'senior' {
  const lower = lifeStage.toLowerCase();
  if (lower.includes('puppy') || lower.includes('kitten')) return 'puppy';
  if (lower.includes('senior')) return 'senior';
  return 'adult';
}

/**
 * Analyze pet profile based on breed and age
 * Main analyzer function (replaces previous range-based logic)
 *
 * @param breed - Breed name (Korean or English)
 * @param month - Age in months (1-120)
 * @param inputWeight - Current weight in kg (optional)
 * @returns PetAnalysisResult or null if breed not found
 */
export function analyzePet(
  breed: string,
  month: number,
  inputWeight?: number
): PetAnalysisResult | null {
  // 1. Normalize breed name (Korean → English)
  const normalizedBreed = normalizeBreedName(breed);

  if (!normalizedBreed) {
    // Breed not found in database (e.g., mixed breed, typo)
    return null;
  }

  // 2. Lookup exact month data
  const breedMonthData = breedData[normalizedBreed];

  if (!breedMonthData) {
    // Should not happen if normalization worked, but safety check
    return null;
  }

  const monthStr = month.toString();
  const stats = breedMonthData[monthStr];

  // 3. Handle missing month data (e.g., month > 120 or invalid)
  if (!stats) {
    // Fallback: return approximate age_fit based on month only
    return {
      age_fit: month <= 12 ? 'puppy' : month >= 84 ? 'senior' : 'adult',
      jaw_hardness_fit: null,
      weight_status: null
    };
  }

  // 4. Calculate results
  const age_fit = mapLifeStageToAgeFit(stats.lifeStage);
  const jaw_hardness_fit = mapBiteForceToJawHardness(stats.biteForceN);
  const weight_status = inputWeight
    ? getWeightStatus(inputWeight, stats.underweightKg, stats.overweightKg)
    : null;

  return {
    age_fit,
    jaw_hardness_fit,
    weight_status
  };
}
