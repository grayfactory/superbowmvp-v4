// src/lib/server/utils/context.ts
import type { Context, HardFilters } from '$lib/types';

/**
 * Context 규칙을 hard_filters로 변환
 */
export function contextToHardFilters(context: Context): HardFilters {
  const filters: HardFilters = {};

  // storage 규칙 변환
  if (context.storage === 'only_shelf_stable') {
    filters.shelf_stable = true;
  }

  // noise_sensitive 규칙 변환
  if (context.noise_sensitive === true) {
    filters.noise_level = 'low';
  }

  // messy_ok 규칙 변환
  if (context.messy_ok === false) {
    filters.crumb_level = 'low';
  }

  // budget 규칙 변환
  if (context.budget_max) {
    filters.price_lte = context.budget_max;
  }

  return filters;
}

/**
 * Context의 owner_pref를 soft_preferences 배열로 변환
 */
export function parseOwnerPreferences(ownerPref: string | null): string[] {
  if (!ownerPref) return [];

  // "저칼로리, 개별포장" → ['저칼로리', '개별포장']
  return ownerPref.split(',').map(p => p.trim()).filter(p => p.length > 0);
}
