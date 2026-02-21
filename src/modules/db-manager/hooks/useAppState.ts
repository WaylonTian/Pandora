// App State Persistence Hook for Database Manager
// This module implements app state save and restore functionality.
// **Validates: Requirements 6.4**

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore, QueryTab } from '../store';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Persisted tab state (subset of QueryTab for storage)
 */
export interface PersistedTab {
  id: string;
  title: string;
  content: string;
  connectionId: string | null;
}

/**
 * App state structure for persistence
 * Matches the design document specification
 */
export interface PersistedAppState {
  /** Active connection ID */
  active_connection_id: string | null;
  /** Open tabs with their content */
  open_tabs: PersistedTab[];
  /** Currently active tab ID */
  active_tab_id: string;
  /** Sidebar width in pixels */
  sidebar_width: number;
}

/**
 * Return type for the useAppState hook
 */
export interface UseAppStateReturn {
  /** Whether state has been restored */
  isRestored: boolean;
  /** Manually trigger a save */
  saveState: () => void;
  /** Clear persisted state */
  clearState: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * LocalStorage key for persisting app state
 */
export const APP_STATE_STORAGE_KEY = 'database-manager-app-state';

/**
 * Debounce delay in milliseconds for saving state
 */
const SAVE_DEBOUNCE_MS = 500;

/**
 * Default sidebar width
 */
const DEFAULT_SIDEBAR_WIDTH = 250;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a QueryTab to a PersistedTab (strips runtime state)
 */
function tabToPersistedTab(tab: QueryTab): PersistedTab {
  return {
    id: tab.id,
    title: tab.title,
    content: tab.content,
    connectionId: tab.connectionId,
  };
}

/**
 * Converts a PersistedTab to a QueryTab (adds default runtime state)
 */
function persistedTabToTab(persistedTab: PersistedTab): QueryTab {
  return {
    id: persistedTab.id,
    title: persistedTab.title,
    content: persistedTab.content,
    connectionId: persistedTab.connectionId,
    results: [],
    error: null,
    isExecuting: false,
    type: 'query',
  };
}

/**
 * Validates that a value is a valid PersistedTab
 */
function isValidPersistedTab(value: unknown): value is PersistedTab {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const tab = value as Record<string, unknown>;
  
  return (
    typeof tab.id === 'string' &&
    typeof tab.title === 'string' &&
    typeof tab.content === 'string' &&
    (tab.connectionId === null || typeof tab.connectionId === 'string')
  );
}

/**
 * Validates that a value is a valid PersistedAppState
 */
function isValidPersistedAppState(value: unknown): value is PersistedAppState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const state = value as Record<string, unknown>;
  
  // Validate active_connection_id
  if (state.active_connection_id !== null && typeof state.active_connection_id !== 'string') {
    return false;
  }
  
  // Validate open_tabs
  if (!Array.isArray(state.open_tabs)) {
    return false;
  }
  
  for (const tab of state.open_tabs) {
    if (!isValidPersistedTab(tab)) {
      return false;
    }
  }
  
  // Validate active_tab_id
  if (typeof state.active_tab_id !== 'string') {
    return false;
  }
  
  // Validate sidebar_width
  if (typeof state.sidebar_width !== 'number' || state.sidebar_width < 0) {
    return false;
  }
  
  return true;
}

/**
 * Gets the stored app state from localStorage
 * Returns null if no valid state is stored
 */
export function getStoredAppState(): PersistedAppState | null {
  try {
    const stored = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    
    const parsed = JSON.parse(stored);
    if (isValidPersistedAppState(parsed)) {
      return parsed;
    }
    
    console.warn('Invalid app state in localStorage, ignoring');
    return null;
  } catch (error) {
    console.warn('Failed to read app state from localStorage:', error);
    return null;
  }
}

/**
 * Saves the app state to localStorage
 */
export function saveAppState(state: PersistedAppState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(APP_STATE_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Failed to save app state to localStorage:', error);
  }
}

/**
 * Clears the app state from localStorage
 */
export function clearAppState(): void {
  try {
    localStorage.removeItem(APP_STATE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear app state from localStorage:', error);
  }
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 */
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): { (...args: Parameters<T>): void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
  
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for managing app state persistence
 * 
 * Features:
 * - Saves app state to localStorage on changes (debounced)
 * - Restores app state on app startup
 * - Integrates with Zustand store
 * 
 * State persisted:
 * - Open tabs (id, title, content, connectionId)
 * - Active tab ID
 * - Active connection ID
 * - Sidebar width
 * 
 * **Validates: Requirements 6.4**
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isRestored } = useAppState();
 *   
 *   if (!isRestored) {
 *     return <LoadingSpinner />;
 *   }
 *   
 *   return <MainApp />;
 * }
 * ```
 */
export function useAppState(): UseAppStateReturn {
  const isRestoredRef = useRef(false);
  const sidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  
  // Get store state and actions
  const tabs = useAppStore((state) => state.tabs);
  const activeTabId = useAppStore((state) => state.activeTabId);
  const activeConnectionId = useAppStore((state) => state.activeConnectionId);
  const setActiveConnection = useAppStore((state) => state.setActiveConnection);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  
  // Create the current state object for saving
  const getCurrentState = useCallback((): PersistedAppState => {
    return {
      active_connection_id: activeConnectionId,
      open_tabs: tabs.map(tabToPersistedTab),
      active_tab_id: activeTabId,
      sidebar_width: sidebarWidthRef.current,
    };
  }, [tabs, activeTabId, activeConnectionId]);
  
  // Create debounced save function
  const debouncedSaveRef = useRef(
    debounce(() => {
      const state = getCurrentState();
      saveAppState(state);
    }, SAVE_DEBOUNCE_MS)
  );
  
  // Update debounced save when getCurrentState changes
  useEffect(() => {
    debouncedSaveRef.current = debounce(() => {
      const state = getCurrentState();
      saveAppState(state);
    }, SAVE_DEBOUNCE_MS);
  }, [getCurrentState]);
  
  // Restore state on mount
  useEffect(() => {
    if (isRestoredRef.current) {
      return;
    }
    
    const storedState = getStoredAppState();
    
    if (storedState) {
      // Restore tabs if there are any
      if (storedState.open_tabs.length > 0) {
        const restoredTabs = storedState.open_tabs.map(persistedTabToTab);
        
        // Update store with restored tabs
        useAppStore.setState({
          tabs: restoredTabs,
        });
        
        // Restore active tab ID if it exists in the restored tabs
        const activeTabExists = restoredTabs.some(
          (tab) => tab.id === storedState.active_tab_id
        );
        
        if (activeTabExists) {
          setActiveTab(storedState.active_tab_id);
        } else if (restoredTabs.length > 0) {
          setActiveTab(restoredTabs[0].id);
        }
      }
      
      // Restore active connection ID
      if (storedState.active_connection_id) {
        setActiveConnection(storedState.active_connection_id);
      }
      
      // Restore sidebar width
      sidebarWidthRef.current = storedState.sidebar_width;
    }
    
    isRestoredRef.current = true;
  }, [setActiveConnection, setActiveTab]);
  
  // Save state when relevant values change
  useEffect(() => {
    // Skip saving during initial restore
    if (!isRestoredRef.current) {
      return;
    }
    
    debouncedSaveRef.current();
    
    // Cleanup on unmount
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [tabs, activeTabId, activeConnectionId]);
  
  // Manual save function
  const saveState = useCallback(() => {
    const state = getCurrentState();
    saveAppState(state);
  }, [getCurrentState]);
  
  // Clear state function
  const clearState = useCallback(() => {
    clearAppState();
  }, []);
  
  return {
    isRestored: isRestoredRef.current,
    saveState,
    clearState,
  };
}

/**
 * Updates the sidebar width in the persisted state
 * Call this when the sidebar is resized
 */
export function updateSidebarWidth(width: number): void {
  const storedState = getStoredAppState();
  if (storedState) {
    storedState.sidebar_width = width;
    saveAppState(storedState);
  }
}

/**
 * Gets the persisted sidebar width
 * Returns the default width if no state is stored
 */
export function getSidebarWidth(): number {
  const storedState = getStoredAppState();
  return storedState?.sidebar_width ?? DEFAULT_SIDEBAR_WIDTH;
}

export default useAppState;
