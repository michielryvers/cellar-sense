import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import EditWineForm from "../EditWineForm.vue";
import * as dbService from "../../services/dexie-db";

// Mock dependencies
vi.mock("../../services/dexie-db", () => ({
  updateWine: vi.fn().mockResolvedValue("test-id"),
}));

// Type for the Vue wrapper
type AnyWrapper = ReturnType<typeof mount<any>>;

// Mock wine data for testing
const mockWine = {
  id: "test-id",
  name: "Test Wine",
  vintner: "Test Vintner",
  vintage: 2020,
  appellation: "Test Appellation",
  region: "Test Region",
  color: "Red",
  volume: "750ml",
  alcohol: "13.5%",
  farming: "Organic",
  price: "$20",
  sulfites: "Contains Sulfites",
  drink_from: 2022,
  drink_until: 2025,
  grapes: [
    { name: "Cabernet Sauvignon", percentage: 80 },
    { name: "Merlot", percentage: 20 },
  ],
  vinification: [
    { step: "Fermentation", description: "Stainless steel tanks" },
  ],
  tasting_notes: {
    nose: ["Cherry", "Blackberry"],
    palate: ["Full-bodied", "Tannic"],
  },
  images: {
    front: "front-image-data",
    back: "back-image-data",
  },
  inventory: {
    bottles: 3,
    purchaseDate: "2023-01-01",
    purchaseLocation: "Wine Shop",
  },
  sources: ["https://example.com"],
};

describe("EditWineForm.vue", () => {
  let wrapper: AnyWrapper;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mount component with required props
    wrapper = mount(EditWineForm, {
      props: {
        show: true,
        wine: mockWine,
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
    expect(wrapper.find("h2").text()).toBe("Edit Wine Details");
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("does not render when show is false", async () => {
    await wrapper.setProps({ show: false });
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("initializes with the provided wine data", () => {
    expect((wrapper.find("#wineName").element as HTMLInputElement).value).toBe(
      mockWine.name
    );
    expect(
      (wrapper.find("#wineVintner").element as HTMLInputElement).value
    ).toBe(mockWine.vintner);
    expect(
      (wrapper.find("#wineVintage").element as HTMLInputElement).value
    ).toBe(mockWine.vintage.toString());
    expect((wrapper.find("#wineColor").element as HTMLInputElement).value).toBe(
      mockWine.color
    );
  });

  it("updates formData when inputs change", async () => {
    const nameInput = wrapper.find("#wineName");
    await nameInput.setValue("Updated Wine Name");
    expect((wrapper.vm as any).formData.name).toBe("Updated Wine Name");

    const vintnerInput = wrapper.find("#wineVintner");
    await vintnerInput.setValue("Updated Vintner");
    expect((wrapper.vm as any).formData.vintner).toBe("Updated Vintner");
  });

  it("adds a grape when addGrape is called", async () => {
    const initialGrapesCount = mockWine.grapes.length;
    // Call the method directly
    (wrapper.vm as any).addGrape();
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.grapes.length).toBe(
      initialGrapesCount + 1
    );
    expect((wrapper.vm as any).formData.grapes[initialGrapesCount]).toEqual({
      name: "",
      percentage: 0,
    });
  });

  it("removes a grape when removeGrape is called", async () => {
    const initialGrapesCount = mockWine.grapes.length;
    // Call the method directly
    (wrapper.vm as any).removeGrape(0);
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.grapes.length).toBe(
      initialGrapesCount - 1
    );
  });

  it("adds a vinification step when addVinificationStep is called", async () => {
    const initialCount = mockWine.vinification.length;
    // Call the method directly
    (wrapper.vm as any).addVinificationStep();
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.vinification.length).toBe(
      initialCount + 1
    );
    expect((wrapper.vm as any).formData.vinification[initialCount]).toEqual({
      step: "",
      description: "",
    });
  });

  it("adds a tasting note when addTastingNote is called", async () => {
    const initialNoseCount = mockWine.tasting_notes.nose.length;
    // Call the method directly
    (wrapper.vm as any).addTastingNote("nose");
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.tasting_notes.nose.length).toBe(
      initialNoseCount + 1
    );
  });

  it("adds a source when addSource is called", async () => {
    const initialSourcesCount = mockWine.sources.length;
    // Call the method directly
    (wrapper.vm as any).addSource();
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.sources.length).toBe(
      initialSourcesCount + 1
    );
    expect((wrapper.vm as any).formData.sources[initialSourcesCount]).toBe("");
  });

  it("displays error message when there is an error", async () => {
    // Set error
    (wrapper.vm as any).error = "Test error message";
    await wrapper.vm.$nextTick();

    // Check error display
    const errorDiv = wrapper.find(".bg-red-50");
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.text()).toBe("Test error message");
  });

  it("emits update:show event when closeModal is called", async () => {
    // Call closeModal directly
    (wrapper.vm as any).closeModal();
    await wrapper.vm.$nextTick();

    // Verify event emission
    expect(wrapper.emitted("update:show")).toBeTruthy();
    expect(wrapper.emitted("update:show")![0]).toEqual([false]);
  });

  it("handles outside click to close the modal", async () => {
    // Create a mock event with target and currentTarget being the same
    const mockEvent = {
      target: "test",
      currentTarget: "test",
    } as unknown as MouseEvent;

    // Call handleOutsideClick
    (wrapper.vm as any).handleOutsideClick(mockEvent);
    await wrapper.vm.$nextTick();

    // Verify event emission
    expect(wrapper.emitted("update:show")).toBeTruthy();
    expect(wrapper.emitted("update:show")![0]).toEqual([false]);
  });

  it("doesn't close modal when clicking on inner elements", async () => {
    // Create a mock event with different target and currentTarget
    const mockEvent = {
      target: "test1",
      currentTarget: "test2",
    } as unknown as MouseEvent;

    // Call handleOutsideClick
    (wrapper.vm as any).handleOutsideClick(mockEvent);
    await wrapper.vm.$nextTick();

    // Verify no event emission
    expect(wrapper.emitted("update:show")).toBeFalsy();
  });

  it("submits the form and calls updateWine with correct data", async () => {
    // Update a form field
    await wrapper.find("#wineName").setValue("Updated Wine");

    // Submit the form
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // Check if updateWine was called with the correct data
    expect(dbService.updateWine).toHaveBeenCalled();
    const updateWineArg = vi.mocked(dbService.updateWine).mock.calls[0][0];
    expect(updateWineArg.name).toBe("Updated Wine");
    expect(updateWineArg.id).toBe(mockWine.id);

    // Verify events were emitted
    expect(wrapper.emitted("wine-updated")).toBeTruthy();
    expect(wrapper.emitted("update:show")).toBeTruthy();
  });

  it("handles errors during form submission", async () => {
    // Setup updateWine to reject
    const errorMessage = "Failed to update wine";
    vi.mocked(dbService.updateWine).mockRejectedValueOnce(
      new Error(errorMessage)
    );

    // Submit the form
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // Check if error state is updated
    expect((wrapper.vm as any).error).toBe(errorMessage);
    expect((wrapper.vm as any).isLoading).toBe(false);

    // Verify error message is displayed
    const errorDiv = wrapper.find(".bg-red-50");
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.text()).toBe(errorMessage);

    // Verify no events were emitted
    expect(wrapper.emitted("wine-updated")).toBeFalsy();
    expect(wrapper.emitted("update:show")).toBeFalsy();
  });

  it("disables the submit button while loading", async () => {
    // Set loading state
    (wrapper.vm as any).isLoading = true;
    await wrapper.vm.$nextTick();

    // Check submit button is disabled
    const submitButton = wrapper.find("button[type='submit']");
    expect(submitButton.attributes("disabled")).toBe("");
    expect(submitButton.text()).toContain("Saving...");
  });

  it("removes a vinification step when removeVinificationStep is called", async () => {
    const initialCount = mockWine.vinification.length;
    // Call the method directly
    (wrapper.vm as any).removeVinificationStep(0);
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.vinification.length).toBe(
      initialCount - 1
    );
  });

  it("removes a tasting note when removeTastingNote is called", async () => {
    const initialCount = mockWine.tasting_notes.nose.length;
    // Call the method directly
    (wrapper.vm as any).removeTastingNote("nose", 0);
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.tasting_notes.nose.length).toBe(
      initialCount - 1
    );
  });

  it("removes a source when removeSource is called", async () => {
    const initialCount = mockWine.sources.length;
    // Call the method directly
    (wrapper.vm as any).removeSource(0);
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).formData.sources.length).toBe(initialCount - 1);
  });
});
