import { OpenAI } from "openai";
import type { Wine } from "../shared/Wine";
import type { RecommendationOption } from "../shared/types";
import { saveRecommendation } from "./recommendations-idb";
import { settingsService } from "./settings";
import { ensureDatabaseUploaded } from "./openai-file";

export async function getWineRecommendations({
  apiKey,
  wines,
  userQuery,
}: {
  apiKey: string;
  wines: Wine[];
  userQuery: string;
}): Promise<RecommendationOption[]> {
  if (!apiKey) throw new Error("OpenAI API key is required");
  if (!wines.length) throw new Error("No wines in stock");
  if (!userQuery) throw new Error("User query is required");

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  // Create system prompt
  const systemPrompt = `
  You are a helpful wine assistant. 
  The user will describe their meal, occasion, or mood. 
  Recommend several wines (from their cellar list below) that best fit their query. 
  Only recommend wines that are in stock (bottles > 0). 
  For each, include a short reason. Return an array of JSON objects:
   { id, name, vintner, vintage, reason } in order of best fit first.
  Do not recommend any wine not in the list.
  `;

  try {
    // Get file reference - throws error if not available
    const fileId = await ensureDatabaseUploaded();
    if (!fileId) {
      throw new Error("OpenAI file reference is required. Please ensure you are online and try again.");
    }
    
    // Create messages with system prompt and user query
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userQuery }
    ];

    const model = settingsService.openAiModel;

    // Create the API request parameters with file reference
    const requestParams = {
      model: model,
      messages,
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.7,
      file_ids: [fileId]
    };

    const response = await openai.chat.completions.create(requestParams);

    let result;
    const content = response.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      result = JSON.parse(content);
    } else {
      result = content;
    }

    let recs: RecommendationOption[];
    if (Array.isArray(result)) {
      recs = result;
    } else if (result && "recommendations" in result) {
      recs = result.recommendations;
    } else if (result && "results" in result) {
      recs = result.results;
    } else {
      throw new Error("Invalid recommendation format");
    }

    // Save to recommendations history DB
    try {
      await saveRecommendation(userQuery, recs);
    } catch (err) {
      // Non-fatal, just log
      console.warn("Failed to save recommendation history", err);
    }

    return recs;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error("Failed to parse recommendations: " + errorMessage);
  }
}
