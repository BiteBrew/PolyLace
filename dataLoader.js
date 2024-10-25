// dataLoader.js
import electron from './electronBridge.js';
import { ENCRYPTION_PASSWORD } from './constants.js'; // Adjust the path as necessary
const { ipcRenderer } = electron;

// Add this function to create default API keys
function createDefaultApiKeys() {
  return {
    openai: { apiKey: '', models: ['gpt-4o', 'gpt-4o-mini'] },
    anthropic: { apiKey: '', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
    groq: { apiKey: '', models: ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'gemma2-9b-it', 'mixtral-8x7b-32768'] },
    local: { serverAddress: 'http://localhost:11434/api/chat', models: ['llama3.2', 'llama3.2:1b'] },
    google: { apiKey: '', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] }
  };
}

// Modify the loadApiKeys function
export async function loadApiKeys() {
  try {
    const apiKeys = await ipcRenderer.invoke('load-api-keys', ENCRYPTION_PASSWORD);
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
    if (!config || !config.providers) {
      throw new Error('Invalid config structure');
    }
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    // Return default config if loading fails
    return {
      context_window_size: 25,
      providers: {
        openai: { models: ['gpt-4o ', 'gpt-4o-mini'] },
        anthropic: { models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
        groq: { models: ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'gemma2-9b-it', 'mixtral-8x7b-32768'] },
        google: { models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
        local: { 
          models: ['llama3.2', 'llama3.2:1b'],
          serverAddress: 'http://localhost:11434/api/chat'
        }
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

// Update populateOptionsForm to use config instead of apiKeys
export async function populateOptionsForm() {
  try {
    const currentApiKeys = await loadApiKeys();
    const config = await loadConfig();
    
    // Populate API keys
    document.getElementById('openai-api-key').value = currentApiKeys.openai?.apiKey || '';
    document.getElementById('anthropic-api-key').value = currentApiKeys.anthropic?.apiKey || '';
    document.getElementById('groq-api-key').value = currentApiKeys.groq?.apiKey || '';
    document.getElementById('google-api-key').value = currentApiKeys.google?.apiKey || '';
    
    // Populate models from config
    document.getElementById('openai-models').value = config.providers.openai.models.join(', ');
    document.getElementById('anthropic-models').value = config.providers.anthropic.models.join(', ');
    document.getElementById('groq-models').value = config.providers.groq.models.join(', ');
    document.getElementById('local-models').value = config.providers.local.models.join(', ');
    document.getElementById('google-models').value = config.providers.google.models.join(', ');
    
    // Set local server address
    document.getElementById('local-server-address').value = config.providers.local.serverAddress || '';
    
  } catch (error) {
    console.error('Error populating options form:', error);
    throw error;
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