const { contextBridge, ipcRenderer } = require('electron');
//const { marked } = require('marked');

//marked.use({
//  mangle: false,
//  headerIds: false
//})

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
  parseMarkdown: (content) => ipcRenderer.invoke('parse-markdown', content),
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
  // Add any other methods you need
});
