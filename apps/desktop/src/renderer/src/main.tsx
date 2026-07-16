import { createRoot } from 'react-dom/client';
import './monaco-setup';
import { App } from './App';
import { SettingsProvider } from './context/SettingsContext';
import './components/icons.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>,
);
