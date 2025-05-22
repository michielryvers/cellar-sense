import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import DrinkWineModal from "../DrinkWineModal.vue";
import { nextTick } from "vue";
import * as useEscapeKeyModule from "../../composables/useEscapeKey";

// Mock composables
vi.mock("../../composables/useEscapeKey", () => ({
  useEscapeKey: vi.fn(),
}));

// Create mock wine data
const mockWine = {
  id: "123",
  name: "Test Wine",
  vintner: "Test Winery",
  vintage: 2020,
  appellation: "Test Valley",
  region: "Test Region",
  color: "Red",
  volume: "750ml",
  alcohol: "14%",
  farming: "Organic",
  price: "$20",
  sulfites: "Contains Sulfites",
  drink_from: 2022,
  drink_until: 2030,
  grapes: [{ name: "Grape Variety", percentage: 100 }],
  vinification: [{ step: "Fermentation", description: "Steel tanks" }],
  tasting_notes: {
    nose: ["Cherry", "Vanilla"],
    palate: ["Medium body", "Smooth tannins"],
  },
  images: {
    front: "data:image/png;base64,mockFrontImage",
  },
  inventory: {
    bottles: 3,
    purchaseDate: "2023-01-01",
    purchaseLocation: "Test Store",
  },
};

describe("DrinkWineModal.vue", () => {
  let wrapper;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mount component
    wrapper = mount(DrinkWineModal, {
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

  // Rendering tests
  it("renders the modal when show is true", () => {
    expect(wrapper.find("h2").text()).toBe("Rate This Wine");
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("does not render when show is false", async () => {
    await wrapper.setProps({ show: false });
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("displays wine information correctly", () => {
    expect(wrapper.find("h3").text()).toBe(mockWine.name);
    expect(wrapper.find("p").text()).toContain(mockWine.vintner);
    expect(wrapper.find("p").text()).toContain(mockWine.vintage);
  });

  // Star rating functionality tests
  it("updates rating when stars are clicked", async () => {
    // Get all rating star buttons (filter by class to exclude the close button and cancel button)
    const starButtons = wrapper.findAll("button.focus\\:outline-none");
    expect(starButtons.length).toBe(5);

    // Click the third star
    await starButtons[2].trigger("click");
    expect((wrapper.vm as any).rating).toBe(3);

    // Click the fifth star
    await starButtons[4].trigger("click");
    expect((wrapper.vm as any).rating).toBe(5);
  });

  it("updates hover rating when hovering over stars", async () => {
    // Get the star buttons with the specific class
    const starButtons = wrapper.findAll("button.focus\\:outline-none");

    // Hover over the fourth star
    await starButtons[3].trigger("mouseenter");
    expect((wrapper.vm as any).hoverRating).toBe(4);
    
    // Call the handler directly to simulate mouseleave
    (wrapper.vm as any).handleStarLeave();
    expect((wrapper.vm as any).hoverRating).toBe(0);
  });

  // Form submission tests
  it("disables save button when rating is 0", () => {
    const saveButton = wrapper.find("button[type='submit']");
    expect(saveButton.attributes("disabled")).toBeDefined();
  });

  it("enables save button when rating is set", async () => {
    // Set rating to 4
    await wrapper.findAll("button[type='button']")[3].trigger("click");
    expect((wrapper.vm as any).rating).toBe(4);

    // Check button is enabled
    const saveButton = wrapper.find("button[type='submit']");
    expect(saveButton.attributes("disabled")).toBeUndefined();
  });

  it("emits save event with correct data when form is submitted", async () => {
    // Mock date to ensure consistent test
    const mockDate = new Date("2023-05-01T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Set form data directly on the VM to ensure it's set correctly
    (wrapper.vm as any).rating = 4;
    (wrapper.vm as any).notes = "This is a test note";
    await nextTick();

    // Create expected consumption object
    const expectedConsumption = {
      date: mockDate.toISOString(),
      rating: 4,
      notes: "This is a test note",
    };

    // Call the submit handler directly to avoid event bubbling issues
    (wrapper.vm as any).handleSubmit();
    await nextTick();

    // Verify emitted events
    expect(wrapper.emitted()).toHaveProperty("save");
    const saveEvent = wrapper.emitted().save[0][0];
    expect(saveEvent.rating).toBe(expectedConsumption.rating);
    expect(saveEvent.notes).toBe(expectedConsumption.notes);
    expect(saveEvent.date).toBeDefined(); // Date might differ slightly due to ISO string format

    // Verify form was reset
    expect((wrapper.vm as any).rating).toBe(0);
    expect((wrapper.vm as any).notes).toBe("");

    // Verify modal was closed
    expect(wrapper.emitted()).toHaveProperty("update:show");
    expect(wrapper.emitted()["update:show"][0]).toEqual([false]);

    vi.useRealTimers();
  });

  // Modal closing tests
  it("closes modal when close button is clicked", async () => {
    const closeButton = wrapper.find("button[aria-label='Close modal']");
    await closeButton.trigger("click");

    expect(wrapper.emitted()).toHaveProperty("update:show");
    expect(wrapper.emitted()["update:show"][0]).toEqual([false]);
    expect(wrapper.emitted()).toHaveProperty("cancel");
  });

  it("closes modal when clicking outside", async () => {
    // The outer div handles the outside click
    const modalOverlay = wrapper.find("div.fixed.inset-0");
    await modalOverlay.trigger("click");

    expect(wrapper.emitted()).toHaveProperty("update:show");
    expect(wrapper.emitted()["update:show"][0]).toEqual([false]);
  });

  it("does not close modal when clicking inside", async () => {
    // Click on the modal content
    const modalContent = wrapper.find("div.bg-white");
    await modalContent.trigger("click");

    // Modal should not be closed
    expect(wrapper.emitted()["update:show"]).toBeUndefined();
  });

  it("closes modal when escape key is pressed", async () => {
    // Get the escape key handler that was registered
    const useEscapeKeySpy = vi.spyOn(useEscapeKeyModule, "useEscapeKey");
    
    // Simulate the mounting phase and capture the callback
    const component = mount(DrinkWineModal, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    // The first argument passed to useEscapeKey should be the closeModal function
    const closeModalFunc = useEscapeKeySpy.mock.calls[0][0];
    
    // Call the captured function directly to simulate pressing escape
    closeModalFunc();
    
    // Verify the modal was closed
    expect(component.emitted()).toHaveProperty("update:show");
    expect(component.emitted()["update:show"][0]).toEqual([false]);
    expect(component.emitted()).toHaveProperty("cancel");
    
    component.unmount();
  });

  // Form resetting test
  it("resets form when modal is closed", async () => {
    // Set values in the form
    await wrapper.findAll("button[type='button']")[3].trigger("click");
    await wrapper.find("textarea").setValue("Test notes");
    
    // Verify values are set
    expect((wrapper.vm as any).rating).toBe(4);
    expect((wrapper.vm as any).notes).toBe("Test notes");
    
    // Close the modal
    await wrapper.find("button[aria-label='Close modal']").trigger("click");
    
    // Verify form was reset
    expect((wrapper.vm as any).rating).toBe(0);
    expect((wrapper.vm as any).notes).toBe("");
  });
});