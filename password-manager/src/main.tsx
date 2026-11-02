import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { registerServiceWorker } from './lib/pwa';
import { SessionProvider } from './state/session';
import { SettingsProvider } from './state/settings';
import { ToastProvider } from './state/toast';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </ToastProvider>
    </SettingsProvider>
  </StrictMode>,
);
