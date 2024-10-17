import { sendMessage, clearChat, handleOptionsSubmit } from './chatActions.js';
import { saveSelectedModel } from './dataLoader.js';
import { applySystemTheme } from './dataLoader.js';
import { inputField, clearButton, optionsButton, optionsModal, closeButton, optionsForm, modelSelector } from './renderer.js';

export function setupEventListeners() {
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  clearButton.addEventListener('click', clearChat);
  optionsButton.addEventListener('click', () => {
    optionsModal.style.display = 'block';
  });

  closeButton.addEventListener('click', () => {
    optionsModal.style.display = 'none';
  });

  optionsForm.addEventListener('submit', handleOptionsSubmit);

  window.api.on('theme-updated', async () => {
    await applySystemTheme();
  });

  modelSelector.addEventListener('change', async (e) => {
    const selectedModel = e.target.value;
    await saveSelectedModel(selectedModel);
  });
}
