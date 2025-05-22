import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WineDetail from "../WineDetail.vue";
import type { Wine } from "../../shared/Wine";

// Mock the useEscapeKey composable
vi.mock("../../composables/useEscapeKey", () => ({
  useEscapeKey: vi.fn(),
}));

// Mock URL.createObjectURL
const mockObjectURL = "mock-object-url";
global.URL.createObjectURL = vi.fn(() => mockObjectURL);

describe("WineDetail", () => {
  // Create a complete mock Wine object for testing
  const mockWine: Wine = {
    id: "test-id-123",
    name: "Test Wine",
    vintner: "Test Winery",
    vintage: 2020,
    appellation: "Test Valley AVA",
    region: "Test Region, Country",
    color: "Red",
    volume: "750 ml",
    alcohol: "13.5%",
    farming: "Organic",
    price: "$25.99",
    sulfites: "Contains Sulfites",
    drink_from: 2022,
    drink_until: 2030,
    grapes: [
      { name: "Cabernet Sauvignon", percentage: 80 },
      { name: "Merlot", percentage: 20 },
    ],
    vinification: [
      { step: "Harvest", description: "Hand-harvested in early October" },
      { step: "Fermentation", description: "20 days in stainless steel tanks" },
      { step: "Aging", description: "18 months in French oak barrels" },
    ],
    tasting_notes: {
      nose: ["Black Cherry", "Vanilla", "Tobacco"],
      palate: ["Full-bodied", "Structured Tannins", "Long Finish"],
    },
    images: {
      front: "data:image/jpeg;base64,mockbase64string",
      back: new Blob(["mock-blob-content"], { type: "image/jpeg" }),
    },
    inventory: {
      bottles: 3,
      purchaseDate: "2023-05-15",
      purchaseLocation: "Local Wine Store",
    },
    consumptions: [
      { date: "2023-12-25", rating: 4, notes: "Excellent with Christmas dinner" },
      { date: "2023-10-31", rating: 5, notes: "Perfect for Halloween party" },
    ],
    sources: ["https://example.com/wine-info", "https://winedata.org/test-wine"],
  };

  it("renders wine details correctly", () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Check basic information section
    expect(wrapper.text()).toContain("Test Wine");
    expect(wrapper.text()).toContain("Test Winery");
    expect(wrapper.text()).toContain("2020");

    // Check for each section header
    expect(wrapper.text()).toContain("Basic Information");
    expect(wrapper.text()).toContain("Technical Details");
    expect(wrapper.text()).toContain("Grape Varieties");
    expect(wrapper.text()).toContain("Vinification Process");
    expect(wrapper.text()).toContain("Tasting Notes");
    expect(wrapper.text()).toContain("Drinking Window");
    expect(wrapper.text()).toContain("Additional Details");
    expect(wrapper.text()).toContain("Data Sources");
    expect(wrapper.text()).toContain("Consumption History");
  });

  it("renders images correctly", () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Check front image
    const frontImage = wrapper.find('img[alt="Front label"]');
    expect(frontImage.exists()).toBe(true);
    expect(frontImage.attributes("src")).toBe(mockWine.images.front);

    // Check back image
    const backImage = wrapper.find('img[alt="Back label"]');
    expect(backImage.exists()).toBe(true);
    expect(backImage.attributes("src")).toBe(mockObjectURL);
  });

  it("renders grape varieties correctly", () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Find grape varieties section by text content
    const grapeSection = wrapper.findAll('h3').find(el => el.text() === 'Grape Varieties')?.element.parentElement;
    expect(grapeSection).toBeTruthy();
    expect(grapeSection?.textContent).toContain("Cabernet Sauvignon");
    expect(grapeSection?.textContent).toContain("80%");
    expect(grapeSection?.textContent).toContain("Merlot");
    expect(grapeSection?.textContent).toContain("20%");
  });

  it("renders tasting notes correctly", () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Check nose notes
    const noseSection = wrapper.findAll("h4").find(h => h.text() === "Nose")?.element.parentElement;
    expect(noseSection).toBeTruthy();
    expect(noseSection?.textContent).toContain("Black Cherry");
    expect(noseSection?.textContent).toContain("Vanilla");
    expect(noseSection?.textContent).toContain("Tobacco");

    // Check palate notes
    const palateSection = wrapper.findAll("h4").find(h => h.text() === "Palate")?.element.parentElement;
    expect(palateSection).toBeTruthy();
    expect(palateSection?.textContent).toContain("Full-bodied");
    expect(palateSection?.textContent).toContain("Structured Tannins");
    expect(palateSection?.textContent).toContain("Long Finish");
  });

  it("renders drinking window correctly", () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Find drinking window section
    const drinkingWindowSection = wrapper.findAll('h3').find(el => el.text() === 'Drinking Window')?.element.parentElement;
    expect(drinkingWindowSection).toBeTruthy();
    expect(drinkingWindowSection?.textContent).toContain("From");
    expect(drinkingWindowSection?.textContent).toContain("2022");
    expect(drinkingWindowSection?.textContent).toContain("Until");
    expect(drinkingWindowSection?.textContent).toContain("2030");
  });

  it("renders consumption history correctly with average rating", () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Check for consumption history section
    const historySection = wrapper.findAll('h3').find(el => el.text() === 'Consumption History');
    expect(historySection).toBeTruthy();
    
    // Check for average rating display
    expect(wrapper.text()).toContain("Average Rating");
    expect(wrapper.text()).toContain("4.5"); // Average of 4 and 5
    
    // Check consumption notes are displayed
    expect(wrapper.text()).toContain("Excellent with Christmas dinner");
    expect(wrapper.text()).toContain("Perfect for Halloween party");
  });

  it("emits edit event when edit button is clicked", async () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Click edit button by finding it through its text content
    const editButton = wrapper.findAll('button').find(b => b.text().includes('Edit'));
    expect(editButton).toBeTruthy();
    await editButton?.trigger("click");
    
    // Check that the edit event was emitted with the wine object
    expect(wrapper.emitted("edit")).toBeTruthy();
    expect(wrapper.emitted("edit")?.[0]).toEqual([mockWine]);
    
    // Check that the modal is closed
    expect(wrapper.emitted("update:show")).toBeTruthy();
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("emits update:show event when close button is clicked", async () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Click close button
    await wrapper.find("button[aria-label='Close modal']").trigger("click");
    
    // Check that the update:show event was emitted with false
    expect(wrapper.emitted("update:show")).toBeTruthy();
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("closes modal when clicking outside the modal content", async () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Click the backdrop
    await wrapper.find(".fixed.inset-0").trigger("click");
    
    // Check that the modal is closed
    expect(wrapper.emitted("update:show")).toBeTruthy();
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("doesn't close modal when clicking on modal content", async () => {
    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: mockWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Click inside the modal content
    await wrapper.find(".bg-white.rounded-xl").trigger("click");
    
    // Check that the update:show event was not emitted
    expect(wrapper.emitted("update:show")).toBeFalsy();
  });

  it("handles missing data gracefully", () => {
    // Create wine object with minimal data
    const minimalWine: Wine = {
      id: "minimal-id",
      name: "",
      vintner: "",
      vintage: "",
      appellation: "",
      region: "",
      color: "",
      volume: "",
      alcohol: "",
      farming: "",
      price: "",
      sulfites: "",
      drink_from: "",
      drink_until: "",
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "" },
      inventory: {
        bottles: 0,
        purchaseDate: "",
        purchaseLocation: "",
      },
    };

    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: minimalWine,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Check fallbacks are shown for missing data
    expect(wrapper.text()).toContain("Unnamed Wine");
    expect(wrapper.text()).toContain("No grape varieties specified");
    expect(wrapper.text()).toContain("No vinification details available");
    expect(wrapper.text()).toContain("No nose characteristics specified");
    expect(wrapper.text()).toContain("No palate characteristics specified");
    
    // Check images section is not rendered
    const labelsHeadings = wrapper.findAll('h3').filter(h => h.text() === 'Labels');
    expect(labelsHeadings.length).toBe(0);
    
    // Check consumption history section is not rendered
    const consumptionHeadings = wrapper.findAll('h3').filter(h => h.text() === 'Consumption History');
    expect(consumptionHeadings.length).toBe(0);
  });
});