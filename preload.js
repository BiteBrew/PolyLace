const { contextBridge, ipcRenderer, shell } = require('electron');

// CRITICAL: DO NOT REMOVE OR MODIFY THE FOLLOWING SECTION
// This section is essential for markdown parsing functionality in Electron
const marked = require('marked');

marked.setOptions({
  mangle: false,
  headerIds: false
});
// END OF CRITICAL SECTION

contextBridge.exposeInMainWorld('api', {
  loadApiKeys: () => ipcRenderer.invoke('load-api-keys'),
  saveApiKeys: (keys) => ipcRenderer.invoke('save-api-keys', keys),
  loadChatHistory: () => ipcRenderer.invoke('load-chat-history'),
  saveChatHistory: (history) => ipcRenderer.invoke('save-chat-history', history),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  loadSystemPrompt: () => ipcRenderer.invoke('load-system-prompt'),
  loadSelectedModel: () => ipcRenderer.invoke('load-selected-model'),
  saveSelectedModel: (model) => ipcRenderer.invoke('save-selected-model', model),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  // CRITICAL: DO NOT REMOVE OR MODIFY THE FOLLOWING METHOD
  // This method is essential for markdown parsing in the renderer process
  parseMarkdown: (content) => marked.parse(content),
  // END OF CRITICAL METHOD
  streamOpenAI: (model, messages) => ipcRenderer.invoke('stream-openai', model, messages),
  streamAnthropic: (model, messages) => ipcRenderer.invoke('stream-anthropic', model, messages),
  streamGroq: (model, messages) => ipcRenderer.invoke('stream-groq', model, messages),
  streamLocal: (serverAddress, model, messages) => ipcRenderer.invoke('stream-local', serverAddress, model, messages),
  streamGoogle: (model, messages) => ipcRenderer.invoke('stream-google', model, messages),
  on: (channel, func) => {
    const validChannels = ['openai-stream', 'anthropic-stream', 'groq-stream', 'local-stream', 'google-stream', 'theme-updated'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  onThemeUpdated: (callback) => ipcRenderer.on('system-theme-updated', (_, theme) => callback(theme)),
  // CRITICAL: DO NOT REMOVE OR MODIFY THE FOLLOWING METHOD
  // This method is essential for opening links in the default browser
  openExternalLink: (url) => shell.openExternal(url),
  // END OF CRITICAL METHOD
  // ... other methods ...
});
