import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// PROTOTYPE (#15): retunes tokens from the URL before anything reads them.
import './ui/phoneProto';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
