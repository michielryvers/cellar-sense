import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import WineQuestionModal from "../WineQuestionModal.vue";
import * as dbService from "../../services/dexie-db";
import { nextTick } from "vue";

// Mock the database service
vi.mock("../../services/dexie-db", () => ({
  getAllWineQuestions: vi.fn(),
  wineQuestionsState: { value: [] },
  liveQuery: vi.fn(() => ({
    subscribe: vi.fn(() => ({
      unsubscribe: vi.fn(),
    })),
  })),
}));

// Mock heroicons components
vi.mock("@heroicons/vue/24/outline", () => ({
  QuestionMarkCircleIcon: { render: () => null },
  XMarkIcon: { render: () => null },
  ClockIcon: { render: () => null },
  ChevronDownIcon: { render: () => null },
  ChevronUpIcon: { render: () => null },
}));

// Sample past questions data
const pastQuestions = [
  {
    id: 1,
    question: "What wine pairs with fish?",
    response: "White wines like Sauvignon Blanc pair well with fish.",
    createdAt: Date.now() - 86400000, // 1 day ago
  },
  {
    id: 2,
    question: "Do I have any Cabernet?",
    response: "Yes, you have 3 bottles of Cabernet Sauvignon.",
    createdAt: Date.now() - 3600000, // 1 hour ago
  },
];

describe("WineQuestionModal.vue", () => {
  let wrapper;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set up mock for liveQuery
    vi.spyOn(dbService, "getAllWineQuestions").mockResolvedValue(pastQuestions);
    
    // Mount component
    wrapper = mount(WineQuestionModal, {
      props: {
        show: true,
        loading: false,
        error: "",
      },
      global: {
        stubs: ["Teleport"], // Stub teleport to prevent errors
      },
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it("renders correctly when show is true", () => {
    expect(wrapper.find(".fixed").exists()).toBe(true);
    expect(wrapper.find("h2").text()).toContain("Ask About Your Wine Collection");
  });

  it("doesn't render when show is false", async () => {
    await wrapper.setProps({ show: false });
    expect(wrapper.find(".fixed").exists()).toBe(false);
  });

  it("renders loading state correctly", async () => {
    await wrapper.setProps({ loading: true });
    expect(wrapper.find(".animate-spin").exists()).toBe(true);
    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeDefined();
  });

  it("renders error message when provided", async () => {
    const errorMessage = "Failed to send question";
    await wrapper.setProps({ error: errorMessage });
    expect(wrapper.find(".text-red-600").text()).toBe(errorMessage);
  });

  it("toggles past questions panel when clicking the toggle button", async () => {
    // Initially, showPast should be false
    expect(wrapper.vm.showPast).toBe(false);
    
    // Click the toggle button
    await wrapper.find("button[type='button']").trigger("click");
    
    // showPast should now be true
    expect(wrapper.vm.showPast).toBe(true);
    
    // The past questions section should be visible (div with v-if="showPast")
    const pastQuestionsSection = wrapper.find("div.mb-6");
    expect(pastQuestionsSection.exists()).toBe(true);
  });

  it("displays 'No previous questions yet' when there are no past questions", async () => {
    // Set empty past questions
    wrapper.vm.pastQuestions = [];
    wrapper.vm.showPast = true;
    await nextTick();
    
    expect(wrapper.text()).toContain("No previous questions yet");
  });

  it("displays the past questions when they exist", async () => {
    // Set past questions directly in the component instance
    wrapper.vm.pastQuestions = pastQuestions;
    
    // Toggle past questions display
    wrapper.vm.showPast = true;
    await nextTick();
    
    // Verify each question is displayed
    pastQuestions.forEach(question => {
      expect(wrapper.text()).toContain(question.question);
    });
  });

  it("emits 'show-past-question' event when clicking on a past question", async () => {
    // Set past questions and toggle display
    wrapper.vm.pastQuestions = pastQuestions;
    wrapper.vm.showPast = true;
    await nextTick();
    
    // Click on the first question
    const questionItems = wrapper.findAll("li");
    await questionItems[0].trigger("click");
    
    // Check the emitted event
    expect(wrapper.emitted("show-past-question")).toBeTruthy();
    expect(wrapper.emitted("show-past-question")[0][0]).toEqual(pastQuestions[0]);
  });

  it("emits 'update:show' event when closeModal is called", async () => {
    await wrapper.find("button[aria-label='Close modal']").trigger("click");
    
    expect(wrapper.emitted("update:show")).toBeTruthy();
    expect(wrapper.emitted("update:show")[0][0]).toBe(false);
  });

  it("emits 'submit-question' with trimmed question text when form is submitted", async () => {
    const testQuestion = "   What wine pairs with chocolate?   ";
    const expectedQuestion = "What wine pairs with chocolate?";
    
    // Set the question
    await wrapper.find("textarea").setValue(testQuestion);
    
    // Submit the form
    await wrapper.find("form").trigger("submit.prevent");
    
    // Check the emitted event
    expect(wrapper.emitted("submit-question")).toBeTruthy();
    expect(wrapper.emitted("submit-question")[0][0]).toBe(expectedQuestion);
  });

  it("does not emit 'submit-question' when question is empty", async () => {
    // Set empty question
    await wrapper.find("textarea").setValue("  ");
    
    // Submit the form
    await wrapper.find("form").trigger("submit.prevent");
    
    // Should not emit the event
    expect(wrapper.emitted("submit-question")).toBeFalsy();
  });

  it("clears the question input when modal is closed", async () => {
    // Set a question
    await wrapper.find("textarea").setValue("Test question");
    
    // Close the modal
    await wrapper.find("button[aria-label='Close modal']").trigger("click");
    
    // Question should be cleared
    expect(wrapper.vm.userQuestion).toBe("");
  });

  it("emits 'update:show' event when clicking outside the modal", async () => {
    // Click on the modal backdrop (which has the click.self directive)
    await wrapper.find(".fixed").trigger("click");
    
    expect(wrapper.emitted("update:show")).toBeTruthy();
    expect(wrapper.emitted("update:show")[0][0]).toBe(false);
  });

  it("unsubscribes from liveQuery on component unmount", () => {
    const unsubscribeSpy = vi.fn();
    wrapper.vm.subscription = { unsubscribe: unsubscribeSpy };
    
    wrapper.unmount();
    
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});