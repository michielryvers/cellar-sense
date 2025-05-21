import {
  db,
  saveWineQuestion,
  getAllWineQuestions,
  wineQuestionsState,
} from "../dexie-db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("wine questions database", () => {
  beforeEach(async () => {
    await db.winequestions.clear();
  });

  afterEach(async () => {
    await db.winequestions.clear();
  });

  it("saves a wine question and retrieves it", async () => {
    const question = "What wine pairs well with salmon?";
    const response = "Pinot Noir or a light Chardonnay pairs well with salmon.";

    const id = await saveWineQuestion(question, response);
    expect(typeof id).toBe("number");

    const questions = await getAllWineQuestions();
    expect(questions.length).toBe(1);
    expect(questions[0].question).toBe(question);
    expect(questions[0].response).toBe(response);
  });

  it("wineQuestionsState is kept in sync", async () => {
    await saveWineQuestion("Test question", "Test response");
    // Wait for liveQuery to update
    await new Promise((r) => setTimeout(r, 100));
    expect(wineQuestionsState.value.length).toBeGreaterThan(0);
    expect(wineQuestionsState.value[0].question).toBe("Test question");
  });
});
