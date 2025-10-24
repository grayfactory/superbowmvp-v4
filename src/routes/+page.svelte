<script lang="ts">
  import { conversationStore } from '$lib/stores/conversation';
  import { petProfileStore } from '$lib/stores/petProfile';
  import type { PetAnalysisResult } from '$lib/types';
  import { onMount } from 'svelte';

  let showProfileForm = true;
  let userInput = '';
  let analysisError = '';
  let messagesContainer: HTMLElement;

  // Pet Profile Form 제출
  async function handleProfileSubmit(e: Event) {
    e.preventDefault();
    analysisError = '';

    const result: PetAnalysisResult | null = await petProfileStore.submitForm();

    if (result) {
      // 프로필 분석 성공 - state에 반영
      $conversationStore.state.profile.age_fit = result.age_fit;
      $conversationStore.state.profile.jaw_hardness_fit = result.jaw_hardness_fit;
      $conversationStore.state.profile.weight_status = result.weight_status || null;

      // hard_filters에도 반영
      $conversationStore.state.filters.hard_filters.age_fit = result.age_fit;
      $conversationStore.state.filters.hard_filters.jaw_hardness_fit = result.jaw_hardness_fit;

      // 폼 숨기고 대화 시작
      showProfileForm = false;
    } else {
      analysisError = '견종 정보를 찾을 수 없습니다. 믹스견의 경우 건너뛰기를 선택해주세요.';
    }
  }

  // 건너뛰기 (바로 대화 시작)
  function skipProfile() {
    showProfileForm = false;
  }

  // 메시지 전송
  async function sendMessage() {
    if (!userInput.trim() || $conversationStore.isLoading) return;

    const message = userInput;
    userInput = '';

    await conversationStore.sendMessage(message);
  }

  // Enter 키 처리
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // 메시지 자동 스크롤
  $: if ($conversationStore.messages.length && messagesContainer) {
    setTimeout(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  }
</script>

<div class="container">
  <header>
    <h1>🐕 SuperBow</h1>
    <p>AI 기반 반려견 간식 추천 서비스</p>
  </header>

  {#if showProfileForm}
    <!-- Pet Profile Form -->
    <div class="chat-container">
      <div class="profile-form-container">
        <h2>반려견 프로필</h2>
        <p class="subtitle">우리 아이에 대해 알려주세요 (모든 항목 선택사항)</p>

        <form on:submit={handleProfileSubmit}>
          <div class="form-group">
            <label for="breed">견종 <span class="optional">(선택)</span></label>
            <input
              id="breed"
              type="text"
              bind:value={$petProfileStore.breed}
              placeholder="예: 골든리트리버, 비글, 믹스"
            />
            <p class="form-help">모르시면 비워두셔도 괜찮아요</p>
          </div>

          <div class="form-group">
            <label for="monthsOld">개월 수 <span class="optional">(선택)</span></label>
            <input
              id="monthsOld"
              type="number"
              bind:value={$petProfileStore.monthsOld}
              placeholder="예: 24"
            />
          </div>

          <div class="form-group">
            <label for="currentWeight">몸무게 <span class="optional">(선택, kg)</span></label>
            <input
              id="currentWeight"
              type="number"
              step="0.1"
              bind:value={$petProfileStore.currentWeight}
              placeholder="예: 12.5"
            />
            <p class="form-help">모르시면 견종과 나이로 추정할게요</p>
          </div>

          {#if analysisError}
            <p class="error">{analysisError}</p>
          {/if}

          <button type="submit" class="submit-btn">간식 추천 받기</button>
          <button type="button" class="skip-btn" on:click={skipProfile}>
            건너뛰고 대화로 시작하기
          </button>
        </form>
      </div>
    </div>
  {:else}
    <!-- Chat Interface -->
    <div class="chat-container" bind:this={messagesContainer}>
      <div class="messages">
        {#each $conversationStore.messages as msg}
          <div class="message {msg.role}">
            {msg.content}
          </div>
        {/each}

        {#if $conversationStore.isLoading}
          <div class="message assistant typing-indicator">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        {/if}

        <!-- Recommendations Display -->
        {#if $conversationStore.recommendations.length > 0}
          {#each $conversationStore.recommendations as rec, index}
            <div class="message assistant">
              <div class="recommendation">
                <span class="rank">#{index + 1}</span>
                <h3>{rec.product.name}</h3>
                <div class="price">{rec.product.price.toLocaleString()}원</div>
                <div style="margin-top: 8px;">
                  <strong>카테고리:</strong> {rec.product.category || 'N/A'}<br>
                  <strong>식감:</strong> {rec.product.texture || 'N/A'}<br>
                  <strong>연령:</strong> {rec.product.age_fit || 'N/A'}
                </div>
                <div class="reasoning">{rec.reasoning}</div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Input Container -->
    <div class="input-container">
      <input
        type="text"
        bind:value={userInput}
        on:keydown={handleKeydown}
        placeholder="메시지를 입력하세요..."
        disabled={$conversationStore.isLoading}
      />
      <button
        on:click={sendMessage}
        disabled={$conversationStore.isLoading || !userInput.trim()}
      >
        전송
      </button>
    </div>
  {/if}
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .container {
    width: 100%;
    max-width: 800px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 90vh;
  }

  header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;
  }

  header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }

  header p {
    font-size: 1rem;
    opacity: 0.9;
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f5f5f5;
  }

  .messages {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .message {
    max-width: 70%;
    padding: 12px 18px;
    border-radius: 18px;
    line-height: 1.5;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message.user {
    background: #667eea;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }

  .message.assistant {
    background: white;
    color: #333;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  /* Typing Indicator Animation */
  .typing-indicator {
    display: flex;
    align-items: center;
    padding: 12px 18px;
  }

  .typing-dots {
    display: flex;
    gap: 6px;
  }

  .typing-dots span {
    width: 8px;
    height: 8px;
    background: #667eea;
    border-radius: 50%;
    animation: typingBounce 1.4s infinite ease-in-out;
  }

  .typing-dots span:nth-child(1) {
    animation-delay: 0s;
  }

  .typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typingBounce {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.7;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }

  .recommendation {
    background: white;
    border-radius: 12px;
    padding: 15px;
    margin: 10px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .recommendation h3 {
    color: #667eea;
    margin-bottom: 8px;
  }

  .recommendation .rank {
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    margin-right: 8px;
  }

  .recommendation .price {
    color: #e74c3c;
    font-weight: bold;
    margin-top: 8px;
  }

  .recommendation .reasoning {
    color: #555;
    font-size: 0.95rem;
    margin-top: 8px;
    line-height: 1.6;
  }

  .input-container {
    display: flex;
    padding: 20px;
    background: white;
    border-top: 1px solid #e0e0e0;
  }

  input[type="text"] {
    flex: 1;
    padding: 12px 18px;
    border: 2px solid #e0e0e0;
    border-radius: 25px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.3s;
  }

  input[type="text"]:focus {
    border-color: #667eea;
  }

  .input-container button {
    margin-left: 10px;
    padding: 12px 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .input-container button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .input-container button:active {
    transform: translateY(0);
  }

  .input-container button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Profile Form Styles */
  .profile-form-container {
    padding: 30px;
    background: white;
    max-width: 600px;
    margin: 20px auto;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .profile-form-container h2 {
    color: #667eea;
    margin-bottom: 10px;
    font-size: 1.8rem;
    text-align: center;
  }

  .profile-form-container .subtitle {
    text-align: center;
    color: #666;
    margin-bottom: 30px;
    font-size: 0.95rem;
  }

  .form-group {
    margin-bottom: 24px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .form-group label .optional {
    color: #999;
    font-weight: 400;
    font-size: 0.85rem;
    margin-left: 6px;
  }

  .form-group input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.3s, box-shadow 0.3s;
    outline: none;
  }

  .form-group input:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-group input::placeholder {
    color: #bbb;
  }

  .form-help {
    font-size: 0.85rem;
    color: #777;
    margin-top: 6px;
    line-height: 1.4;
  }

  .submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.3s;
    margin-top: 10px;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .submit-btn:active {
    transform: translateY(0);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .skip-btn {
    width: 100%;
    padding: 12px;
    background: #f5f5f5;
    color: #666;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 10px;
  }

  .skip-btn:hover {
    background: #e8e8e8;
    border-color: #ccc;
  }

  .error {
    color: #e74c3c;
    margin: 1rem 0;
    padding: 10px;
    background: #ffe8e8;
    border-radius: 8px;
    font-size: 0.9rem;
  }
</style>
