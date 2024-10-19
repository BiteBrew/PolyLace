// renderer.js
import { setupEventListeners, clearChat } from './chatActions.js';
import { renderChat, displayMessage, updateMessageContent } from './chatRenderer.js';
import { loadApiKeys, loadChatHistory, loadConfig, loadSystemPrompt, loadSelectedModel } from './dataLoader.js';
import { handleStreamingResponse } from './streamHandler.js';
import { populateModelSelector } from './uiUpdater.js';
import electron from './electronBridge.js';
const { ipcRenderer } = electron;
const marked = require('marked');

// Set up marked options
marked.setOptions({
  mangle: false,
  headerIds: false
});

let apiKeys = {};
let messages = [];
let config = {};
let systemPrompt = '';
let selectedModel = 'openai:gpt-3.5-turbo'; // Default model
let streamingContent = '';
let currentStreamingMessage = null;
let lastDisplayedContent = '';
let groqBuffer = '';

// DOM Elements
const chatDisplay = document.getElementById('chat-display');
const inputField = document.getElementById('input-field');
const modelSelector = document.getElementById('model-selector');
const clearButton = document.getElementById('clear-button');
const optionsButton = document.getElementById('options-button');
const optionsModal = document.getElementById('options-modal');
const optionsForm = document.getElementById('options-form');
const closeButton = document.querySelector('.close-button');

// Add auto-resize function
function autoResizeTextarea(textarea, reset = false) {
  if (reset) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    return;
  }
  
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

// Add paste handling function
function handlePaste(event) {
  event.preventDefault();
  const clipboardData = event.clipboardData || window.clipboardData;
  let pastedData = clipboardData.getData('Text');

  // Optional: Sanitize pasted data
  pastedData = sanitizePastedData(pastedData);

  // Insert the sanitized text at the cursor position
  insertAtCursor(event.target, pastedData);
}

// Sanitize pasted data
function sanitizePastedData(text) {
  // Example: Remove any unnecessary whitespace
  return text.replace(/\s+/g, ' ').trim();
}

// Insert text at cursor position
function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  textarea.value = before + text + after;
  
  // Move the cursor to the end of the inserted text
  const cursorPosition = start + text.length;
  textarea.setSelectionRange(cursorPosition, cursorPosition);
  
  // Trigger the input event to resize the textarea
  textarea.dispatchEvent(new Event('input'));
}

// Expose functions to global scope
window.autoResizeTextarea = autoResizeTextarea;
window.handlePaste = handlePaste;
window.sanitizePastedData = sanitizePastedData;
window.insertAtCursor = insertAtCursor;

// Add event listeners for auto-resize and paste handling
inputField.addEventListener('input', function() {
  autoResizeTextarea(this);
});

inputField.addEventListener('paste', handlePaste);

// Add this function to set up streaming listeners
function setupStreamingListeners() {
  ipcRenderer.on('openai-stream', (event, chunk) => handleStreamingResponse('OpenAI', chunk, 'openai'));
  ipcRenderer.on('anthropic-stream', (event, chunk) => handleStreamingResponse('Anthropic', chunk, 'anthropic'));
  ipcRenderer.on('groq-stream', (event, chunk) => handleStreamingResponse('Groq', chunk, 'groq'));
  ipcRenderer.on('local-stream', (event, chunk) => handleStreamingResponse('Local', chunk, 'local'));
  ipcRenderer.on('google-stream', (event, chunk) => handleStreamingResponse('Google', chunk, 'google'));
}

async function applySystemTheme() {
  try {
    const theme = await ipcRenderer.invoke('get-system-theme');
    document.body.setAttribute('data-theme', theme);
  } catch (error) {
    console.error('Error applying system theme:', error);
  }
}

function handleLinkClicks(event) {
  const target = event.target.closest('a');
  if (target && target.href) {
    event.preventDefault();
    ipcRenderer.invoke('open-external-link', target.href);
  }
}

// Update the DOMContentLoaded event listener
window.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM fully loaded and parsed');
  checkChatDisplay();
  await applySystemTheme();
  apiKeys = await loadApiKeys();
  messages = await loadChatHistory();
  config = await loadConfig();
  systemPrompt = await loadSystemPrompt();
  selectedModel = await loadSelectedModel();
  await populateModelSelector();
  renderChat();
  setupEventListeners();
  setupStreamingListeners(); // Add this line

  // Add event listener for link clicks
  document.addEventListener('click', handleLinkClicks);

  // Listen for theme changes
  ipcRenderer.on('theme-updated', (event, theme) => {
    document.body.setAttribute('data-theme', theme);
  });

  const clearButton = document.getElementById('clear-button');
  if (clearButton) {
    clearButton.addEventListener('click', clearChat);
  } else {
    console.error('Clear button not found');
  }
});

function checkChatDisplay() {
  if (chatDisplay) {
    console.log('chatDisplay found:', chatDisplay);
  } else {
    console.error('chatDisplay not found!');
  }
}

function scrollToBottom() {
  if (chatDisplay) {
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
    console.log('Scrolled to bottom');
  } else {
    console.warn('chatDisplay not found, unable to scroll');
  }
}

function updateMessages(newMessages) {
  messages = newMessages;
}

function updateStreamingContent(newContentOrUpdateFunction) {
  if (typeof newContentOrUpdateFunction === 'function') {
    streamingContent = newContentOrUpdateFunction(streamingContent);
  } else {
    streamingContent = newContentOrUpdateFunction;
  }
  // Ensure streamingContent is always a string
  streamingContent = String(streamingContent);
}

function updateCurrentStreamingMessage(newMessage) {
  currentStreamingMessage = newMessage;
}

function updateLastDisplayedContent(newContent) {
  lastDisplayedContent = newContent;
}

function updateGroqBuffer(newBufferOrUpdateFunction) {
  if (typeof newBufferOrUpdateFunction === 'function') {
    groqBuffer = newBufferOrUpdateFunction(groqBuffer);
  } else {
    groqBuffer = newBufferOrUpdateFunction;
  }
}

// Listen for theme updates
ipcRenderer.on('system-theme-updated', (event, theme) => {
  // Handle theme update
});

// Function to parse markdown
function parseMarkdown(content) {
  return marked.parse(content);
}

// Function to open external links
function openExternalLink(url) {
  shell.openExternal(url);
}

// Call these functions when needed
applySystemTheme();
loadApiKeys();

// Export functions if needed
module.exports = {
  parseMarkdown,
  openExternalLink,
  // ... other functions you want to expose ...
};

export { 
  apiKeys, messages, config, systemPrompt, selectedModel, 
  streamingContent, currentStreamingMessage, lastDisplayedContent, groqBuffer,
  chatDisplay, inputField, modelSelector, clearButton, optionsButton, optionsModal, optionsForm, closeButton,
  scrollToBottom, updateMessages, updateStreamingContent, updateCurrentStreamingMessage, updateLastDisplayedContent,
  updateGroqBuffer,
  autoResizeTextarea
};
