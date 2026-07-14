import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import 'katex/dist/katex.min.css';
import './index.css';
import './styles/print.css';
import {registerServiceWorker} from './registerSW';
import {installAuthInterceptor} from './lib/authInterceptor';
import {startOfflineSync} from './lib/offlineQueue';

// Install before anything fetches, so expired sessions are handled everywhere.
installAuthInterceptor();
startOfflineSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
