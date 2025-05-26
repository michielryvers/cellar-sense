export interface Location {
  rackId: string; // FK to cellar-vision-definition.id
  x: number; // normalised
  y: number; // normalised
}

export interface MarkerPosition {
  id: number;
  x: number;
  y: number;
}

export interface RackDefinition {
  id: string; // primary key (GUID)
  rackName: string;
  markerIds: number[]; // length 4
  markerPositions: MarkerPosition[]; // raw pixel coords in calibration image
  homography: number[]; // length 9, row-major H
  calibrationImageUrl: string; // base64 or remote object URL
  lastCalibration: string; // ISO Date
}
