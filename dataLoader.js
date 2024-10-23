// dataLoader.js
import electron from './electronBridge.js';
const { ipcRenderer } = electron;

// Add this function to create default API keys
function createDefaultApiKeys() {
  return {
    openai: { apiKey: '', models: ['gpt-4o', 'gpt-4o-mini'] },
    anthropic: { apiKey: '', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
    groq: { apiKey: '', models: ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'gemma2-9b-it', 'mixtral-8x7b-32768'] },
    local: { serverAddress: 'http://localhost:11434/api/chat', models: ['llama3.2', 'llama3.2:1b'] },
    google: { apiKey: '', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] }
  };
}

// Modify the loadApiKeys function
export async function loadApiKeys(password) {
  try {
    const apiKeys = await ipcRenderer.invoke('load-api-keys', password);
    return apiKeys;
  } catch (error) {
    console.error('Error loading API keys:', error);
    return createDefaultApiKeys();
  }
}

export async function loadChatHistory() {
  try {
    return await ipcRenderer.invoke('load-chat-history');
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

export async function loadConfig() {
  try {
    const config = await ipcRenderer.invoke('load-config');
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    return {
      context_window_size: 10,
      providers: {
        openai: { models: [] },
        anthropic: { models: [] },
        groq: { models: [] },
        local: { models: [], serverAddress: '' },
        google: { models: [] }
      }
    };
  }
}

export async function loadSystemPrompt() {
  return await ipcRenderer.invoke('load-system-prompt');
}

export async function loadSelectedModel() {
  return await ipcRenderer.invoke('load-selected-model');
}

export async function saveSelectedModel(model) {
  await ipcRenderer.invoke('save-selected-model', model);
}

export async function applySystemTheme() {
  try {
    const theme = await ipcRenderer.invoke('get-system-theme');
    document.body.setAttribute('data-theme', theme);
  } catch (error) {
    console.error('Error applying system theme:', error);
  }
}

// Modify the populateOptionsForm function in chatActions.js
export async function populateOptionsForm() {
  try {
    const currentApiKeys = await loadApiKeys(); // Use loadApiKeys instead of ipcRenderer.invoke
    
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
  } catch (error) {
    console.error('Error populating options form:', error);
    // Handle the error, perhaps by showing a message to the user
  }
}

// Add saveApiKeys function
export async function saveApiKeys(apiKeys, password) {
  try {
    await ipcRenderer.invoke('save-api-keys', apiKeys, password);
    return true;
  } catch (error) {
    console.error('Error saving API keys:', error);
    return false;
  }
}
