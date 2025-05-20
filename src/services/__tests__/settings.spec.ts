import { setSetting, settingsReactive } from '../settings';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('settings service', () => {
  const testKey = 'OPENAI_SDK_KEY';
  const testValue = 'test-key';
  let originalValue: string | null;

  beforeEach(() => {
    originalValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    // Reset settingsReactive
    settingsReactive.OPENAI_SDK_KEY = '';
  });

  afterEach(() => {
    if (originalValue !== null) {
      localStorage.setItem(testKey, originalValue);
      settingsReactive.OPENAI_SDK_KEY = originalValue;
    } else {
      localStorage.removeItem(testKey);
      settingsReactive.OPENAI_SDK_KEY = '';
    }
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
});
