import electron from './electronBridge.js';
const { ipcRenderer } = electron;
import { sendMessage, clearChat, handleOptionsSubmit, populateOptionsForm } from './chatActions.js';
import { saveSelectedModel } from './dataLoader.js';
import { applySystemTheme } from './dataLoader.js';
import { inputField, clearButton, optionsButton, closeButton, optionsForm, modelSelector } from './renderer.js';

export function setupEventListeners() {
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  clearButton.addEventListener('click', clearChat);
  optionsButton.addEventListener('click', async () => {
    await populateOptionsForm();
    document.getElementById('options-modal').style.display = 'block';
  });

  closeButton.addEventListener('click', () => {
    document.getElementById('options-modal').style.display = 'none';
  });

  optionsForm.addEventListener('submit', handleOptionsSubmit);

  ipcRenderer.on('theme-updated', async () => {
    await applySystemTheme();
  });

  modelSelector.addEventListener('change', async (e) => {
    const selectedModel = e.target.value;
    await saveSelectedModel(selectedModel);
  });

  // Add this new event listener
  ipcRenderer.on('close-options-modal', () => {
    document.getElementById('options-modal').style.display = 'none';
  });
}
