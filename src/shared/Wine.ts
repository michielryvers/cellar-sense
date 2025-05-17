export interface Wine {
  id: string | number;
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
  label_art: string;
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
}

export interface GrapeEntry {
  name: string;
  percentage: number;
}

export interface VinificationStep {
  step: string;
  description: string;
}
