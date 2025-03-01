import { createRoot } from 'react-dom/client'
// import App from './App.tsx'
import TestApp from './TestApp.tsx'
import './index.css'

// For debugging
console.log('main.tsx is executing');
console.log('Root element:', document.getElementById("root"));

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  root.render(<TestApp />);
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  
  // Display error on page
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; border: 1px solid #f44336; margin: 20px;">
        <h2>Error Rendering Application</h2>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}
