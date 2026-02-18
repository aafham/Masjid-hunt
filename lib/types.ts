export type LineType = "LRT" | "MRT" | "ERL";

export type Station = {
  id: string;
  name: string;
  line_type: LineType;
  line_name: string;
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
};

export type SortOrder = "nearest" | "farthest";
