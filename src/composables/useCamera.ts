import { ref, onUnmounted, Ref } from "vue";

export interface CameraOptions {
  video?: MediaTrackConstraints | boolean;
  audio?: boolean;
}

export interface CameraState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  isRequesting: boolean;
}

/**
 * Composable for managing camera access and video streams
 * Refactored from existing camera usage in AddWineForm
 */
export function useCamera(options: CameraOptions = {}) {
  const state = ref<CameraState>({
    stream: null,
    isActive: false,
    error: null,
    isRequesting: false,
  });
  /**
   * Request camera permission and start video stream
   */
  async function startCamera(
    customOptions?: CameraOptions
  ): Promise<MediaStream | null> {
    if (state.value.isRequesting) {
      console.log("Camera already requesting, skipping");
      return null;
    }

    state.value.isRequesting = true;
    state.value.error = null;

    try {
      // Check permission state if available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          console.log("Camera permission state:", permissionStatus.state);

          if (permissionStatus.state === "denied") {
            throw new Error(
              "Camera permission denied. Please enable camera access in your browser settings."
            );
          }
        } catch (permError) {
          // Some browsers might not support this API fully
          console.warn("Could not query camera permission:", permError);
        }
      }
      // Merge default options with custom options if provided
      const mergedOptions = customOptions || options;

      // Default camera constraints - prefer rear camera for AR
      const constraints: MediaStreamConstraints = {
        video: mergedOptions.video || {
          facingMode: "environment", // Rear camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: mergedOptions.audio || false,
      };

      console.log("Requesting camera with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera stream obtained successfully", stream);

      state.value.stream = stream;
      state.value.isActive = true;
      state.value.error = null;

      return stream;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Camera access failed";
      state.value.error = errorMessage;
      state.value.isActive = false;
      state.value.stream = null;
      console.error("Camera access error:", error);

      // Check for permission denied error
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.error("Camera permission denied by user");
        state.value.error =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (
        error instanceof DOMException &&
        error.name === "NotFoundError"
      ) {
        console.error("No camera found on device");
        state.value.error = "No camera found on this device.";
      } else if (
        error instanceof DOMException &&
        error.name === "NotReadableError"
      ) {
        console.error("Camera in use by another application");
        state.value.error =
          "Camera is in use by another application. Please close other camera apps and try again.";
      } else if (
        error instanceof DOMException &&
        error.name === "OverconstrainedError"
      ) {
        console.error("Camera constraints not satisfied");
        state.value.error =
          "Camera constraints not satisfied. Try with different settings.";
      }

      return null;
    } finally {
      state.value.isRequesting = false;
    }
  }

  /**
   * Stop the camera stream and release resources
   */
  function stopCamera(): void {
    if (state.value.stream) {
      state.value.stream.getTracks().forEach((track) => {
        track.stop();
      });
      state.value.stream = null;
    }
    state.value.isActive = false;
    state.value.error = null;
  }

  /**
   * Check if camera is supported
   */
  function isCameraSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Get available camera devices
   */
  async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      console.error("Error enumerating devices:", error);
      return [];
    }
  }

  /**
   * Switch between front and rear camera
   */
  async function switchCamera(
    facingMode: "user" | "environment"
  ): Promise<MediaStream | null> {
    if (state.value.isActive) {
      stopCamera();
    }

    const newOptions = {
      ...options,
      video: {
        ...(typeof options.video === "object" ? options.video : {}),
        facingMode,
      },
    };

    // Update options and restart
    Object.assign(options, newOptions);
    return await startCamera();
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopCamera();
  });

  // Return the state as a ref so it maintains reactivity
  return {
    state,
    startCamera,
    stopCamera,
    isCameraSupported,
    getCameraDevices,
    switchCamera,
  };
}
