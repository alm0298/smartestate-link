// This is a simple entry point file to help debug issues with the build process
console.log('Debug entry point loaded');

// Import the main application
import './main.tsx';

// Import React and ReactDOM
import React from 'react';
import ReactDOM from 'react-dom/client';

// Add some debugging information
console.log('Environment:', {
  NODE_ENV: import.meta.env.MODE,
  BASE_URL: import.meta.env.BASE_URL,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_API_URL: import.meta.env.VITE_API_URL
});

// Check if React is available
console.log('React version:', React.version);

// Check if ReactDOM is available
console.log('ReactDOM client available:', !!ReactDOM);

// Check if the root element exists
console.log('Root element exists:', !!document.getElementById('root')); 