// src/routes/api/analyze-pet/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzePet } from '$lib/server/petAnalyzer';
import type { AnalyzePetRequest, AnalyzePetResponse } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
  const { breed, monthsOld, currentWeight }: AnalyzePetRequest = await request.json();

  // Pet 분석 실행
  const result = analyzePet(breed, monthsOld, currentWeight);

  if (result === null) {
    // 견종이 DB에 없음 (믹스견 등)
    const response: AnalyzePetResponse = {
      success: false,
      result: null,
      error: `견종 '${breed}'에 대한 데이터가 없습니다. 믹스견의 경우 직접 정보를 입력해주세요.`
    };
    return json(response);
  }

  const response: AnalyzePetResponse = {
    success: true,
    result
  };

  return json(response);
};
