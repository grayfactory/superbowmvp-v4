// src/lib/stores/conversation.ts
// Simplified Conversation Store (v2 Architecture)

import { writable, get } from 'svelte/store';
import type { Message, ProductRecommendation, ChatResponse } from '$lib/types';

interface ConversationStore {
  messages: Message[];
  isLoading: boolean;
  isThinking: boolean; // AI가 추천을 생성 중인 상태
}

function createConversationStore() {
  const { subscribe, set, update } = writable<ConversationStore>({
    messages: [
      {
        role: 'assistant',
        content: `안녕하세요! 🐕 반가워요.

저는 우리 아이에게 딱 맞는 간식을 찾아드리는 AI 친구예요.

먼저 우리 아이의 **견종**과 **나이**가 어떻게 될까요?`
      }
    ],
    isLoading: false,
    isThinking: false
  });

  return {
    subscribe,

    /**
     * 사용자 메시지 전송 및 서버 응답 처리
     */
    sendMessage: async (content: string) => {
      update(store => {
        // 사용자 메시지 추가
        store.messages.push({
          role: 'user',
          content
        });
        store.isLoading = true;
        store.isThinking = false;
        return store;
      });

      // 2초 후에 isThinking 상태로 전환 (필터링, 쿼리, 랭킹 단계)
      const thinkingTimer = setTimeout(() => {
        update(store => {
          if (store.isLoading) {
            store.isThinking = true;
          }
          return store;
        });
      }, 2000);

      try {
        const currentMessages = get({ subscribe }).messages;

        // 서버 API 호출 (전체 대화 히스토리 전송)
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentMessages
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ChatResponse = await response.json();

        clearTimeout(thinkingTimer);

        update(store => {
          // 서버 응답 메시지 추가 (추천이 있으면 함께 인라인으로)
          store.messages.push({
            role: 'assistant',
            content: data.reply,
            recommendations: data.recommendations  // Inline recommendations
          });

          store.isLoading = false;
          store.isThinking = false;
          return store;
        });
      } catch (error) {
        console.error('Chat error:', error);
        clearTimeout(thinkingTimer);
        update(store => {
          // 에러 메시지 추가
          store.messages.push({
            role: 'assistant',
            content: '죄송해요, 오류가 발생했어요. 다시 시도해주세요.'
          });
          store.isLoading = false;
          store.isThinking = false;
          return store;
        });
      }
    },

    /**
     * 대화 초기화 (새로 시작)
     */
    reset: () => {
      set({
        messages: [],
        isLoading: false,
        isThinking: false
      });
    }
  };
}

export const conversationStore = createConversationStore();
