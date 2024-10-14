const { contextBridge, ipcRenderer, shell } = require('electron');
const { marked } = require('marked');

// Configure marked to address the warnings
marked.use({
  mangle: false,
  headerIds: false
});

contextBridge.exposeInMainWorld('api', {
  loadChatHistory: () => ipcRenderer.invoke('load-chat-history'),
  saveChatHistory: (messages) => ipcRenderer.invoke('save-chat-history', messages),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadSystemPrompt: () => ipcRenderer.invoke('load-system-prompt'),
  saveSystemPrompt: (prompt) => ipcRenderer.invoke('save-system-prompt', prompt),
  loadApiKeys: () => ipcRenderer.invoke('load-api-keys'),
  saveApiKeys: (apiKeys) => ipcRenderer.invoke('save-api-keys', apiKeys),
  parseMarkdown: (content) => marked.parse(content),
  // Streaming Handlers
  streamOpenAI: (model, messages) => ipcRenderer.invoke('stream-openai', model, messages),
  streamAnthropic: (model, messages) => ipcRenderer.invoke('stream-anthropic', model, messages),
  streamGroq: (model, messages) => ipcRenderer.invoke('stream-groq', model, messages),
  streamLocal: (serverAddress, model, messages) => ipcRenderer.invoke('stream-local', serverAddress, model, messages),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  openExternal: (url) => shell.openExternal(url),
  makeLocalRequest: (url, data) => ipcRenderer.invoke('make-local-request', url, data),
  onThemeUpdated: (callback) => ipcRenderer.on('system-theme-updated', callback),
  loadSelectedModel: () => ipcRenderer.invoke('load-selected-model'),
  saveSelectedModel: (selectedModel) => ipcRenderer.invoke('save-selected-model', selectedModel),
  onOpenAIStream: (callback) => ipcRenderer.on('openai-stream', callback),
  onAnthropicStream: (callback) => ipcRenderer.on('anthropic-stream', callback),
  onGroqStream: (callback) => ipcRenderer.on('groq-stream', callback),
  onLocalStream: (callback) => ipcRenderer.on('local-stream', callback),
});