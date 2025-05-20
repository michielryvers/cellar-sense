export interface Wine {
  id: string | undefined;
  name: string;
  vintner: string;
  vintage: number | string;
  appellation: string;
  region: string;
  color: string;
  volume: string;
  alcohol: string;
  farming: string;
  price: string;
  sulfites: string;
  drink_from: number | string;
  drink_until: number | string;
  grapes: GrapeEntry[];
  vinification: VinificationStep[];
  tasting_notes: {
    nose: string[];
    palate: string[];
  };
  images: {
    front: string | Blob;
    back?: string | Blob;
  };
  inventory: {
    bottles: number;
    purchaseDate: string;
    purchaseLocation: string;
  };
  consumptions?: WineConsumption[];
}

export interface GrapeEntry {
  name: string;
  percentage: number;
}

export interface VinificationStep {
  step: string;
  description: string;
}

export interface WineConsumption {
  date: string;
  rating: number;
  notes: string;
}
