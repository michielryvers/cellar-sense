<template>
  <div class="overlay-container" ref="containerRef">
    <canvas
      ref="canvasRef"
      :width="width"
      :height="height"
      class="overlay-canvas"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, watchEffect } from "vue";
import * as THREE from "three";
import { usePoseStore } from "../stores/poseStore";

// Props
const props = withDefaults(
  defineProps<{
    width?: number;
    height?: number;
    targetPoint?: THREE.Vector3;
  }>(),
  {
    width: 640,
    height: 480,
    targetPoint: () => new THREE.Vector3(0, 0, 0),
  }
);

// Refs
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Store
const poseStore = usePoseStore();

// Three.js setup
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let arrowHelper: THREE.ArrowHelper | null = null;
let targetMarker: THREE.Mesh | null = null;
let animationFrameId: number | null = null;

// Initialize Three.js
function initThree() {
  if (!canvasRef.value) return;

  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(props.width, props.height);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create scene
  scene = new THREE.Scene();

  // Create camera with reasonable initial values
  // The actual camera parameters will be set from pose data
  camera = new THREE.PerspectiveCamera(
    75, // FOV
    props.width / props.height, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
  );
  camera.position.z = 5;

  // Add some lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create arrow helper pointing to the target
  const arrowDirection = new THREE.Vector3(0, 0, -1);
  arrowDirection.normalize();

  arrowHelper = new THREE.ArrowHelper(
    arrowDirection,
    new THREE.Vector3(0, 0, 0),
    0.5, // Length
    0xff0000, // Color (red)
    0.2, // Head length
    0.1 // Head width
  );
  arrowHelper.visible = false;
  scene.add(arrowHelper);

  // Create a marker for the target point (small sphere)
  const targetGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const targetMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  targetMarker = new THREE.Mesh(targetGeometry, targetMaterial);
  targetMarker.visible = false;
  scene.add(targetMarker);

  // Start animation loop
  startAnimation();
}

// Convert AprilTag pose to Three.js matrices
function updateCameraFromPose() {
  if (!scene || !camera || !poseStore.state.detection) return;

  const detection = poseStore.state.detection;

  // Create rotation matrix from AprilTag rotation
  // AprilTag provides a 3x3 rotation matrix (R) in column-major order
  // We need to convert to 4x4 matrix for Three.js
  const R = detection.R;
  const rotMat = new THREE.Matrix4().set(
    R[0],
    R[3],
    R[6],
    0,
    R[1],
    R[4],
    R[7],
    0,
    R[2],
    R[5],
    R[8],
    0,
    0,
    0,
    0,
    1
  );

  // Create translation vector from AprilTag translation
  const t = detection.t;
  const position = new THREE.Vector3(t[0], t[1], t[2]);

  // In computer vision, camera looks down positive Z
  // In Three.js, camera looks down negative Z
  // We need to apply a coordinate system transformation
  const coordSystem = new THREE.Matrix4().set(
    1,
    0,
    0,
    0,
    0,
    -1,
    0,
    0,
    0,
    0,
    -1,
    0,
    0,
    0,
    0,
    1
  );

  // Create matrix that transforms from tag coordinates to camera coordinates
  const tagToCam = new THREE.Matrix4().multiply(coordSystem).multiply(rotMat);

  // Set position of the tag in camera coordinates
  tagToCam.setPosition(position);

  // Inverse to get camera pose in tag coordinates
  const camToTag = tagToCam.clone().invert();

  // Apply to camera in scene
  camera.matrix.copy(camToTag);
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

  // Update target marker position
  if (targetMarker) {
    targetMarker.position.copy(props.targetPoint);
    targetMarker.visible = true;
  }

  // Update arrow helper
  if (arrowHelper) {
    // Set arrow at origin pointing to target
    const origin = new THREE.Vector3(0, 0, 0);
    const direction = props.targetPoint.clone().sub(origin).normalize();

    arrowHelper.position.copy(origin);
    arrowHelper.setDirection(direction);
    arrowHelper.setLength(
      props.targetPoint.distanceTo(origin), // Length
      0.2, // Head length
      0.1 // Head width
    );
    arrowHelper.visible = true;
  }
}

// Animation loop
function startAnimation() {
  const animate = () => {
    if (!renderer || !scene || !camera) return;
    // Only render when we have a valid pose
    if (poseStore.hasValidPose) {
      updateCameraFromPose();
      renderer.render(scene, camera);
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animate();
}

// Stop animation loop
function stopAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// Clean up Three.js resources
function disposeThree() {
  stopAnimation();

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  if (scene) {
    scene.clear();
    scene = null;
  }

  camera = null;
  arrowHelper = null;
  targetMarker = null;
}

// Watch for targetPoint changes
watchEffect(() => {
  if (targetMarker && props.targetPoint) {
    targetMarker.position.copy(props.targetPoint);
  }
});

// Lifecycle hooks
onMounted(() => {
  initThree();
});

onUnmounted(() => {
  disposeThree();
});
</script>

<style scoped>
.overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
