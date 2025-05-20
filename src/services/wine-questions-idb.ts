import Dexie, { liveQuery, type Table } from "dexie";
import { ref, Ref } from "vue";
import { WineQuestionEntry } from "../shared/types";

class WineQuestionsDB extends Dexie {
  winequestions!: Table<WineQuestionEntry, number>;

  constructor() {
    super("cellar-sense-questions");
    this.version(1).stores({
      winequestions: "++id, createdAt",
    });
  }
}

export const db = new WineQuestionsDB();

// Use Dexie's liveQuery instead of RxJS BehaviorSubject
export const wineQuestions$ = liveQuery(() => db.winequestions.toArray());

// For backward compatibility - create a Vue reactive state that stays in sync with liveQuery
export const wineQuestionsState: Ref<WineQuestionEntry[]> = ref([]);

// Keep the Vue ref in sync with liveQuery
wineQuestions$.subscribe((questions) => {
  wineQuestionsState.value = questions;
});

/**
 * Save a question and its response to the database
 * @param question The user's question
 * @param response The AI's response
 * @returns The ID of the saved question
 */
export async function saveWineQuestion(
  question: string,
  response: string
): Promise<number> {
  console.time("Dexie ‑ saveWineQuestion");
  try {
    const id = await db.winequestions.add({
      question,
      response,
      createdAt: Date.now(),
    });
    console.timeEnd("Dexie ‑ saveWineQuestion");
    return id;
  } catch (error) {
    console.timeEnd("Dexie ‑ saveWineQuestion"); // ensure timer ends on error
    console.error("Failed to save wine question:", error);
    throw error;
  }
}

/**
 * Get all wine questions from the database, sorted by creation time (newest first)
 * @returns An array of wine questions
 */
export async function getAllWineQuestions(): Promise<WineQuestionEntry[]> {
  try {
    return await db.winequestions.orderBy("createdAt").reverse().toArray();
  } catch (error) {
    console.error("Failed to get wine questions:", error);
    throw error;
  }
}

/**
 * Delete a wine question from the database
 * @param id The ID of the question to delete
 */
export async function deleteWineQuestion(id: number): Promise<void> {
  try {
    await db.winequestions.delete(id);
  } catch (error) {
    console.error(`Failed to delete wine question with id ${id}:`, error);
    throw error;
  }
}

/**
 * Get a wine question by its ID
 * @param id The ID of the question to retrieve
 * @returns The question, or undefined if not found
 */
export async function getWineQuestionById(
  id: number
): Promise<WineQuestionEntry | undefined> {
  try {
    return await db.winequestions.get(id);
  } catch (error) {
    console.error(`Failed to get wine question with id ${id}:`, error);
    throw error;
  }
}