// chatActions.js
import { 
  inputField, modelSelector, chatDisplay, messages,
  streamingContent, currentStreamingMessage, lastDisplayedContent, 
  apiKeys, updateMessages, updateStreamingContent, 
  updateCurrentStreamingMessage, updateLastDisplayedContent,
  scrollToBottom, autoResizeTextarea, systemPrompt
} from './renderer.js';
import { loadApiKeys, loadConfig } from './dataLoader.js';
import { displayMessage, updateMessageContent, displayError, addCopyIconToMessage } from './chatRenderer.js';
import { handleStreamingResponse } from './streamHandler.js';
import { populateModelSelector } from './uiUpdater.js';
import electron from './electronBridge.js';
const { ipcRenderer } = electron;

export async function sendMessage() {
  const userInput = inputField.value.trim();
  
  // Handle commands to exit the application
  if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
    window.close();
    return;
  }

  // Prevent sending empty messages
  if (userInput === '') return;

  inputField.value = ''; // Clear the textarea
  autoResizeTextarea(inputField, true); // Reset the textarea height
  updateStreamingContent(''); // Clear previous streaming content

  const userMessage = { role: 'user', content: userInput };
  
  // Create a new array with system prompt and user messages
  const contextMessages = [
    { role: 'system', content: systemPrompt }, // Add system prompt as first message
    ...messages, // Add existing conversation history
    userMessage // Add new user message
  ];

  messages.push(userMessage); // Update visible messages
  displayMessage('You', userInput);
  await ipcRenderer.invoke('save-chat-history', messages);

  const selectedModel = modelSelector.value;
  const [provider, model] = selectedModel.split(':');

  try {
    // Display an empty AI message to be updated
    updateCurrentStreamingMessage(await displayMessage('AI', ''));

    // Pass contextMessages instead of messages to include system prompt
    if (provider === 'local') {
      const serverAddress = apiKeys.local.serverAddress;
      await ipcRenderer.invoke('stream-local', serverAddress, model, contextMessages);
    } else if (provider === 'openai') {
      await ipcRenderer.invoke('stream-openai', model, contextMessages);
    } else if (provider === 'anthropic') {
      await ipcRenderer.invoke('stream-anthropic', model, contextMessages);
    } else if (provider === 'groq') {
      await ipcRenderer.invoke('stream-groq', model, contextMessages);
    } else if (provider === 'google') {
      await ipcRenderer.invoke('stream-google', model, contextMessages);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

  } catch (error) {
    console.error('Error in sendMessage:', error);
    displayError('System', `Error: ${error.message}`);
    if (currentStreamingMessage) {
      chatDisplay.removeChild(currentStreamingMessage);
      updateCurrentStreamingMessage(null);
    }
  }

  if (selectedModel.startsWith('google:')) {
    resetStreamingState();
  }
}

export async function clearChat() {
  try {
    console.log('Clearing chat...');
    updateMessages([]); // Clear the messages array
    console.log('Messages array cleared.');
    await ipcRenderer.invoke('save-chat-history', []); // Save empty chat history
    console.log('Chat history saved.');
    chatDisplay.innerHTML = ''; // Clear the chat display
    console.log('Chat display cleared.');
  } catch (error) {
    console.error('Error clearing chat:', error);
    displayError('System', `Error clearing chat: ${error.message}`);
  }
}

export async function handleOptionsSubmit(e) {
  e.preventDefault();

  const newApiKeys = {
    openai: {
      apiKey: document.getElementById('openai-api-key').value.trim()
    },
    anthropic: {
      apiKey: document.getElementById('anthropic-api-key').value.trim()
    },
    groq: {
      apiKey: document.getElementById('groq-api-key').value.trim()
    },
    local: {
      serverAddress: document.getElementById('local-server-address').value.trim()
    },
    google: {
      apiKey: document.getElementById('google-api-key').value.trim()
    }
  };

  console.log('Saving API keys:', JSON.stringify(newApiKeys, null, 2));

  try {
    const result = await ipcRenderer.invoke('save-api-keys', newApiKeys);
    if (result.status === 'success') {
      console.log('API keys saved successfully');
      // Update the apiKeys in renderer.js
      Object.assign(apiKeys, newApiKeys);
    } else {
      console.error('Failed to save API keys:', result.message);
    }
  } catch (error) {
    console.error('Error saving API keys:', error);
  }

  ipcRenderer.send('close-options-modal');
}

export async function updateDisplayIfNeeded() {
  console.log('Updating display. Current streaming content:', streamingContent);
  if (streamingContent.length > lastDisplayedContent.length) {
    if (!currentStreamingMessage) {
      console.log('Creating new message element');
      updateCurrentStreamingMessage(await displayMessage('AI', streamingContent));
    } else {
      console.log('Updating existing message element');
      await updateMessageContent(currentStreamingMessage, streamingContent);
    }
    updateLastDisplayedContent(streamingContent);
    scrollToBottom();
  }
}

export async function finalizeMessage() {
  console.log('Finalizing message with streaming content:', streamingContent);
  try {
    if (!currentStreamingMessage) {
      console.warn('No current streaming message to finalize');
      return;
    }

    // Ensure we have the actual DOM element
    const messageElement = await currentStreamingMessage;
    if (!messageElement) {
      console.warn('Message element not found during finalization');
      return;
    }

    // Update the message content
    await updateMessageContent(messageElement, streamingContent);
    
    // Add the message to history
    const aiMessage = { role: 'assistant', content: String(streamingContent).trim() };
    updateMessages([...messages, aiMessage]);
    await ipcRenderer.invoke('save-chat-history', messages);
    
    // Add the copy icon
    console.log('Adding copy icon to message element');
    addCopyIconToMessage(messageElement, streamingContent);
    
  } catch (error) {
    console.error('Error in finalizeMessage:', error);
  } finally {
    console.log('Resetting streaming state');
    resetStreamingState();
  }
}

export function resetStreamingState() {
  console.log('Resetting streaming state');
  updateCurrentStreamingMessage(null);
  updateStreamingContent('');
  updateLastDisplayedContent('');
  // Note: groqBuffer is not exported, so we can't update it here. 
  // If needed, add a similar update function for groqBuffer.
}

export async function populateOptionsForm() {
  try {
    // Load both API keys and config
    const currentApiKeys = await loadApiKeys();
    const config = await loadConfig();
    
    // Populate API keys
    document.getElementById('openai-api-key').value = currentApiKeys.openai?.apiKey || '';
    document.getElementById('anthropic-api-key').value = currentApiKeys.anthropic?.apiKey || '';
    document.getElementById('groq-api-key').value = currentApiKeys.groq?.apiKey || '';
    document.getElementById('local-server-address').value = currentApiKeys.local?.serverAddress || '';
    document.getElementById('google-api-key').value = currentApiKeys.google?.apiKey || '';
    
    // Populate models from config
    document.getElementById('openai-models').value = config.providers.openai.models.join(', ');
    document.getElementById('anthropic-models').value = config.providers.anthropic.models.join(', ');
    document.getElementById('groq-models').value = config.providers.groq.models.join(', ');
    document.getElementById('local-models').value = config.providers.local.models.join(', ');
    document.getElementById('google-models').value = config.providers.google.models.join(', ');
    
  } catch (error) {
    console.error('Error populating options form:', error);
    throw error;
  }
}

export function setupEventListeners() {
  if (inputField) {
    inputField.addEventListener('input', function() {
      autoResizeTextarea(this);
    });

    inputField.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
      // Allow Shift+Enter for new lines
    });
  } else {
    console.error('inputField is not available');
  }
}

// Export functions


