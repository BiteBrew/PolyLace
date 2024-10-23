// chatRenderer.js
import { chatDisplay, scrollToBottom, messages } from './renderer.js';
import { resolveContent } from './utils.js';
import electron from './electronBridge.js';
const { ipcRenderer } = electron;

export async function renderChat() {
  chatDisplay.innerHTML = '';
  try {
    for (const message of messages) {
      // Skip rendering system messages
      if (message.role === 'system') continue;
      
      const content = await resolveContent(message.content);
      const messageElement = await displayMessage(message.role === 'user' ? 'You' : 'AI', content);
      
      // Add copy icon for AI messages when rendering from history
      if (message.role === 'assistant') {
        addCopyIconToMessage(messageElement, content);
      }
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
  
  const parsedContent = await ipcRenderer.invoke('parse-markdown', content);
  contentElement.innerHTML = parsedContent;
  
  // Add copy buttons to code blocks
  addCopyButtonsToCodeBlocks(contentElement);
  
  messageElement.appendChild(contentElement);
  
  // We'll add the copy icon later for AI messages
  
  chatDisplay.appendChild(messageElement);
  console.log('Message element added to chatDisplay');
  scrollToBottom();
  return messageElement;
}

function addCopyButtonsToCodeBlocks(contentElement) {
  const codeBlocks = contentElement.querySelectorAll('pre');
  codeBlocks.forEach((pre, index) => {
    // Create a wrapper for the button and the pre element
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    
    // Create the copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.className = 'copy-button';
    copyButton.onclick = () => copyCodeToClipboard(pre, copyButton);
    
    // Insert the pre element into the wrapper
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(copyButton);
    wrapper.appendChild(pre);
  });
}

function copyCodeToClipboard(pre, button) {
  const code = pre.textContent;
  navigator.clipboard.writeText(code).then(() => {
    console.log('Code copied to clipboard');
    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = 'Copy';
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy code: ', err);
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Text copied to clipboard');
    showNotification('Text copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = 'notification';
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

export async function updateMessageContent(messageElement, content) {
  console.log('Updating message content:', content);
  try {
    if (!(messageElement instanceof Element)) {
      console.error('Invalid messageElement:', messageElement);
      return messageElement; // Return the element for chaining
    }

    const contentElement = messageElement.querySelector('.message-content');
    if (contentElement) {
      const parsedContent = await ipcRenderer.invoke('parse-markdown', content);
      contentElement.innerHTML = parsedContent;
      // Re-add copy buttons to code blocks after content update
      addCopyButtonsToCodeBlocks(contentElement);
    } else {
      console.warn('Content element not found in message, creating new one');
      const newContentElement = document.createElement('div');
      newContentElement.className = 'message-content';
      const parsedContent = await ipcRenderer.invoke('parse-markdown', content);
      newContentElement.innerHTML = parsedContent;
      addCopyButtonsToCodeBlocks(newContentElement);
      messageElement.appendChild(newContentElement);
    }
    scrollToBottom();
    return messageElement; // Return the element for chaining
  } catch (error) {
    console.error('Error updating message content:', error);
    return messageElement; // Return the element even on error
  }
}

export function displayError(sender, message) {
  displayMessage(sender, `❌ ${message}`);
}

// New function to add copy icon after streaming is complete
export function addCopyIconToMessage(messageElement, content) {
  if (!messageElement) {
    console.warn('messageElement is null in addCopyIconToMessage');
    return;
  }

  try {
    console.log('Adding copy icon to message with classes:', messageElement.classList.toString());
    // Remove existing copy icon if it exists
    const existingIcon = messageElement.querySelector('.copy-icon-wrapper');
    if (existingIcon) {
      existingIcon.remove();
    }

    if (messageElement.classList.contains('ai-message')) {
      const copyIconWrapper = document.createElement('div');
      copyIconWrapper.className = 'copy-icon-wrapper';
      
      const copyIcon = document.createElement('img');
      copyIcon.src = 'assets/images/copy_text_icon.png';
      copyIcon.className = 'copy-icon';
      copyIcon.title = 'Copy to clipboard';
      copyIcon.onclick = () => copyToClipboard(content);
      
      copyIconWrapper.appendChild(copyIcon);
      messageElement.appendChild(copyIconWrapper);
      console.log('Copy icon added successfully');
    } else {
      console.log('Message is not AI message');
    }
  } catch (error) {
    console.error('Error adding copy icon to message:', error);
  }
}
