// main.js
const { app, BrowserWindow, ipcMain, nativeTheme, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const marked = require('marked');
const https = require('https');
const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');

// Define both default and user data directories
const DEFAULT_DATA_DIR = app.isPackaged 
  ? path.join(process.resourcesPath, 'default_data')
  : path.join(__dirname, 'data');

const USER_DATA_DIR = app.isPackaged 
  ? path.join(app.getPath('userData'), 'data')
  : path.join(__dirname, 'data');

// Update file paths
const DEFAULT_CONFIG_FILE = path.join(DEFAULT_DATA_DIR, 'config.json');
const DEFAULT_SYSTEM_PROMPT_FILE = path.join(DEFAULT_DATA_DIR, 'system_prompt.txt');

const USER_HISTORY_FILE = path.join(USER_DATA_DIR, 'chat_history.json');
const USER_CONFIG_FILE = path.join(USER_DATA_DIR, 'config.json');
const USER_SYSTEM_PROMPT_FILE = path.join(USER_DATA_DIR, 'system_prompt.txt');
const USER_API_KEYS_FILE = path.join(USER_DATA_DIR, 'api_keys.enc');
const USER_SELECTED_MODEL_FILE = path.join(USER_DATA_DIR, 'selected_model.json');

const ipcHandlers = new Set();

function encrypt(text, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, password) {
  const salt = Buffer.from(encryptedData.salt, 'hex');
  const key = crypto.scryptSync(password, salt, 32);
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function loadApiKeys(password) {
  try {
    const encryptedData = await fs.readFile(USER_API_KEYS_FILE, 'utf-8');
    if (!encryptedData) {
      return createEmptyApiKeys();
    }
    
    // If no password provided, use a default one (not recommended for production)
    const encryptionPassword = password || 'default-encryption-key';
    
    // Decrypt the data
    const decrypted = decrypt(JSON.parse(encryptedData), encryptionPassword);
    return JSON.parse(decrypted);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return createEmptyApiKeys();
    }
    console.error('Error loading API keys:', error);
    throw error;
  }
}

async function saveApiKeys(apiKeys, password) {
  const encrypted = encrypt(JSON.stringify(apiKeys), password);
  await fs.writeFile(USER_API_KEYS_FILE, JSON.stringify(encrypted));
}

function createEmptyApiKeys() {
  return {
    openai: { apiKey: '' },
    anthropic: { apiKey: '' },
    groq: { apiKey: '' },
    google: { apiKey: '' }
  };
}

async function createDataFiles() {
  try {
    // Ensure user data directory exists
    await fs.mkdir(USER_DATA_DIR, { recursive: true });
    console.log('User data directory created at:', USER_DATA_DIR);

    // Copy default files if they don't exist in user directory
    const filesToCopy = [
      {
        default: DEFAULT_CONFIG_FILE,
        user: USER_CONFIG_FILE
      },
      {
        default: DEFAULT_SYSTEM_PROMPT_FILE,
        user: USER_SYSTEM_PROMPT_FILE
      }
    ];

    for (const file of filesToCopy) {
      try {
        await fs.access(file.user);
        console.log(`User file exists: ${file.user}`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          try {
            const defaultContent = await fs.readFile(file.default, 'utf-8');
            await fs.writeFile(file.user, defaultContent);
            console.log(`Copied default file to user directory: ${file.user}`);
          } catch (copyError) {
            console.error(`Error copying default file: ${file.default}`, copyError);
          }
        }
      }
    }

    // Create other user-specific files if they don't exist
    const userFiles = [
      { path: USER_HISTORY_FILE, content: '[]' },
      { path: USER_SELECTED_MODEL_FILE, content: JSON.stringify({ selectedModel: 'openai:gpt-4o' }) }
    ];

    for (const file of userFiles) {
      try {
        await fs.access(file.path);
        console.log(`File exists: ${file.path}`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.writeFile(file.path, file.content);
          console.log(`Created file: ${file.path}`);
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
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'PolyLace.png')
  });

  win.setMenu(null);
  win.loadFile('index.html');
  win.webContents.openDevTools(); // Add this line

  // Error listener
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Open DevTools (optional)
  win.webContents.openDevTools();

  // Send the initial theme to the renderer
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('system-theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  // Listen for theme changes
  nativeTheme.on('updated', () => {
    win.webContents.send('system-theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  // Open links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
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
    const data = await fs.readFile(USER_HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
});

// Save Chat History
safeIpcHandle('save-chat-history', async (event, messages) => {
  try {
    await fs.writeFile(USER_HISTORY_FILE, JSON.stringify(messages, null, 4));
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving chat history:', error);
    return { status: 'error', message: error.message };
  }
});

// Load Config
safeIpcHandle('load-config', async () => {
  try {
    const data = await fs.readFile(USER_CONFIG_FILE, 'utf-8');
    const config = JSON.parse(data);
    // Ensure the config has the required structure
    return {
      context_window_size: config.context_window_size || 10,
      providers: {
        openai: {
          models: config.providers?.openai?.models || ['gpt-4', 'gpt-3.5-turbo'],
        },
        anthropic: {
          models: config.providers?.anthropic?.models || ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        },
        groq: {
          models: config.providers?.groq?.models || ['mixtral-8x7b-32768', 'llama2-70b-4096'],
        },
        local: {
          models: config.providers?.local?.models || ['llama2', 'mistral'],
          serverAddress: config.providers?.local?.serverAddress || 'http://localhost:11434/api/chat',
        },
        google: {
          models: config.providers?.google?.models || ['gemini-1.5-pro', 'gemini-1.5-ultra'],
        }
      }
    };
  } catch (error) {
    console.error('Error loading config:', error);
    // Return default config if file doesn't exist or is invalid
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
});

// Save Config
safeIpcHandle('save-config', async (event, config) => {
  try {
    await fs.writeFile(USER_CONFIG_FILE, JSON.stringify(config, null, 4));
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving config:', error);
    return { status: 'error', message: error.message };
  }
});

// Load System Prompt
safeIpcHandle('load-system-prompt', async () => {
  try {
    const data = await fs.readFile(USER_SYSTEM_PROMPT_FILE, 'utf-8');
    return data;
  } catch (error) {
    console.error('Error loading system prompt:', error);
    return 'You are *Ada*, a **helpful** AI assistant.\nFeel free to ask me anything!';
  }
});

// Save System Prompt
safeIpcHandle('save-system-prompt', async (event, prompt) => {
  try {
    await fs.writeFile(USER_SYSTEM_PROMPT_FILE, prompt);
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
safeIpcHandle('load-api-keys', async (event, password) => {
  try {
    const encryptedData = await fs.readFile(USER_API_KEYS_FILE, 'utf-8');
    if (!encryptedData) {
      return createEmptyApiKeys();
    }
    
    // If no password provided, use a default one (not recommended for production)
    const encryptionPassword = password || 'default-encryption-key';
    
    // Decrypt the data
    const decrypted = decrypt(JSON.parse(encryptedData), encryptionPassword);
    return JSON.parse(decrypted);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return createEmptyApiKeys();
    }
    console.error('Error loading API keys:', error);
    throw error;
  }
});

// Save API Keys
safeIpcHandle('save-api-keys', async (event, newApiKeys, password) => {
  try {
    // If no password provided, use a default one (not recommended for production)
    const encryptionPassword = password || 'default-encryption-key';
    
    // Encrypt the API keys
    const encrypted = encrypt(JSON.stringify(newApiKeys), encryptionPassword);
    
    // Save the encrypted data
    await fs.writeFile(USER_API_KEYS_FILE, JSON.stringify(encrypted));
    return { status: 'success' };
  } catch (error) {
    console.error('Error saving API keys:', error);
    return { status: 'error', message: error.message };
  }
});

// Load Selected Model
safeIpcHandle('load-selected-model', async () => {
  try {
    const data = await fs.readFile(USER_SELECTED_MODEL_FILE, 'utf-8');
    return JSON.parse(data).selectedModel;
  } catch (error) {
    console.error('Error loading selected model:', error);
    return 'openai:gpt-3.5-turbo';
  }
});

// Save Selected Model
safeIpcHandle('save-selected-model', async (event, selectedModel) => {
  try {
    await fs.writeFile(USER_SELECTED_MODEL_FILE, JSON.stringify({ selectedModel }));
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
    const apiKeys = await loadApiKeys();
    const apiKey = apiKeys.anthropic?.apiKey;

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
  try {
    const apiKeys = await loadApiKeys();
    const apiKey = apiKeys.groq?.apiKey;

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
  } catch (error) {
    console.error('Error in stream-groq:', error);
    throw error;
  }
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

    for await (const chunk of result.stream) {
      console.log('Emitting google-stream chunk:', chunk.text());
      event.sender.send('google-stream', chunk.text());
    }

    console.log('Emitting google-stream [DONE]');
    event.sender.send('google-stream', '[DONE]');
  } catch (error) {
    console.error('Error in stream-google:', error);
    event.sender.send('google-stream', JSON.stringify({ error: error.message }));
  }
});

function setupGoogleStreamListener() {
  // This function should be called within streamGoogle after creating the stream
  // Example:
  mainWindow.webContents.on('google-stream', (chunk) => {
    mainWindow.webContents.send('google-stream', chunk);
  });
}

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

ipcMain.on('close-options-modal', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.webContents.send('close-options-modal');
  }
});
