import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// © 2025 Preston Willis. All rights reserved.
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
