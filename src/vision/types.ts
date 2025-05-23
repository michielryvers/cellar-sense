/**
 * Interface representing the data structure for an AprilTag detection
 */
export interface Detection {
  /** Tag ID (from the AprilTag family) */
  id: number;

  /** Rotation matrix (3x3 flattened) */
  R: number[];

  /** Translation vector (x, y, z) */
  t: number[];

  /** Detection error/confidence value */
  err: number;
}

/**
 * Frame message interface for communication with the worker
 */
export interface FrameMsg {
  /** ImageBitmap representation of the camera frame */
  bitmap: ImageBitmap;

  /** Camera intrinsic parameters */
  intrinsics?: {
    fx: number; // focal length x
    fy: number; // focal length y
    cx: number; // principal point x
    cy: number; // principal point y
  };

  /** Frame timestamp */
  timestamp: number;
}
