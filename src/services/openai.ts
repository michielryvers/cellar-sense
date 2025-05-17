import { OpenAI } from "openai";
import {
  ResponseInput,
  ResponseInputImage,
} from "openai/resources/responses/responses";

/**
 * JSON Schema for wine entry validation
 * This is used to ensure OpenAI returns properly structured data
 */
export const wineSchema = {
  type: "object",
  description: "Full specification for a single wine entry",
  properties: {
    name: { type: "string" },
    vintner: { type: "string" },
    vintage: { type: "integer" },
    appellation: { type: "string" },
    region: { type: "string" },
    grapes: {
      type: "object",
      description: "Any grape variety → percentage mapping",
      properties: {},
    },
    color: { type: "string", enum: ["Red", "White", "Rosé", "Orange"] },
    volume: { type: "string" },
    alcohol: { type: "string" },
    farming: {
      type: "string",
      enum: ["Organic", "Biodynamic", "Conventional", "Natural"],
    },
    vinification: {
      type: "object",
      description: "Any vinification step → free-text description",
      properties: {},
    },
    tasting_notes: {
      type: "object",
      properties: {
        nose: { type: "array", items: { type: "string" } },
        palate: { type: "array", items: { type: "string" } },
      },
    },
    drink_from: { type: "integer" },
    drink_until: { type: "integer" },
    price: { type: "string" },
    sulfites: { type: "string" },
    label_art: { type: "string" },
  },
  required: [
    "name",
    "vintner",
    "vintage",
    "appellation",
    "region",
    "grapes",
    "color",
    "volume",
    "alcohol",
    "farming",
    "vinification",
    "tasting_notes",
    "drink_from",
    "drink_until",
    "price",
    "sulfites",
    "label_art",
  ],
  additionalProperties: false,
};

/**
 * Builds the system prompt for the OpenAI API
 * @param {Object} params
 * @param {string} [params.purchaseLocation] - Optional location where the wine was purchased
 * @returns {string} The formatted system prompt
 */
function buildPrompt(purchaseLocation: string | undefined) {
  return `
You are a wine label data extraction assistant. Your job is to extract all possible wine metadata from the provided label images and purchase location. 
If any required information is missing from the label, do a web search for additional info. Prefer the purchase location as a main source of truth. 

Always return a single, complete JSON object (do not include any images fields).

- Do not emit anything except the JSON object.
- Use the purchase location as a hint if provided: "${purchaseLocation || ""}".
`;
}

interface ExtractWineDataParams {
  apiKey: string;
  purchaseLocation?: string;
  frontBase64: string;
  backBase64: string | null;
}

/**
 * Extracts wine data from label images and purchase location using OpenAI API
 * @param {Object} params Configuration object
 * @param {string} params.apiKey OpenAI API key
 * @param {string} [params.purchaseLocation] Optional purchase location for context
 * @param {string} params.frontBase64 Base64-encoded front label image
 * @param {string} [params.backBase64] Optional base64-encoded back label image
 * @returns {Promise<Object>} Parsed wine data matching the wineSchema
 * @throws {Error} If API call fails or response cannot be parsed
 */
export async function extractWineData({
  apiKey,
  purchaseLocation,
  frontBase64,
  backBase64,
}: ExtractWineDataParams) {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }

  if (!frontBase64) {
    throw new Error("Front label image is required");
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  // Prepare the input for the OpenAI API
  const input: ResponseInput = [
    {
      role: "system",
      content: buildPrompt(purchaseLocation),
    },
    {
      role: "user",
      content: getInputImages(frontBase64, backBase64),
    },
  ];

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      input,
      tools: [{ type: "web_search_preview", search_context_size: "medium" }],
      text: {
        format: {
          type: "json_schema",
          name: "wine_entry",
          schema: wineSchema,
          strict: false,
        },
      },
    });

    // Parse and return the JSON object
    let json = response.output_text;
    if (typeof json === "string") {
      json = JSON.parse(json);
    }
    return json;
  } catch (error) {
    console.error("OpenAI API error:", error);
    let message = "Failed to extract wine data from images";
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as any).response?.data?.error?.message === "string"
    ) {
      message = (error as any).response.data.error.message;
    }
    throw new Error(message);
  }

  function getInputImages(
    frontBase64: string,
    backBase64: string | null
  ): ResponseInputImage[] {
    const images: ResponseInputImage[] = [
      { type: "input_image", image_url: frontBase64, detail: "auto" },
    ];

    if (backBase64) {
      images.push({
        type: "input_image",
        image_url: backBase64,
        detail: "auto",
      });
    }

    return images;
  }
}
