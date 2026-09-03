import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ensureWebMCPContextReady, initializeWebMCPBridge } from './webmcp/bridge';

// Prepare document.modelContext early so it is immediately discoverable
try {
  ensureWebMCPContextReady();
} catch (err) {
  console.warn('[WebMCP] Early context setup notice:', err);
}

// Initialize WebMCP tools
initializeWebMCPBridge().catch(err => {
  console.error('[WebMCP] Initial registration notice:', err);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
