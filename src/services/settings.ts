// src/services/settings.ts
// Service for managing application settings
import { BehaviorSubject, Observable } from "rxjs";
import { ref, reactive, readonly } from "vue";

// Define settings interface
export interface Settings {
  DEXIE_CLOUD_URL: string;
  OPENAI_SDK_KEY: string;
  OPENAI_MODEL: string;
}

// Define default values
const DEFAULT_SETTINGS: Settings = {
  DEXIE_CLOUD_URL: "",
  OPENAI_SDK_KEY: "",
  OPENAI_MODEL: "gpt-4.1",
};

// Create a BehaviorSubject with the initial settings
const loadInitialSettings = (): Settings => {
  return {
    DEXIE_CLOUD_URL: localStorage.getItem("DEXIE_CLOUD_URL") || DEFAULT_SETTINGS.DEXIE_CLOUD_URL,
    OPENAI_SDK_KEY: localStorage.getItem("OPENAI_SDK_KEY") || DEFAULT_SETTINGS.OPENAI_SDK_KEY,
    OPENAI_MODEL: localStorage.getItem("OPENAI_MODEL") || DEFAULT_SETTINGS.OPENAI_MODEL,
  };
};

// Settings observable for RxJS consumers
const settings$ = new BehaviorSubject<Settings>(loadInitialSettings());

// Reactive settings object for Vue consumers
const settingsReactive = reactive<Settings>(loadInitialSettings());

// Save a single setting to localStorage and update observables
const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]): void => {
  localStorage.setItem(key, value as string);
  
  // Update the reactive object
  settingsReactive[key] = value;
  
  // Update the RxJS subject
  const newSettings = { ...settings$.value, [key]: value };
  settings$.next(newSettings);
};

// Save all settings at once
const setAllSettings = (newSettings: Partial<Settings>): boolean => {
  let needsRefresh = false;
  const prevCloudUrl = settings$.value.DEXIE_CLOUD_URL;
  
  Object.entries(newSettings).forEach(([key, value]) => {
    if (key in DEFAULT_SETTINGS && value !== undefined) {
      localStorage.setItem(key, value as string);
      settingsReactive[key as keyof Settings] = value as Settings[keyof Settings];
      
      // Check if Dexie Cloud URL changed, which requires page reload
      if (key === "DEXIE_CLOUD_URL" && value !== prevCloudUrl) {
        needsRefresh = true;
      }
    }
  });
  
  // Update the RxJS subject with all new settings
  settings$.next({ ...settings$.value, ...newSettings });
  
  return needsRefresh;
};

// Get a specific setting
const getSetting = <K extends keyof Settings>(key: K): Settings[K] => {
  return settingsReactive[key];
};

// Public API
export const settingsService = {
  // RxJS observable for reactive updates
  settings$: settings$.asObservable(),
  
  // Vue reactive object (readonly to prevent direct mutation)
  settings: readonly(settingsReactive),
  
  // Methods
  getSetting,
  setSetting,
  setAllSettings,
  
  // Convenience getters
  get dexieCloudUrl(): string {
    return settingsReactive.DEXIE_CLOUD_URL;
  },
  
  get openAiKey(): string {
    return settingsReactive.OPENAI_SDK_KEY;
  },
  
  get openAiModel(): string {
    return settingsReactive.OPENAI_MODEL;
  },
  
  // Convenience setters
  setDexieCloudUrl(url: string): boolean {
    const prevUrl = settings$.value.DEXIE_CLOUD_URL;
    setSetting("DEXIE_CLOUD_URL", url);
    return url !== prevUrl;
  },
  
  setOpenAiKey(key: string): void {
    setSetting("OPENAI_SDK_KEY", key);
  },
  
  setOpenAiModel(model: string): void {
    setSetting("OPENAI_MODEL", model);
  },
  
  // Check if settings have required values
  hasOpenAiKey(): boolean {
    return !!settingsReactive.OPENAI_SDK_KEY;
  }
};

export default settingsService;