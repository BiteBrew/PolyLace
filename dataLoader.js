// dataLoader.js
export async function loadApiKeys() {
    return await window.api.loadApiKeys();
  }
  
  export async function loadChatHistory() {
    return await window.api.loadChatHistory();
  }
  
  export async function loadConfig() {
    return await window.api.loadConfig();
  }
  
  export async function loadSystemPrompt() {
    return await window.api.loadSystemPrompt();
  }
  
  export async function loadSelectedModel() {
    return await window.api.loadSelectedModel();
  }
  
  export async function saveSelectedModel(model) {
    await window.api.saveSelectedModel(model);
  }
  
  export async function applySystemTheme() {
    const theme = await window.api.getSystemTheme();
    document.body.classList.toggle('dark-mode', theme.shouldUseDarkColors);
  }