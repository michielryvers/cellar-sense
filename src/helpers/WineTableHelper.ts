import { Ref, ref } from "vue";
import { liveQuery, Subscription } from "dexie";
import { db, deleteWine, drinkBottle } from "../services/dexie-db";
import type { Wine } from "../shared/Wine";

/**
 * Helper class for WineTable component logic
 * Manages state, subscriptions and event handlers
 */
export class WineTableHelper {
  // Data refs
  private _wines: Ref<Wine[]> = ref([]);
  private _filterVintner: Ref<string> = ref("");
  private _filterColor: Ref<string> = ref("");
  private _selectedWine: Ref<Wine | null> = ref(null);
  private _showDetailModal: Ref<boolean> = ref(false);
  private _showEditModal: Ref<boolean> = ref(false);
  
  // Subscription reference
  private _subscription: Subscription | null = null;

  constructor() {
    this.initSubscription();
  }

  // Getters for reactive refs
  get wines(): Ref<Wine[]> {
    return this._wines;
  }

  get filterVintner(): Ref<string> {
    return this._filterVintner;
  }

  get filterColor(): Ref<string> {
    return this._filterColor;
  }

  get selectedWine(): Ref<Wine | null> {
    return this._selectedWine;
  }

  get showDetailModal(): Ref<boolean> {
    return this._showDetailModal;
  }

  get showEditModal(): Ref<boolean> {
    return this._showEditModal;
  }

  /**
   * Computed property for wine filtering
   * Filters wines based on selected vintner and color
   */
  getFilteredWines(): Wine[] {
    return this._wines.value.filter((wine) => {
      const vintnerMatch =
        !this._filterVintner.value || wine.vintner === this._filterVintner.value;
      const colorMatch = !this._filterColor.value || wine.color === this._filterColor.value;
      return vintnerMatch && colorMatch;
    });
  }

  /**
   * Get unique vintner options for filter dropdown
   */
  getVintnerOptions(): string[] {
    const set = new Set<string>();
    this._wines.value.forEach((w) => {
      if (w.vintner) set.add(w.vintner);
    });
    return Array.from(set).sort();
  }

  /**
   * Get unique color options for filter dropdown
   */
  getColorOptions(): string[] {
    const set = new Set<string>();
    this._wines.value.forEach((w) => {
      if (w.color) set.add(w.color);
    });
    return Array.from(set).sort();
  }

  /**
   * Initialize liveQuery subscription to wines database
   */
  private initSubscription(): void {
    this._subscription = liveQuery(() => db.wines.toArray()).subscribe({
      next: (result: Wine[]) => {
        this._wines.value = result;
      },
      error: (err: any) => {
        console.error("liveQuery error", err);
      },
    });
  }

  /**
   * Placeholder method for compatibility with EditWineForm and others
   */
  loadWines(): void {
    // No-op, kept for compatibility with EditWineForm and others
  }

  /**
   * Handle wine deletion with confirmation
   */
  async handleDelete(id: string | undefined, event: Event): Promise<void> {
    event.stopPropagation();
    if (!id) return;

    if (confirm("Are you sure you want to delete this wine?")) {
      await deleteWine(id);
      // No need to reload, liveQuery will update automatically
    }
  }

  /**
   * Handle edit action
   */
  handleEdit(wine: Wine, event?: Event): void {
    // Only stop propagation if event exists (clicked from table)
    if (event) {
      event.stopPropagation();
    }
    this._selectedWine.value = wine;
    this._showEditModal.value = true;
  }

  /**
   * Handle row click to show details
   */
  handleRowClick(wine: Wine): void {
    this._selectedWine.value = wine;
    this._showDetailModal.value = true;
  }

  /**
   * Handle marking a bottle as consumed
   */
  async handleDrink(wine: Wine, event: Event): Promise<void> {
    event.stopPropagation();
    if (wine.id) {
      await drinkBottle(wine.id);
    }
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this._filterVintner.value = "";
    this._filterColor.value = "";
  }

  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    if (this._subscription) {
      this._subscription.unsubscribe();
      this._subscription = null;
    }
  }
}