<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chrome Extension with React & Vite Tutorial</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f5f7fa;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            padding: 30px 0;
            background: linear-gradient(135deg, #61dafb 0%, #764abc 100%);
            color: white;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        h2 {
            color: #61dafb;
            margin: 25px 0 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eaeaea;
        }
        
        h3 {
            color: #764abc;
            margin: 20px 0 10px;
        }
        
        .intro {
            text-align: center;
            font-size: 1.2rem;
            margin-bottom: 30px;
            color: #555;
        }
        
        .tutorial-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.1);
        }
        
        .code-block {
            background-color: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
        }
        
        .tag {
            color: #f92672;
        }
        
        .attribute {
            color: #a6e22e;
        }
        
        .value {
            color: #e6db74;
        }
        
        .comment {
            color: #75715e;
        }
        
        .example {
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #61dafb;
            margin: 15px 0;
            border-radius: 0 5px 5px 0;
        }
        
        footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            color: #777;
            font-size: 0.9rem;
        }
        
        .tip {
            background-color: #e7f3ff;
            padding: 10px 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #61dafb;
        }
        
        .warning {
            background-color: #fff3e0;
            padding: 10px 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #FFA000;
        }
        
        .file-structure {
            background-color: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
        }
        
        .step {
            counter-increment: step-counter;
            margin: 20px 0;
            padding-left: 50px;
            position: relative;
        }
        
        .step:before {
            content: counter(step-counter);
            background: #61dafb;
            color: white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            text-align: center;
            line-height: 30px;
            position: absolute;
            left: 0;
            top: 0;
        }
        
        .command {
            background-color: #2d2d2d;
            color: #f8f8f2;
            padding: 10px 15px;
            border-radius: 5px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            display: inline-block;
        }
        
        @media (max-width: 768px) {
            .tutorial-grid {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .step {
                padding-left: 40px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Chrome Extension with React & Vite</h1>
            <p>Build modern Chrome extensions using React and Vite</p>
        </header>
        
        <div class="intro">
            <p>This tutorial will show you how to create a Chrome extension using React and Vite for a modern development experience.</p>
        </div>
        
        <div class="tip">
            <p><strong>Why React + Vite?</strong> Faster development, hot reloading, modern tooling, and better developer experience!</p>
        </div>
        
        <h2>Prerequisites</h2>
        <div class="step">
            <h3>1. Install Node.js</h3>
            <p>Make sure you have Node.js (version 14 or higher) installed on your system.</p>
            <div class="command">node --version</div>
            <p>If not installed, download from <a href="https://nodejs.org" target="_blank">nodejs.org</a></p>
        </div>
        
        <h2>Project Setup</h2>
        
        <div class="step">
            <h3>1. Create a New Vite Project</h3>
            <p>Open your terminal and run:</p>
            <div class="command">npm create vite@latest my-chrome-extension -- --template react</div>
            <p>Then navigate to the project folder:</p>
            <div class="command">cd my-chrome-extension</div>
        </div>
        
        <div class="step">
            <h3>2. Install Dependencies</h3>
            <p>Install the required packages:</p>
            <div class="command">npm install</div>
            <p>Install Chrome extension types for better development experience:</p>
            <div class="command">npm install --save-dev @types/chrome</div>
        </div>
        
        <div class="step">
            <h3>3. Configure Vite for Chrome Extension</h3>
            <p>Update your <code>vite.config.js</code> file:</p>
            <div class="code-block">import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'content.html'),
        background: resolve(__dirname, 'background.html')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})</div>
        </div>
        
        <h2>Project Structure</h2>
        <div class="file-structure">
            my-chrome-extension/<br>
            ├── public/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Static files</span><br>
            │&nbsp;&nbsp;&nbsp;├── icons/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Extension icons</span><br>
            │&nbsp;&nbsp;&nbsp;└── manifest.json &nbsp;&nbsp;<span style="color: #777;">// Chrome extension manifest</span><br>
            ├── src/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Source code</span><br>
            │&nbsp;&nbsp;&nbsp;├── components/ &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// React components</span><br>
            │&nbsp;&nbsp;&nbsp;├── popup/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Popup component</span><br>
            │&nbsp;&nbsp;&nbsp;├── content/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Content script components</span><br>
            │&nbsp;&nbsp;&nbsp;└── background/ &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Background script</span><br>
            ├── popup.html &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Popup HTML entry point</span><br>
            ├── content.html &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Content script entry point</span><br>
            ├── background.html &nbsp;&nbsp;<span style="color: #777;">// Background script entry point</span><br>
            ├── vite.config.js &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Vite configuration</span><br>
            └── package.json &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #777;">// Project dependencies</span>
        </div>
        
        <h2>Creating the Manifest</h2>
        
        <div class="step">
            <h3>1. Create manifest.json</h3>
            <p>Create <code>public/manifest.json</code>:</p>
            <div class="code-block">{
  "manifest_version": 3,
  "name": "React Chrome Extension",
  "version": "1.0.0",
  "description": "A Chrome extension built with React and Vite",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Open React Popup"
  },
  "content_scripts": [
    {
      "matches": ["&lt;all_urls&gt;"],
      "js": ["assets/content.js"],
      "css": ["assets/content.css"]
    }
  ],
  "background": {
    "service_worker": "assets/background.js"
  },
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["&lt;all_urls&gt;"]
}</div>
        </div>
        
        <h2>Creating React Components</h2>
        
        <div class="step">
            <h3>1. Create Popup Component</h3>
            <p>Create <code>src/popup/Popup.jsx</code>:</p>
            <div class="code-block">import React, { useState, useEffect } from 'react';
import './Popup.css';

const Popup = () => {
  const [count, setCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setCurrentUrl(tabs[0].url);
    });

    // Load saved count from storage
    chrome.storage.local.get(['count'], (result) => {
      setCount(result.count || 0);
    });
  }, []);

  const incrementCount = () => {
    const newCount = count + 1;
    setCount(newCount);
    chrome.storage.local.set({ count: newCount });
  };

  const changePageColor = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'changeColor' });
    });
  };

  return (
    &lt;div className="popup-container"&gt;
      &lt;h1&gt;React Chrome Extension&lt;/h1&gt;
      &lt;div className="counter"&gt;
        &lt;p&gt;Count: {count}&lt;/p&gt;
        &lt;button onClick={incrementCount}&gt;Increment&lt;/button&gt;
      &lt;/div&gt;
      &lt;div className="current-url"&gt;
        &lt;p&gt;Current URL:&lt;/p&gt;
        &lt;small&gt;{currentUrl}&lt;/small&gt;
      &lt;/div&gt;
      &lt;button onClick={changePageColor} className="color-btn"&gt;
        Change Page Color
      &lt;/button&gt;
    &lt;/div&gt;
  );
};

export default Popup;</div>
        </div>
        
        <div class="step">
            <h3>2. Create Popup CSS</h3>
            <p>Create <code>src/popup/Popup.css</code>:</p>
            <div class="code-block">.popup-container {
  width: 300px;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.popup-container h1 {
  font-size: 18px;
  margin-bottom: 15px;
  color: #333;
}

.counter {
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 5px;
}

.counter button {
  background: #61dafb;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
}

.current-url {
  margin-bottom: 15px;
  padding: 10px;
  background: #f0f8ff;
  border-radius: 5px;
}

.current-url small {
  word-break: break-all;
  color: #666;
}

.color-btn {
  width: 100%;
  background: #764abc;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.color-btn:hover {
  background: #5a3796;
}</div>
        </div>
        
        <div class="step">
            <h3>3. Create Popup Entry Point</h3>
            <p>Create <code>popup.html</code>:</p>
            <div class="code-block">&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
  &lt;head&gt;
    &lt;meta charset="UTF-8" /&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0" /&gt;
    &lt;title&gt;React Extension Popup&lt;/title&gt;
    &lt;style&gt;
      body {
        margin: 0;
        padding: 0;
        width: 300px;
      }
    &lt;/style&gt;
  &lt;/head&gt;
  &lt;body&gt;
    &lt;div id="root"&gt;&lt;/div&gt;
    &lt;script type="module" src="/src/popup/main.jsx"&gt;&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</div>
        </div>
        
        <div class="step">
            <h3>4. Create Popup Main File</h3>
            <p>Create <code>src/popup/main.jsx</code>:</p>
            <div class="code-block">import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './Popup.jsx'
import './Popup.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  &lt;React.StrictMode&gt;
    &lt;Popup /&gt;
  &lt;/React.StrictMode&gt;,
)</div>
        </div>
        
        <h2>Content Script with React</h2>
        
        <div class="step">
            <h3>1. Create Content Script Component</h3>
            <p>Create <code>src/content/ContentScript.jsx</code>:</p>
            <div class="code-block">import React from 'react';
import ReactDOM from 'react-dom/client';

// Component that will be injected into pages
const ContentApp = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'changeColor') {
        // Toggle background color
        document.body.style.backgroundColor = 
          document.body.style.backgroundColor === 'lightcyan' ? '' : 'lightcyan';
        
        // Show/hide our component
        setVisible(!visible);
      }
    });
  }, [visible]);

  if (!visible) return null;

  return ReactDOM.createPortal(
    &lt;div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#764abc',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 10000,
      fontSize: '14px'
    }}&gt;
      React Content Script Active!
    &lt;/div&gt;,
    document.body
  );
};

// Inject our React component
const app = document.createElement('div');
app.id = 'react-chrome-extension';
document.body.appendChild(app);

const root = ReactDOM.createRoot(app);
root.render(&lt;ContentApp /&gt;);</div>
        </div>
        
        <div class="step">
            <h3>2. Create Content Script Entry</h3>
            <p>Create <code>content.html</code>:</p>
            <div class="code-block">&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;script type="module" src="/src/content/ContentScript.jsx"&gt;&lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;</div>
        </div>
        
        <h2>Building and Loading the Extension</h2>
        
        <div class="step">
            <h3>1. Update package.json Scripts</h3>
            <p>Modify your <code>package.json</code> scripts:</p>
            <div class="code-block">{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "build:watch": "vite build --watch"
  }
}</div>
        </div>
        
        <div class="step">
            <h3>2. Build the Extension</h3>
            <p>Run the build command:</p>
            <div class="command">npm run build</div>
            <p>This creates a <code>dist</code> folder with your built extension.</p>
        </div>
        
        <div class="step">
            <h3>3. Load in Chrome</h3>
            <ol>
                <li>Open Chrome and go to <code>chrome://extensions</code></li>
                <li>Enable "Developer mode"</li>
                <li>Click "Load unpacked"</li>
                <li>Select the <code>dist</code> folder</li>
            </ol>
        </div>
        
        <h2>Development Workflow</h2>
        
        <div class="step">
            <h3>1. Development with Hot Reload</h3>
            <p>For development, use:</p>
            <div class="command">npm run dev</div>
            <p class="warning">Note: Chrome extensions need to be built. For true hot reload during development, use build watch mode:</p>
            <div class="command">npm run build:watch</div>
            <p>Then reload your extension in Chrome after changes.</p>
        </div>
        
        <div class="step">
            <h3>2. Adding New Components</h3>
            <p>Create React components as needed and import them into your entry files.</p>
            <div class="code-block">// Example of adding a new feature
import React from 'react';

const NewFeature = () => {
  return (
    &lt;div&gt;
      &lt;h3&gt;New Feature&lt;/h3&gt;
      &lt;p&gt;This is a new component!&lt;/p&gt;
    &lt;/div&gt;
  );
};

export default NewFeature;</div>
        </div>
        
        <h2>Advanced Configuration</h2>
        <div class="tutorial-grid">
            <div class="card">
                <h3>Environment Variables</h3>
                <p>Use <code>.env</code> files for different environments:</p>
                <div class="code-block">// .env.development
VITE_API_URL=http://localhost:3000

// .env.production  
VITE_API_URL=https://api.example.com</div>
            </div>
            
            <div class="card">
                <h3>State Management</h3>
                <p>Add Redux or Zustand for complex state:</p>
                <div class="code-block">npm install @reduxjs/toolkit react-redux</div>
                <p>Or use React Context for simpler cases.</p>
            </div>
            
            <div class="card">
                <h3>TypeScript Support</h3>
                <p>Create project with TypeScript template:</p>
                <div class="code-block">npm create vite@latest my-extension -- --template react-ts</div>
                <p>Better type safety and developer experience.</p>
            </div>
            
            <div class="card">
                <h3>UI Libraries</h3>
                <p>Add Material-UI, Chakra UI, or Ant Design:</p>
                <div class="code-block">npm install @mui/material @emotion/react @emotion/styled</div>
                <p>For pre-built, beautiful components.</p>
            </div>
        </div>
        
        <div class="warning">
            <p><strong>Important:</strong> Chrome extensions have security restrictions. Some browser APIs might not be available in content scripts.</p>
        </div>
        
        <div class="tip">
            <p><strong>Pro Tip:</strong> Use Chrome's extension developer tools for debugging. Right-click your extension icon and select "Inspect popup".</p>
        </div>
        
        <footer>
            <p>Chrome Extension with React & Vite Tutorial | Modern Extension Development</p>
            <p>Refer to <a href="https://vitejs.dev" target="_blank">Vite Documentation</a> and <a href="https://developer.chrome.com/docs/extensions" target="_blank">Chrome Extension Docs</a> for more details.</p>
        </footer>
    </div>

    <script>
        // Add step counter
        document.addEventListener('DOMContentLoaded', function() {
            const stepsContainer = document.querySelector('.container');
            stepsContainer.style.counterReset = 'step-counter';
        });
    </script>
</body>
</html>