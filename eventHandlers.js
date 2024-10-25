console.log('eventHandlers.js loaded');

import electron from './electronBridge.js';
const { ipcRenderer } = electron;
import { sendMessage, clearChat, handleOptionsSubmit, populateOptionsForm } from './chatActions.js';
import { applySystemTheme, loadApiKeys, saveSelectedModel } from './dataLoader.js';
import { inputField, clearButton, optionsButton, closeButton, optionsForm, modelSelector } from './renderer.js';

export function setupEventListeners() {
  console.log('Setting up event listeners');

  if (!optionsButton) {
    console.error('Options button not found');
    return;
  }

  // Comment out the simple click listener
  /*
  optionsButton.addEventListener('click', () => {
    console.log('Options button clicked');
    alert('Options button clicked');
  });
  */

  // Uncomment and modify the complex listener
  optionsButton.addEventListener('click', async () => {
    console.log('Options button clicked');
    try {
      console.log('Attempting to populate options form');
      await populateOptionsForm();
      console.log('Options form populated successfully');
      const optionsModal = document.getElementById('options-modal');
      if (optionsModal) {
        optionsModal.style.display = 'block';
        console.log('Options modal displayed');
      } else {
        console.error('Options modal element not found');
      }
    } catch (error) {
      console.error('Error opening options modal:', error);
      alert('There was an error opening the options. Please try again.');
    }
  });

  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  clearButton.addEventListener('click', clearChat);

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