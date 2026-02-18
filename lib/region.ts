export type PrayerArea = "Kuala Lumpur" | "Selangor";

export function detectPrayerArea(lat: number, lng: number): PrayerArea | null {
  const isKualaLumpur =
    lat >= 3.02 && lat <= 3.27 &&
    lng >= 101.62 && lng <= 101.78;

  if (isKualaLumpur) {
    return "Kuala Lumpur";
  }

  const isSelangor =
    lat >= 2.73 && lat <= 3.84 &&
    lng >= 100.7 && lng <= 101.99;

  if (isSelangor) {
    return "Selangor";
  }

  return null;
}
