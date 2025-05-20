import * as openaiRecommend from "../openai-recommend";
import { describe, it, expect } from "vitest";

describe("openai-recommend", () => {
  it("throws if no apiKey", async () => {
    await expect(
      openaiRecommend.getWineRecommendations({
        apiKey: "",
        wines: [],
        userQuery: "foo",
      })
    ).rejects.toThrow("OpenAI API key is required");
  });

  it("throws if no wines", async () => {
    await expect(
      openaiRecommend.getWineRecommendations({
        apiKey: "key",
        wines: [],
        userQuery: "foo",
      })
    ).rejects.toThrow("No wines in stock");
  });

  it("throws if no userQuery", async () => {
    await expect(
      openaiRecommend.getWineRecommendations({
        apiKey: "key",
        wines: [{}] as any,
        userQuery: "",
      })
    ).rejects.toThrow("User query is required");
  });
});
