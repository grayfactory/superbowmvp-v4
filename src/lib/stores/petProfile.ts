// src/lib/stores/petProfile.ts
import { writable, get } from 'svelte/store';
import type { PetAnalysisResult, AnalyzePetResponse } from '$lib/types';

interface PetProfileFormData {
  breed: string;
  monthsOld: string;
  currentWeight: string;
}

function createPetProfileStore() {
  const { subscribe, set, update } = writable<PetProfileFormData>({
    breed: '',
    monthsOld: '',
    currentWeight: ''
  });

  return {
    subscribe,

    /**
     * 폼 제출 및 분석
     */
    submitForm: async (): Promise<PetAnalysisResult | null> => {
      const formData = get(petProfileStore);

      const response = await fetch('/api/analyze-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breed: formData.breed,
          monthsOld: parseInt(formData.monthsOld),
          currentWeight: formData.currentWeight ? parseFloat(formData.currentWeight) : undefined
        })
      });

      const data: AnalyzePetResponse = await response.json();

      if (data.success) {
        return data.result;
      } else {
        console.error('Pet analysis failed:', data.error);
        return null;
      }
    },

    reset: () => {
      set({ breed: '', monthsOld: '', currentWeight: '' });
    }
  };
}

export const petProfileStore = createPetProfileStore();
