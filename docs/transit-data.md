# Transit data and maintenance

Rapid Rail station membership and coordinates were checked against the official feed on **25 November 2026**. ERL service membership and coordinates were last reviewed on **20 September 2026**. For current disruptions, check [Rapid KL service status](https://myrapid.com.my/).

## Operating lines

| Line | Entries | Source |
| --- | ---: | --- |
| LRT Kelana Jaya | 37 | Prasarana GTFS |
| LRT Ampang | 18 | Prasarana GTFS |
| LRT Sri Petaling | 29 | Prasarana GTFS |
| LRT Shah Alam (LRT3) | 20 | Prasarana GTFS + operating-status verification |
| MRT Kajang | 29 | Prasarana GTFS |
| MRT Putrajaya | 36 | Prasarana GTFS + MRT Corp |
| KLIA Transit | 6 | ERL operator |
| KLIA Ekspres | 3 | ERL operator |

There are **178 route-station entries**. An interchange appears once per line; this is deliberately not described as 178 unique physical stations. Ampang and Sri Petaling are separate routes, including their shared section. KLIA Ekspres contains its three regular stops; late-night variations should be checked with ERL.

The Shah Alam line is operating: the [operator's current page](https://www.prasarana.com.my/rapid-rail/) includes Shah Alam in its 2026 operations, and [RTM's 22 June 2026 report](https://berita.rtm.gov.my/nasional/senarai-berita-nasional/senarai-artikel/perkhidmatan-lrt3-mula-beroperasi-29-jun-2026/) reports the opening on 29 June 2026. The current [Rapid KL timetable](https://myrapid.com.my/bus-train/rapid-kl/shah-alam-line/) lists the same 20 stops as the operating feed, from Bandar Utama to Johan Setia. It lists SA12 as Dato' Menteri and SA15 as Seksyen 7 Shah Alam. The directory uses these names and preserves the existing station IDs. The restored/provisional stations absent from scheduled trips are excluded.

[MRT Corp](https://www.mymrt.com.my/projects/putrajaya-line/) confirms 36 operational Putrajaya stations plus five provisional stations. The app includes all 36, including Sri Damansara Timur, Metro Prima, Kentonmen and Persiaran KLCC which were missing. Sungai Buloh and Kampung Selamat belong to Putrajaya, not Kajang. [MRT3 Circle Line](https://www.mymrt.com.my/projects/mrt3-circle-line/) is a planned project and is not offered as an operating line.

## Network map

The map at `/peta` uses one complete scheduled trip per Rapid Rail line. The sync script joins its ordered stops to `shapes.txt` and trims the geometry to the operating termini. This keeps the former Sungai Buloh section off the Kajang line. Trip IDs, shape IDs, stop sequences and coordinates are recorded in `data/transit-shapes.json`. The ERL overlay connects the operator’s scheduled stops in order. Its dashed lines show schematic connections between stations.

## Coordinates, provenance and limitations

- Rapid Rail names, codes, coordinates and route membership come from the [Prasarana GTFS endpoint](https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl), documented by [data.gov.my](https://developer.data.gov.my/realtime-api/gtfs-static). SHA-256 hashes for all input tables are recorded in `data/transit-feed-provenance.json`.
- Route membership is derived by joining `routes.route_id → trips.route_id → stop_times.trip_id → stops.stop_id`. The custom `stops.route_id` field is not a safe join: Kajang stops use `MRT`, and interchange identities differ. The custom `stop_times.route_id` also differs from `routes.route_id`.
- Station names use title case, expand TRX, preserve meaningful acronyms and omit commercial naming suffixes for consistent search. `KENTOMEN` in GTFS is normalized to MRT Corp's `Kentonmen`; `KINRARA` is shown as `Kinrara BK5`.
- ERL regular service membership is confirmed by the [KLIA Transit operator page](https://www.kliaekspres.com/products-fares/klia-transit/) and [KLIA Ekspres operator page](https://www.kliaekspres.com/products-fares/klia-ekspres/).
- ERL coordinates come from **© OpenStreetMap contributors**, available under [ODbL](https://www.openstreetmap.org/copyright). Each row in `data/erl-stations.json` links to the exact source node or way. Retrieved on 20 September 2026 through Overpass; the returned database timestamp is **31 May 2026, 22:37:44 UTC** (recorded as `erlCoordinatesAsOf`). Way centers are used where the station is mapped as a polygon. KL Sentral uses the shared station complex. These coordinates are not claimed as an official ERL survey or a live snapshot.
- All points represent stations, not verified entrances or accessible walking paths. Walking distance must be obtained from routing or clearly shown as a straight-line estimate.
- MRT3, unopened provisional stops, KTM, Monorail and BRT are outside the selectable LRT/MRT/ERL operating dataset.

## Update procedure

Requires Node.js 22.13+ and either PowerShell/.NET on Windows or `unzip` on other platforms. No additional Node dependencies are needed.

```sh
# Download and validate the current official feed.
node scripts/sync-transit.mjs

# Or use a downloaded, extracted feed directory.
node scripts/sync-transit.mjs --feed-dir /path/to/rapid-rail-kl

pnpm test
```

Review official operating announcements before changing the line list/counts and `rapidRailCheckedAt` in `data/transit-lines.json`. A changed feed count fails the sync rather than silently adding a future station. ERL coordinates and service membership are maintained separately in `data/erl-stations.json`; the Prasarana feed does not cover ERL.

The generated `data/stations.my.json` preserves existing station IDs by line and code. The first migration retained old bookmarks where meaningful; obsolete Kajang entries and renamed stations are handled by `data/station-id-aliases.json` and `getStationById`. Review the generated diff, provenance hashes, names and coordinates before deployment. Never commit downloaded scratch archives or treat station operating status as a real-time service guarantee.
