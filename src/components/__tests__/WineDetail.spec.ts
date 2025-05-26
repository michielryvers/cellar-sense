import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, it, expect, vi } from "vitest";
import WineDetail from "../WineDetail.vue";
import * as db from "../../services/dexie-db";
import type { Wine } from "../../shared/Wine";

// Mock getAllRacks in dexie-db
vi.mock("../../services/dexie-db", () => ({
  getAllRacks: vi.fn(),
  saveWineLocation: vi.fn(),
}));

describe("WineDetail button visibility", () => {
  const mountComponent = async (wineProp: Partial<Wine>) => {
    // Reset mocks
    const getAllRacksMock = db.getAllRacks as unknown as ReturnType<
      typeof vi.fn
    >;
    getAllRacksMock.mockReset();
    getAllRacksMock.mockResolvedValue([]);

    const wrapper = mount(WineDetail, {
      props: {
        show: true,
        wine: {
          id: "w1",
          name: "Test Wine",
          vintner: "Tester",
          vintage: 2020,
          appellation: "AOP",
          region: "Region",
          color: "Red",
          volume: "750 ml",
          alcohol: "12%",
          farming: "Organic",
          price: "€10",
          sulfites: "Low",
          drink_from: 2021,
          drink_until: 2025,
          grapes: [],
          vinification: [],
          tasting_notes: { nose: [], palate: [] },
          images: { front: "" },
          inventory: { bottles: 1, purchaseDate: "", purchaseLocation: "" },
          ...wineProp,
        },
      },
    });
    // Wait for onMounted to resolve racks
    await flushPromises();
    await nextTick();
    return wrapper;
  };

  it("hides both buttons when location exists but no rack", async () => {
    const wrapper = await mountComponent({
      location: { rackId: "r1", x: 0.5, y: 0.5 },
    });
    const texts = wrapper.findAll("button").map((b) => b.text());
    expect(texts).not.toContain("Set Location");
    expect(texts).not.toContain("Find Bottle");
  });
});
