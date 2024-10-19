// dataLoader.js
import electron from './electronBridge.js';
const { ipcRenderer } = electron;

export async function loadApiKeys() {
  return await ipcRenderer.invoke('load-api-keys');
}

export async function loadChatHistory() {
  return await ipcRenderer.invoke('load-chat-history');
}

export async function loadConfig() {
  return await ipcRenderer.invoke('load-config');
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
