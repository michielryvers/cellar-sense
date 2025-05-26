import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import VisionDebugPage from "../VisionDebugPage.vue";
import { useVisionStore } from "../../stores/vision";
import type { DetectedTag } from "../../vision/aruco";

// Mock the VisionCamera component
vi.mock("../VisionCamera.vue", () => ({
  default: {
    name: "VisionCamera",
    setup: () => {},
    template: '<div class="vision-camera-mock">Vision Camera Mock</div>',
  },
}));

describe("VisionDebugPage Component", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should render correctly with no markers when shown", () => {
    const wrapper = mount(VisionDebugPage, {
      props: {
        show: true,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });

    // Check initial state
    expect(wrapper.text()).toContain("Vision Debug");
    expect(wrapper.text()).toContain("No markers detected");
  });

  it("should not render when show is false", () => {
    const wrapper = mount(VisionDebugPage, {
      props: {
        show: false,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });

    expect(wrapper.html()).not.toContain("vision-debug-modal");
  });

  it("should emit update:show event when close button is clicked", async () => {
    const wrapper = mount(VisionDebugPage, {
      props: {
        show: true,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });
    await wrapper.find("button").trigger("click");
    const emitted = wrapper.emitted("update:show");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual([false]);
  });

  it("should update UI when markers are detected", async () => {
    const wrapper = mount(VisionDebugPage, {
      props: {
        show: true,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });
    const visionStore = useVisionStore();

    // Add mock marker data
    const mockTags: DetectedTag[] = [
      {
        id: 1,
        corners: [
          [10, 10],
          [50, 10],
          [50, 50],
          [10, 50],
        ],
      },
      {
        id: 2,
        corners: [
          [100, 100],
          [150, 100],
          [150, 150],
          [100, 150],
        ],
      },
    ];

    // Update the store
    visionStore.update(mockTags);

    // Wait for UI to update
    await wrapper.vm.$nextTick();

    // Check updated UI
    expect(wrapper.text()).toContain("2");
    expect(wrapper.text()).toContain("MEDIUM");
    expect(wrapper.findAll(".marker-item")).toHaveLength(2);
    expect(wrapper.text()).toContain("ID: 1");
  });

  it("should handle different accuracy levels correctly", async () => {
    const wrapper = mount(VisionDebugPage, {
      props: {
        show: true,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });
    const visionStore = useVisionStore();

    // Test LOW accuracy
    visionStore.update([
      {
        id: 1,
        corners: [
          [10, 10],
          [50, 10],
          [50, 50],
          [10, 50],
        ],
      },
    ]);

    await wrapper.vm.$nextTick();
    expect(wrapper.html()).toContain("text-orange-500");
    expect(wrapper.text()).toContain("LOW");

    // Test HIGH accuracy
    visionStore.update([
      {
        id: 1,
        corners: [
          [10, 10],
          [50, 10],
          [50, 50],
          [10, 50],
        ],
      },
      {
        id: 2,
        corners: [
          [100, 100],
          [150, 100],
          [150, 150],
          [100, 150],
        ],
      },
      {
        id: 3,
        corners: [
          [200, 200],
          [250, 200],
          [250, 250],
          [200, 250],
        ],
      },
      {
        id: 4,
        corners: [
          [300, 300],
          [350, 300],
          [350, 350],
          [300, 350],
        ],
      },
    ]);

    await wrapper.vm.$nextTick();
    expect(wrapper.html()).toContain("text-green-500");
    expect(wrapper.text()).toContain("HIGH");
  });
});
