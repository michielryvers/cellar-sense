import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { mount, flushPromises, VueWrapper } from "@vue/test-utils";
import WineTable from "../WineTable.vue";
import * as dbService from "../../services/dexie-db";
import { nextTick } from "vue";
import { liveQuery } from "dexie";
import { useEscapeKey } from "../../composables/useEscapeKey";
import type { Wine } from "../../shared/Wine";

// Type for the Vue wrapper
type AnyWrapper = VueWrapper<any>;

// Mock data for wines - ensure it matches the Wine type structure
const mockWines: Wine[] = [
  {
    id: "1",
    name: "Test Wine 1",
    vintner: "Test Vintner 1",
    vintage: 2020,
    color: "Red",
    region: "Test Region 1",
    appellation: "Test Appellation 1",
    alcohol: "13%",
    volume: "750ml",
    price: "€20",
    farming: "Organic",
    sulfites: "Low-sulfite",
    drink_from: 2022,
    drink_until: 2025,
    grapes: [
      { name: "Grenache", percentage: 60 },
      { name: "Syrah", percentage: 40 },
    ],
    vinification: [
      { step: "harvest", description: "Manual" },
      { step: "yeasts", description: "Indigenous" },
    ],
    tasting_notes: {
      nose: ["Black Cherry", "Vanilla"],
      palate: ["Full-bodied", "Tannic"],
    },
    images: {
      front: "data:image/jpeg;base64,test",
      back: "data:image/jpeg;base64,testback",
    },
    inventory: {
      bottles: 3,
      purchaseDate: "2023-01-01",
      purchaseLocation: "Test Store 1",
    },
  },
  {
    id: "2",
    name: "Test Wine 2",
    vintner: "Test Vintner 2",
    vintage: 2021,
    color: "White",
    region: "Test Region 2",
    appellation: "Test Appellation 2",
    alcohol: "12%",
    volume: "750ml",
    price: "€15",
    farming: "Conventional",
    sulfites: "Contains sulfites",
    drink_from: 2022,
    drink_until: 2024,
    grapes: [{ name: "Chardonnay", percentage: 100 }],
    vinification: [{ step: "fermentation", description: "Oak barrels" }],
    tasting_notes: {
      nose: ["Apple", "Citrus"],
      palate: ["Light-bodied", "Crisp"],
    },
    images: {
      front: "data:image/jpeg;base64,test2",
    },
    inventory: {
      bottles: 5,
      purchaseDate: "2023-02-01",
      purchaseLocation: "Test Store 2",
    },
  },
  {
    id: "3",
    name: "Test Wine 3",
    vintner: "Test Vintner 1", // Same vintner as Wine 1 for filter testing
    vintage: 2019,
    color: "Red", // Same color as Wine 1 for filter testing
    region: "Test Region 3",
    appellation: "Test Appellation 3",
    alcohol: "14%",
    volume: "750ml",
    price: "€25",
    farming: "Biodynamic",
    sulfites: "No added sulfites",
    drink_from: 2021,
    drink_until: 2026,
    grapes: [{ name: "Pinot Noir", percentage: 100 }],
    vinification: [{ step: "aging", description: "Concrete vats" }],
    tasting_notes: {
      nose: ["Red Berries", "Spice"],
      palate: ["Medium-bodied", "Silky"],
    },
    images: {
      front: "data:image/jpeg;base64,test3",
    },
    inventory: {
      bottles: 0, // For testing 0 bottle state
      purchaseDate: "2023-03-01",
      purchaseLocation: "Test Store 1",
    },
  },
];

// Mock dependencies
vi.mock("../../services/dexie-db", () => ({
  db: {
    wines: {
      toArray: vi.fn(),
    },
  },
  deleteWine: vi.fn().mockResolvedValue(undefined),
  updateWine: vi.fn().mockResolvedValue("1"),
  drinkBottle: vi.fn().mockResolvedValue(2),
}));

// Mock dexie liveQuery
vi.mock("dexie", async () => {
  const actual = await vi.importActual("dexie");
  return {
    ...(actual as any), // Spread actual dexie to include Dexie class etc.
    liveQuery: vi.fn((queryFn) => ({
      subscribe: vi.fn((observer) => {
        Promise.resolve().then(async () => {
          try {
            const result = await queryFn();
            observer.next(result);
          } catch (error) {
            if (observer.error) {
              observer.error(error);
            }
          }
        });
        return {
          unsubscribe: vi.fn(),
        };
      }),
    })),
  };
});

// Mock components used in WineTable
vi.mock("../WineDetail.vue", () => ({
  default: {
    name: "WineDetail",
    template: "<div>Wine Detail Mock</div>",
    props: ["wine", "isVisible"],
  },
}));

vi.mock("../EditWineForm.vue", () => ({
  default: {
    name: "EditWineForm",
    template: "<div>Edit Wine Form Mock</div>",
    props: ["wineToEdit", "isVisible"],
  },
}));

vi.mock("../DrinkWineModal.vue", () => ({
  default: {
    name: "DrinkWineModal",
    template: "<div>Drink Wine Modal Mock</div>",
    props: ["wine", "isVisible"],
  },
}));

// Mock heroicons components
vi.mock("@heroicons/vue/24/outline", () => ({
  ClockIcon: { name: "ClockIcon", render: () => null },
  MinusCircleIcon: { name: "MinusCircleIcon", render: () => null },
  PencilSquareIcon: { name: "PencilSquareIcon", render: () => null },
  TrashIcon: { name: "TrashIcon", render: () => null },
}));

// Mock useEscapeKey
let capturedEscapeKeyCallback: (() => void) | undefined;
const useEscapeKeyMock = vi.fn((callback: () => void) => {
  capturedEscapeKeyCallback = callback;
});
// The vi.mock call for useEscapeKey needs to be defined before it's used by the component.
// Vitest hoists vi.mock calls, so the factory function should not reference variables defined later in the same scope.
// We can define the mock implementation directly in the factory.
vi.mock("../../composables/useEscapeKey", () => ({
  useEscapeKey: (callback: () => void) => {
    capturedEscapeKeyCallback = callback; // This will be set when useEscapeKey is called by the component
    // Return a cleanup function if your composable does
    return () => {
      /* cleanup */
    };
  },
}));

// Mock window.confirm
vi.spyOn(window, "confirm");

describe("WineTable.vue", () => {
  let wrapper: AnyWrapper;

  beforeEach(async () => {
    vi.clearAllMocks();
    (window.confirm as Mock).mockReturnValue(false); // Default to cancel for delete

    // Ensure db.wines.toArray returns a fresh copy for each test
    vi.spyOn(dbService.db.wines, "toArray").mockResolvedValue([...mockWines]);

    capturedEscapeKeyCallback = undefined; // Reset before each test

    wrapper = mount(WineTable, {
      global: {
        stubs: ["Teleport"],
      },
    });
    await flushPromises(); // Wait for liveQuery to populate wines and initial render
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it("renders the table with wines", async () => {
    expect(
      wrapper.find("div[class~='sm:block'][class~='hidden'] table").exists()
    ).toBe(true);
    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] tbody tr"
    );
    expect(rows.length).toBe(mockWines.length);
    expect(rows[0].text()).toContain("Test Wine 1");
    expect(rows[0].text()).toContain("Test Vintner 1");
    expect(rows[0].text()).toContain("2020");
    expect(rows[0].text()).toContain("Red");
    expect(rows[0].text()).toContain("Test Region 1");
    expect(rows[0].text()).toContain("3"); // bottles
  });

  it("computes vintnerOptions correctly", () => {
    const expectedVintners = ["Test Vintner 1", "Test Vintner 2"].sort();
    expect((wrapper.vm as any).vintnerOptions).toEqual(expectedVintners);
  });

  it("computes colorOptions correctly", () => {
    const expectedColors = ["Red", "White"].sort();
    expect((wrapper.vm as any).colorOptions).toEqual(expectedColors);
  });

  it("applies vintner filter correctly (desktop)", async () => {
    const vintnerSelect = wrapper.find<HTMLSelectElement>(
      "div[class~='sm:block'][class~='hidden'] table thead th:nth-child(2) select"
    );
    await vintnerSelect.setValue("Test Vintner 1");
    await nextTick();

    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] tbody tr"
    );
    expect(rows.length).toBe(2); // Wine 1 and Wine 3
    expect(rows[0].text()).toContain("Test Wine 1");
    expect(rows[1].text()).toContain("Test Wine 3");
  });

  it("applies color filter correctly (desktop)", async () => {
    const colorSelect = wrapper.find<HTMLSelectElement>(
      "div[class~='sm:block'][class~='hidden'] table thead th:nth-child(4) select"
    );
    await colorSelect.setValue("White");
    await nextTick();

    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] tbody tr"
    );
    expect(rows.length).toBe(1); // Wine 2
    expect(rows[0].text()).toContain("Test Wine 2");
  });

  it("applies combined vintner and color filters (desktop)", async () => {
    (wrapper.vm as any).filterVintner = "Test Vintner 1";
    (wrapper.vm as any).filterColor = "Red";
    await nextTick();
    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] tbody tr"
    );
    expect(rows.length).toBe(2); // Wine 1 and Wine 3 are Red and by Test Vintner 1
    expect(
      rows.every(
        (row) =>
          row.text().includes("Test Vintner 1") && row.text().includes("Red")
      )
    ).toBe(true);

    (wrapper.vm as any).filterColor = "White"; // Vintner 1 has no White wines
    await nextTick();
    const noRows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] tbody tr"
    );
    // This will find the "No wines in inventory" row if filtering results in empty
    // So we check the text of the first cell if a row exists
    if (noRows.length === 1 && noRows[0].find('td[colspan="7"]').exists()) {
      expect(noRows[0].text()).toContain("No wines in inventory");
    } else {
      expect(noRows.length).toBe(0); // Or expect 0 if the empty message isn't rendered yet
    }
  });

  it("clears filters when clear button is clicked (desktop)", async () => {
    (wrapper.vm as any).filterVintner = "Test Vintner 1";
    (wrapper.vm as any).filterColor = "Red";
    await nextTick();

    const clearButton = wrapper.find(
      "div[class~='sm:block'][class~='hidden'] button.text-xs.text-gray-500.underline"
    );
    expect(clearButton.exists()).toBe(true);
    await clearButton.trigger("click");
    await nextTick();

    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] tbody tr"
    );
    expect(rows.length).toBe(mockWines.length);
    expect((wrapper.vm as any).filterVintner).toBe("");
    expect((wrapper.vm as any).filterColor).toBe("");
    expect(
      wrapper
        .find(
          "div[class~='sm:block'][class~='hidden'] button.text-xs.text-gray-500.underline"
        )
        .exists()
    ).toBe(false);
  });

  it("shows empty state when there are no wines (desktop)", async () => {
    vi.spyOn(dbService.db.wines, "toArray").mockResolvedValue([]);
    const localWrapper = mount(WineTable, { global: { stubs: ["Teleport"] } });
    await flushPromises();
    await nextTick();

    expect(
      localWrapper
        .find(
          "div[class~='sm:block'][class~='hidden'] tbody tr td[colspan='7']"
        )
        .text()
    ).toContain("No wines in inventory");
    localWrapper.unmount();
  });

  it("opens wine detail when row is clicked (desktop)", async () => {
    await wrapper
      .findAll("div[class~='sm:block'][class~='hidden'] tbody tr")[0]
      .trigger("click");
    await nextTick();
    expect((wrapper.vm as any).showDetailModal).toBe(true);
    expect((wrapper.vm as any).selectedWine).toEqual(mockWines[0]);
  });

  it("opens edit modal when edit button is clicked (desktop)", async () => {
    const editButton = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] button[aria-label^='Edit ']"
    )[0];
    await editButton.trigger("click");
    await nextTick();
    expect((wrapper.vm as any).showEditModal).toBe(true);
    expect((wrapper.vm as any).selectedWine).toEqual(mockWines[0]);
  });

  it("handles delete wine when confirmed (desktop)", async () => {
    (window.confirm as Mock).mockReturnValue(true);
    const deleteButton = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] button[aria-label^='Delete ']"
    )[0];
    await deleteButton.trigger("click");
    await nextTick();
    expect(dbService.deleteWine).toHaveBeenCalledWith(mockWines[0].id);
  });

  it("does not delete wine when cancelled (desktop)", async () => {
    (window.confirm as Mock).mockReturnValue(false); // Already default, but explicit
    const deleteButton = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] button[aria-label^='Delete ']"
    )[0];
    await deleteButton.trigger("click");
    await nextTick();
    expect(dbService.deleteWine).not.toHaveBeenCalled();
  });

  it("opens drink modal when drink button is clicked (desktop)", async () => {
    const drinkButton = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] button[aria-label^='Drink a bottle of ']"
    )[0];
    await drinkButton.trigger("click");
    await nextTick();
    expect((wrapper.vm as any).showDrinkModal).toBe(true);
    expect((wrapper.vm as any).selectedWine).toEqual(mockWines[0]);
  });

  it("handles drink wine consumption", async () => {
    (wrapper.vm as any).selectedWine = mockWines[0];
    await (wrapper.vm as any).handleSaveConsumption({
      rating: 4,
      notes: "Great wine",
    });
    expect(dbService.drinkBottle).toHaveBeenCalledWith(mockWines[0].id, {
      rating: 4,
      notes: "Great wine",
    });
  });

  // --- Mobile View Tests ---
  it("renders wine cards in mobile view", () => {
    const mobileList = wrapper.find("div[class~='sm:hidden'] ul");
    expect(mobileList.exists()).toBe(true);
    const mobileItems = mobileList.findAll("li");
    expect(mobileItems.length).toBe(mockWines.length);

    const firstWineCard = mobileItems[0];
    expect(firstWineCard.text()).toContain(mockWines[0].name);
    expect(firstWineCard.text()).toContain(mockWines[0].vintner);
    expect(firstWineCard.text()).toContain(mockWines[0].vintage?.toString());
    expect(firstWineCard.text()).toContain(mockWines[0].region);
    expect(firstWineCard.text()).toContain(mockWines[0].color);
    expect(firstWineCard.text()).toContain(
      mockWines[0].inventory?.bottles.toString()
    );
  });

  it("opens wine detail when mobile card is clicked", async () => {
    const mobileItems = wrapper.findAll("div[class~='sm:hidden'] ul li");
    await mobileItems[0].trigger("click");
    await nextTick();
    expect((wrapper.vm as any).showDetailModal).toBe(true);
    expect((wrapper.vm as any).selectedWine).toEqual(mockWines[0]);
  });

  it("opens edit modal when mobile edit button is clicked", async () => {
    const editButton = wrapper
      .findAll("div[class~='sm:hidden'] ul li")[0]
      .find("button[aria-label^='Edit ']");
    expect(editButton.exists()).toBe(true);
    await editButton.trigger("click");
    await nextTick();
    expect((wrapper.vm as any).showEditModal).toBe(true);
    expect((wrapper.vm as any).selectedWine).toEqual(mockWines[0]);
  });

  it("handles delete wine when mobile delete button is clicked and confirmed", async () => {
    (window.confirm as Mock).mockReturnValue(true);
    const deleteButton = wrapper
      .findAll("div[class~='sm:hidden'] ul li")[0]
      .find("button[aria-label^='Delete ']");
    expect(deleteButton.exists()).toBe(true);
    await deleteButton.trigger("click");
    await nextTick();
    expect(dbService.deleteWine).toHaveBeenCalledWith(mockWines[0].id);
  });

  it("opens drink modal when mobile drink button is clicked", async () => {
    const drinkButton = wrapper
      .findAll("div[class~='sm:hidden'] ul li")[0]
      .find("button[aria-label^='Drink a bottle of ']");
    expect(drinkButton.exists()).toBe(true);
    await drinkButton.trigger("click");
    await nextTick();
    expect((wrapper.vm as any).showDrinkModal).toBe(true);
    expect((wrapper.vm as any).selectedWine).toEqual(mockWines[0]);
  });

  it("shows empty state in mobile view when there are no wines", async () => {
    vi.spyOn(dbService.db.wines, "toArray").mockResolvedValue([]);
    const localWrapper = mount(WineTable, { global: { stubs: ["Teleport"] } });
    await flushPromises();
    await nextTick();
    const mobileEmptyState = localWrapper.find(
      "div[class~='sm:hidden'] > div[class*='text-center']"
    );
    expect(mobileEmptyState.exists()).toBe(true);
    expect(mobileEmptyState.text()).toContain("No wines in inventory");
    localWrapper.unmount();
  });

  // --- Other Tests ---
  it("closes modals in sequence when Escape key is pressed (via useEscapeKey mock)", async () => {
    // Check if the composable was called by verifying capturedEscapeKeyCallback is a function
    expect(capturedEscapeKeyCallback).toBeInstanceOf(Function);

    const vm = wrapper.vm as any;

    vm.showDetailModal = true;
    vm.showEditModal = false;
    vm.showDrinkModal = false;
    await nextTick();
    capturedEscapeKeyCallback!();
    await nextTick();
    expect(vm.showDetailModal).toBe(false);

    vm.showDetailModal = false;
    vm.showEditModal = true;
    vm.showDrinkModal = false;
    await nextTick();
    capturedEscapeKeyCallback!();
    await nextTick();
    expect(vm.showEditModal).toBe(false);

    vm.showDetailModal = false;
    vm.showEditModal = false;
    vm.showDrinkModal = true;
    await nextTick();
    capturedEscapeKeyCallback!();
    await nextTick();
    expect(vm.showDrinkModal).toBe(false);

    vm.showDetailModal = true;
    vm.showEditModal = true;
    vm.showDrinkModal = true;
    await nextTick();
    capturedEscapeKeyCallback!();
    await nextTick(); // Closes Detail
    expect(vm.showDetailModal).toBe(false);
    expect(vm.showEditModal).toBe(true);
    expect(vm.showDrinkModal).toBe(true);
    capturedEscapeKeyCallback!();
    await nextTick(); // Closes Edit
    expect(vm.showEditModal).toBe(false);
    expect(vm.showDrinkModal).toBe(true);
    capturedEscapeKeyCallback!();
    await nextTick(); // Closes Drink
    expect(vm.showDrinkModal).toBe(false);
  });

  it("unsubscribes from liveQuery on unmount", async () => {
    const dexieLiveQueryMock = vi.mocked(liveQuery);
    expect(dexieLiveQueryMock).toHaveBeenCalled();

    const subscribeFnMock = dexieLiveQueryMock.mock.results[0].value.subscribe;
    expect(subscribeFnMock).toHaveBeenCalled();

    const unsubscribeSpy = subscribeFnMock.mock.results[0].value.unsubscribe;
    expect(unsubscribeSpy).toBeInstanceOf(Function);

    wrapper.unmount(); // Trigger onUnmounted
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it("applies opacity to wines with 0 bottles (desktop)", async () => {
    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] tbody tr"
    );
    const wine3Row = rows.find((r) => r.text().includes("Test Wine 3")); // 0 bottles
    expect(wine3Row?.classes()).toContain("opacity-60");
    const wine1Row = rows.find((r) => r.text().includes("Test Wine 1")); // >0 bottles
    expect(wine1Row?.classes()).not.toContain("opacity-60");
  });

  it("applies opacity to wines with 0 bottles (mobile)", async () => {
    const cards = wrapper.findAll("div[class~='sm:hidden'] ul li");
    const wine3Card = cards.find((c) => c.text().includes("Test Wine 3"));
    expect(wine3Card?.classes()).toContain("opacity-60");
    const wine1Card = cards.find((c) => c.text().includes("Test Wine 1"));
    expect(wine1Card?.classes()).not.toContain("opacity-60");
  });

  it("shows clear filter button only when filters are active (desktop)", async () => {
    const clearButtonSelector =
      "div[class~='sm:block'][class~='hidden'] button.text-xs.text-gray-500.underline";
    expect(wrapper.find(clearButtonSelector).exists()).toBe(false);

    (wrapper.vm as any).filterVintner = "Test Vintner 1";
    await nextTick();
    expect(wrapper.find(clearButtonSelector).exists()).toBe(true);

    (wrapper.vm as any).filterVintner = "";
    await nextTick();
    expect(wrapper.find(clearButtonSelector).exists()).toBe(false);
  });

  it("exposed loadWines method does not throw", () => {
    expect(() => (wrapper.vm as any).loadWines()).not.toThrow();
  });

  it("handleEdit function can be called without an event", async () => {
    const vm = wrapper.vm as any;
    vm.handleEdit(mockWines[0]); // Call without event
    await nextTick();
    expect(vm.selectedWine).toEqual(mockWines[0]);
    expect(vm.showEditModal).toBe(true);
  });

  it("correctly displays bottle count badges based on inventory (desktop)", async () => {
    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] table tbody tr"
    );
    const wine1Row = rows.find((r) => r.text().includes("Test Wine 1")); // 3 bottles
    const wine3Row = rows.find((r) => r.text().includes("Test Wine 3")); // 0 bottles

    expect(wine1Row?.find("span.bg-yellow-100.text-yellow-800").exists()).toBe(
      true
    );
    expect(wine1Row?.find("span.bg-yellow-100.text-yellow-800").text()).toBe(
      "3"
    );
    expect(wine3Row?.find("span.bg-gray-100.text-gray-800").exists()).toBe(
      true
    );
    expect(wine3Row?.find("span.bg-gray-100.text-gray-800").text()).toBe("0");
  });

  it("correctly displays color badges (desktop)", async () => {
    const rows = wrapper.findAll(
      "div[class~='sm:block'][class~='hidden'] table tbody tr"
    );
    const wine1Row = rows.find((r) => r.text().includes("Test Wine 1")); // Red
    const wine2Row = rows.find((r) => r.text().includes("Test Wine 2")); // White

    expect(wine1Row?.find("span.bg-red-100.text-red-800").exists()).toBe(true);
    expect(wine1Row?.find("span.bg-red-100.text-red-800").text()).toBe("Red");
    expect(wine2Row?.find("span.bg-yellow-100.text-yellow-800").exists()).toBe(
      true
    );
    expect(wine2Row?.find("span.bg-yellow-100.text-yellow-800").text()).toBe(
      "White"
    );
  });

  it("correctly displays bottle count badges based on inventory (mobile)", async () => {
    const cards = wrapper.findAll("div[class~='sm:hidden'] ul li");
    const wine1Card = cards.find((c) => c.text().includes("Test Wine 1")); // 3 bottles
    const wine3Card = cards.find((c) => c.text().includes("Test Wine 3")); // 0 bottles

    expect(wine1Card?.find("span.bg-yellow-100.text-yellow-800").exists()).toBe(
      true
    );
    expect(wine1Card?.find("span.bg-yellow-100.text-yellow-800").text()).toBe(
      "3"
    );
    expect(wine3Card?.find("span.bg-gray-100.text-gray-800").exists()).toBe(
      true
    );
    expect(wine3Card?.find("span.bg-gray-100.text-gray-800").text()).toBe("0");
  });

  it("correctly displays color badges (mobile)", async () => {
    const cards = wrapper.findAll("div[class~='sm:hidden'] ul li");
    const wine1Card = cards.find((c) => c.text().includes("Test Wine 1")); // Red
    const wine2Card = cards.find((c) => c.text().includes("Test Wine 2")); // White

    expect(wine1Card?.find("span.bg-red-100.text-red-800").exists()).toBe(true);
    expect(wine1Card?.find("span.bg-red-100.text-red-800").text()).toBe("Red");
    expect(wine2Card?.find("span.bg-yellow-100.text-yellow-800").exists()).toBe(
      true
    );
    expect(wine2Card?.find("span.bg-yellow-100.text-yellow-800").text()).toBe(
      "White"
    );
  });
});
