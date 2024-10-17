# PolyLace -- Weaving Conversations Across Models

PolyLace is a cross-platform Electron-based application designed to weave conversations across multiple AI models. Whether you're leveraging OpenAI, Anthropic, Groq AI, or local models, PolyLace provides a unified interface to interact with your preferred AI systems seamlessly.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Getting Started with Local Models](#getting-started-with-local-models)
- [Usage](#usage)
- [Configuration](#configuration)
- [Current Features](#current-features)
- [Areas for Improvement](#areas-for-improvement)
- [Conclusion](#conclusion)      
- [Key Components](#key-components)    

## Features

- **Multi-Model Support:** Interact with various AI models including OpenAI, Anthropic, Groq AI, and local models managed via Ollama.
- **Unified Chat Interface:** Seamlessly switch between different AI models within a single conversation window.
- **API Keys Management:** Securely manage and store API keys for all supported AI providers.
- **Chat History:** Save and load chat histories to maintain context across sessions.
- **Customizable System Prompts:** Tailor the AI's persona and behavior with custom system prompts.
- **Cross-Platform Builds:** Build and distribute PolyLace for Windows, macOS, and Linux.
- **User-Friendly UI:** Intuitive interface with modern design elements and animations.

## Installation

### Prerequisites

- **Node.js:** Ensure you have [Node.js](https://nodejs.org/) installed (version 14 or higher recommended).
- **npm:** Node.js installation comes with npm. Verify by running `npm -v` in your terminal.
- **Electron:** Install Electron globally using npm:

  ```bash
  npm install -g electron
  ```

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/BiteBrew/PolyLace.git
   cd PolyLace
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Run the Application**

   ```bash
   npm start
   ```

4. **Build the Application**

   ```bash
   npm run build:mac
   ```

   ```bash
   npm run build:win
   ```

   ```bash
   npm run build:linux
   ```
*note you can only build for mac on a mac os system. You can build for windows and linux on any system with the correct dependencies.

### Getting Started with Local Models

To get started with local models, follow these steps:

1. **Install Ollama**:
   - Download and install Ollama from [ollama.com](https://ollama.com/).


To install the default models run the following commands in your terminal:

```bash
ollama pull llama3.2
ollama pull llama3.2:1b
```
Other installable models can be found [here](https://ollama.com/library).

To start the ollama server run the following command in your terminal usually this will already be running in the background:

```bash
ollama serve
```
To list the models currently available on your PC run the following command:

```bash
ollama list
```   
Make sure to add those exact names, separated by commas, in the PolyLace settings to make them avalable in PolyLace.

### Getting API Keys and Model Names

Get an OpenAI API key (paid plan required) [here](https://platform.openai.com/account/api-keys).

See their available models [here](https://platform.openai.com/docs/models).

Get an Anthropic API key (paid plan required) [here](https://www.anthropic.com/product).

See their available models [here](https://docs.anthropic.com/claude-3-opus/reference/Claude-3-Opus-Models).

Get an Groq API key (free key available) [here](https://console.groq.com/keys).

See their available models [here](https://docs.groq.com/docs/models).

Get a Google API key (free key available) [here](https://console.cloud.google.com/apis/credentials).

See their available models [here](https://ai.google.dev/gemini-api/docs/models/gemini).

## Usage

### Starting a Conversation

1. **Select an AI Model:**
   - Use the dropdown menu at the top to choose from available AI models across different providers.

2. **Type Your Message:**
   - Enter your message in the input field at the bottom and press Enter or click the send button. Change models at any time without losing any conversation context. For example you can use any onlie model to answer a question and then switch to a local model to summarize or translate the conversation. Local models can also be used without an internet connection and maintain privacy by not sending requests to the internet. Do remember the entire context is sent with each request.

3. **Manage Conversations:**
   - Use the "Clear Conversation" button to reset the chat history.
   - Access additional options by clicking the gear icon to manage API keys, models, and other settings.

### Managing API Keys

1. **Open Options Modal:**
   - Click on the gear icon to open the options modal.

2. **Navigate to API Keys Management:**
   - Scroll to the "API Keys Management" section.

3. **Enter API Keys:**
   - Input your API keys for OpenAI, Anthropic, Groq AI, or configure local model server addresses.

4. **Save Configuration:**
   - Click the "Save" button to store your configurations securely.

## Configuration

PolyLace uses a combination of JSON and YAML configuration files to manage settings and API keys. These files are automatically created and managed in the application's data directory.

### Key Configuration Files

- **config.json:**
  
  ```json
  {
    "context_window_size": 25
  }
  ```

- **api_keys.json:**
  
  ```json
  {
    "openai": {
      "apiKey": "",
      "models": ["gpt-4o", "gpt-4o-mini"]
    },
    "anthropic": {
      "apiKey": "",
      "models": ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-haiku-20240307"]
    },
    "groq": {
      "apiKey": "",
      "models": ["gemma2-9b-it, llama-3.2-11b-vision-preview, mixtral-8x7b-32768"]
    },
    "local": {
      "serverAddress": "http://localhost:11434/api/chat",
      "models": ["llama3.2", "llama3.2:1b"]
    }
  }
  ```

### System Prompt

Customize the AI's persona by editing the `system_prompt.txt` file located in the `data` directory.

### Key Components

1. **Main Application Logic (`main.js`)**:
   - Initializes the Electron app and creates the main browser window.
   - Handles IPC (Inter-Process Communication) for loading and saving chat history, API keys, configurations, and system prompts.
   - Manages data files for chat history, configurations, and API keys.

2. **Renderer Logic (`renderer.js` and `chatRenderer.js`)**:
   - `renderer.js` manages the main UI elements and event listeners.
   - `chatRenderer.js` is responsible for rendering chat messages, updating message content, and displaying errors.
   - Functions like `renderChat`, `displayMessage`, and `updateMessageContent` handle the chat display logic.

3. **Utilities (`utils.js`)**:
   - Contains helper functions, such as `resolveContent`, which is used to process message content before displaying it.

4. **HTML Structure (`index.html`)**:
   - The main HTML file that structures the UI, including the chat display, input fields, and options modal for managing API keys and settings.

5. **Styling (`styles.css`)**:
   - Contains styles for the application, ensuring a modern and user-friendly interface.

6. **Data Management**:
   - The application uses JSON files to store API keys, chat history, configurations, and system prompts, allowing for persistent data management across sessions.

7. **Error Handling**:
   - The codebase includes error handling mechanisms to log errors and display user-friendly messages when issues arise during chat rendering or data loading.

### Current Features
- **Multi-Model Support**: Users can interact with various AI models.
- **Chat History Management**: Save and load previous conversations.
- **API Key Management**: Securely manage API keys for different AI providers.
- **Customizable System Prompts**: Tailor the AI's behavior with custom prompts.
- **User-Friendly Interface**: Intuitive design with modern UI elements.

### Areas for Improvement
- **Testing**: Implement unit tests and integration tests to ensure the reliability of the application.
- **Error Handling**: Enhance error handling to provide more detailed feedback to users.
- **Performance Optimization**: Review and optimize the rendering logic for better performance, especially with large chat histories.
- **Documentation**: Improve inline documentation and user guides to assist developers and users in understanding the codebase and application usage.

### Conclusion
The PolyLace application is well-structured and functional, providing a solid foundation for multi-model AI interactions. With further enhancements in testing, error handling, and documentation, it can become a robust tool for users looking to leverage various AI models in a unified interface.

![PolyLace Logo](assets/PolyLace.png)