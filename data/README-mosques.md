# OpenStreetMap mosque and surau data

`mosques.osm.json` contains 1,485 public Muslim places of worship imported from OpenStreetMap. It is real map data, not demo content. All provider IDs and source object URLs are retained.

- License: [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
- Attribution: [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Retrieved: 20 September 2026.
- **Source replication date: 15 July 2026.** The retrieval date is not the date the map was updated; the queried mirror was behind.
- Bounds: south 2.70, west 101.35, north 3.28, east 101.85 (Klang Valley and KLIA).
- Private, no-access, disused, abandoned and under-construction objects are excluded when those tags are present.
- Polygon centers are approximate destinations, not verified entrances. Coverage and accessibility may be incomplete.

The default application uses this snapshot immediately, without API credentials or a live Overpass request. Responses include `sourceMode`, `sourceUpdatedAt`, `snapshotRetrievedAt` and attribution. Google Places is optional; successful empty results are preserved. An explicitly configured `OVERPASS_API_URL` enables live OSM queries, falling back to this dated snapshot if the provider fails.

To refresh, export JSON from an Overpass instance with sufficient capacity and an up-to-date replication timestamp:

```text
[out:json][timeout:90];
nwr[amenity=place_of_worship][religion=muslim](2.70,101.35,3.28,101.85);
out center tags;
```

Run:

```sh
node scripts/import-mosques.mjs /path/to/overpass-export.json
pnpm test
```

The importer accepts a raw Overpass response or the original wrapper `{data, retrievedAt, bounds, endpoint, query}`. It refuses incomplete or empty exports and keeps the provider's replication timestamp. Inspect the diff, bounds, counts and changed coordinates before publishing updated data. Keep the data file and this attribution available when redistributing the application.
