import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'high-contrast';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem('theme') as Theme) || 'dark';
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const toggleTheme = () => {
        const themes: Theme[] = ['dark', 'light', 'high-contrast'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
