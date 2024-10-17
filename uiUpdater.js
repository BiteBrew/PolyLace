// uiUpdater.js
import { modelSelector, selectedModel, apiKeys } from './renderer.js';

export async function populateModelSelector() {
  modelSelector.innerHTML = ''; // Clear existing options

  for (const [provider, config] of Object.entries(apiKeys)) {
    if (provider === 'local') continue; // Handle local differently if needed

    if (config.models && config.models.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
      
      for (const model of config.models) {
        const option = document.createElement('option');
        option.value = `${provider}:${model}`;
        option.textContent = `${model}`;
        optgroup.appendChild(option);
      }
      modelSelector.appendChild(optgroup);
    }
  }

  // Handle local models
  const localConfig = apiKeys.local;
  if (localConfig && localConfig.models && localConfig.models.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = 'Local';

    for (const model of localConfig.models) {
      const option = document.createElement('option');
      option.value = `local:${model}`;
      option.textContent = `${model}`;
      optgroup.appendChild(option);
    }
    modelSelector.appendChild(optgroup);
  }

  // Set the selected model
  modelSelector.value = selectedModel;
}
