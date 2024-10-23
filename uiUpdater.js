// uiUpdater.js
import { modelSelector, selectedModel, config } from './renderer.js'; // Import config instead of apiKeys

export async function populateModelSelector() {
  try {
    modelSelector.innerHTML = ''; // Clear existing options
    
    // Use config.providers instead of apiKeys
    for (const [provider, providerConfig] of Object.entries(config.providers)) {
      if (provider === 'local') continue; // Handle local differently if needed
      
      if (providerConfig.models && providerConfig.models.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
        
        for (const model of providerConfig.models) {
          const option = document.createElement('option');
          option.value = `${provider}:${model}`;
          option.textContent = model;
          optgroup.appendChild(option);
        }
        
        modelSelector.appendChild(optgroup);
      }
    }

    // Handle local models separately
    const localConfig = config.providers.local;
    if (localConfig && localConfig.models && localConfig.models.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Local';

      for (const model of localConfig.models) {
        const option = document.createElement('option');
        option.value = `local:${model}`;
        option.textContent = model;
        optgroup.appendChild(option);
      }
      
      modelSelector.appendChild(optgroup);
    }

    // Set the selected model
    if (selectedModel) {
      modelSelector.value = selectedModel;
    }
    
    console.log('Model selector populated with options:', modelSelector.innerHTML);
  } catch (error) {
    console.error('Error populating model selector:', error);
  }
}
