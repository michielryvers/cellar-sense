import { ref, onUnmounted } from 'vue';

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
  async function startCamera(): Promise<MediaStream | null> {
    if (state.value.isRequesting) {
      return null;
    }

    state.value.isRequesting = true;
    state.value.error = null;

    try {
      // Default camera constraints - prefer rear camera for AR
      const constraints: MediaStreamConstraints = {
        video: options.video || {
          facingMode: 'environment', // Rear camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: options.audio || false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      state.value.stream = stream;
      state.value.isActive = true;
      state.value.error = null;
      
      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Camera access failed';
      state.value.error = errorMessage;
      state.value.isActive = false;
      state.value.stream = null;
      console.error('Camera access error:', error);
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
      state.value.stream.getTracks().forEach(track => {
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
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return [];
    }
  }

  /**
   * Switch between front and rear camera
   */
  async function switchCamera(facingMode: 'user' | 'environment'): Promise<MediaStream | null> {
    if (state.value.isActive) {
      stopCamera();
    }
    
    const newOptions = {
      ...options,
      video: {
        ...(typeof options.video === 'object' ? options.video : {}),
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

  return {
    state: state.value,
    startCamera,
    stopCamera,
    isCameraSupported,
    getCameraDevices,
    switchCamera,
  };
}
