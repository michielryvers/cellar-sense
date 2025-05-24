import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import { mount } from "@vue/test-utils";
import FullScreenCamera from "../FullScreenCamera.vue";

// Mock getUserMedia
const mockStream = { getTracks: vi.fn(() => [{ stop: vi.fn() }]) };
const getUserMedia = vi.fn().mockResolvedValue(mockStream);

beforeAll(() => {
  Object.defineProperty(window.navigator, "mediaDevices", {
    writable: true,
    value: { getUserMedia },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("FullScreenCamera.vue", () => {
  it("renders when show is true", async () => {
    const wrapper = mount(FullScreenCamera, {
      props: { show: true },
    });
    // Wait for the camera startup logic to run
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.find("header").exists()).toBe(true);
    expect(wrapper.find("video").exists()).toBe(true);
    expect(getUserMedia).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("does not render when show is false", () => {
    const wrapper = mount(FullScreenCamera, {
      props: { show: false },
    });
    expect(wrapper.find("header").exists()).toBe(false);
    expect(wrapper.find("video").exists()).toBe(false);
    wrapper.unmount();
  });

  it("emits close when close button is clicked", async () => {
    const wrapper = mount(FullScreenCamera, {
      props: { show: true },
    });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted()).toHaveProperty("close");
    wrapper.unmount();
  });

  it("stops camera when closed", async () => {
    const stopFn = vi.fn();
    const localStream = { getTracks: () => [{ stop: stopFn }] };
    getUserMedia.mockResolvedValueOnce(localStream);
    const wrapper = mount(FullScreenCamera, {
      props: { show: true },
      attachTo: document.body,
    });
    // Wait for the camera to start
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Simulate prop change to false
    await wrapper.setProps({ show: false });
    // Wait for watcher to trigger
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(stopFn).toHaveBeenCalled();
    wrapper.unmount();
  });
});
