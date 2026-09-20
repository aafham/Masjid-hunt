export type Coordinates = { lat: number; lng: number };

export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseCoordinates(value: string | null): Coordinates | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 2 || parts.some((part) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(part.trim()))) return null;
  const [lat, lng] = parts.map(Number);
  return validCoordinates(lat, lng) ? { lat, lng } : null;
}

export function parseRadius(value: string | null): 1 | 2 | 3 | null {
  if (value === null) return 2;
  return value === "1" || value === "2" || value === "3" ? Number(value) as 1 | 2 | 3 : null;
}
