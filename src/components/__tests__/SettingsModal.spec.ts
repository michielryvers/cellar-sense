import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SettingsModal from "../SettingsModal.vue";
import { settingsService } from "../../services/settings";
import * as importExport from "../../services/importExport";
import { nextTick } from "vue";

// Type for the Vue wrapper
type AnyWrapper = ReturnType<typeof mount<any>>;

// Mock dependencies
vi.mock("../../services/settings", () => ({
  settingsService: {
    dexieCloudUrl: "test-cloud-url",
    openAiKey: "test-key",
    openAiModel: "gpt-4.1",
    setAllSettings: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("../../services/importExport", () => ({
  exportWinesToJSON: vi.fn().mockResolvedValue(new Blob(["test"], { type: "application/json" })),
  importWinesFromJSON: vi.fn().mockResolvedValue(undefined),
}));

// Mock document methods used in component
const originalCreateElement = document.createElement;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("SettingsModal.vue", () => {
  let wrapper: AnyWrapper;
  let mockAnchorElement: { href: string; download: string; click: Function; };

  beforeEach(() => {
    // Mock DOM methods
    mockAnchorElement = {
      href: "",
      download: "",
      click: vi.fn(),
    };

    document.createElement = vi.fn().mockImplementation((tag) => {
      if (tag === "a") {
        return mockAnchorElement;
      }
      return originalCreateElement.call(document, tag);
    });

    URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    URL.revokeObjectURL = vi.fn();

    // Mock appendChild and removeChild
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    // Mock setTimeout
    vi.useFakeTimers();

    // Clear mocks between tests
    vi.clearAllMocks();

    // Mount component with required props
    wrapper = mount(SettingsModal, {
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
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.useRealTimers();
  });

  it("renders the settings form when show is true", () => {
    expect(wrapper.find("h2").text()).toBe("Settings");
    expect(wrapper.find("#openaiKeyInput").exists()).toBe(true);
    expect(wrapper.find("#DEXIE_CLOUD_URL").exists()).toBe(true);
    expect(wrapper.find("#OPENAI_MODEL").exists()).toBe(true);
  });

  it("does not render when show is false", async () => {
    await wrapper.setProps({ show: false });
    expect(wrapper.find("h2").exists()).toBe(false);
  });

  it("initializes settings from the settingsService", () => {
    const settings = (wrapper.vm as any).settings;
    expect(settings.OPENAI_SDK_KEY).toBe("test-key");
    expect(settings.DEXIE_CLOUD_URL).toBe("test-cloud-url");
    expect(settings.OPENAI_MODEL).toBe("gpt-4.1");
  });

  it("emits update:show event when close button is clicked", async () => {
    await wrapper.find("button[aria-label='Close settings']").trigger("click");
    expect(wrapper.emitted()).toHaveProperty("update:show");
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("emits update:show event when cancel button is clicked", async () => {
    // Find the button with "Cancel" text
    const cancelButton = wrapper.findAll("button").find(
      (btn) => btn.text() === "Cancel"
    );
    
    expect(cancelButton).toBeDefined();
    await cancelButton?.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("update:show");
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("closes the modal when clicking outside", async () => {
    // The outer div has the click handler for outside clicks
    const outerDiv = wrapper.find(".fixed.inset-0");
    await outerDiv.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("update:show");
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("does not close when clicking inside the modal", async () => {
    // Click on an element inside the modal
    const innerDiv = wrapper.find(".bg-white.rounded-2xl");
    await innerDiv.trigger("click");
    expect(wrapper.emitted()).not.toHaveProperty("update:show");
  });

  it("emits save event and update:show when saving settings", async () => {
    // Modify a setting
    await wrapper.find("#openaiKeyInput").setValue("new-key");
    // Click save
    const saveButton = wrapper.findAll("button").find(
      (btn) => btn.text().trim() === "Save"
    );
    
    await saveButton?.trigger("click");
    
    // Verify events and service call
    expect(wrapper.emitted()).toHaveProperty("save");
    expect(wrapper.emitted()).toHaveProperty("update:show");
    expect(settingsService.setAllSettings).toHaveBeenCalledWith({
      DEXIE_CLOUD_URL: "test-cloud-url",
      OPENAI_SDK_KEY: "new-key",
      OPENAI_MODEL: "gpt-4.1",
    });
  });

  it("reloads the page if Dexie cloud URL change requires refresh", async () => {
    // Mock the return value to indicate refresh needed
    (settingsService.setAllSettings as any).mockReturnValueOnce(true);
    
    // Mock window.location.reload
    const originalLocation = window.location;
    // @ts-ignore - We need to mock the location
    delete window.location;
    // @ts-ignore - Create a new mockable object
    window.location = { reload: vi.fn() };
    
    // Modify settings and save
    await wrapper.find("#DEXIE_CLOUD_URL").setValue("new-cloud-url");
    
    // Click save
    const saveButton = wrapper.findAll("button").find(
      (btn) => btn.text().trim() === "Save"
    );
    
    await saveButton?.trigger("click");
    
    // Verify reload was called
    expect(window.location.reload).toHaveBeenCalled();
    
    // Restore original
    window.location = originalLocation;
  });

  it("handles data export", async () => {
    // Find and click export button
    const exportButton = wrapper.findAll("button").find(
      (btn) => btn.text().includes("Export Data")
    );
    
    await exportButton?.trigger("click");
    
    // Verify the export service was called
    expect(importExport.exportWinesToJSON).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    
    // Verify a download was initiated
    expect(mockAnchorElement.href).toBe("blob:test-url");
    expect(mockAnchorElement.download).toMatch(/wineventory-backup-\d{4}-\d{2}-\d{2}\.json/);
    expect(mockAnchorElement.click).toHaveBeenCalled();
    expect(document.body.appendChild).toHaveBeenCalled();
    
    // Fast-forward timers
    vi.runAllTimers();
    
    // Check cleanup
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("handles data import", async () => {
    // Create a mock file
    const mockFile = new File(['[]'], 'backup.json', {
      type: 'application/json'
    });
    
    // Mock alert since JSDOM doesn't support it
    const originalAlert = window.alert;
    window.alert = vi.fn();
    
    // Mock file.text method
    Object.defineProperty(mockFile, 'text', {
      value: vi.fn().mockResolvedValue('[]')
    });
    
    // Find import input and trigger change
    const importInput = wrapper.find('input[type="file"]');
    
    // Mock files property
    Object.defineProperty(importInput.element, 'files', {
      value: [mockFile],
      writable: true
    });
    
    await importInput.trigger('change');
    
    // Wait for the async operation
    await flushPromises();
    
    // Verify the import function was called
    expect(importExport.importWinesFromJSON).toHaveBeenCalled();
    
    // Restore original
    window.alert = originalAlert;
  });

  it("displays export loading state", async () => {
    // Set loading state
    (wrapper.vm as any).isExporting = true;
    await nextTick();
    
    // Verify loading indicator is shown
    const exportButton = wrapper.findAll("button").find(
      (btn) => btn.text().includes("Exporting…")
    );
    
    expect(exportButton).toBeDefined();
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
  });

  it("displays import loading state", async () => {
    // Set loading state
    (wrapper.vm as any).isImporting = true;
    await nextTick();
    
    // Find the label that contains the import button
    const importLabel = wrapper.find('label.w-full');
    // Get the span inside the label that shows the text
    const importSpan = importLabel.find('span');
    
    // Verify loading indicator is shown
    expect(importSpan.text()).toContain("Importing…");
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
});