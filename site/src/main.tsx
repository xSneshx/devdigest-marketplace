import { createRoot } from 'react-dom/client';
import './styles/fonts';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { applyTheme, readStoredTheme } from './lib/theme';

// Applied before the first render: an inline <head> script would violate the CSP.
applyTheme(readStoredTheme());

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
