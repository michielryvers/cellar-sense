import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import WineRecommendModal from "../WineRecommendModal.vue";
import type { RecommendationHistoryEntry } from "../../shared/types";

// Mock the heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  StarIcon: { render: () => {} },
  XMarkIcon: { render: () => {} },
  ClockIcon: { render: () => {} },
  ChevronDownIcon: { render: () => {} },
  ChevronUpIcon: { render: () => {} },
}));

// Mock liveQuery and recommendations service
const unsubscribeMock = vi.fn();
const mockSubscribe = vi.fn((cb) => {
  cb.next([]); // Default to empty array
  return { unsubscribe: unsubscribeMock };
});

vi.mock("dexie", () => ({
  liveQuery: vi.fn(() => ({
    subscribe: mockSubscribe,
  })),
}));

vi.mock("../../services/recommendations-idb", () => ({
  getAllRecommendations: vi.fn().mockResolvedValue([]),
}));

// Sample recommendation history entries for testing
const sampleRecommendations: RecommendationHistoryEntry[] = [
  {
    id: 1,
    query: "Looking for a red wine to go with steak",
    results: [
      {
        id: "1",
        name: "Cabernet Sauvignon",
        vintner: "Chateau Test",
        vintage: 2018,
        reason: "Pairs well with steak",
      },
    ],
    createdAt: Date.now() - 10000,
  },
  {
    id: 2,
    query: "White wine for fish",
    results: [
      {
        id: "2",
        name: "Sauvignon Blanc",
        vintner: "Test Winery",
        vintage: 2020,
        reason: "Perfect with seafood",
      },
    ],
    createdAt: Date.now(),
  },
];

describe("WineRecommendModal", () => {
  let wrapper: ReturnType<typeof mount<typeof WineRecommendModal>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockImplementation((cb) => {
      cb.next([]);
      return { unsubscribe: unsubscribeMock };
    });
  });

  afterEach(() => {
    if (wrapper) wrapper.unmount();
  });

  it("renders correctly when show is true", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"], // Stub teleport to prevent errors
      },
    });

    expect(wrapper.find(".rounded-xl").exists()).toBe(true);
    expect(wrapper.find("h2").text()).toContain(
      "Ask for a Wine Recommendation"
    );
    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.find("button[type='submit']").exists()).toBe(true);
  });

  it("does not render when show is false", () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: false,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    expect(wrapper.find(".rounded-xl").exists()).toBe(false);
  });

  it("displays error message when provided", () => {
    const errorMessage = "Failed to get recommendations";
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: errorMessage,
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    expect(wrapper.find(".text-red-600").text()).toBe(errorMessage);
  });

  it("emits update:show event when close button is clicked", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    await wrapper.find("button[aria-label='Close modal']").trigger("click");
    expect(wrapper.emitted()["update:show"]).toBeTruthy();
    expect(wrapper.emitted()["update:show"][0]).toEqual([false]);
  });

  it("emits update:show event when clicking outside the modal", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    // The outer div has the click.self handler
    await wrapper.find(".fixed.inset-0").trigger("click");
    expect(wrapper.emitted()["update:show"]).toBeTruthy();
    expect(wrapper.emitted()["update:show"][0]).toEqual([false]);
  });

  it("toggles past recommendations section when clicking the button", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    // Past recommendations section should initially be hidden
    expect(wrapper.find("div[class*='divide-y']").exists()).toBe(false);

    // Click toggle button
    await wrapper.find("button.flex.items-center.gap-2").trigger("click");

    // Check if toggle state changed
    expect((wrapper.vm as any).showPast).toBe(true);
  });

  it("shows 'no recommendations' message when past recommendations are empty", async () => {
    // Setup with empty recommendations
    mockSubscribe.mockImplementation((cb) => {
      cb.next([]);
      return { unsubscribe: unsubscribeMock };
    });

    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    // Toggle past recommendations
    await wrapper.find("button.flex.items-center.gap-2").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("No previous recommendations yet.");
  });

  it("displays past recommendations when available", async () => {
    // Setup with sample recommendations
    mockSubscribe.mockImplementation((cb) => {
      cb.next(sampleRecommendations);
      return { unsubscribe: unsubscribeMock };
    });

    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    // Toggle past recommendations
    await wrapper.find("button.flex.items-center.gap-2").trigger("click");
    await nextTick();

    // Check if recommendations are displayed
    const listItems = wrapper.findAll("li");
    expect(listItems.length).toBe(2);
    expect(listItems[0].text()).toContain(
      "Looking for a red wine to go with steak"
    );
    expect(listItems[0].text()).toContain("Cabernet Sauvignon");
  });

  it("emits submit-query event when form is submitted", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    const testQuery = "I need a wine for pasta dinner";
    await wrapper.find("textarea").setValue(testQuery);
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted()["submit-query"]).toBeTruthy();
    expect(wrapper.emitted()["submit-query"][0]).toEqual([testQuery]);
  });

  it("does not emit submit-query event when input is empty", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    await wrapper.find("textarea").setValue("   ");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted()["submit-query"]).toBeFalsy();
  });

  it("emits show-past-result event when clicking on a past recommendation", async () => {
    // Setup with sample recommendations
    mockSubscribe.mockImplementation((cb) => {
      cb.next(sampleRecommendations);
      return { unsubscribe: unsubscribeMock };
    });

    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    // Toggle past recommendations
    await wrapper.find("button.flex.items-center.gap-2").trigger("click");
    await nextTick();

    // Click on the first recommendation
    await wrapper.findAll("li")[0].trigger("click");

    expect(wrapper.emitted()["show-past-result"]).toBeTruthy();
    expect((wrapper.emitted()["show-past-result"] as any[])[0][0]).toEqual(
      sampleRecommendations[0]
    );
  });

  it("displays proper button text and state when loading", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: true,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    const submitButton = wrapper.find("button[type='submit']");
    expect(submitButton.text()).toContain("Waiting for OpenAI");
    expect(submitButton.find("svg.animate-spin").exists()).toBe(true);
    expect(submitButton.attributes("disabled")).toBeDefined();
  });

  it("unsubscribes from liveQuery on unmount", async () => {
    wrapper = mount(WineRecommendModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"],
      },
    });

    wrapper.unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
