/**
 * Parameters for extracting wine data from images using OpenAI
 */
export interface ExtractWineDataParams {
  apiKey: string;
  purchaseLocation?: string;
  frontBase64: string;
  backBase64: string | null;
}