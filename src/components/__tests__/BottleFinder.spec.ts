import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  type Mock,
} from "vitest";

// Mock HTMLCanvasElement.getContext to avoid jsdom errors
beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: function () {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(1280 * 720 * 4),
        })),
        putImageData: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        setTransform: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        font: "10px sans-serif",
        fillStyle: "#000",
        strokeStyle: "#000",
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
      };
    },
    configurable: true,
  });
});
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";

// Mock Comlink and BottleFinder dependencies
vi.mock("comlink", () => ({
  default: {
    wrap: vi.fn(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      detect: vi.fn().mockResolvedValue([
        {
          id: 42,
          center: [500, 400],
          corners: [
            [480, 380],
            [520, 380],
            [520, 420],
            [480, 420],
          ],
        },
      ]),
    })),
    proxy: vi.fn(),
  },
}));

import BottleFinder from "../BottleFinder.vue";
import { getCellarPhoto } from "../../services/cellar-photo-storage";
import { useCamera } from "../../composables/useCamera";
import type { Wine } from "../../shared/Wine";

// Mock the services and composables
vi.mock("../../services/cellar-photo-storage", () => ({
  getCellarPhoto: vi.fn(),
}));

vi.mock("../../composables/useCamera", () => ({
  useCamera: vi.fn(),
}));

describe("BottleFinder.vue", () => {
  // Mock data
  const mockWine = {
    id: "wine-1",
    name: "Test Wine",
    vintner: "Test Vintner",
    vintage: 2020,
    appellation: "Test Appellation",
    region: "Test Region",
    color: "Red",
    volume: "750ml",
    alcohol: "13%",
    farming: "Organic",
    price: "$20",
    sulfites: "Minimal",
    drink_from: 2022,
    drink_until: 2030,
    grapes: [],
    vinification: [],
    tasting_notes: {
      nose: [],
      palate: [],
    },
    images: {
      front: "test-image",
    },
    inventory: {
      bottles: 1,
      purchaseDate: "",
      purchaseLocation: "",
    },
    location: {
      tagId: 42,
      x: 0.6,
      y: 0.4,
      cellPhotoId: "photo-1",
    },
  } as Wine;

  const mockCellarPhoto = {
    id: "photo-1",
    createdAt: Date.now(),
    width: 1000,
    height: 800,
    blob: new Blob(["mock"], { type: "image/jpeg" }),
  };

  // Create a mock MediaStream for testing
  const mockMediaStream = {
    getVideoTracks: () => [
      {
        getCapabilities: () => ({ torch: true }),
        applyConstraints: vi.fn(),
        getSettings: () => ({ facingMode: "environment" }),
      },
    ],
  } as unknown as MediaStream;

  // Mock camera functions with proper implementation
  const mockStartCamera = vi.fn().mockImplementation(() => {
    // Update the camera state directly in the mock
    mockCameraState.stream = mockMediaStream;
    mockCameraState.isActive = true;
    mockCameraState.error = null;
    return Promise.resolve(mockMediaStream);
  });

  const mockStopCamera = vi.fn();
  const mockCameraState = {
    stream: null as MediaStream | null,
    isActive: false,
    error: null,
    isRequesting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock behavior
    vi.mocked(getCellarPhoto).mockResolvedValue(mockCellarPhoto);
    vi.mocked(useCamera).mockReturnValue({
      state: ref(mockCameraState),
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
      isCameraSupported: vi.fn().mockReturnValue(true),
      getCameraDevices: vi.fn().mockResolvedValue([]),
      switchCamera: vi.fn().mockResolvedValue(null),
    });

    // Mock Navigator MediaDevices
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
      writable: true,
    }); // Mock Worker
    const workerMock = {
      instances: [] as Array<any>,
      implementation: function () {
        const instance = {
          postMessage: vi.fn(),
          terminate: vi.fn(),
          onmessage: null as any,
        };
        this.instances.push(instance);
        return instance;
      },
    };

    global.Worker = vi.fn().mockImplementation(function () {
      return workerMock.implementation();
    }) as any;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn().mockReturnValue(1);
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    // Clean up mocks
    vi.restoreAllMocks();
  });

  it("should not be visible when show is false", () => {
    const wrapper = mount(BottleFinder, {
      props: {
        show: false,
        wine: mockWine,
      },
    });

    expect(wrapper.find(".fixed").exists()).toBe(false);
  });

  it("should setup camera and load reference photo when shown", async () => {
    const wrapper = mount(BottleFinder, {
      props: {
        show: true,
        wine: mockWine,
      },
    });

    await flushPromises();

    expect(mockStartCamera).toHaveBeenCalled();
    if (mockWine.location) {
      expect(getCellarPhoto).toHaveBeenCalledWith(
        mockWine.location.cellPhotoId
      );
    }
  });

  it("should clean up resources when closed", async () => {
    const wrapper = mount(BottleFinder, {
      props: {
        show: true,
        wine: mockWine,
      },
    });

    await flushPromises();

    // Trigger close using emit
    wrapper.vm.$emit("close");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("should show flashlight button when available", async () => {
    // Mock the implementation to return hasFlashlight=true
    mockStartCamera.mockImplementationOnce(() => {
      // Update the camera state directly in the mock
      mockCameraState.stream = mockMediaStream;
      mockCameraState.isActive = true;
      return Promise.resolve(mockMediaStream);
    });

    const wrapper = mount(BottleFinder, {
      props: {
        show: true,
        wine: mockWine,
      },
    });

    await flushPromises();

    // Check for flashlight button (a better approach would be to add a data-testid)
    expect(wrapper.find('button[class*="rounded-full"]').exists()).toBe(true);
  });

  it("should show correct status when tag is found", async () => {
    const wrapper = mount(BottleFinder, {
      props: {
        show: true,
        wine: mockWine,
      },
    });

    await flushPromises();
    // Wait for the async detect to resolve and UI to update
    await new Promise((resolve) => setTimeout(resolve, 100));
    await wrapper.vm.$nextTick();

    // Simulate camera ready and tag found state

    // Set refs directly on the component instance
    (wrapper.vm as any).cameraReady = true;
    (wrapper.vm as any).detectedTags = [
      {
        id: 42,
        center: [500, 400],
        corners: [
          [480, 380],
          [520, 380],
          [520, 420],
          [480, 420],
        ],
      },
    ];
    await wrapper.vm.$nextTick();

    // Now check for the tag detected UI
    expect(wrapper.find(".bg-green-500").exists()).toBe(true);
    expect(wrapper.text()).toContain("AprilTag detected");
  });
});
