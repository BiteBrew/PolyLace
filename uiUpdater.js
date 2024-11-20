// uiUpdater.js
import { modelSelector, config } from './renderer.js';
import electron from './electronBridge.js';
const { ipcRenderer } = electron;

export async function populateModelSelector() {
  if (!modelSelector) {
    console.error('Model selector element not found');
    return;
  }

  // Clear existing options
  modelSelector.innerHTML = '';

  try {
    // Get the last selected model from storage
    const lastSelectedModel = await ipcRenderer.invoke('load-selected-model') || 'openai:gpt4o-mini';
    console.log('Last selected model:', lastSelectedModel);

    let hasSelectedModel = false;

    // Iterate over each provider in the config and add their models
    for (const [provider, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig && Array.isArray(providerConfig.models)) {
        // Add a group for each provider
        const optgroup = document.createElement('optgroup');
        optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
        
        providerConfig.models.forEach(model => {
          const option = document.createElement('option');
          const modelValue = `${provider}:${model}`;
          option.value = modelValue;
          option.textContent = `${model}`;
          
          // Select this option if it matches the last selected model
          if (modelValue === lastSelectedModel) {
            option.selected = true;
            hasSelectedModel = true;
          }
          
          optgroup.appendChild(option);
        });
        
        modelSelector.appendChild(optgroup);
      }
    }

    // If no model was selected, select the default
    if (!hasSelectedModel) {
      const defaultOption = modelSelector.querySelector('option[value="openai:gpt4o-mini"]');
      if (defaultOption) {
        defaultOption.selected = true;
      }
    }

    // Add change event listener to save selected model
    modelSelector.addEventListener('change', async (event) => {
      await ipcRenderer.invoke('save-selected-model', event.target.value);
    });

  } catch (error) {
    console.error('Error populating model selector:', error);
    // Add a default option in case of error
    const option = document.createElement('option');
    option.value = 'openai:gpt4o-mini';
    option.textContent = 'OpenAI - gpt4o-mini';
    modelSelector.appendChild(option);
  }
}
