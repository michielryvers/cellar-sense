import { ref, type Ref } from "vue";
import type { DXCUserInteraction } from "dexie-cloud-addon";
import { db } from "./dexie-db";

// Observable for user interaction state
export const userInteraction: Ref<DXCUserInteraction | undefined> = ref();

// Observable for current user state - use the db.cloud.currentUser directly
export const currentUser = db.cloud ? db.cloud.currentUser : ref(null);

// Observable for login status
export const isLoggedIn = ref(false);

/**
 * Initialize the Dexie Cloud login service
 * This should be called in the main app component
 */
export function initializeDexieCloudLogin(): void {
  // Only initialize if Dexie Cloud is configured
  if (!db.cloud) {
    console.warn("Dexie Cloud is not configured");
    return;
  }

  // Subscribe to user interaction events
  db.cloud.userInteraction.subscribe((interaction) => {
    userInteraction.value = interaction;
  });
  // Subscribe to current user changes
  db.cloud.currentUser.subscribe((user) => {
    isLoggedIn.value = !!user;
  });

  // Subscribe to sync state for additional status information
  db.cloud.syncState.subscribe((state) => {
    console.log("Dexie Cloud sync state:", state);
  });
}

/**
 * Manually trigger login
 */
export async function login(): Promise<void> {
  if (!db.cloud) {
    throw new Error("Dexie Cloud is not configured");
  }
  
  try {
    await db.cloud.login();
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

/**
 * Manually trigger logout
 */
export async function logout(): Promise<void> {
  if (!db.cloud) {
    throw new Error("Dexie Cloud is not configured");
  }
  
  try {
    await db.cloud.logout();
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus() {
  if (!db.cloud) {
    return null;
  }
  
  return {
    syncState: db.cloud.syncState.value,
    currentUser: db.cloud.currentUser.value,
    persistedSyncState: db.cloud.persistedSyncState.value,
  };
}
