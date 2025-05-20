import type { Wine } from "../Wine";
import type { RecommendationOption } from "./RecommendationTypes";
import type { WineQuestionEntry } from "./WineQuestionTypes";

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

/**
 * Props for WineQuestionModal component
 */
export interface WineQuestionModalProps {
  show: boolean;
  loading: boolean;
  error: string;
}

/**
 * Props for WineQuestionResultModal component
 */
export interface WineQuestionResultModalProps {
  show: boolean;
  response: string;
  question: string;
}