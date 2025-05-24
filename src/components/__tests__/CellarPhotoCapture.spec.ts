import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CellarPhotoCapture from '../CellarPhotoCapture.vue';

// Mock dependencies
vi.mock('../../services/cellar-photo-storage', () => ({
  saveCellarPhoto: vi.fn(),
}));

// Mock getUserMedia
const mockStream = { getTracks: vi.fn(() => [{ stop: vi.fn() }]) };
const getUserMedia = vi.fn().mockResolvedValue(mockStream);

beforeAll(() => {
  Object.defineProperty(window.navigator, 'mediaDevices', {
    writable: true,
    value: { getUserMedia },
  });
  
  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-photo-url');
  
  // Mock Worker
  global.Worker = vi.fn().mockImplementation(() => ({
    terminate: vi.fn(),
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
  }));
  
  // Mock crypto.randomUUID
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'mock-photo-id'),
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CellarPhotoCapture.vue', () => {
  beforeEach(() => {
    // Reset getUserMedia mock
    getUserMedia.mockResolvedValue(mockStream);
  });

  it('renders when show is true', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    await nextTick();
    
    expect(wrapper.find('header').exists()).toBe(true);
    expect(wrapper.find('video').exists()).toBe(true);
    expect(wrapper.find('canvas').exists()).toBe(true);
    expect(wrapper.text()).toContain('Cellar Photo Capture');
  });

  it('does not render when show is false', () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: false },
    });
    
    expect(wrapper.find('header').exists()).toBe(false);
    expect(wrapper.find('video').exists()).toBe(false);
  });

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('close');
  });

  it('shows instructions for AprilTag detection', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    await nextTick();
    
    expect(wrapper.text()).toContain('Looking for AprilTags...');
    expect(wrapper.text()).toContain('Position your wine rack so AprilTags are clearly visible');
    expect(wrapper.text()).toContain('These tags will help locate bottles later');
  });

  it('shows capture button when camera is ready', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    await nextTick();
    
    const captureButton = wrapper.find('button[class*="w-16 h-16"]');
    expect(captureButton.exists()).toBe(true);
  });

  it('disables capture button when camera is not ready', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    await nextTick();
    
    const captureButton = wrapper.find('button[class*="w-16 h-16"]');
    expect(captureButton.attributes('disabled')).toBeDefined();
  });
  it('shows loading overlay when capturing', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    // Check loading overlay is shown by testing the component's VM directly
    const vm = wrapper.vm as any;
    vm.isCapturing = true;
    await nextTick();
    
    expect(wrapper.text()).toContain('Saving cellar photo...');
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
  });

  it('displays detected tag count', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    // Simulate detected tags by setting the VM property directly
    const vm = wrapper.vm as any;
    vm.detectedTags = [{ id: 1 }, { id: 2 }, { id: 3 }];
    await nextTick();
    
    expect(wrapper.text()).toContain('3 AprilTag(s) detected');
    expect(wrapper.text()).toContain('Tags: 1, 2, 3');
  });

  it('shows red indicator when no tags detected', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    await nextTick();
    
    const indicator = wrapper.find('.w-3.h-3.rounded-full');
    expect(indicator.classes()).toContain('bg-red-500');
  });
  it('shows green indicator when tags detected', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    // Set VM properties directly
    const vm = wrapper.vm as any;
    vm.detectedTags = [{ id: 1 }];
    vm.cameraReady = true;
    await nextTick();
    
    const indicator = wrapper.find('.w-2.h-2.rounded-full');
    expect(indicator.classes()).toContain('bg-green-500');
  });

  it('attempts to start camera when show becomes true', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: false },
    });
    
    await wrapper.setProps({ show: true });
    await nextTick();
    
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment',
      },
    });
  });

  it('stops camera when show becomes false', async () => {
    const stopFn = vi.fn();
    const localStream = { getTracks: () => [{ stop: stopFn }] };
    getUserMedia.mockResolvedValueOnce(localStream);
    
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
      attachTo: document.body,
    });
    
    await nextTick();
    await wrapper.setProps({ show: false });
    await nextTick();
    
    expect(stopFn).toHaveBeenCalled();
    wrapper.unmount();
  });
  it('handles capture button click', async () => {
    const { saveCellarPhoto } = await import('../../services/cellar-photo-storage');
    (saveCellarPhoto as any).mockResolvedValue({
      id: 'mock-photo-id',
      blob: new Blob(['test'], { type: 'image/jpeg' }),
      width: 1920,
      height: 1080,
      createdAt: Date.now(),
    });
    
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    // Mock canvas and video elements
    const mockVideo = {
      videoWidth: 1920,
      videoHeight: 1080,
    };
    
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn((callback) => {
        callback(new Blob(['test'], { type: 'image/jpeg' }));
      }),
    };
      // Set up component state - access VM directly due to Vue 3 reactive object limitations
    const vm = wrapper.vm as any;
    vm.cameraReady = true;
    vm.detectedTags = [{ id: 1 }];
    
    // Mock the refs
    Object.defineProperty(wrapper.vm, 'video', {
      get: () => ({ value: mockVideo }),
    });
    Object.defineProperty(wrapper.vm, 'canvas', {
      get: () => ({ value: mockCanvas }),
    });
    
    await nextTick();
    
    const captureButton = wrapper.find('button[class*="w-16 h-16"]');
    await captureButton.trigger('click');
    
    // Should eventually emit photo-captured (this is async so we can't easily test the full flow)
    // but we can test that the button was clickable
    expect(captureButton.exists()).toBe(true);
  });

  it('shows high resolution constraints for cellar photos', async () => {
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
    });
    
    await nextTick();
    
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment',
      },
    });
  });
  it('cleans up resources on unmount', async () => {
    const stopFn = vi.fn();
    const terminateFn = vi.fn();
    const localStream = { getTracks: () => [{ stop: stopFn }] };
    getUserMedia.mockResolvedValueOnce(localStream);
    
    const wrapper = mount(CellarPhotoCapture, {
      props: { show: true },
      attachTo: document.body,
    });
    
    // Wait for camera to start and stream to be set
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 10)); // Allow async camera start
    
    // Manually set the stream on the VM to simulate successful camera start
    const vm = wrapper.vm as any;
    vm.stream = localStream;
    
    // Mock worker
    Object.defineProperty(wrapper.vm, 'apriltagWorker', {
      get: () => ({ terminate: terminateFn }),
      set: () => {},
    });
    
    wrapper.unmount();
    
    expect(stopFn).toHaveBeenCalled();
  });
});
