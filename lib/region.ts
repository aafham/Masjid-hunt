// Official zone names: https://www.e-solat.gov.my/ (verified 20 September 2026).
// Coordinates alone do not identify a prayer zone reliably near district borders.
export const PRAYER_ZONES = [
  { code: "WLY01", area: "Kuala Lumpur & Putrajaya" },
  { code: "SGR01", area: "Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor & Shah Alam" },
  { code: "SGR02", area: "Kuala Selangor & Sabak Bernam" },
  { code: "SGR03", area: "Klang & Kuala Langat" }
] as const;

export type PrayerZone = (typeof PRAYER_ZONES)[number]["code"];

export function getPrayerZone(code: string) {
  return PRAYER_ZONES.find((zone) => zone.code === code);
}
