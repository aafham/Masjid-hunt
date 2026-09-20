export type LineType = "LRT" | "MRT" | "ERL";

export type Station = {
  id: string;
  name: string;
  line_type: LineType;
  line_name: string;
  line_id?: string;
  station_code?: string;
  source?: string;
  lat: number;
  lng: number;
};

export type Mosque = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  distanceMeters?: number;
  durationMinutes?: number;
  distanceType: "walking_api" | "haversine_estimate";
  source?: "google" | "openstreetmap";
  osmUrl?: string;
};

export type SortOrder = "nearest" | "farthest";
