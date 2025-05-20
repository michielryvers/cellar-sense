import * as openaiService from "../openai";
import { describe, it, expect } from "vitest";

describe("openai service", () => {
  it("exports wineSchema with required fields", () => {
    expect(openaiService.wineSchema).toBeDefined();
    expect(openaiService.wineSchema.properties).toHaveProperty("name");
    expect(openaiService.wineSchema.properties).toHaveProperty("vintner");
    expect(openaiService.wineSchema.properties).toHaveProperty("vintage");
  });

  // Add more tests for extractWineData if needed, using mocks for OpenAI
});
