import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito';
import './styles.css';
import { App } from './App.tsx';
import { ToastHost } from './ui/Toast.tsx';
import { UpdatePrompt } from './ui/UpdatePrompt.tsx';

// Ask the browser not to clear our data when space runs low (PLAN.md section 8).
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastHost>
      <App />
      <UpdatePrompt />
    </ToastHost>
  </StrictMode>,
);
