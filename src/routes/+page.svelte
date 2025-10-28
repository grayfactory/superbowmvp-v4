<script lang="ts">
  import { conversationStore } from '$lib/stores/conversation';
  import { marked } from 'marked';
  
  // Markdown 설정
  marked.setOptions({
    breaks: true,        // 줄바꿈을 <br>로 변환
    gfm: true,          // GitHub Flavored Markdown
    headerIds: false,   // 헤더 ID 생성 안 함
    mangle: false       // 이메일 난독화 안 함
  });

  let userInput = '';
  let messagesContainer: HTMLElement;

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

  <!-- Chat Interface -->
  <div class="chat-container" bind:this={messagesContainer}>
    <div class="messages">

      {#each $conversationStore.messages as msg}
        <div class="message {msg.role}">
          {@html marked(msg.content)}
        </div>

        <!-- Inline Recommendations (if this message has recommendations) -->
        {#if msg.recommendations && msg.recommendations.length > 0}
          <div class="recommendations-section">
            {#each msg.recommendations as rec, index}
              <div class="recommendation-card">
                <div class="rank">#{index + 1}</div>
                <h3>{rec.product.name}</h3>
                <div class="price">{rec.product.price.toLocaleString()}원</div>
                <div class="product-info">
                  <div><strong>카테고리:</strong> {rec.product.category || 'N/A'}</div>
                  <div><strong>식감:</strong> {rec.product.texture || 'N/A'}</div>
                  <div><strong>연령:</strong> {rec.product.age_fit || 'N/A'}</div>
                  {#if rec.product.functional_tags && rec.product.functional_tags.length > 0}
                    <div><strong>특징:</strong> {rec.product.functional_tags.join(', ')}</div>
                  {/if}
                </div>
                <div class="reasoning">{rec.reasoning}</div>
              </div>
            {/each}
          </div>
        {/if}
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

  .welcome-message {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  .welcome-message h2 {
    color: #667eea;
    margin-bottom: 15px;
    font-size: 2rem;
  }

  .welcome-message p {
    font-size: 1.1rem;
    margin-bottom: 10px;
  }

  .welcome-message .hint {
    color: #999;
    font-size: 0.95rem;
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

  /* Markdown 스타일 */
  .message :global(h1),
  .message :global(h2),
  .message :global(h3) {
    margin-top: 0.5em;
    margin-bottom: 0.3em;
    font-weight: 600;
  }

  .message :global(h1) { font-size: 1.3em; }
  .message :global(h2) { font-size: 1.2em; }
  .message :global(h3) { font-size: 1.1em; }

  .message :global(p) {
    margin: 0.5em 0;
  }

  .message :global(strong) {
    font-weight: 600;
    color: #667eea;
  }

  .message :global(em) {
    font-style: italic;
  }

  .message :global(code) {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  .message :global(pre) {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.5em 0;
  }

  .message :global(pre code) {
    background: none;
    padding: 0;
  }

  .message :global(ul),
  .message :global(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .message :global(li) {
    margin: 0.3em 0;
  }

  .message :global(blockquote) {
    border-left: 3px solid #667eea;
    padding-left: 12px;
    margin: 0.5em 0;
    color: #666;
  }

  .message :global(a) {
    color: #667eea;
    text-decoration: none;
  }

  .message :global(a:hover) {
    text-decoration: underline;
  }

  .message :global(hr) {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 1em 0;
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

  .recommendations-section {
    margin-top: 20px;
    display: flex;
    gap: 15px;
    width: 100%;
  }

  /* 모바일: 세로 스택 */
  @media (max-width: 768px) {
    .recommendations-section {
      flex-direction: column;
    }
  }

  .recommendation-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
    flex: 1;
    min-width: 0; /* 텍스트 오버플로우 방지 */
    display: flex;
    flex-direction: column;
  }

  .recommendation-card .rank {
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .recommendation-card h3 {
    color: #333;
    margin-bottom: 10px;
    font-size: 1.3rem;
  }

  .recommendation-card .price {
    color: #e74c3c;
    font-weight: bold;
    font-size: 1.2rem;
    margin-bottom: 15px;
  }

  .recommendation-card .product-info {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 0.95rem;
    line-height: 1.8;
  }

  .recommendation-card .product-info div {
    margin-bottom: 4px;
  }

  .recommendation-card .reasoning {
    color: #555;
    font-size: 0.95rem;
    line-height: 1.6;
    border-left: 3px solid #667eea;
    padding-left: 12px;
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
</style>
