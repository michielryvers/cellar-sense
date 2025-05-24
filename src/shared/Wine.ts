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
  sources?: string[];
  location?: BottleLocation | null;
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

export interface BottleLocation {
  tagId: number; // apriltag id stuck on the rack
  x: number; // normalised 0-1 position in cellar photo
  y: number;
  cellPhotoId: string; // FK to stored reference photo
}
