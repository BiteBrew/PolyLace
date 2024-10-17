// renderer.js
import { setupEventListeners } from './eventHandlers.js';
import { renderChat, displayMessage, updateMessageContent } from './chatRenderer.js';
import { loadApiKeys, loadChatHistory, loadConfig, loadSystemPrompt, loadSelectedModel } from './dataLoader.js';
import { handleStreamingResponse } from './streamHandler.js';
import { populateModelSelector } from './uiUpdater.js';

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

// Add this function to set up streaming listeners
function setupStreamingListeners() {
  window.api.on('openai-stream', (chunk) => handleStreamingResponse('OpenAI', chunk, 'openai'));
  window.api.on('anthropic-stream', (chunk) => handleStreamingResponse('Anthropic', chunk, 'anthropic'));
  window.api.on('groq-stream', (chunk) => handleStreamingResponse('Groq', chunk, 'groq'));
  window.api.on('local-stream', (chunk) => handleStreamingResponse('Local', chunk, 'local'));
  window.api.on('google-stream', (chunk) => handleStreamingResponse('Google', chunk, 'google'));
}

async function applySystemTheme() {
  try {
    const theme = await window.api.getSystemTheme();
    document.body.setAttribute('data-theme', theme);
  } catch (error) {
    console.error('Error applying system theme:', error);
  }
}

function handleLinkClicks(event) {
  const target = event.target.closest('a');
  if (target && target.href) {
    event.preventDefault();
    window.api.openExternalLink(target.href);
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
  window.api.onThemeUpdated((theme) => {
    document.body.setAttribute('data-theme', theme);
  });
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

export { 
  apiKeys, messages, config, systemPrompt, selectedModel, 
  streamingContent, currentStreamingMessage, lastDisplayedContent, groqBuffer,
  chatDisplay, inputField, modelSelector, clearButton, optionsButton, optionsModal, optionsForm, closeButton,
  scrollToBottom, updateMessages, updateStreamingContent, updateCurrentStreamingMessage, updateLastDisplayedContent,
  updateGroqBuffer
};
