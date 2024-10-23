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
    // Ensure default structure if config is missing or incomplete
    return {
      context_window_size: config?.context_window_size || 10,
      providers: {
        openai: {
          models: ['gpt-4', 'gpt-3.5-turbo'],
          ...config?.providers?.openai
        },
        anthropic: {
          models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
          ...config?.providers?.anthropic
        },
        groq: {
          models: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
          ...config?.providers?.groq
        },
        local: {
          models: ['llama2', 'mistral'],
          serverAddress: 'http://localhost:11434/api/chat',
          ...config?.providers?.local
        },
        google: {
          models: ['gemini-1.5-pro', 'gemini-1.5-ultra'],
          ...config?.providers?.google
        }
      }
    };
  } catch (error) {
    console.error('Error loading config:', error);
    // Return default config if loading fails
    return {
      context_window_size: 10,
      providers: {
        openai: { models: ['gpt-4', 'gpt-3.5-turbo'] },
        anthropic: { models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
        groq: { models: ['mixtral-8x7b-32768', 'llama2-70b-4096'] },
        local: { 
          models: ['llama2', 'mistral'],
          serverAddress: 'http://localhost:11434/api/chat'
        },
        google: { models: ['gemini-1.5-pro', 'gemini-1.5-ultra'] }
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
