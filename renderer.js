// renderer.js

// ... existing imports and code ...

let apiKeys = {};
let messages = [];
let config = {};
let systemPrompt = '';
let selectedModel = 'openai:gpt-3.5-turbo'; // Default model
let openAIBuffer = '';
let buffer = '';
let lastResponse = '';

// DOM Elements
const chatDisplay = document.getElementById('chat-display');
const inputField = document.getElementById('input-field');
const modelSelector = document.getElementById('model-selector');
const clearButton = document.getElementById('clear-button');
const optionsButton = document.getElementById('options-button');
const optionsModal = document.getElementById('options-modal');
const optionsForm = document.getElementById('options-form');
const closeButton = document.querySelector('.close-button');

// Initialize Application
window.addEventListener('DOMContentLoaded', async () => {
  await applySystemTheme();
  await loadApiKeys();
  await loadChatHistory();
  await loadConfig();
  await loadSystemPrompt();
  await loadSelectedModel();
  populateModelSelector();
  renderChat();
  setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  clearButton.addEventListener('click', clearChat);
  optionsButton.addEventListener('click', () => {
    optionsModal.style.display = 'block';
  });

  closeButton.addEventListener('click', () => {
    optionsModal.style.display = 'none';
  });

  optionsForm.addEventListener('submit', handleOptionsSubmit);

  // Replace the old onThemeUpdated with the new syntax
  window.api.on('theme-updated', async () => {
    await applySystemTheme();
  });

  modelSelector.addEventListener('change', async (e) => {
    selectedModel = e.target.value;
    await saveSelectedModel();
  });
}

// Load API Keys
async function loadApiKeys() {
  apiKeys = await window.api.loadApiKeys();
  
  // Populate the options modal with loaded API keys
  document.getElementById('openai-api-key').value = apiKeys.openai?.apiKey || '';
  document.getElementById('openai-models').value = apiKeys.openai?.models.join(', ') || 'gpt-4o, gpt-4o-mini';

  document.getElementById('anthropic-api-key').value = apiKeys.anthropic?.apiKey || '';
  document.getElementById('anthropic-models').value = apiKeys.anthropic?.models.join(', ') || 'claude-3-5-sonnet-20240620, claude-3-opus-20240229, claude-3-haiku-20240307';

  document.getElementById('groq-api-key').value = apiKeys.groq?.apiKey || '';
  document.getElementById('groq-models').value = apiKeys.groq?.models.join(', ') || 'llama-3.2-90b-vision-preview, llama-3.2-11b-vision-preview, mixtral-8x7b-32768';

  document.getElementById('local-models').value = apiKeys.local?.models.join(', ') || 'llama3.2, llama3.2:1b';

  // Add Google Gemini
  document.getElementById('google-api-key').value = apiKeys.google?.apiKey || '';
  document.getElementById('google-models').value = apiKeys.google?.models.join(', ') || 'gemini-1.5-pro, gemini-1.5-flash, gemini-1.5-flash-8b';
}

// Load Chat History
async function loadChatHistory() {
  messages = await window.api.loadChatHistory();
}

// Load Config
async function loadConfig() {
  config = await window.api.loadConfig();
}

// Load System Prompt
async function loadSystemPrompt() {
  systemPrompt = await window.api.loadSystemPrompt();
}

// Load Selected Model
async function loadSelectedModel() {
  selectedModel = await window.api.loadSelectedModel();
  modelSelector.value = selectedModel;
}

// Save Selected Model
async function saveSelectedModel() {
  await window.api.saveSelectedModel(selectedModel);
}

// Populate Model Selector
async function populateModelSelector() {
  const modelSelector = document.getElementById('model-selector');
  modelSelector.innerHTML = ''; // Clear existing options

  const apiKeys = await window.api.loadApiKeys();

  for (const [provider, config] of Object.entries(apiKeys)) {
    if (provider === 'local') continue; // Handle local differently if needed

    if (config.models && config.models.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
      
      for (const model of config.models) {
        const option = document.createElement('option');
        option.value = `${provider}:${model}`;
        option.textContent = `${model}`;
        optgroup.appendChild(option);
      }
      modelSelector.appendChild(optgroup);
    }
  }

  // Handle local models
  const localConfig = apiKeys.local;
  if (localConfig && localConfig.models && localConfig.models.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = 'Local';

    for (const model of localConfig.models) {
      const option = document.createElement('option');
      option.value = `local:${model}`;
      option.textContent = `${model}`;
      optgroup.appendChild(option);
    }
    modelSelector.appendChild(optgroup);
  }

  // Set the selected model
  modelSelector.value = selectedModel;
}

// Handle Options Form Submission
async function handleOptionsSubmit(e) {
  e.preventDefault();

  const newApiKeys = {
    openai: {
      apiKey: document.getElementById('openai-api-key').value.trim(),
      models: document.getElementById('openai-models').value.split(',').map(m => m.trim())
    },
    anthropic: {
      apiKey: document.getElementById('anthropic-api-key').value.trim(),
      models: document.getElementById('anthropic-models').value.split(',').map(m => m.trim())
    },
    groq: {
      apiKey: document.getElementById('groq-api-key').value.trim(),
      models: document.getElementById('groq-models').value.split(',').map(m => m.trim())
    },
    local: {
      serverAddress: document.getElementById('local-server-address').value.trim(),
      models: document.getElementById('local-models').value.split(',').map(m => m.trim())
    },
    google: {
      apiKey: document.getElementById('google-api-key').value.trim(),
      models: document.getElementById('google-models').value.split(',').map(m => m.trim())
    }
  };

  console.log('Saving API keys:', JSON.stringify(newApiKeys, null, 2));

  try {
    const result = await window.api.saveApiKeys(newApiKeys);
    console.log('Save API keys result:', result);
    if (result.status === 'success') {
      console.log('API keys saved successfully');
      // Optionally, you can add a visual confirmation here
    } else {
      console.error('Failed to save API keys:', result.message);
      // Optionally, show an error message to the user
    }
  } catch (error) {
    console.error('Error saving API keys:', error);
    // Optionally, show an error message to the user
  }

  // Re-populate the model selector with updated models
  await populateModelSelector();

  // Close modal
  optionsModal.style.display = 'none';
}

// Send Message
async function sendMessage() {
  const userInput = inputField.value.trim();
  if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
    window.close();
    return;
  }
  if (userInput === '') return;

  inputField.value = '';

  const userMessage = { role: 'user', content: userInput };
  messages.push(userMessage);
  displayMessage('You', userInput);
  await window.api.saveChatHistory(messages);

  const selectedModel = modelSelector.value; // Format: Provider:ModelName
  const [provider, model] = selectedModel.split(':');

  try {
    // Clear streaming content before starting a new message
    streamingContent = '';
    currentStreamingMessage = null;

    // For all providers, display an empty AI message to be updated
    currentStreamingMessage = displayMessage('AI', '');

    // Initiate streaming based on provider
    if (provider === 'local') {
      const serverAddress = apiKeys.local.serverAddress;
      await window.api.streamLocal(serverAddress, model, messages);
    } else if (provider === 'openai') {
      await window.api.streamOpenAI(model, messages);
    } else if (provider === 'anthropic') {
      await window.api.streamAnthropic(model, messages);
    } else if (provider === 'groq') {
      await window.api.streamGroq(model, messages);
    } else if (provider === 'google') {
      await window.api.streamGoogle(model, messages);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // The actual AI response will be handled via stream listeners
  } catch (error) {
    console.error('Error in sendMessage:', error);
    displayError('System', `Error: ${error.message}`);
    if (currentStreamingMessage) {
      chatDisplay.removeChild(currentStreamingMessage);
      currentStreamingMessage = null;
    }
  }
}

// Handle streaming data from providers
function setupStreamListeners() {
  window.api.on('openai-stream', (chunk) => {
    handleStreamingResponse('AI', chunk, 'openai');
  });

  window.api.on('anthropic-stream', (chunk) => {
    handleStreamingResponse('AI', chunk, 'anthropic');
  });

  window.api.on('groq-stream', (chunk) => {
    handleStreamingResponse('AI', chunk, 'groq');
  });

  window.api.on('local-stream', (chunk) => {
    handleStreamingResponse('AI', chunk, 'local');
  });

  window.api.on('google-stream', (chunk) => {
    handleStreamingResponse('AI', chunk, 'google');
  });
}

// Initialize stream listeners
setupStreamListeners();

// Function to handle streaming responses
let currentStreamingMessage = null;
let streamingContent = '';
let lastDisplayedContent = '';

async function handleStreamingResponse(sender, chunk, provider) {
  console.log(`Received chunk from ${provider}:`, chunk);
  try {
    let newContent = '';

    if (provider === 'local') {
      try {
        const data = JSON.parse(chunk);
        if (data.message && data.message.content) {
          newContent = data.message.content;
        }
        if (data.done === true) {
          console.log('Local stream ended');
          await finalizeMessage();
          return;
        }
      } catch (jsonError) {
        console.warn('Error parsing JSON from local provider:', jsonError, 'Raw chunk:', chunk);
        newContent = chunk;
      }
    } else {
      // Handle other providers (openai, anthropic, groq, google)
      const lines = chunk.split('\n');
      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          const jsonString = line.slice(5).trim();
          if (jsonString && jsonString !== '[DONE]') {
            try {
              const jsonData = JSON.parse(jsonString);
              if (provider === 'anthropic' && jsonData.type === 'content_block_delta') {
                newContent += jsonData.delta.text || '';
              } else if ((provider === 'openai' || provider === 'groq' || provider === 'google') && 
                         jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta) {
                newContent += jsonData.choices[0].delta.content || '';
              }
            } catch (e) {
              console.warn('Error parsing JSON:', e, 'Raw data:', jsonString);
            }
          }
        }
      });
    }

    if (newContent) {
      streamingContent += newContent;
      await updateDisplayIfNeeded();
    }

    if (provider !== 'local' && (chunk.includes('"finish_reason":"stop"') || chunk.includes('"type":"message_stop"') || chunk.includes('[DONE]'))) {
      await finalizeMessage();
    }

  } catch (error) {
    console.error('Streaming Error:', error);
    displayError(sender, error.message);
    resetStreamingState();
  }
}

async function updateDisplayIfNeeded() {
  // Update more frequently for local model
  if (streamingContent.length - lastDisplayedContent.length > 0) {
    if (!currentStreamingMessage) {
      currentStreamingMessage = await displayMessage('AI', streamingContent);
    } else {
      await updateMessageContent(currentStreamingMessage, streamingContent);
    }
    lastDisplayedContent = streamingContent;
  }
}

async function finalizeMessage() {
  if (currentStreamingMessage) {
    await updateMessageContent(currentStreamingMessage, streamingContent);
    const aiMessage = { role: 'assistant', content: streamingContent.trim() };
    messages.push(aiMessage);
    await window.api.saveChatHistory(messages);
  }
  resetStreamingState();
}

function resetStreamingState() {
  currentStreamingMessage = null;
  streamingContent = '';
  lastDisplayedContent = '';
}

// Function to display error messages
function displayError(sender, message) {
  displayMessage(sender, `❌ ${message}`);
}

// Render Chat
async function renderChat() {
  chatDisplay.innerHTML = '';
  try {
    for (const message of messages) {
      const content = await resolveContent(message.content);
      await displayMessage(message.role === 'user' ? 'You' : 'AI', content);
    }
  } catch (error) {
    console.error('Error rendering chat:', error);
    displayError('System', `Error rendering chat: ${error.message}`);
  }
}

// Display Message
async function displayMessage(sender, content) {
  return new Promise((resolve) => {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender.toLowerCase()}-message`;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    contentElement.textContent = content;
    
    messageElement.appendChild(contentElement);
    
    chatDisplay.appendChild(messageElement);
    scrollToBottom();
    resolve(messageElement);
  });
}

// Function to copy AI message content
function copyAiMessage(messageElement) {
  // Select all text content within the message, excluding the button
  const content = Array.from(messageElement.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== 'button'))
    .map(node => node.textContent)
    .join('').trim();

  navigator.clipboard.writeText(content).then(() => {
    // Provide visual feedback that the copy was successful
    const copyButton = messageElement.querySelector('.ai-message-copy-button');
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Copied!';
    copyButton.classList.add('copied');
    copyButton.disabled = true;
    setTimeout(() => {
      copyButton.textContent = originalText;
      copyButton.classList.remove('copied');
      copyButton.disabled = false;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy message: ', err);
  });
}

// Function to add code block features (syntax highlighting and copy button)
function addCodeBlockFeatures(element) {
  const codeBlocks = element.querySelectorAll('pre code');
  
  codeBlocks.forEach((block) => {
    let pre = block.parentNode;
    
    // Escape HTML content in the code block
    block.textContent = block.innerHTML;
    
    // Create header if it doesn't exist
    if (!pre.previousElementSibling || !pre.previousElementSibling.classList.contains('code-block-header')) {
      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span>${block.className.replace('language-', '') || 'plaintext'}</span>
        <button class="copy-button">Copy</button>
      `;
      
      // Insert header before pre
      pre.parentNode.insertBefore(header, pre);
      
      // Add copy functionality
      const copyButton = header.querySelector('.copy-button');
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(block.textContent).then(() => {
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 2000);
        });
      });
    }
    
    // Apply syntax highlighting
    hljs.highlightElement(block);
  });
}

// Clear Chat
async function clearChat() {
  try {
    console.log('Clearing chat...');
    messages = [];
    console.log('Messages array cleared.');
    await window.api.saveChatHistory(messages);
    console.log('Chat history saved.');
    chatDisplay.innerHTML = ''; // Directly clear the chat display
    console.log('Chat display cleared.');
  } catch (error) {
    console.error('Error clearing chat:', error);
    displayError('System', `Error clearing chat: ${error.message}`);
  }
}

// Apply System Theme
async function applySystemTheme() {
  const theme = await window.api.getSystemTheme();
  document.body.classList.toggle('dark-mode', theme.shouldUseDarkColors);
}

// Helper function to update message content
async function updateMessageContent(messageElementPromise, content) {
  console.log('Updating message content:', content);
  try {
    const messageElement = await messageElementPromise;
    if (!(messageElement instanceof Element)) {
      console.error('Invalid messageElement:', messageElement);
      return;
    }

    const contentElement = messageElement.querySelector('.message-content');
    if (contentElement) {
      contentElement.textContent = content;
    } else {
      console.warn('Content element not found in message, creating new one');
      const newContentElement = document.createElement('div');
      newContentElement.className = 'message-content';
      newContentElement.textContent = content;
      messageElement.appendChild(newContentElement);
    }
    scrollToBottom();
  } catch (error) {
    console.error('Error updating message content:', error);
  }
}

// Helper function to resolve content if it's a Promise
async function resolveContent(content) {
  return content instanceof Promise ? await content : content;
}

function createMessageElement(message, isAi) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', isAi ? 'ai-message' : 'user-message');
  
  const contentElement = document.createElement('div');
  contentElement.classList.add('message-content');
  contentElement.innerHTML = message;
  
  messageElement.appendChild(contentElement);

  if (isAi) {
    const copyButton = document.createElement('button');
    copyButton.classList.add('ai-message-copy-button');
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', () => copyAiMessage(messageElement));
    
    messageElement.appendChild(copyButton);
  }

  return messageElement;
}

function scrollToBottom() {
  if (chatDisplay) {
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  } else {
    console.warn('chatDisplay not found');
  }
}

// Call this function whenever a new message is added to the chat
// For example:
// addMessageToChat(message);
// scrollToBottom();