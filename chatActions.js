// chatActions.js
import { 
  inputField, modelSelector, chatDisplay, messages,
  streamingContent, currentStreamingMessage, lastDisplayedContent, 
  apiKeys, updateMessages, updateStreamingContent, 
  updateCurrentStreamingMessage, updateLastDisplayedContent,
  scrollToBottom, autoResizeTextarea
} from './renderer.js';
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
  messages.push(userMessage);
  displayMessage('You', userInput);
  await ipcRenderer.invoke('save-chat-history', messages);

  const selectedModel = modelSelector.value; // Format: Provider:ModelName
  const [provider, model] = selectedModel.split(':');

  try {
    // Display an empty AI message to be updated
    updateCurrentStreamingMessage(await displayMessage('AI', ''));

    // Initiate streaming based on provider
    if (provider === 'local') {
      const serverAddress = apiKeys.local.serverAddress;
      await ipcRenderer.invoke('stream-local', serverAddress, model, messages);
    } else if (provider === 'openai') {
      await ipcRenderer.invoke('stream-openai', model, messages);
    } else if (provider === 'anthropic') {
      await ipcRenderer.invoke('stream-anthropic', model, messages);
    } else if (provider === 'groq') {
      await ipcRenderer.invoke('stream-groq', model, messages);
    } else if (provider === 'google') {
      await ipcRenderer.invoke('stream-google', model, messages);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // The actual AI response will be handled via stream listeners
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
    const result = await ipcRenderer.invoke('save-api-keys', newApiKeys);
    console.log('Save API keys result:', result);
    if (result.status === 'success') {
      console.log('API keys saved successfully');
      // Update the apiKeys in renderer.js
      Object.assign(apiKeys, newApiKeys);
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

  // Emit an event to close the modal
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
  console.log('Finalizing message');
  if (currentStreamingMessage) {
    await updateMessageContent(currentStreamingMessage, streamingContent);
    const aiMessage = { role: 'assistant', content: String(streamingContent).trim() };
    updateMessages([...messages, aiMessage]);
    await ipcRenderer.invoke('save-chat-history', messages);
    
    // Add the copy icon after the message is complete
    addCopyIconToMessage(await currentStreamingMessage, streamingContent);
  }
  resetStreamingState();
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
  const currentApiKeys = await ipcRenderer.invoke('load-api-keys');
  
  document.getElementById('openai-api-key').value = currentApiKeys.openai.apiKey || '';
  document.getElementById('openai-models').value = currentApiKeys.openai.models.join(', ');
  
  document.getElementById('anthropic-api-key').value = currentApiKeys.anthropic.apiKey || '';
  document.getElementById('anthropic-models').value = currentApiKeys.anthropic.models.join(', ');
  
  document.getElementById('groq-api-key').value = currentApiKeys.groq.apiKey || '';
  document.getElementById('groq-models').value = currentApiKeys.groq.models.join(', ');
  
  document.getElementById('local-server-address').value = currentApiKeys.local.serverAddress || '';
  document.getElementById('local-models').value = currentApiKeys.local.models.join(', ');
  
  document.getElementById('google-api-key').value = currentApiKeys.google.apiKey || '';
  document.getElementById('google-models').value = currentApiKeys.google.models.join(', ');
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


