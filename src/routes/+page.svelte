<script lang="ts">
  import { conversationStore } from '$lib/stores/conversation';
  import { petProfileStore } from '$lib/stores/petProfile';
  import type { PetAnalysisResult } from '$lib/types';

  let showProfileForm = true;
  let userInput = '';
  let analysisError = '';

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
    if (!userInput.trim()) return;

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
</script>

<main>
  <h1>🐾 펫 간식 추천 AI</h1>

  {#if showProfileForm}
    <!-- Pet Profile Form -->
    <section class="profile-section">
      <h2>반려동물 프로필</h2>
      <p>정확한 추천을 위해 프로필을 입력해주세요. (선택사항)</p>

      <form on:submit={handleProfileSubmit}>
        <div class="form-group">
          <label for="breed">견종</label>
          <input
            id="breed"
            type="text"
            bind:value={$petProfileStore.breed}
            placeholder="예: 골든리트리버"
          />
        </div>

        <div class="form-group">
          <label for="monthsOld">개월 수</label>
          <input
            id="monthsOld"
            type="number"
            bind:value={$petProfileStore.monthsOld}
            placeholder="예: 24"
          />
        </div>

        <div class="form-group">
          <label for="currentWeight">현재 몸무게 (kg, 선택사항)</label>
          <input
            id="currentWeight"
            type="number"
            step="0.1"
            bind:value={$petProfileStore.currentWeight}
            placeholder="예: 28.5"
          />
        </div>

        {#if analysisError}
          <p class="error">{analysisError}</p>
        {/if}

        <div class="button-group">
          <button type="submit">프로필 분석</button>
          <button type="button" class="secondary" on:click={skipProfile}>
            건너뛰기 (바로 추천받기)
          </button>
        </div>
      </form>
    </section>
  {:else}
    <!-- Chat Interface -->
    <section class="chat-section">
      <div class="messages">
        {#each $conversationStore.messages as msg}
          <div class="message {msg.role}">
            <div class="message-content">{msg.content}</div>
          </div>
        {/each}

        {#if $conversationStore.isLoading}
          <div class="message assistant">
            <div class="message-content loading">생각하는 중...</div>
          </div>
        {/if}
      </div>

      <!-- Recommendations Display -->
      {#if $conversationStore.recommendations.length > 0}
        <div class="recommendations">
          <h3>추천 제품</h3>
          {#each $conversationStore.recommendations as rec}
            <div class="recommendation-card">
              <h4>{rec.product.name} <span class="price">₩{rec.product.price.toLocaleString()}</span></h4>
              <p class="reasoning">{rec.reasoning}</p>
              <div class="tags">
                {#if rec.product.functional_tags}
                  {#each rec.product.functional_tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Input Area -->
      <div class="input-area">
        <textarea
          bind:value={userInput}
          on:keydown={handleKeydown}
          placeholder="어떤 상황에서 쓸 간식이 필요하세요?"
          rows="3"
          disabled={$conversationStore.isLoading}
        />
        <button on:click={sendMessage} disabled={$conversationStore.isLoading || !userInput.trim()}>
          전송
        </button>
      </div>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    margin: 0;
    padding: 0;
    background: #f5f5f5;
  }

  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    text-align: center;
    color: #333;
    margin-bottom: 2rem;
  }

  .profile-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .profile-section h2 {
    margin-top: 0;
    color: #333;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #555;
  }

  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #4CAF50;
  }

  .button-group {
    display: flex;
    gap: 1rem;
  }

  button {
    flex: 1;
    padding: 0.75rem 1.5rem;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: #45a049;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  button.secondary {
    background: #6c757d;
  }

  button.secondary:hover:not(:disabled) {
    background: #5a6268;
  }

  .error {
    color: #d32f2f;
    margin: 1rem 0;
  }

  .chat-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    min-height: 500px;
    display: flex;
    flex-direction: column;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 1.5rem;
    max-height: 400px;
  }

  .message {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .message.user {
    background: #e3f2fd;
    margin-left: 20%;
  }

  .message.assistant {
    background: #f5f5f5;
    margin-right: 20%;
  }

  .message-content.loading {
    font-style: italic;
    color: #666;
  }

  .recommendations {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: #f9f9f9;
    border-radius: 8px;
  }

  .recommendations h3 {
    margin-top: 0;
    color: #333;
  }

  .recommendation-card {
    background: white;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    border-left: 4px solid #4CAF50;
  }

  .recommendation-card h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .price {
    color: #4CAF50;
    font-weight: bold;
  }

  .reasoning {
    margin: 0.5rem 0;
    color: #555;
    line-height: 1.5;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .tag {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
  }

  .input-area {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
  }

  .input-area textarea {
    flex: 1;
  }

  .input-area button {
    flex: 0 0 auto;
    height: fit-content;
  }
</style>
