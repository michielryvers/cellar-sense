import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import LocationPicker from "../LocationPicker.vue";
import { getRack, saveWineLocation } from "../../services/dexie-db";
import type { RackDefinition } from "../../shared/types/vision";

// Mock the services
vi.mock("../../services/dexie-db", () => ({
  getRack: vi.fn(),
  saveWineLocation: vi.fn(),
}));

// Mock the composable
vi.mock("../../composables/useEscapeKey", () => ({
  useEscapeKey: vi.fn(),
}));

describe("LocationPicker.vue", () => {
  // Mock data
  const mockRackDefinition: RackDefinition = {
    id: "rack-1",
    rackName: "Main Rack",
    markerIds: [0, 1, 2, 3],
    markerPositions: [
      { id: 0, x: 100, y: 100 },
      { id: 1, x: 500, y: 100 },
      { id: 2, x: 100, y: 400 },
      { id: 3, x: 500, y: 400 },
    ],
    homography: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    calibrationImageUrl: "data:image/jpeg;base64,mockImageData",
    lastCalibration: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock behavior
    vi.mocked(getRack).mockResolvedValue(mockRackDefinition);
    vi.mocked(saveWineLocation).mockResolvedValue(1);
  });

  it("should not be visible when show is false", () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: false,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    expect(wrapper.find(".fixed").exists()).toBe(false);
  });

  it("should be visible when show is true", () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    expect(wrapper.find(".fixed").exists()).toBe(true);
  });

  it("should load rack definition on mount", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    expect(getRack).toHaveBeenCalledWith("rack-1");
  });

  it("should display error when rack definition is not found", async () => {
    vi.mocked(getRack).mockResolvedValue(undefined);

    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "nonexistent-rack",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Rack definition not found");
    expect(wrapper.find("[data-testid='error-state']").exists()).toBe(true);
  });

  it("should display calibration image when rack definition is loaded", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    const image = wrapper.find("img");
    expect(image.exists()).toBe(true);
    expect(image.attributes("src")).toBe(
      mockRackDefinition.calibrationImageUrl
    );
  });

  it("should emit close event when backdrop is clicked", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    // Click on backdrop
    await wrapper.find(".absolute.inset-0").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("should emit close event when cancel button is clicked", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    // Click cancel button
    const cancelButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Cancel"));
    expect(cancelButton).toBeTruthy();
    await cancelButton!.trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("should show marker when image is clicked", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    // Mock getBoundingClientRect
    const mockRect = {
      left: 100,
      top: 100,
      width: 600,
      height: 400,
    } as DOMRect;

    const image = wrapper.find("img");
    const imageElement = image.element as HTMLImageElement;
    vi.spyOn(imageElement, "getBoundingClientRect").mockReturnValue(mockRect);

    // Simulate click on image
    await image.trigger("click", {
      clientX: 250, // 150px from left edge of image
      clientY: 200, // 100px from top edge of image
    });

    // Check if marker is visible
    const marker = wrapper.find(".absolute.pointer-events-none");
    expect(marker.exists()).toBe(true);
  });

  it("should save location when Save button is clicked after setting marker", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    // Mock getBoundingClientRect
    const mockRect = {
      left: 100,
      top: 100,
      width: 600,
      height: 400,
    } as DOMRect;

    const image = wrapper.find("img");
    const imageElement = image.element as HTMLImageElement;
    vi.spyOn(imageElement, "getBoundingClientRect").mockReturnValue(mockRect);

    // Simulate click on image
    await image.trigger("click", {
      clientX: 250, // 150px from left edge of image
      clientY: 200, // 100px from top edge of image
    });

    // Click save button
    const saveButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Save Location"));
    expect(saveButton).toBeTruthy();
    await saveButton!.trigger("click");

    expect(saveWineLocation).toHaveBeenCalledWith("wine-1", {
      rackId: "rack-1",
      x: 0.25, // (250 - 100) / 600 = 0.25
      y: 0.25, // (200 - 100) / 400 = 0.25
    });

    expect(wrapper.emitted("location-saved")).toBeTruthy();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("should disable save button when no marker is set", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    const saveButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Save Location"));
    expect(saveButton).toBeTruthy();
    expect(saveButton!.element.disabled).toBe(true);
  });

  it("should handle rack loading error gracefully", async () => {
    vi.mocked(getRack).mockRejectedValue(new Error("Database error"));

    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Failed to load rack definition");
  });

  it("should handle save location error gracefully", async () => {
    vi.mocked(saveWineLocation).mockRejectedValue(new Error("Save error"));

    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    // Mock getBoundingClientRect
    const mockRect = {
      left: 100,
      top: 100,
      width: 600,
      height: 400,
    } as DOMRect;

    const image = wrapper.find("img");
    const imageElement = image.element as HTMLImageElement;
    vi.spyOn(imageElement, "getBoundingClientRect").mockReturnValue(mockRect);

    // Simulate click on image
    await image.trigger("click", {
      clientX: 250,
      clientY: 200,
    });

    // Click save button
    const saveButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Save Location"));
    await saveButton!.trigger("click");

    await flushPromises();

    expect(wrapper.text()).toContain("Failed to save location");
  });

  it("should show loading state initially", () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    expect(wrapper.find(".animate-spin").exists()).toBe(true);
  });
  it("should show magnifier on mouse move over image", async () => {
    const wrapper = mount(LocationPicker, {
      props: {
        show: true,
        rackId: "rack-1",
        wineId: "wine-1",
      },
    });

    await flushPromises();

    const image = wrapper.find("img");

    // Simulate mouse move
    await image.trigger("mousemove", {
      clientX: 250,
      clientY: 200,
    });

    // Verify the cursor style is set correctly
    expect(image.classes()).toContain("cursor-crosshair");
  });
});
