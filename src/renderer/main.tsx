import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './i18n';
import './styles/themes.css';

const rootPath = document.getElementById('root');
if (!rootPath) {
    console.error('Failed to find root element');
} else {
    ReactDOM.createRoot(rootPath).render(
        <React.StrictMode>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </React.StrictMode>
    );
}
