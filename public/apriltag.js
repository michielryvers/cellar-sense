importScripts("apriltag_wasm.js");
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");

/**
 * This is a wrapper class that calls apriltag_wasm to load the WASM module and wraps the c implementation calls.
 * The apriltag dectector uses the tag36h11 family.
 * For tag pose estimation, call set_tag_size allows to indicate the size of known tags.
 * If size is not defined using set_tag_size() will default to the defaukt tag size of 0.15 meters
 *
 */
class Apriltag {
  constructor() {
    this._opt = {
      quad_decimate: 2.0,
      quad_sigma: 0.0,
      nthreads: 1,
      refine_edges: 1,
      max_detections: 0,
      return_pose: 1,
      return_solutions: 1,
    };
    this._ready = new Promise((resolve) => {
      AprilTagWasm().then((Module) => {
        this.onWasmInit(Module);
        resolve();
      });
    });
  }
  async waitReady() {
    await this._ready;
  }

  /**
   * Init warapper calls
   * @param {*} Module WASM module instance
   */
  onWasmInit(Module) {
    // save a reference to the module here
    this._Module = Module;
    //int atagjs_init(); Init the apriltag detector with default options
    this._init = Module.cwrap("atagjs_init", "number", []);
    //int atagjs_destroy(); Releases resources allocated by the wasm module
    this._destroy = Module.cwrap("atagjs_destroy", "number", []);
    //int atagjs_set_detector_options(float decimate, float sigma, int nthreads, int refine_edges, int max_detections, int return_pose, int return_solutions); Sets the given detector options
    this._set_detector_options = Module.cwrap(
      "atagjs_set_detector_options",
      "number",
      ["number", "number", "number", "number", "number", "number", "number"]
    );
    //int atagjs_set_pose_info(double fx, double fy, double cx, double cy); Sets the tag size (meters) and camera intrinsics (in pixels) for tag pose estimation
    this._set_pose_info = Module.cwrap("atagjs_set_pose_info", "number", [
      "number",
      "number",
      "number",
      "number",
    ]);
    //uint8_t* atagjs_set_img_buffer(int width, int height, int stride); Creates/changes size of the image buffer where we receive the images to process
    this._set_img_buffer = Module.cwrap("atagjs_set_img_buffer", "number", [
      "number",
      "number",
      "number",
    ]);
    //void *atagjs_set_tag_size(int tagid, double size)
    this._atagjs_set_tag_size = Module.cwrap("atagjs_set_tag_size", null, [
      "number",
      "number",
    ]);
    //t_str_json* atagjs_detect(); Detect tags in image previously stored in the buffer.
    //returns pointer to buffer starting with an int32 indicating the size of the remaining buffer (a string of chars with the json describing the detections)
    this._detect = Module.cwrap("atagjs_detect", "number", []);

    // inits detector
    this._init();

    // set max_detections = 0, meaning no max; will return all detections
    //options: float decimate, float sigma, int nthreads, int refine_edges, int max_detections, int return_pose, int return_solutions
    this._set_detector_options(
      this._opt.quad_decimate,
      this._opt.quad_sigma,
      this._opt.nthreads,
      this._opt.refine_edges,
      this._opt.max_detections,
      this._opt.return_pose,
      this._opt.return_solutions
    );
  }

  /**
   * **public** detect method
   * @param {Array} grayscaleImg grayscale image buffer
   * @param {Number} imgWidth image with
   * @param {Number} imgHeight image height
   * @return {detection} detection object
   */
  async detect(grayscaleImg, imgWidth, imgHeight) {
    // Ensure WASM is ready
    if (!this._Module || !this._Module.HEAP8) {
      throw new Error("WASM module not ready");
    }
    // set_img_buffer allocates the buffer for image and returns it; just returns the previously allocated buffer if size has not changed
    let imgBuffer = this._set_img_buffer(imgWidth, imgHeight, imgWidth);
    if (imgWidth * imgHeight < grayscaleImg.length)
      return { result: "Image data too large." };
    this._Module.HEAPU8.set(grayscaleImg, imgBuffer); // copy grayscale image data
    let strJsonPtr = this._detect();
    /* detect returns a pointer to a t_str_json c struct as follows
            size_t len; // string length
            char *str;
            size_t alloc_size; // allocated size */
    let strJsonLen = this._Module.getValue(strJsonPtr, "i32"); // get len from struct
    if (strJsonLen == 0) {
      // returned empty string
      return [];
    }
    let strJsonStrPtr = this._Module.getValue(strJsonPtr + 4, "i32"); // get *str from struct
    const strJsonView = new Uint8Array(
      this._Module.HEAP8.buffer,
      strJsonStrPtr,
      strJsonLen
    );
    let detectionsJson = ""; // build this javascript string from returned characters
    for (let i = 0; i < strJsonLen; i++) {
      detectionsJson += String.fromCharCode(strJsonView[i]);
    }
    //console.log(detectionsJson);
    let detections = JSON.parse(detectionsJson);

    return detections;
  }

  /**
   * **public** set camera parameters
   * @param {Number} fx camera focal length
   * @param {Number} fy camera focal length
   * @param {Number} cx camera principal point
   * @param {Number} cy camera principal point
   */
  set_camera_info(fx, fy, cx, cy) {
    this._set_pose_info(fx, fy, cx, cy);
  }

  /**
   * **public** set size of known tag (size in meters)
   * @param {Number} tagid the tag id
   * @param {Number} size the size of the tag in meters
   */
  set_tag_size(tagid, size) {
    this._atagjs_set_tag_size(tagid, size);
  }

  /**
   * **public** set maximum detections to return (0=return all)
   * @param {Number} maxDetections
   */
  set_max_detections(maxDetections) {
    this._opt.max_detections = maxDetections;
    this._set_detector_options(
      this._opt.quad_decimate,
      this._opt.quad_sigma,
      this._opt.nthreads,
      this._opt.refine_edges,
      this._opt.max_detections,
      this._opt.return_pose,
      this._opt.return_solutions
    );
  }

  /**
   * **public** set return pose estimate (0=do not return; 1=return)
   * @param {Number} returnPose
   */
  set_return_pose(returnPose) {
    this._opt.return_pose = returnPose;
    this._set_detector_options(
      this._opt.quad_decimate,
      this._opt.quad_sigma,
      this._opt.nthreads,
      this._opt.refine_edges,
      this._opt.max_detections,
      this._opt.return_pose,
      this._opt.return_solutions
    );
  }

  /**
   * **public** set return pose estimate alternative solution details (0=do not return; 1=return)
   * @param {Number} returnSolutions
   */
  set_return_solutions(returnSolutions) {
    this._opt.return_solutions = returnSolutions;
    this._set_detector_options(
      this._opt.quad_decimate,
      this._opt.quad_sigma,
      this._opt.nthreads,
      this._opt.refine_edges,
      this._opt.max_detections,
      this._opt.return_pose,
      this._opt.return_solutions
    );
  }
}

// Expose an API for Comlink: must call init() before detect()
let detector = null;
let detectorReady = false;
Comlink.expose({
  async init(onReady) {
    detector = new Apriltag();
    await detector.waitReady();
    detectorReady = true;
    if (onReady) onReady();
  },
  async detect(...args) {
    if (!detector || !detectorReady) {
      throw new Error("Detector not initialized or not ready");
    }
    return detector.detect(...args);
  },
  // Optionally expose other methods as needed
});
