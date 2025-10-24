// src/lib/stores/conversation.ts
import { writable, get } from 'svelte/store';
import { createInitialState } from '$lib/types/state';
import type { ConversationState, ProductRecommendation, ChatResponse } from '$lib/types';

interface ConversationStore {
  state: ConversationState;
  messages: ChatMessage[];
  recommendations: ProductRecommendation[];
  isLoading: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function createConversationStore() {
  const { subscribe, set, update } = writable<ConversationStore>({
    state: createInitialState(),
    messages: [],
    recommendations: [],
    isLoading: false
  });

  return {
    subscribe,

    /**
     * 펫 프로필 업데이트
     */
    updateProfile: (profile: Partial<ConversationState['profile']>) => {
      update(store => {
        store.state.profile = { ...store.state.profile, ...profile };

        // hard_filters에도 반영
        if (profile.age_fit) {
          store.state.filters.hard_filters.age_fit = profile.age_fit;
        }
        if (profile.jaw_hardness_fit) {
          store.state.filters.hard_filters.jaw_hardness_fit = profile.jaw_hardness_fit;
        }

        return store;
      });
    },

    /**
     * 사용자 메시지 전송 및 서버 응답 처리
     */
    sendMessage: async (message: string) => {
      update(store => {
        // 사용자 메시지 추가
        store.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date()
        });
        store.isLoading = true;
        return store;
      });

      try {
        // 서버 API 호출
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            currentState: get(conversationStore).state
          })
        });

        const data: ChatResponse = await response.json();

        update(store => {
          // 서버 응답 메시지 추가
          store.messages.push({
            role: 'assistant',
            content: data.reply,
            timestamp: new Date()
          });

          // State 업데이트 (서버가 계산한 newState로 덮어쓰기)
          store.state = data.newState;

          // 추천 결과가 있으면 저장
          if (data.recommendations) {
            store.recommendations = data.recommendations;
          }

          store.isLoading = false;
          return store;
        });
      } catch (error) {
        console.error('Chat error:', error);
        update(store => {
          store.isLoading = false;
          return store;
        });
      }
    },

    /**
     * 대화 초기화 (새로 시작)
     */
    reset: () => {
      set({
        state: createInitialState(),
        messages: [],
        recommendations: [],
        isLoading: false
      });
    }
  };
}

export const conversationStore = createConversationStore();
