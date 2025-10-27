import './polyfills/buffer'; // MUST come first

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import "./i18n";
import App from './App.tsx';
import { TonConnectUIProvider } from "@tonconnect/ui-react";


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl="https://cryptostylematrix.github.io/frontend/tonconnect-manifest.json">
      <App />
    </TonConnectUIProvider>
  </StrictMode>
);