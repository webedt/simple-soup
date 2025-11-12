// Claude SDK Chat Interface Page

import type { Page } from '../utils/types'

export const claudeSdkPage: Page = {
  id: 'claude-sdk',
  title: 'Claude SDK',
  icon: '🤖',
  render: () => `
    <div class="chat-container">
      <div class="chat-header">
        <h2>
          <span>🤖</span>
          <span>Claude SDK Chat</span>
        </h2>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <div class="model-selector">
            <label for="model-select">Model:</label>
            <select id="model-select">
              <option value="claude-3-5-sonnet-20241022" selected>Claude 3.5 Sonnet</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            </select>
          </div>
          <div class="status">
            <span class="status-indicator"></span>
            <span>Ready</span>
          </div>
        </div>
      </div>

      <div id="chat-messages" class="chat-messages">
        <div class="chat-welcome">
          <div class="chat-welcome-icon">✨</div>
          <h3>Welcome to Claude SDK Chat</h3>
          <p>Start a conversation with Claude using the Anthropic SDK.</p>
          <p>Type your message below to begin.</p>
        </div>
      </div>

      <div class="chat-input-area">
        <div class="chat-input-wrapper">
          <textarea
            id="chat-input"
            class="chat-input"
            placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
            rows="1"
          ></textarea>
          <button id="send-button" class="send-button">
            <span>Send</span>
            <span>↑</span>
          </button>
          <button id="clear-button" class="clear-button">Clear</button>
        </div>
      </div>
    </div>
  `
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

let messages: Message[] = []
let isStreaming = false

/**
 * Attach event listeners for the Claude SDK page
 */
export function attachClaudeSdkListeners(): void {
  const chatInput = document.querySelector<HTMLTextAreaElement>('#chat-input')
  const sendButton = document.querySelector<HTMLButtonElement>('#send-button')
  const clearButton = document.querySelector<HTMLButtonElement>('#clear-button')
  const modelSelect = document.querySelector<HTMLSelectElement>('#model-select')

  if (!chatInput || !sendButton || !clearButton) {
    console.error('Required elements not found')
    return
  }

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto'
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px'
  })

  // Handle Enter key (send) vs Shift+Enter (new line)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  // Send button click
  sendButton.addEventListener('click', () => {
    sendMessage()
  })

  // Clear button click
  clearButton.addEventListener('click', () => {
    messages = []
    renderMessages()
    showWelcome()
  })

  /**
   * Send a message to Claude
   */
  async function sendMessage() {
    const message = chatInput.value.trim()
    if (!message || isStreaming) return

    // Add user message
    messages.push({ role: 'user', content: message })
    renderMessages()

    // Clear input
    chatInput.value = ''
    chatInput.style.height = 'auto'

    // Disable input while streaming
    isStreaming = true
    updateInputState(true)

    // Show typing indicator
    showTypingIndicator()

    try {
      // Get selected model
      const model = modelSelect?.value || 'claude-3-5-sonnet-20241022'

      // Call API with streaming
      await streamChatResponse(messages, model)
    } catch (error) {
      console.error('Error sending message:', error)
      showError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      isStreaming = false
      updateInputState(false)
      removeTypingIndicator()
    }
  }

  /**
   * Stream chat response from Claude API
   */
  async function streamChatResponse(messageHistory: Message[], model: string) {
    const response = await fetch('/api/claude/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messageHistory,
        model
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get response from Claude')
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    // Create assistant message placeholder
    const assistantMessage: Message = { role: 'assistant', content: '' }
    messages.push(assistantMessage)
    removeTypingIndicator()
    renderMessages()

    // Read the stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const event = JSON.parse(data)

            if (event.type === 'text') {
              assistantMessage.content += event.content
              renderMessages()
              scrollToBottom()
            } else if (event.type === 'error') {
              throw new Error(event.content)
            } else if (event.type === 'end') {
              // Stream complete
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e)
          }
        }
      }
    }

    scrollToBottom()
  }

  /**
   * Update input state (disabled/enabled)
   */
  function updateInputState(disabled: boolean) {
    if (chatInput) {
      chatInput.disabled = disabled
    }
    if (sendButton) {
      sendButton.disabled = disabled
    }
  }

  /**
   * Show typing indicator
   */
  function showTypingIndicator() {
    const messagesContainer = document.querySelector('#chat-messages')
    if (!messagesContainer) return

    const indicator = document.createElement('div')
    indicator.id = 'typing-indicator'
    indicator.className = 'message assistant'
    indicator.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `
    messagesContainer.appendChild(indicator)
    scrollToBottom()
  }

  /**
   * Remove typing indicator
   */
  function removeTypingIndicator() {
    const indicator = document.querySelector('#typing-indicator')
    if (indicator) {
      indicator.remove()
    }
  }

  /**
   * Show welcome message
   */
  function showWelcome() {
    const messagesContainer = document.querySelector('#chat-messages')
    if (!messagesContainer) return

    messagesContainer.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-icon">✨</div>
        <h3>Welcome to Claude SDK Chat</h3>
        <p>Start a conversation with Claude using the Anthropic SDK.</p>
        <p>Type your message below to begin.</p>
      </div>
    `
  }

  /**
   * Show error message
   */
  function showError(errorMessage: string) {
    const messagesContainer = document.querySelector('#chat-messages')
    if (!messagesContainer) return

    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.textContent = `Error: ${errorMessage}`
    messagesContainer.appendChild(errorDiv)
    scrollToBottom()
  }

  /**
   * Render all messages
   */
  function renderMessages() {
    const messagesContainer = document.querySelector('#chat-messages')
    if (!messagesContainer) return

    messagesContainer.innerHTML = messages.map(msg => {
      const avatar = msg.role === 'user' ? '👤' : '🤖'
      const formattedContent = formatMessageContent(msg.content)

      return `
        <div class="message ${msg.role}">
          <div class="message-avatar">${avatar}</div>
          <div class="message-content">${formattedContent}</div>
        </div>
      `
    }).join('')

    scrollToBottom()
  }

  /**
   * Format message content (markdown-like)
   */
  function formatMessageContent(content: string): string {
    // Escape HTML
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Convert code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`
    })

    // Convert inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>')

    return formatted
  }

  /**
   * Scroll to bottom of messages
   */
  function scrollToBottom() {
    const messagesContainer = document.querySelector('#chat-messages')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }

  // Focus on input
  chatInput.focus()
}
