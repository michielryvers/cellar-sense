import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import WineQuestionResultModal from "../WineQuestionResultModal.vue";
import VueMarkdown from "vue-markdown-render";

// Mock the vue-markdown-render component
vi.mock("vue-markdown-render", () => ({
  default: {
    name: "VueMarkdown",
    props: ["source"],
    template: '<div class="markdown-mock">{{ source }}</div>',
  },
}));

describe("WineQuestionResultModal", () => {
  it("renders markdown content correctly", () => {
    const testProps = {
      show: true,
      question: "What wines go well with fish?",
      response:
        "# Wine Pairings for Fish\n\n**White wines** are typically best with fish. For example:\n\n- Sauvignon Blanc\n- Chardonnay\n- Pinot Grigio",
    };

    const wrapper = mount(WineQuestionResultModal, {
      props: testProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Check if the question is displayed correctly
    expect(wrapper.text()).toContain(testProps.question);

    // Check if VueMarkdown component is present with the correct props
    const markdownComponent = wrapper.findComponent(VueMarkdown);
    expect(markdownComponent.exists()).toBe(true);
    expect(markdownComponent.props("source")).toBe(testProps.response);

    // Check if scrollable container has the right classes
    const responseContainer = wrapper.find(".bg-gray-50.p-4.rounded-lg");
    expect(responseContainer.classes()).toContain("max-h-[50vh]");
    expect(responseContainer.classes()).toContain("overflow-y-auto");
  });
});
