// Theme Hook for Database Manager
// This module implements theme switching functionality with persistence.
// **Validates: Requirements 6.3**

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Available theme options
 * - 'light': Always use light theme
 * - 'dark': Always use dark theme
 * - 'system': Follow system preference
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * The resolved theme (actual appearance)
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Return type for the useTheme hook
 */
export interface UseThemeReturn {
  /** Current theme setting ('light' | 'dark' | 'system') */
  theme: Theme;
  /** The actual resolved theme based on setting and system preference */
  resolvedTheme: ResolvedTheme;
  /** Function to set the theme */
  setTheme: (theme: Theme) => void;
  /** Whether the system prefers dark mode */
  systemPrefersDark: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * LocalStorage key for persisting theme preference
 */
const THEME_STORAGE_KEY = 'database-manager-theme';

/**
 * Valid theme values for validation
 */
const VALID_THEMES: Theme[] = ['light', 'dark', 'system'];

/**
 * Default theme when no preference is stored
 */
const DEFAULT_THEME: Theme = 'system';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a value is a valid theme
 */
function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALID_THEMES.includes(value as Theme);
}

/**
 * Gets the stored theme from localStorage
 * Returns the default theme if no valid theme is stored
 */
function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidTheme(stored)) {
      return stored;
    }
  } catch {
    // localStorage might not be available (e.g., in SSR or private browsing)
    console.warn('Failed to read theme from localStorage');
  }
  return DEFAULT_THEME;
}

/**
 * Saves the theme to localStorage
 */
function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    console.warn('Failed to save theme to localStorage');
  }
}

/**
 * Gets the system color scheme preference
 */
function getSystemPreference(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolves the actual theme based on the setting and system preference
 */
function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Applies the theme class to the document root element
 * Tailwind CSS uses the 'dark' class on <html> for dark mode
 */
function applyThemeToDocument(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  const root = document.documentElement;
  
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for managing theme switching
 * 
 * Features:
 * - Supports light, dark, and system themes
 * - Persists theme preference to localStorage
 * - Listens to system preference changes when in 'system' mode
 * - Applies 'dark' class to document root for Tailwind CSS
 * 
 * **Validates: Requirements 6.3**
 * 
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const { theme, setTheme, resolvedTheme } = useTheme();
 *   
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
 *       <option value="light">Light</option>
 *       <option value="dark">Dark</option>
 *       <option value="system">System</option>
 *     </select>
 *   );
 * }
 * ```
 */
export function useTheme(): UseThemeReturn {
  // Initialize theme from localStorage
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  
  // Track system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => 
    getSystemPreference()
  );
  
  // Calculate resolved theme
  const resolvedTheme = resolveTheme(theme, systemPrefersDark);
  
  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    if (!isValidTheme(newTheme)) {
      console.warn(`Invalid theme value: ${newTheme}`);
      return;
    }
    setThemeState(newTheme);
    saveTheme(newTheme);
  }, []);
  
  // Apply theme to document when resolved theme changes
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);
  
  // Listen to system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    
    // Add listener for system preference changes
    // Use addEventListener for modern browsers, addListener for older ones
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Cleanup listener on unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  
  // Apply initial theme on mount
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    theme,
    resolvedTheme,
    setTheme,
    systemPrefersDark,
  };
}

export default useTheme;
