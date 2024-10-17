// chatRenderer.js
import { chatDisplay, scrollToBottom, messages } from './renderer.js';
import { resolveContent } from './utils.js';

export async function renderChat() {
  chatDisplay.innerHTML = '';
  try {
    for (const message of messages) {
      const content = await resolveContent(message.content);
      await displayMessage(message.role === 'user' ? 'You' : 'AI', content);
    }
  } catch (error) {
    console.error('Error rendering chat:', error);
    displayError('System', `Error rendering chat: ${error.message}`);
  }
}

export async function displayMessage(sender, content) {
  console.log(`Displaying message from ${sender}:`, content);
  if (!chatDisplay) {
    console.error('chatDisplay is not defined!');
    return null;
  }
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender.toLowerCase()}-message`;
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  contentElement.textContent = content;
  
  messageElement.appendChild(contentElement);
  
  chatDisplay.appendChild(messageElement);
  console.log('Message element added to chatDisplay');
  scrollToBottom();
  return messageElement;
}

export async function updateMessageContent(messageElementPromise, content) {
  console.log('Updating message content:', content);
  try {
    const messageElement = await messageElementPromise;
    if (!(messageElement instanceof Element)) {
      console.error('Invalid messageElement:', messageElement);
      return;
    }

    const contentElement = messageElement.querySelector('.message-content');
    if (contentElement) {
      contentElement.textContent = content;
    } else {
      console.warn('Content element not found in message, creating new one');
      const newContentElement = document.createElement('div');
      newContentElement.className = 'message-content';
      newContentElement.textContent = content;
      messageElement.appendChild(newContentElement);
    }
    scrollToBottom();
  } catch (error) {
    console.error('Error updating message content:', error);
  }
}

export function displayError(sender, message) {
  displayMessage(sender, `❌ ${message}`);
}
