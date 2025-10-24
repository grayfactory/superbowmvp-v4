// src/lib/utils/state.ts

/**
 * 두 객체를 재귀적으로 병합 (Deep Merge)
 * LLM이 반환한 updates를 기존 state에 적용할 때 사용
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // 중첩 객체는 재귀 병합
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      // 원시값, 배열, null은 덮어쓰기
      result[key] = sourceValue as any;
    }
  }

  return result;
}
