import React, { createContext, useContext, useState, useEffect } from 'react';

const BlogThemeContext = createContext();

export function BlogThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('blog-theme');
        // Default to dark mode
        return saved !== null ? saved === 'dark' : true;
    });

    useEffect(() => {
        localStorage.setItem('blog-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <BlogThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </BlogThemeContext.Provider>
    );
}

export function useBlogTheme() {
    const context = useContext(BlogThemeContext);
    if (!context) {
        throw new Error('useBlogTheme must be used within a BlogThemeProvider');
    }
    return context;
}
