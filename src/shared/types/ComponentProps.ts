import type { Wine } from "../Wine";
import type { RecommendationOption } from "./RecommendationTypes";

/**
 * Props for EditWineForm component
 */
export interface EditWineFormProps {
  show: boolean;
  wine: Wine;
}

/**
 * Props for WineDetail component
 */
export interface WineDetailProps {
  show: boolean;
  wine: Wine;
}

/**
 * Props for DrinkWineModal component
 */
export interface DrinkWineModalProps {
  show: boolean;
  wine: Wine;
}

/**
 * Props for SettingsModal component
 */
export interface SettingsModalProps {
  show: boolean;
}

/**
 * Props for AddWineForm component
 */
export interface AddWineFormProps {
  show: boolean;
}

/**
 * Props for WineRecommendModal component
 */
export interface WineRecommendModalProps {
  show: boolean;
  loading: boolean;
  error: string;
}

/**
 * Props for RecommendationsResultModal component
 */
export interface RecommendationsResultModalProps {
  show: boolean;
  results: RecommendationOption[];
  query?: string;
}