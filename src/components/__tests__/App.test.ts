import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import App from "../../App.vue";
import { settingsService } from "../../services/settings";
import * as dbService from "../../services/dexie-db";
import * as recommendService from "../../services/openai-recommend";
import * as questionService from "../../services/openai-questions";

// Type for the Vue wrapper
type AnyWrapper = ReturnType<typeof mount<any>>;

// Mock dexie-cloud-login
vi.mock("../../services/dexie-cloud-login", () => ({
  currentUser: { value: null },
  isLoggedIn: { value: false },
  userInteraction: { value: null },
  logout: vi.fn(),
  initializeDexieCloudLogin: vi.fn(),
}));

// Mock components
vi.mock("../../components/WineTable.vue", () => ({
  default: {
    name: "WineTable",
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/SettingsModal.vue", () => ({
  default: {
    name: "SettingsModal",
    props: ["show"],
    emits: ["update:show", "save"],
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/AddWineForm.vue", () => ({
  default: {
    name: "AddWineForm",
    props: ["show"],
    emits: ["update:show", "wine-added", "missing-api-key"],
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/EditWineForm.vue", () => ({
  default: {
    name: "EditWineForm",
    props: ["show", "wine"],
    emits: ["update:show", "wine-updated"],
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/WineQueue.vue", () => ({
  default: {
    name: "WineQueue",
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/WineDetail.vue", () => ({
  default: {
    name: "WineDetail",
    props: ["show", "wine"],
    emits: ["update:show", "edit"],
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/WineRecommendModal.vue", () => ({
  default: {
    name: "WineRecommendModal",
    props: ["show", "loading", "error"],
    emits: ["update:show", "submit-query", "show-past-result"],
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/RecommendationsResultModal.vue", () => ({
  default: {
    name: "RecommendationsResultModal",
    props: ["show", "results", "query"],
    emits: ["close", "show-detail"],
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/WineQuestionModal.vue", () => ({
  default: {
    name: "WineQuestionModal",
    props: ["show", "loading", "error"],
    emits: ["update:show", "submit-question", "show-past-question"],
    setup() {
      return () => {};
    },
  },
}));

vi.mock("../../components/WineQuestionResultModal.vue", () => ({
  default: {
    name: "WineQuestionResultModal",
    props: ["show", "response", "question"],
    emits: ["close"],
    setup() {
      return () => {};
    },
  },
}));

// Mock heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  Cog6ToothIcon: {
    name: "Cog6ToothIcon",
    render: () => {},
  },
  PlusIcon: {
    name: "PlusIcon",
    render: () => {},
  },
  StarIcon: {
    name: "StarIcon",
    render: () => {},
  },
  QuestionMarkCircleIcon: {
    name: "QuestionMarkCircleIcon",
    render: () => {},
  },
  XMarkIcon: {
    name: "XMarkIcon",
    render: () => {},
  },
  ArrowRightOnRectangleIcon: {
    name: "ArrowRightOnRectangleIcon",
    render: () => {},
  },
}));

// Mock services
vi.mock("../../services/settings", () => ({
  settingsService: {
    openAiKey: "test-key",
    hasOpenAiKey: vi.fn().mockReturnValue(true),
    themePreference: "system",
    applyTheme: vi.fn(),
    getEffectiveTheme: vi.fn().mockReturnValue("light"),
    setupThemeListener: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock("../../services/dexie-db", () => ({
  db: {
    cloud: {
      currentUser: { value: null },
    },
    wines: {
      toArray: vi.fn(),
    },
  },
  getAllWines: vi.fn(),
  showDexieLoginModal: false,
  dexieLoginTitle: "",
  dexieLoginMessage: "",
  dexieLoginButtonText: "",
  dexieLoginError: "",
  dexieLoginInputPlaceholder: "",
  dexieLoginCallback: null,
}));

vi.mock("../../services/openai-recommend", () => ({
  getWineRecommendations: vi.fn(),
}));

vi.mock("../../services/openai-questions", () => ({
  askWineQuestion: vi.fn(),
}));

describe("App.vue", () => {
  let wrapper: AnyWrapper;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock responses
    vi.mocked(settingsService.hasOpenAiKey).mockReturnValue(true);
    vi.mocked(dbService.getAllWines).mockResolvedValue([
      {
        id: "1",
        name: "Test Wine 1",
        vintner: "Test Vintner",
        vintage: 2020,
        appellation: "Test Appellation",
        region: "Test Region",
        grapes: [{ name: "Grenache", percentage: 100 }],
        color: "Red",
        volume: "750 ml",
        alcohol: "13% Vol",
        farming: "Organic",
        vinification: [
          { step: "harvest", description: "Manual" },
          { step: "yeasts", description: "Indigenous" },
          { step: "maceration", description: "2 weeks" },
          { step: "aging", description: "6 months" },
          { step: "bottling", description: "Unfiltered" },
        ],
        tasting_notes: {
          nose: ["Berry"],
          palate: ["Smooth"],
        },
        drink_from: 2021,
        drink_until: 2025,
        price: "$20",
        sulfites: "Low-sulfite",
        images: { front: "", back: "" },
        inventory: {
          bottles: 1,
          purchaseDate: "2024-01-01",
          purchaseLocation: "Test Store",
        },
      },
      {
        id: "2",
        name: "Test Wine 2",
        vintner: "Test Vintner",
        vintage: 2021,
        appellation: "Test Appellation",
        region: "Test Region",
        grapes: [{ name: "Syrah", percentage: 100 }],
        color: "White",
        volume: "750 ml",
        alcohol: "12% Vol",
        farming: "Conventional",
        vinification: [
          { step: "harvest", description: "Machine" },
          { step: "yeasts", description: "Commercial" },
          { step: "maceration", description: "1 week" },
          { step: "aging", description: "3 months" },
          { step: "bottling", description: "Filtered" },
        ],
        tasting_notes: {
          nose: ["Citrus"],
          palate: ["Crisp"],
        },
        drink_from: 2022,
        drink_until: 2026,
        price: "$15",
        sulfites: "Medium",
        images: { front: "", back: "" },
        inventory: {
          bottles: 2,
          purchaseDate: "2024-01-01",
          purchaseLocation: "Test Store",
        },
      },
    ]);
    vi.mocked(recommendService.getWineRecommendations).mockResolvedValue([
      {
        id: "1",
        name: "Test Wine 1",
        vintner: "Test Vintner",
        vintage: 2020,
        reason: "Test reason 1",
      },
    ]);
    vi.mocked(questionService.askWineQuestion).mockResolvedValue(
      "Test response"
    );

    // Mount component
    wrapper = mount(App, {
      global: {
        stubs: ["Teleport"],
      },
    });
  });
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it("renders the header with the app name", () => {
    // Check if header exists
    expect(wrapper.find("h1").text()).toBe("CellarSense");
    expect(wrapper.find("p").text()).toContain(
      "Snap a label, let OpenAI parse it"
    );
  });

  it("renders the main action buttons", () => {
    const buttons = wrapper.findAll("button");
    // Check if all buttons exist
    expect(buttons.length).toBeGreaterThanOrEqual(4);

    // Check for button text
    const buttonTexts = buttons.map((button) => button.text());
    expect(buttonTexts).toContain("Settings");
    expect(buttonTexts).toContain("Recommend");
    expect(buttonTexts).toContain("Ask AI");
    expect(buttonTexts).toContain("Add Wine");
  });

  it("shows settings modal when settings button is clicked", async () => {
    // Initial state check
    expect((wrapper.vm as any).showSettings).toBe(false);

    // Click settings button
    await wrapper.findAll("button")[0].trigger("click");

    // Check if settings modal is shown
    expect((wrapper.vm as any).showSettings).toBe(true);
  });  it("shows add wine modal when add wine button is clicked", async () => {
    // Initial state check
    expect((wrapper.vm as any).showAddModal).toBe(false);

    // Click add wine button - find by text content
    const buttons = wrapper.findAll("button");
    const addButton = buttons.find(button => button.text().includes("Add Wine"));
    expect(addButton).toBeDefined();
    await addButton!.trigger("click");

    // Check if add wine modal is shown
    expect((wrapper.vm as any).showAddModal).toBe(true);
  });
  it("shows settings modal instead when API key is missing", async () => {
    // Mock missing API key BEFORE mounting
    vi.mocked(settingsService.hasOpenAiKey).mockReturnValue(false);

    // Create a new wrapper with the mock already set
    const testWrapper = mount(App, {
      global: {
        stubs: ["Teleport"],
      },
    });

    // Initial state check
    expect((testWrapper.vm as any).showSettings).toBe(false);
    expect((testWrapper.vm as any).showAddModal).toBe(false);

    // Click add wine button - find by text content
    const buttons = testWrapper.findAll("button");
    const addButton = buttons.find(button => button.text().includes("Add Wine"));
    expect(addButton).toBeDefined();
    await addButton!.trigger("click");

    // Check if settings modal is shown instead of add wine modal
    expect((testWrapper.vm as any).showSettings).toBe(true);
    expect((testWrapper.vm as any).showAddModal).toBe(false);

    // Clean up
    testWrapper.unmount();
  });

  it("shows recommendation modal when recommend button is clicked", async () => {
    // Initial state check
    expect((wrapper.vm as any).showRecommendModal).toBe(false);    // Click recommend button - find by text content
    const buttons = wrapper.findAll("button");
    const recommendButton = buttons.find(button => button.text().includes("Recommend"));
    expect(recommendButton).toBeDefined();
    await recommendButton!.trigger("click");

    // Check if recommendation modal is shown
    expect((wrapper.vm as any).showRecommendModal).toBe(true);

    // Check if state is reset
    expect((wrapper.vm as any).recommendResults).toBeNull();
    expect((wrapper.vm as any).recommendQuery).toBe("");
    expect((wrapper.vm as any).recommendError).toBe("");
  });  it("shows question modal when ask AI button is clicked", async () => {
    // Initial state check
    expect((wrapper.vm as any).showQuestionModal).toBe(false);

    // Click ask AI button - find by text content
    const buttons = wrapper.findAll("button");
    const askAiButton = buttons.find(button => button.text().includes("Ask AI"));
    expect(askAiButton).toBeDefined();
    await askAiButton!.trigger("click");

    // Check if question modal is shown
    expect((wrapper.vm as any).showQuestionModal).toBe(true);    // Check if state is reset
    expect((wrapper.vm as any).questionResponse).toBe("");
    expect((wrapper.vm as any).questionText).toBe("");
    expect((wrapper.vm as any).questionError).toBe("");
  });

  it("handles recommendation query submission", async () => {
    // Set up initial state for the test
    (wrapper.vm as any).recommendLoading = false;

    // Call the method directly with a test query
    await (wrapper.vm as any).handleSubmitRecommendQuery("test query");

    // Check if API was called with right parameters
    expect(dbService.getAllWines).toHaveBeenCalled();
    expect(recommendService.getWineRecommendations).toHaveBeenCalledWith({
      apiKey: "test-key",
      wines: expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "2" }),
      ]),
      userQuery: "test query",
    });

    // Check if state is updated correctly
    await flushPromises();
    expect((wrapper.vm as any).recommendLoading).toBe(false);
    expect((wrapper.vm as any).recommendResults).toEqual([
      {
        id: "1",
        name: "Test Wine 1",
        vintner: "Test Vintner",
        vintage: 2020,
        reason: "Test reason 1",
      },
    ]);
    expect((wrapper.vm as any).recommendQuery).toBe("test query");
    expect((wrapper.vm as any).showRecommendModal).toBe(false);
    expect((wrapper.vm as any).showRecommendationsResultModal).toBe(true);
  });

  it("handles question submission", async () => {
    // Set up initial state for the test
    (wrapper.vm as any).questionLoading = false;

    // Call the method directly with a test question
    await (wrapper.vm as any).handleSubmitQuestion("test question");

    // Check if API was called with right parameters
    expect(dbService.getAllWines).toHaveBeenCalled();
    expect(questionService.askWineQuestion).toHaveBeenCalledWith({
      apiKey: "test-key",
      wines: expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "2" }),
      ]),
      userQuestion: "test question",
    });

    // Check if state is updated correctly
    await flushPromises();
    expect((wrapper.vm as any).questionLoading).toBe(false);
    expect((wrapper.vm as any).questionResponse).toBe("Test response");
    expect((wrapper.vm as any).questionText).toBe("test question");
    expect((wrapper.vm as any).showQuestionModal).toBe(false);
    expect((wrapper.vm as any).showQuestionResultModal).toBe(true);
  });

  it("handles API errors in recommendation", async () => {
    // Mock API error
    vi.mocked(recommendService.getWineRecommendations).mockRejectedValue(
      new Error("API error")
    );

    // Call the method
    await (wrapper.vm as any).handleSubmitRecommendQuery("test query");

    // Check if error is handled correctly
    await flushPromises();
    expect((wrapper.vm as any).recommendLoading).toBe(false);
    expect((wrapper.vm as any).recommendError).toBe("API error");
    expect((wrapper.vm as any).recommendResults).toBeNull();
  });

  it("handles API errors in question", async () => {
    // Mock API error
    vi.mocked(questionService.askWineQuestion).mockRejectedValue(
      new Error("API error")
    );

    // Call the method
    await (wrapper.vm as any).handleSubmitQuestion("test question");

    // Check if error is handled correctly
    await flushPromises();
    expect((wrapper.vm as any).questionLoading).toBe(false);
    expect((wrapper.vm as any).questionError).toBe("API error");
    expect((wrapper.vm as any).questionResponse).toBe("");
  });

  it("handles past recommendation display", () => {
    // Create past recommendation data
    const pastRec = {
      query: "past query",
      results: [{ wineId: "2", reason: "Past reason" }],
    };

    // Call the method
    (wrapper.vm as any).handleShowPastRecommendation(pastRec);

    // Check if UI state is updated correctly
    expect((wrapper.vm as any).recommendResults).toEqual(pastRec.results);
    expect((wrapper.vm as any).recommendQuery).toBe("past query");
    expect((wrapper.vm as any).showRecommendModal).toBe(false);
    expect((wrapper.vm as any).showRecommendationsResultModal).toBe(true);
  });

  it("handles past question display", () => {
    // Create past question data
    const pastQuestion = {
      question: "past question",
      response: "past response",
    };

    // Call the method
    (wrapper.vm as any).handleShowPastQuestion(pastQuestion);

    // Check if UI state is updated correctly
    expect((wrapper.vm as any).questionResponse).toBe("past response");
    expect((wrapper.vm as any).questionText).toBe("past question");
    expect((wrapper.vm as any).showQuestionModal).toBe(false);
    expect((wrapper.vm as any).showQuestionResultModal).toBe(true);
  });

  it("handles wine detail display from recommendation", async () => {
    // Call the method with the wine ID
    await (wrapper.vm as any).handleShowRecommendationDetail("1");

    // Check if getAllWines was called
    expect(dbService.getAllWines).toHaveBeenCalled();

    // Check if UI state is updated correctly
    await flushPromises();
    expect((wrapper.vm as any).selectedWine).toMatchObject({
      id: "1",
      name: "Test Wine 1",
    });
    expect((wrapper.vm as any).showDetailModal).toBe(true);
    expect((wrapper.vm as any).showRecommendationsResultModal).toBe(false);
  });

  it("handles edit wine action", () => {
    // Create a test wine
    const testWine = {
      id: "3",
      name: "Edit Test Wine",
    };

    // Call the method
    (wrapper.vm as any).handleEditWine(testWine);

    // Check if UI state is updated correctly
    expect((wrapper.vm as any).selectedWine).toEqual(testWine);
    expect((wrapper.vm as any).showEditModal).toBe(true);
  });

  it("handles settings save", () => {
    // Initial setup
    (wrapper.vm as any).showSettings = true;

    // Call the method
    (wrapper.vm as any).handleSettingsSave();

    // Check if modal is closed
    expect((wrapper.vm as any).showSettings).toBe(false);
  });
});
