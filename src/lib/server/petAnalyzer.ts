// src/lib/server/petAnalyzer.ts
import type { PetAnalysisResult, BreedData } from '$lib/types';
import breedDataJson from '$lib/data/pet_breed_data.json';

const breedData: BreedData = breedDataJson as BreedData;

/**
 * Pet Analyzer
 * 견종과 개월 수를 입력받아 age_fit, jaw_hardness_fit, weight_status를 계산
 *
 * @param breed - 견종명 (예: '골든리트리버')
 * @param monthsOld - 개월 수 (1-120+)
 * @param currentWeight - 현재 몸무게 (optional, kg)
 * @returns PetAnalysisResult | null (견종이 DB에 없으면 null)
 */
export function analyzePet(
  breed: string,
  monthsOld: number,
  currentWeight?: number
): PetAnalysisResult | null {
  const breedInfo = breedData[breed];

  if (!breedInfo) {
    // 믹스견 등 미등록 견종
    return null;
  }

  // 해당 개월 수가 속하는 range 찾기
  const matchingRange = breedInfo.ranges.find(range => {
    const [min, max] = range.monthRange;
    return monthsOld >= min && monthsOld <= max;
  });

  if (!matchingRange) {
    // 범위를 벗어난 경우 (예: 200개월) - 마지막 range 사용
    const lastRange = breedInfo.ranges[breedInfo.ranges.length - 1];
    return buildResult(lastRange, currentWeight);
  }

  return buildResult(matchingRange, currentWeight);
}

/**
 * Range 데이터를 기반으로 PetAnalysisResult 생성
 */
function buildResult(
  range: BreedData[string]['ranges'][0],
  currentWeight?: number
): PetAnalysisResult {
  const result: PetAnalysisResult = {
    age_fit: range.lifeStage,
    jaw_hardness_fit: mapBiteForceToHardness(range.biteForceRange),
    weight_status: undefined
  };

  // 몸무게가 제공된 경우 weight_status 계산
  if (currentWeight !== undefined) {
    result.weight_status = calculateWeightStatus(currentWeight, range.weightRange);
  }

  return result;
}

/**
 * 치악력(BiteForce)을 jaw_hardness_fit으로 매핑
 *
 * 기준:
 * - 0-80N: low
 * - 81-150N: medium
 * - 151N+: high
 */
function mapBiteForceToHardness(
  biteForceRange: [number, number]
): 'low' | 'medium' | 'high' {
  const avgBiteForce = (biteForceRange[0] + biteForceRange[1]) / 2;

  if (avgBiteForce <= 80) {
    return 'low';
  } else if (avgBiteForce <= 150) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * 현재 몸무게와 정상 범위를 비교하여 weight_status 계산
 *
 * 기준:
 * - 정상 범위 하한 미만: underweight
 * - 정상 범위 내: normal
 * - 정상 범위 상한 초과: overweight
 */
function calculateWeightStatus(
  currentWeight: number,
  weightRange: [number, number]
): 'underweight' | 'normal' | 'overweight' {
  const [min, max] = weightRange;

  if (currentWeight < min) {
    return 'underweight';
  } else if (currentWeight > max) {
    return 'overweight';
  } else {
    return 'normal';
  }
}
