import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import RecommendationsResultModal from "../RecommendationsResultModal.vue";
import type { RecommendationOption } from "../../shared/types/RecommendationTypes";
import type { Wine } from "../../shared/Wine";

// Mock the dexie-db module
vi.mock("../../services/dexie-db", () => ({
  getWine: vi.fn(),
}));

// Import the mocked function after mocking the module
import { getWine } from "../../services/dexie-db";

describe("RecommendationsResultModal", () => {
  // Mock data for tests
  const mockRecommendations: RecommendationOption[] = [
    {
      id: "wine1",
      name: "Château Margaux",
      vintner: "Château Margaux",
      vintage: 2015,
      reason: "Similar to wines you've enjoyed before",
    },
    {
      id: "wine2",
      name: "Domaine Leroy Romanée-Saint-Vivant",
      vintner: "Domaine Leroy",
      vintage: 2018,
      reason: "Matches your preference for full-bodied reds",
    },
  ];

  const mockWineWithImage: Wine = {
    id: "wine1",
    name: "Château Margaux",
    images: { front: "data:image/png;base64,testimage" },
    vintner: "Château Margaux",
    vintage: 2015,
    appellation: "Margaux",
    region: "Bordeaux",
    grapes: [
      { name: "Cabernet Sauvignon", percentage: 70 },
      { name: "Merlot", percentage: 30 },
    ],
    color: "Red",
    volume: "750ml",
    alcohol: "13.5%",
    farming: "",
    price: "",
    sulfites: "",
    drink_from: "",
    drink_until: "",
    vinification: [],
    tasting_notes: {
      nose: [],
      palate: [],
    },
    inventory: {
      bottles: 0,
      purchaseDate: "",
      purchaseLocation: "",
    },
  };

  const mockWineWithoutImage: Wine = {
    id: "wine2",
    name: "Domaine Leroy Romanée-Saint-Vivant",
    vintner: "Domaine Leroy",
    vintage: 2018,
    appellation: "Romanée-Saint-Vivant",
    region: "Burgundy",
    grapes: [{ name: "Pinot Noir", percentage: 100 }],
    color: "Red",
    volume: "750ml",
    alcohol: "13%",
    farming: "",
    price: "",
    sulfites: "",
    drink_from: "",
    drink_until: "",
    vinification: [],
    tasting_notes: {
      nose: [],
      palate: [],
    },
    images: {
      front: "",
      back: undefined,
    },
    inventory: {
      bottles: 0,
      purchaseDate: "",
      purchaseLocation: "",
    },
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // @ts-expect-error Mocking implementation
    getWine.mockImplementation(async (id: string) => {
      if (id === "wine1") return mockWineWithImage;
      if (id === "wine2") return mockWineWithoutImage;
      return undefined;
    });
  });

  it("renders when show is true", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations,
      },
    });

    // Check if modal is rendered
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
    expect(wrapper.text()).toContain("🍷 Recommended Wines");
  });

  it("doesn't render when show is false", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: false,
        results: mockRecommendations,
      },
    });

    // Check if modal is not rendered
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(false);
  });

  it("displays the query when provided", () => {
    const testQuery = "Red wines under $30 with chocolate notes";
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations,
        query: testQuery,
      },
    });

    // Check if query is displayed
    expect(wrapper.find(".text-purple-900\\/80.italic").exists()).toBe(true);
    expect(wrapper.text()).toContain("Your query:");
    expect(wrapper.text()).toContain(testQuery);
  });

  it("doesn't display query section when no query is provided", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations,
      },
    });

    // Check query section is not displayed
    expect(wrapper.find(".text-purple-900\\/80.italic").exists()).toBe(false);
  });

  it("renders all wine recommendations correctly", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations,
      },
    });

    // Check if all recommendations are rendered
    const listItems = wrapper.findAll("li");
    expect(listItems.length).toBe(mockRecommendations.length);

    // Check content of the first recommendation
    expect(listItems[0].text()).toContain(mockRecommendations[0].name);
    expect(listItems[0].text()).toContain(mockRecommendations[0].vintner);
    expect(listItems[0].text()).toContain(mockRecommendations[0].vintage);
    expect(listItems[0].text()).toContain(mockRecommendations[0].reason);

    // Check content of the second recommendation
    expect(listItems[1].text()).toContain(mockRecommendations[1].name);
    expect(listItems[1].text()).toContain(mockRecommendations[1].vintner);
    expect(listItems[1].text()).toContain(mockRecommendations[1].vintage);
    expect(listItems[1].text()).toContain(mockRecommendations[1].reason);
  });

  it("fetches and displays wine images when available", async () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations,
      },
    });

    // Wait for promises to resolve (image fetching)
    await flushPromises();

    // Check if getWine was called for each recommendation
    expect(getWine).toHaveBeenCalledTimes(mockRecommendations.length);
    expect(getWine).toHaveBeenCalledWith("wine1");
    expect(getWine).toHaveBeenCalledWith("wine2");

    // Check if image is rendered for the wine with an image
    const wine1ListItem = wrapper
      .findAll("li")
      .find((li) => li.text().includes("Château Margaux"));
    expect(wine1ListItem).toBeDefined();
    const imgTag = wine1ListItem!.find("img");
    expect(imgTag.exists()).toBe(true);
    expect(imgTag.attributes("src")).toBe(mockWineWithImage.images?.front);
    expect(imgTag.attributes("alt")).toBe("Wine label");

    // Check that no image is rendered for the wine without an image
    const wine2ListItem = wrapper
      .findAll("li")
      .find((li) => li.text().includes("Domaine Leroy"));
    expect(wine2ListItem).toBeDefined();
    expect(wine2ListItem!.find("img").exists()).toBe(false);
  });

  it("handles Blob image URLs correctly", async () => {
    const blob = new Blob(["test data"], { type: "image/png" });
    const objectURL = "blob:http://localhost/test-blob-id";
    global.URL.createObjectURL = vi.fn(() => objectURL);

    const mockWineWithBlobImage: Wine = {
      ...mockWineWithImage,
      id: "wine_blob",
      images: { front: blob },
    };
    const recommendationsWithBlob: RecommendationOption[] = [
      {
        id: "wine_blob",
        name: "Blob Wine",
        vintner: "Blob Vintner",
        vintage: 2020,
        reason: "Test blob image",
      },
    ];

    // @ts-expect-error Mocking implementation
    getWine.mockImplementationOnce(async (id: string) => {
      if (id === "wine_blob") return mockWineWithBlobImage;
      return undefined;
    });

    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: recommendationsWithBlob,
      },
    });

    await flushPromises();

    expect(getWine).toHaveBeenCalledWith("wine_blob");
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);

    const imgTag = wrapper.find("img");
    expect(imgTag.exists()).toBe(true);
    expect(imgTag.attributes("src")).toBe(objectURL);

    // Clean up mock
    vi.mocked(global.URL.createObjectURL).mockRestore();
  });

  it("emits 'close' event when close button is clicked", async () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations,
      },
    });

    // Find and click the close button
    const closeButton = wrapper.find("[aria-label='Close']");
    await closeButton.trigger("click");

    // Verify close event was emitted
    expect(wrapper.emitted()).toHaveProperty("close");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits 'show-detail' event with wine ID when a wine name is clicked", async () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations,
      },
    });

    // Find and click the first wine name button
    const wineButtons = wrapper.findAll(
      ".font-semibold.text-purple-700.text-base"
    );
    await wineButtons[0].trigger("click");

    // Verify show-detail event was emitted with the correct wine ID
    expect(wrapper.emitted()).toHaveProperty("show-detail");
    const showDetailEvents = wrapper.emitted("show-detail");
    expect(showDetailEvents?.[0]).toEqual(["wine1"]);
  });

  it("renders correctly with empty results list", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: [],
      },
    });

    // Modal should still render
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
    expect(wrapper.text()).toContain("🍷 Recommended Wines");

    // No list items should be rendered
    const listItems = wrapper.findAll("li");
    expect(listItems.length).toBe(0);
  });
});
