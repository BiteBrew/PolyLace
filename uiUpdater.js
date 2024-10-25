// uiUpdater.js
import { modelSelector, config } from './renderer.js';

export async function populateModelSelector() {
  if (!modelSelector) {
    console.error('Model selector element not found');
    return;
  }

  // Clear existing options
  modelSelector.innerHTML = '';

  // Check if config and providers exist
  if (!config || !config.providers) {
    console.error('Config or providers not initialized:', config);
    // Add a default option
    const option = document.createElement('option');
    option.value = 'openai:gpt-3.5-turbo';
    option.textContent = 'OpenAI - GPT-3.5 Turbo';
    modelSelector.appendChild(option);
    return;
  }

  try {
    // Iterate over each provider in the config and add their models
    for (const [provider, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig && Array.isArray(providerConfig.models)) {
        providerConfig.models.forEach(model => {
          const option = document.createElement('option');
          option.value = `${provider}:${model}`;
          option.textContent = `${provider} - ${model}`;
          modelSelector.appendChild(option);
        });
      }
    }

    // If no options were added, add a default option
    if (modelSelector.options.length === 0) {
      const option = document.createElement('option');
      option.value = 'openai:gpt-3.5-turbo';
      option.textContent = 'OpenAI - GPT-3.5 Turbo';
      modelSelector.appendChild(option);
    }
  } catch (error) {
    console.error('Error populating model selector:', error);
    // Add a default option in case of error
    const option = document.createElement('option');
    option.value = 'openai:gpt-3.5-turbo';
    option.textContent = 'OpenAI - GPT-3.5 Turbo';
    modelSelector.appendChild(option);
  }

  // Optionally, set the selected model to the previously selected one
  // This assumes you have a `selectedModel` variable exported from renderer.js
  const selectedModelOption = modelSelector.querySelector(`option[value="${config.selectedModel}"]`);
  if (selectedModelOption) {
    modelSelector.value = selectedModelOption.value;
  } else if (modelSelector.options.length > 0) {
    modelSelector.value = modelSelector.options[0].value; // Set to first option if previous selection not found
  }
}
