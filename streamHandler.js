// streamHandler.js
import { 
  updateStreamingContent, 
  streamingContent, 
  currentStreamingMessage, 
  messages, 
  updateMessages,
  updateGroqBuffer,  // Add this
  groqBuffer        // Add this
} from './renderer.js';
import { updateMessageContent, addCopyIconToMessage, displayError } from './chatRenderer.js';
import { finalizeMessage, resetStreamingState, updateDisplayIfNeeded } from './chatActions.js';
import electron from './electronBridge.js';
const { ipcRenderer } = electron;

export async function handleStreamingResponse(sender, chunk, provider) {
  console.log(`Handling streaming response from ${provider}:`, chunk);
  try {
    // Special handling for Google's stream completion
    if (provider === 'google' && chunk === '[DONE]') {
      console.log('Google stream completed');
      // Store the final content before resetting
      const finalContent = streamingContent;
      const finalMessage = currentStreamingMessage;
      
      // Ensure we have content and a message element
      if (finalContent && finalMessage) {
        const messageElement = await finalMessage;
        if (messageElement) {
          await updateMessageContent(messageElement, finalContent);
          const aiMessage = { role: 'assistant', content: String(finalContent).trim() };
          updateMessages([...messages, aiMessage]);
          await ipcRenderer.invoke('save-chat-history', messages);
          
          console.log('Adding copy icon to Google response');
          addCopyIconToMessage(messageElement, finalContent);
        }
      }
      
      // Reset state after everything is done
      resetStreamingState();
      return;
    }

    const { newContent, isDone } = processChunk(chunk, provider);

    if (newContent) {
      console.log('New content received:', newContent);
      updateStreamingContent(prevContent => prevContent + newContent);
      await updateDisplayIfNeeded();
    }

    if (isDone && provider !== 'google') {
      console.log('Stream is done, finalizing message');
      await finalizeMessage();
    }
  } catch (error) {
    console.error('Streaming Error:', error);
    displayError(sender, error.message);
    resetStreamingState();
  }
}

export function processChunk(chunk, provider) {
  switch (provider) {
    case 'google':
      return processGoogleChunk(chunk);
    case 'groq':
      return processGroqChunk(chunk);
    case 'local':
      return processLocalChunk(chunk);
    default:
      return processDefaultChunk(chunk, provider);
  }
}

function processGoogleChunk(chunk) {
  if (chunk === '[DONE]') {
    return { newContent: '', isDone: true };
  }
  return { newContent: chunk, isDone: false };
}

function processGroqChunk(chunk) {
  updateGroqBuffer(prevBuffer => prevBuffer + chunk);
  let newContent = '';
  let isDone = false;

  const lines = groqBuffer.split('\n');
  updateGroqBuffer(lines.pop() || '');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonString = line.slice(5).trim();
      if (jsonString === '[DONE]') {
        isDone = true;
        break;
      }
      try {
        const jsonData = JSON.parse(jsonString);
        if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta) {
          newContent += jsonData.choices[0].delta.content || '';
        }
      } catch (e) {
        console.warn('Error parsing Groq JSON:', e, 'Raw data:', jsonString);
      }
    }
  }

  return { newContent, isDone };
}

function processLocalChunk(chunk) {
  try {
    const data = JSON.parse(chunk);
    if (data.message && data.message.content) {
      return { newContent: data.message.content, isDone: data.done === true };
    }
    if (data.done === true) {
      return { newContent: '', isDone: true };
    }
  } catch (jsonError) {
    console.warn('Error parsing JSON from local provider:', jsonError, 'Raw chunk:', chunk);
    return { newContent: chunk, isDone: false };
  }
  return { newContent: '', isDone: false };
}

function processDefaultChunk(chunk, provider) {
  let newContent = '';
  let isDone = false;

  if (typeof chunk === 'string') {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonString = line.slice(5).trim();
        if (jsonString && jsonString !== '[DONE]') {
          try {
            const jsonData = JSON.parse(jsonString);
            if (provider === 'anthropic' && jsonData.type === 'content_block_delta') {
              newContent += jsonData.delta.text || '';
            } else if ((provider === 'openai' || provider === 'groq') && 
                       jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta) {
              newContent += jsonData.choices[0].delta.content || '';
            }
          } catch (e) {
            console.warn('Error parsing JSON:', e, 'Raw data:', jsonString);
          }
        }
      }
    }
    isDone = chunk.includes('"finish_reason":"stop"') || chunk.includes('"type":"message_stop"');
  }

  return { newContent, isDone };
}