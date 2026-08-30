import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

/*
 * Marks the document as JavaScript-capable. The reveal styles hide their targets
 * only under `html.js`, so if this never runs — scripting disabled, or the bundle
 * fails to load — nothing is hidden and the page degrades to fully visible.
 * Set here rather than in index.html so it is a genuine capability check, and so
 * the Content-Security-Policy needs no inline-script allowance.
 */
document.documentElement.classList.add('js');

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
