import { setSetting, settingsReactive, settingsService } from '../settings';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('settings service', () => {
  const testKey = 'OPENAI_SDK_KEY';
  const testValue = 'test-key';
  let originalValue: string | null;

  beforeEach(() => {
    originalValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    // Reset settingsReactive
    settingsReactive.OPENAI_SDK_KEY = '';
    
    // Mock document methods
    document.documentElement.classList.add = vi.fn();
    document.documentElement.classList.remove = vi.fn();
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    if (originalValue !== null) {
      localStorage.setItem(testKey, originalValue);
      settingsReactive.OPENAI_SDK_KEY = originalValue;
    } else {
      localStorage.removeItem(testKey);
      settingsReactive.OPENAI_SDK_KEY = '';
    }
    
    vi.restoreAllMocks();
  });

  it('sets and gets a setting', () => {
    setSetting('OPENAI_SDK_KEY', testValue);
    expect(localStorage.getItem(testKey)).toBe(testValue);
    expect(settingsReactive.OPENAI_SDK_KEY).toBe(testValue);
  });

  it('loads default settings if not set', () => {
    localStorage.removeItem(testKey);
    settingsReactive.OPENAI_SDK_KEY = '';
    const loaded = settingsReactive.OPENAI_SDK_KEY;
    expect(loaded).toBe('');
  });
  
  describe('theme methods', () => {
    it('gets effective theme as light when preference is light', () => {
      settingsReactive.THEME_PREFERENCE = 'light';
      expect(settingsService.getEffectiveTheme()).toBe('light');
    });
    
    it('gets effective theme as dark when preference is dark', () => {
      settingsReactive.THEME_PREFERENCE = 'dark';
      expect(settingsService.getEffectiveTheme()).toBe('dark');
    });
    
    it('gets effective theme from system preference when preference is system', () => {
      settingsReactive.THEME_PREFERENCE = 'system';
      
      // Mock system preference as light
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });
      expect(settingsService.getEffectiveTheme()).toBe('light');
      
      // Mock system preference as dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: true,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });
      expect(settingsService.getEffectiveTheme()).toBe('dark');
    });
    
    it('applies light theme by removing dark class', () => {
      settingsReactive.THEME_PREFERENCE = 'light';
      settingsService.applyTheme();
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
    
    it('applies dark theme by adding dark class', () => {
      settingsReactive.THEME_PREFERENCE = 'dark';
      settingsService.applyTheme();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });
    
    it('sets up theme listener for system preference', () => {
      settingsReactive.THEME_PREFERENCE = 'system';
      const mockAddEventListener = vi.fn();
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          addEventListener: mockAddEventListener,
          removeEventListener: vi.fn(),
        })),
      });
      
      const cleanup = settingsService.setupThemeListener();
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });
    
    it('does not set up theme listener for explicit preference', () => {
      settingsReactive.THEME_PREFERENCE = 'light';
      const mockAddEventListener = vi.fn();
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          addEventListener: mockAddEventListener,
          removeEventListener: vi.fn(),
        })),
      });
      
      const cleanup = settingsService.setupThemeListener();
      expect(mockAddEventListener).not.toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });
  });
});
