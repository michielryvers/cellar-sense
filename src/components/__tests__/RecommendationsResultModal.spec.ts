import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RecommendationsResultModal from "../RecommendationsResultModal.vue";
import type { RecommendationOption } from "../../shared/types/RecommendationTypes";

describe("RecommendationsResultModal", () => {
  // Mock data for tests
  const mockRecommendations: RecommendationOption[] = [
    {
      id: "wine1",
      name: "Château Margaux",
      vintner: "Château Margaux",
      vintage: 2015,
      reason: "Similar to wines you've enjoyed before"
    },
    {
      id: "wine2",
      name: "Domaine Leroy Romanée-Saint-Vivant",
      vintner: "Domaine Leroy",
      vintage: 2018,
      reason: "Matches your preference for full-bodied reds"
    }
  ];

  it("renders when show is true", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations
      }
    });

    // Check if modal is rendered
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
    expect(wrapper.text()).toContain("🍷 Recommended Wines");
  });

  it("doesn't render when show is false", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: false,
        results: mockRecommendations
      }
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
        query: testQuery
      }
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
        results: mockRecommendations
      }
    });

    // Check query section is not displayed
    expect(wrapper.find(".text-purple-900\\/80.italic").exists()).toBe(false);
  });

  it("renders all wine recommendations correctly", () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations
      }
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

  it("emits 'close' event when close button is clicked", async () => {
    const wrapper = mount(RecommendationsResultModal, {
      props: {
        show: true,
        results: mockRecommendations
      }
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
        results: mockRecommendations
      }
    });

    // Find and click the first wine name button
    const wineButtons = wrapper.findAll(".font-semibold.text-purple-700.text-base");
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
        results: []
      }
    });

    // Modal should still render
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
    expect(wrapper.text()).toContain("🍷 Recommended Wines");
    
    // No list items should be rendered
    const listItems = wrapper.findAll("li");
    expect(listItems.length).toBe(0);
  });
});