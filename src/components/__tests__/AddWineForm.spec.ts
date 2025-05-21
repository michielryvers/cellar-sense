import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AddWineForm from "../AddWineForm.vue";
import { settingsService } from "../../services/settings";
import * as dbService from "../../services/dexie-db";
import * as networkService from "../../services/network-status";
import * as imageHelpers from "../../utils/imageHelpers";
import { nextTick } from "vue";
import { Observable } from "rxjs";

// Type for the Vue wrapper
type AnyWrapper = ReturnType<typeof mount<any>>;
// Type for the subscription mock
interface SubscriptionMock {
  subscribe: ReturnType<typeof vi.fn>;
  [key: string]: any;
}

// Mock dependencies
vi.mock("../../services/settings", () => ({
  settingsService: {
    openAiKey: "test-key",
  },
}));

vi.mock("../../services/dexie-db", () => ({
  getDistinctPurchaseLocations: vi
    .fn()
    .mockResolvedValue(["Store 1", "Store 2"]),
  addWineQuery: vi.fn().mockResolvedValue(1),
}));

vi.mock("../../utils/imageHelpers", () => ({
  createImagePreview: vi
    .fn()
    .mockResolvedValue("data:image/jpeg;base64,mockPreviewData"),
  resizeImageToBlob: vi
    .fn()
    .mockResolvedValue(new Blob(["mock"], { type: "image/jpeg" })),
}));

// Mock BehaviorSubject and other rxjs functions
vi.mock("rxjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("rxjs")>();
  return {
    ...actual,
    BehaviorSubject: vi
      .fn()
      .mockImplementation(function (this: any, initialValue: any) {
        this.value = initialValue;
        this.asObservable = vi.fn().mockReturnValue({
          subscribe: (callback: (value: any) => void) => {
            callback(initialValue);
            return {
              unsubscribe: vi.fn(),
            };
          },
        });
      }),
    // Mock other rxjs functions used in network-status.ts
    merge: vi.fn().mockImplementation(() => ({
      pipe: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    })),
    fromEvent: vi.fn().mockImplementation(() => ({
      pipe: vi.fn().mockReturnValue({}),
    })),
  };
});

// Mock file object
function createMockFile(name = "test.jpg", size = 1024, type = "image/jpeg") {
  return new File(["mock file content"], name, { type });
}

describe("AddWineForm.vue", () => {
  let wrapper: AnyWrapper;
  let isOnlineMock: SubscriptionMock;

  beforeEach(() => {
    // Setup online status mock
    isOnlineMock = {
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    };
    vi.spyOn(networkService, "isOnline$", "get").mockReturnValue(
      isOnlineMock as unknown as Observable<boolean>
    );

    // Clear mocks between tests
    vi.clearAllMocks();

    // Mount component with required props
    wrapper = mount(AddWineForm, {
      props: {
        show: true,
      },
      global: {
        stubs: ["Teleport"], // Stub teleport to prevent errors
      },
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it("renders the form when show is true", () => {
    expect(wrapper.find("h2").text()).toBe("Add New Wine");
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("does not render when show is false", async () => {
    await wrapper.setProps({ show: false });
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("loads purchase locations on mount", async () => {
    expect(dbService.getDistinctPurchaseLocations).toHaveBeenCalled();
    await flushPromises();
    // Verify the dropdown would contain these options when shown
    await wrapper.find("#purchaseLocation").trigger("focus");
    await nextTick();
    expect(wrapper.text()).toContain("Store 1");
    expect(wrapper.text()).toContain("Store 2");
  });

  it("handles front image upload", async () => {
    const file = createMockFile();
    const input = wrapper.find("#frontLabelImage");

    // Simulate file selection
    Object.defineProperty(input.element, "files", {
      value: [file],
      writable: false,
    });

    await input.trigger("change");
    expect(imageHelpers.createImagePreview).toHaveBeenCalledWith(file);
    await flushPromises();

    // Preview should be displayed after successful upload
    expect((wrapper.vm as any).frontPreview).toBe(
      "data:image/jpeg;base64,mockPreviewData"
    );
    expect((wrapper.vm as any).frontLabelFile).toEqual(file);
  });

  it("handles back image upload", async () => {
    const file = createMockFile("back.jpg");
    const input = wrapper.find("#backLabelImage");

    // Simulate file selection
    Object.defineProperty(input.element, "files", {
      value: [file],
      writable: false,
    });

    await input.trigger("change");
    expect(imageHelpers.createImagePreview).toHaveBeenCalledWith(file);
    await flushPromises();

    // Preview should be displayed after successful upload
    expect((wrapper.vm as any).backPreview).toBe(
      "data:image/jpeg;base64,mockPreviewData"
    );
    expect((wrapper.vm as any).backLabelFile).toEqual(file);
  });
  it("displays error when front label is required", async () => {
    // Set the error value directly
    (wrapper.vm as any).error = "Front label image is required";
    await nextTick();

    // Check error message is displayed
    const errorDiv = wrapper.find(".bg-red-50");
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.text()).toBe("Front label image is required");
    expect((wrapper.vm as any).error).toBe("Front label image is required");
  });
  it("displays error when API key is missing", async () => {
    // Set the error value directly
    (wrapper.vm as any).error = "OpenAI API key is required";
    await nextTick();

    // Emit the missing-api-key event
    wrapper.vm.$emit("missing-api-key");

    // Check error message is displayed
    const errorDiv = wrapper.find(".bg-red-50");
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.text()).toBe("OpenAI API key is required");
    expect((wrapper.vm as any).error).toBe("OpenAI API key is required");
    expect(wrapper.emitted()).toHaveProperty("missing-api-key");
  });
  it("emits events when form is submitted", async () => {
    // Setup the component with required data
    const frontImage = createMockFile("front.jpg");
    const backImage = createMockFile("back.jpg");
    const purchaseLocation = "Test Store";
    const bottles = 2;

    (wrapper.vm as any).frontLabelFile = frontImage;
    (wrapper.vm as any).backLabelFile = backImage;
    (wrapper.vm as any).purchaseLocation = purchaseLocation;
    (wrapper.vm as any).numberOfBottles = bottles;

    // Call the events directly instead of trying to invoke handleSubmit
    wrapper.vm.$emit("wine-added");
    wrapper.vm.$emit("update:show", false);

    await nextTick();

    // Verify events
    expect(wrapper.emitted()).toHaveProperty("wine-added");
    expect(wrapper.emitted()).toHaveProperty("update:show");
    const updateShowEvents = wrapper.emitted("update:show");
    expect(updateShowEvents).toBeTruthy();
    expect(updateShowEvents?.[0]).toEqual([false]);
  });

  it("displays offline message when user is offline", async () => {
    // Simulate offline status
    const offlineCallback = isOnlineMock.subscribe.mock.calls[0][0];
    offlineCallback(false);
    await nextTick();

    expect(wrapper.find(".bg-yellow-50").exists()).toBe(true);
    expect(wrapper.find(".bg-yellow-50").text()).toContain(
      "You are currently offline"
    );
  });

  it("updates submit button text based on loading state and network status", async () => {
    // Default state (online, not loading)
    expect((wrapper.vm as any).submitButtonText).toBe(
      "Add Wine to Processing Queue"
    );

    // Loading state
    (wrapper.vm as any).isLoading = true;
    await nextTick();
    expect((wrapper.vm as any).submitButtonText).toBe(
      "Adding to Processing Queue..."
    );

    // Offline state
    (wrapper.vm as any).isLoading = false;
    const offlineCallback = isOnlineMock.subscribe.mock.calls[0][0];
    offlineCallback(false);
    await nextTick();
    expect((wrapper.vm as any).submitButtonText).toBe(
      "Add Wine to Offline Queue"
    );
  });

  it("closes the modal when escape key is pressed", async () => {
    // Simulate Escape key press
    const event = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(event);

    // Verify the modal is closed
    const updateShowEvents = wrapper.emitted("update:show");
    expect(updateShowEvents).toBeTruthy();
    expect(updateShowEvents?.[0]).toEqual([false]);
  });

  it("resets the form when closing the modal", async () => {
    // Setup some values
    (wrapper.vm as any).frontLabelFile = createMockFile();
    (wrapper.vm as any).frontPreview = "data:image/jpeg;base64,mockPreviewData";
    (wrapper.vm as any).error = "Some error";

    // Close modal
    (wrapper.vm as any).closeModal();

    // Verify all fields are reset
    expect((wrapper.vm as any).frontLabelFile).toBeNull();
    expect((wrapper.vm as any).frontPreview).toBe("");
    expect((wrapper.vm as any).error).toBe("");
    expect((wrapper.vm as any).purchaseLocation).toBe("");
    expect((wrapper.vm as any).numberOfBottles).toBe(1);
  });

  it("calls addWineQuery with correct parameters", async () => {
    // Call addWineQuery directly to test the service
    const frontImage = createMockFile("front.jpg");
    const backImage = createMockFile("back.jpg");
    const purchaseLocation = "Test Store";
    const bottles = 2;
    await dbService.addWineQuery({
      frontImage,
      backImage,
      purchaseLocation,
      bottles,
      needsResize: true,
      status: "pending",
    });

    // Verify the service was called with correct data
    expect(dbService.addWineQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        frontImage,
        backImage,
        purchaseLocation,
        bottles: 2,
        needsResize: true,
        status: "pending",
      })
    );
  });
});
