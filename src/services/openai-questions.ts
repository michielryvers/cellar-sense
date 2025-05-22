import { OpenAI } from "openai";
import type { Wine } from "../shared/Wine";
import { saveWineQuestion } from "./dexie-db";
import { settingsService } from "./settings";
import { ensureDatabaseUploaded } from "./openai-file";

/**
 * Asks OpenAI a question about the user's wine collection
 * @param {Object} params Configuration object
 * @param {string} params.apiKey OpenAI API key
 * @param {Wine[]} params.wines The user's wine collection
 * @param {string} params.userQuestion The user's question
 * @returns {Promise<string>} The AI's response
 */
export async function askWineQuestion({
  apiKey,
  wines,
  userQuestion,
}: {
  apiKey: string;
  wines: Wine[];
  userQuestion: string;
}): Promise<string> {
  if (!apiKey) throw new Error("OpenAI API key is required");
  if (!wines.length) throw new Error("No wines in collection");
  if (!userQuestion) throw new Error("User question is required");

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  // Prepare system prompt
  const systemPrompt = `
  You are a knowledgeable wine expert and sommelier.
  The user will ask questions about their wine collection, wine pairings, storage, and other wine-related topics.
  Provide detailed, educational responses based on the wine collection provided.
  If the question isn't related to wine, politely redirect the conversation to wine-related topics.
  If the question requires information not in the wine collection data, you can provide general wine knowledge or use web search to find more specific information.
  
  IMPORTANT: Format your response using markdown syntax. Use headings, lists, bold, italic, etc. as appropriate to make your response well-structured and readable.
  `;

  try {
    // Get file reference - throws error if not available
    const fileId = await ensureDatabaseUploaded();
    if (!fileId) {
      throw new Error(
        "OpenAI file reference is required. Please ensure you are online and try again."
      );
    }

    // Create messages with system prompt and user question
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userQuestion },
    ];

    const model = settingsService.openAiModel;

    // Create the API request parameters with file reference
    const requestParams = {
      model: "gpt-4o-search-preview",
      messages,
      max_tokens: 2000,
      temperature: 0.7,
      file_ids: [fileId],
      web_search_options: {
        search_context_size: "low" as "low",
      },
    };

    const response = await openai.chat.completions.create(requestParams);

    const responseText =
      response.choices?.[0]?.message?.content || "No response generated";

    // Save the question and response to the database
    try {
      await saveWineQuestion(userQuestion, responseText);
    } catch (err) {
      // Non-fatal, just log
      console.warn("Failed to save question/answer history", err);
    }

    return responseText;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error("Failed to get response from OpenAI: " + errorMessage);
  }
}
