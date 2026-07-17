import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/600.css';
import './styles/global.css';
import App from './App';
import { GameProvider } from './state/GameContext';

// Scheduled reminders are intentionally out of scope: a PWA cannot fire local,
// scheduled notifications without a push server. The v2 path is web-push via a
// worker; until then, users set a phone alarm.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
