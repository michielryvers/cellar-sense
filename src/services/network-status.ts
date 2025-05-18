// src/services/network-status.ts
// Service for monitoring network connectivity status
import { BehaviorSubject, Observable, fromEvent, merge } from "rxjs";
import { map, debounceTime, distinctUntilChanged } from "rxjs/operators";

// Create a BehaviorSubject with the initial online status
const onlineStatus$ = new BehaviorSubject<boolean>(navigator.onLine);

// Update the online status when the browser's online/offline events fire
if (typeof window !== "undefined") {
  merge(
    fromEvent(window, "online").pipe(map(() => true)),
    fromEvent(window, "offline").pipe(map(() => false))
  )
    .pipe(
      debounceTime(300), // Debounce to avoid rapid changes
      distinctUntilChanged() // Only emit when the status actually changes
    )
    .subscribe((status) => {
      onlineStatus$.next(status);
    });
}

// Export the observable for subscribers
export const isOnline$: Observable<boolean> = onlineStatus$.asObservable();

// Helper function to get the current online status
export function getOnlineStatus(): boolean {
  return onlineStatus$.value;
}

// Helper composable for Vue components
export function useOnlineStatus() {
  return { isOnline$, currentStatus: onlineStatus$ };
}
