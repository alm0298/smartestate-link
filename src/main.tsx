import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// import TestApp from './TestApp.tsx';
import './index.css';
import { debug, error as logError } from './lib/logger';

debug('[Main] Application starting');

const rootElement = document.getElementById('root');

if (!rootElement) {
  logError('[Main] Root element not found');
  throw new Error('Root element not found');
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  debug('[Main] App rendered successfully');
} catch (error) {
  logError('[Main] Error rendering app:', error);
  
  // Display error on the page
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; border: 1px solid #f44336; margin: 20px;">
        <h2>Error Rendering Application</h2>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre>${error instanceof Error ? error.stack : ''}</pre>
      </div>
    `;
  }
}
