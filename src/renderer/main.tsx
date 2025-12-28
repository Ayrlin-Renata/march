import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './i18n';
import './styles/themes.css';

console.log('Renderer process started');

const rootPath = document.getElementById('root');
if (!rootPath) {
    console.error('Failed to find root element');
} else {
    console.log('Root element found, mounting React app');
    ReactDOM.createRoot(rootPath).render(
        <React.StrictMode>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </React.StrictMode>
    );
}

console.log('Render call completed');
