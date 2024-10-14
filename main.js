// main.js
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs').promises;
//const marked = require('marked');
const https = require('https');
const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SYSTEM_PROMPT_FILE = path.join(DATA_DIR, 'system_prompt.txt');
const API_KEYS_FILE = path.join(app.getPath('userData'), 'api_keys.json');
const SELECTED_MODEL_FILE = path.join(DATA_DIR, 'selected_model.json');

const ipcHandlers = new Set();

async function loadApiKeys() {
  try {
    const data = await fs.readFile(API_KEYS_FILE, 'utf-8');
    console.log('Loaded API keys:', data);
    const parsedData = JSON.parse(data);
    if (typeof parsedData.openai.apiKey !== 'string') {
      console.error('Invalid OpenAI API key format');
      parsedData.openai.apiKey = '';
    }
    return parsedData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('API keys file not found, returning default structure');
      return {
        openai: { apiKey: '', models: ['gpt-4o', 'gpt-4o-mini'] },
        anthropic: { apiKey: '', models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
        groq: { apiKey: '', models: ['gemma2-9b-it, llama-3.2-11b-vision-preview, mixtral-8x7b-32768'] },
        local: { serverAddress: 'http://localhost:11434/api/chat', models: ['llama3.2', 'llama3.2:1b'] }
      };
    }
    console.error('Error loading API keys:', error);
    throw error;
  }
}

async function createDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const files = [
      { path: HISTORY_FILE, content: '[]' },
      { path: CONFIG_FILE, content: JSON.stringify({ context_window_size: 10 }) },
      { path: SYSTEM_PROMPT_FILE, content: 'You are *Ada*, a **helpful** AI assistant.\nFeel free to ask me anything!' },
      { path: API_KEYS_FILE, content: JSON.stringify({
        openai: { apiKey: '', models: ['gpt-4o', 'gpt-4o-mini'] },
        anthropic: { apiKey: '', models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
        groq: { apiKey: '', models: ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'mixtral-8x7b-32768'] },
        local: { serverAddress: 'http://localhost:11434/api/chat', models: ['llama3.2', 'llama3.2:1b'] }
      }, null, 2) },
      { path: SELECTED_MODEL_FILE, content: JSON.stringify({ selectedModel: 'openai:gpt-4o' }) }
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.writeFile(file.path, file.content);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Error creating data files:', error);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenu(null); // Remove the default menu
  win.loadFile('index.html');

  // Error listener
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Open DevTools (optional)
  win.webContents.openDevTools();

  // Listen for theme changes
  nativeTheme.on('updated', () => {
    win.webContents.send('system-theme-updated');
  });
}

app.whenReady().then(async () => {
  await createDataFiles();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * IPC Handlers
 */

function safeIpcHandle(channel, listener) {
  if (!ipcHandlers.has(channel)) {
    ipcMain.handle(channel, listener);
    ipcHandlers.add(channel);
  }
}

// Load Chat History
safeIpcHandle('load-chat-history', async () => {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
});

// Save Chat History
safeIpcHandle('save-chat-history', async (event, messages) => {
  try {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(messages, null, 4));
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving chat history:', error);
    return { status: 'error', message: error.message };
  }
});

// Load Config
safeIpcHandle('load-config', async () => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading config:', error);
    return { context_window_size: 10 };
  }
});

// Save Config
safeIpcHandle('save-config', async (event, config) => {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4));
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving config:', error);
    return { status: 'error', message: error.message };
  }
});

// Load System Prompt
safeIpcHandle('load-system-prompt', async () => {
  try {
    const data = await fs.readFile(SYSTEM_PROMPT_FILE, 'utf-8');
    return data;
  } catch (error) {
    console.error('Error loading system prompt:', error);
    return 'You are *Ada*, a **helpful** AI assistant.\nFeel free to ask me anything!';
  }
});

// Save System Prompt
safeIpcHandle('save-system-prompt', async (event, prompt) => {
  try {
    await fs.writeFile(SYSTEM_PROMPT_FILE, prompt);
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving system prompt:', error);
    return { status: 'error', message: error.message };
  }
});

// Parse Markdown
safeIpcHandle('parse-markdown', async (event, content) => {
  return marked.parse(content);
});

// Get System Theme
safeIpcHandle('get-system-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

/**
 * IPC Handlers for API Keys Management
 */

// Load API Keys
safeIpcHandle('load-api-keys', async () => {
  try {
    const data = await fs.readFile(API_KEYS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default structure
      return {
        openai: { apiKey: '', models: ['gpt-4o', 'gpt-4o-mini'] },
        anthropic: { apiKey: '', models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
        groq: { apiKey: '', models: ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'mixtral-8x7b-32768'] },
        local: { serverAddress: 'http://localhost:11434/api/chat', models: ['llama3.2', 'llama3.2:1b'] }
      };
    }
    console.error('Error loading API keys:', error);
    throw error;
  }
});

// Save API Keys
safeIpcHandle('save-api-keys', async (event, apiKeys) => {
  try {
    console.log('Saving API keys:', JSON.stringify(apiKeys, null, 2));
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
    console.log('API keys saved successfully');
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving API keys:', error);
    return { status: 'error', message: error.message };
  }
});

// Load Selected Model
safeIpcHandle('load-selected-model', async () => {
  try {
    const data = await fs.readFile(SELECTED_MODEL_FILE, 'utf-8');
    return JSON.parse(data).selectedModel;
  } catch (error) {
    console.error('Error loading selected model:', error);
    return 'openai:gpt-3.5-turbo';
  }
});

// Save Selected Model
safeIpcHandle('save-selected-model', async (event, selectedModel) => {
  try {
    await fs.writeFile(SELECTED_MODEL_FILE, JSON.stringify({ selectedModel }));
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving selected model:', error);
    return { status: 'error', message: error.message };
  }
});

/**
 * Provider-Specific Handlers
 */

// OpenAI Streaming
safeIpcHandle('stream-openai', async (event, model, messages) => {
  try {
    const apiKeys = await loadApiKeys();
    console.log('API keys for OpenAI request:', JSON.stringify(apiKeys.openai, null, 2));
    const apiKey = apiKeys.openai.apiKey;

    if (!apiKey) {
      console.error('OpenAI API key is not set');
      throw new Error('OpenAI API key is not set.');
    }

    const data = {
      model: model,
      messages: messages,
      stream: true
    };

    return new Promise((resolve, reject) => {
      const req = https.request('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        res.on('data', (chunk) => {
          event.sender.send('openai-stream', chunk.toString());
        });

        res.on('end', () => {
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error('OpenAI Streaming Error:', error);
        reject(error);
      });

      req.write(JSON.stringify(data));
      req.end();
    });
  } catch (error) {
    console.error('Error in stream-openai:', error);
    throw error;
  }
});

// Anthropic Streaming
safeIpcHandle('stream-anthropic', async (event, model, messages) => {
  try {
    const apiKeysData = await fs.readFile(API_KEYS_FILE, 'utf-8');
    const apiKeys = JSON.parse(apiKeysData);
    const apiKey = apiKeys.anthropic.apiKey;

    if (!apiKey) {
      throw new Error('Anthropic API key is not set.');
    }

    const data = {
      model: model,
      max_tokens: 1024,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      stream: true
    };

    return new Promise((resolve, reject) => {
      const req = https.request('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }, (res) => {
        res.on('data', (chunk) => {
          event.sender.send('anthropic-stream', chunk.toString());
        });

        res.on('end', () => {
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error('Anthropic Streaming Error:', error);
        reject(error);
      });

      req.write(JSON.stringify(data));
      req.end();
    });
  } catch (error) {
    console.error('Error in stream-anthropic:', error);
    throw error;
  }
});

// Groq Streaming
safeIpcHandle('stream-groq', async (event, model, messages) => {
  const apiKeys = JSON.parse(await fs.readFile(API_KEYS_FILE, 'utf-8'));
  const apiKey = apiKeys.groq.apiKey;

  if (!apiKey) {
    throw new Error('Groq API key is not set.');
  }

  const data = {
    model: model,
    messages: messages,
    stream: true,
    max_tokens: 1024
  };

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      res.on('data', (chunk) => {
        event.sender.send('groq-stream', chunk.toString());
      });

      res.on('end', () => {
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Groq Streaming Error:', error);
      reject(error);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
});

// Local (Ollama) Streaming
safeIpcHandle('stream-local', async (event, serverAddress, model, messages) => {
  if (!serverAddress) {
    throw new Error('Local server address is not set.');
  }

  const data = {
    model: model,
    messages: messages,
    stream: true
  };

  return new Promise((resolve, reject) => {
    const url = new URL(serverAddress);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(url, options, (res) => {
      res.on('data', (chunk) => {
        event.sender.send('local-stream', chunk.toString());
      });

      res.on('end', () => {
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Local Streaming Error:', error);
      reject(error);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
});

// Google Gemini Streaming
safeIpcHandle('stream-google', async (event, model, messages) => {
  await streamGoogle(event, model, messages);
});

async function streamGoogle(event, model, messages) {
  try {
    const apiKeys = await loadApiKeys();
    const apiKey = apiKeys.google.apiKey;

    if (!apiKey) {
      throw new Error('Google API key is not set.');
    }

    console.log('Initializing Google Generative AI with model:', model);
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model: model });

    // Format the messages for Google Gemini
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      content: msg.content
    }));

    console.log('Formatted messages:', JSON.stringify(formattedMessages));

    // Prepare the request
    const request = {
      contents: formattedMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    };

    console.log('Sending request to Google API:', JSON.stringify(request));

    const result = await generativeModel.generateContentStream(request);

    console.log('Stream received from Google API');
    let fullResponse = '';

    for await (const chunk of result.stream) {
      console.log('Raw chunk from Google API:', chunk);
      if (chunk.text) {
        const chunkText = chunk.text();
        console.log('Chunk text:', chunkText);
        fullResponse += chunkText;
      } else {
        console.log('Chunk has no text method');
      }
    }

    console.log('Full response:', fullResponse);
    console.log('Sending response to renderer');
    event.sender.send('google-stream', fullResponse);
    console.log('Google stream completed');
    event.sender.send('google-stream', '[DONE]');
  } catch (error) {
    console.error('Error in streamGoogle:', error);
    event.sender.send('google-stream', JSON.stringify({ error: error.message }));
  }
}

function setupGoogleStreamListener() {
  // This function should be called within streamGoogle after creating the stream
  // Example:
  mainWindow.webContents.on('google-stream', (chunk) => {
    mainWindow.webContents.send('google-stream', chunk);
  });
}

// Expose `streamGoogle` via window.api in preload.js

function notifyRendererOfThemeChange() {
  mainWindow.webContents.send('theme-updated');
}

async function streamLocal(serverAddress, model, messages) {
  try {
    // Implement your local model API call here
    // This is just a placeholder example
    const response = await fetch(`${serverAddress}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      mainWindow.webContents.send('local-stream', chunk);
    }

    mainWindow.webContents.send('local-stream', JSON.stringify({ done: true }));
  } catch (error) {
    console.error('Error in streamLocal:', error);
    mainWindow.webContents.send('local-stream', JSON.stringify({ error: error.message }));
  }
}

// Make sure to export the function
module.exports = {
  streamGoogle,
  // ... other exported functions ...
};