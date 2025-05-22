import { ref } from "vue";

// Dexie Cloud Login state for custom UI
export const showDexieLoginModal = ref(false);
export const dexieLoginTitle = ref("");
export const dexieLoginMessage = ref("");
export const dexieLoginButtonText = ref("Continue");
export const dexieLoginError = ref("");
export const dexieLoginInputPlaceholder = ref("");
export const dexieLoginCallback = ref<((value?: string) => void) | null>(null);

/**
 * Registers a Dexie Cloud user interaction handler for custom login modal UI.
 * Call this in your Dexie DB constructor if using Dexie Cloud.
 * @param userInteraction$ The Dexie Cloud userInteraction observable
 */
export function registerDexieCloudLoginModal(userInteraction$: any) {
  userInteraction$.subscribe((event: any) => {
    if (!event || typeof event !== "object" || !("type" in event)) {
      console.warn("Dexie Cloud auth event: unknown event", event);
      return;
    }

    // Reset state
    dexieLoginError.value = "";
    dexieLoginInputPlaceholder.value = "";
    dexieLoginCallback.value = null;

    // Type guards for event types
    const isLogin = (
      e: any
    ): e is {
      type: "login";
      resolve: (email: string) => void;
      reject: (err: Error) => void;
    } =>
      e.type === "login" &&
      typeof e.resolve === "function" &&
      typeof e.reject === "function";
    const isVerify = (
      e: any
    ): e is { type: "verify"; email: string; resolve: () => void } =>
      e.type === "verify" &&
      typeof e.email === "string" &&
      typeof e.resolve === "function";
    const isWaitForEmail = (
      e: any
    ): e is { type: "waitForEmail"; resolve: () => void } =>
      e.type === "waitForEmail" && typeof e.resolve === "function";
    const isAccountCreated = (
      e: any
    ): e is { type: "accountCreated"; resolve: () => void } =>
      e.type === "accountCreated" && typeof e.resolve === "function";
    const isError = (
      e: any
    ): e is {
      type: "error";
      error?: { message?: string };
      resolve: () => void;
    } => e.type === "error" && typeof e.resolve === "function";
    const isEmail = (e: any): e is { type: "email"; resolve: () => void } =>
      e.type === "email" && typeof e.resolve === "function";

    if (isLogin(event)) {
      const loginEvent = event as {
        type: "login";
        resolve: (email: string) => void;
        reject: (err: Error) => void;
      };
      dexieLoginTitle.value = "Sign in to Cellar Sense";
      dexieLoginMessage.value =
        "Enter your email to sign in or create an account";
      dexieLoginButtonText.value = "Send magic link";
      dexieLoginInputPlaceholder.value = "your.email@example.com";
      dexieLoginCallback.value = (email?: string) => {
        if (email) loginEvent.resolve(email);
        else loginEvent.reject(new Error("Email is required"));
      };
      showDexieLoginModal.value = true;
    } else if (isVerify(event)) {
      const verifyEvent = event as {
        type: "verify";
        email: string;
        resolve: () => void;
      };
      dexieLoginTitle.value = "Verify your email";
      dexieLoginMessage.value = `We've sent a magic link to ${verifyEvent.email}. Click the link to sign in.`;
      dexieLoginButtonText.value = "OK";
      dexieLoginCallback.value = () => {
        verifyEvent.resolve();
      };
      showDexieLoginModal.value = true;
    } else if (isWaitForEmail(event)) {
      const waitEvent = event as {
        type: "waitForEmail";
        resolve: () => void;
      };
      dexieLoginTitle.value = "Check your inbox";
      dexieLoginMessage.value =
        "Please click the link in the email we sent you to complete the sign-in process.";
      dexieLoginButtonText.value = "OK";
      dexieLoginCallback.value = () => {
        waitEvent.resolve();
      };
      showDexieLoginModal.value = true;
    } else if (isAccountCreated(event)) {
      const accountEvent = event as {
        type: "accountCreated";
        resolve: () => void;
      };
      dexieLoginTitle.value = "Account created";
      dexieLoginMessage.value = "Your account has been created!";
      dexieLoginButtonText.value = "OK";
      dexieLoginCallback.value = () => {
        accountEvent.resolve();
      };
      showDexieLoginModal.value = true;
    } else if (isError(event)) {
      const errorEvent = event as {
        type: "error";
        error?: { message?: string };
        resolve: () => void;
      };
      dexieLoginTitle.value = "Error";
      dexieLoginMessage.value =
        errorEvent.error?.message || "An error occurred during authentication";
      dexieLoginButtonText.value = "OK";
      dexieLoginError.value =
        errorEvent.error?.message || "Authentication error";
      dexieLoginCallback.value = () => {
        errorEvent.resolve();
      };
      showDexieLoginModal.value = true;
    } else if (isEmail(event)) {
      const emailEvent = event as { type: "email"; resolve: () => void };
      dexieLoginTitle.value = "Check your inbox";
      dexieLoginMessage.value =
        "Please check your email for a magic link to continue the sign-in process.";
      dexieLoginButtonText.value = "OK";
      dexieLoginCallback.value = () => {
        emailEvent.resolve();
      };
      showDexieLoginModal.value = true;
    } else {
      // Fallback for unknown event types
      console.warn("Unhandled Dexie Cloud auth event type:", event.type);
    }
  });
}
