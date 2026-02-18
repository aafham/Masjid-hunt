# Masjid Hunt

Web app mobile-first untuk cari masjid terdekat dari stesen LRT/MRT/ERL (fokus Klang Valley).

## Setup

1. Install dependency:

```bash
npm install
```

2. Sediakan env file:

```bash
cp .env.example .env.local
```

Untuk PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Isi `.env.local`:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_key
GOOGLE_PLACES_API_KEY=your_google_places_key
```

- `GOOGLE_PLACES_API_KEY` boleh sama dengan `GOOGLE_MAPS_API_KEY` jika Places API enabled.
- Jika key tiada/invalid, app guna fallback sample mosques supaya UI tetap boleh demo.

3. Jalankan app:

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Deploy Vercel

1. Push repo ke GitHub.
2. Di Vercel, pilih `New Project` dan import repo ini.
3. Framework preset: `Next.js` (auto-detect).
4. Tambah Environment Variables di Vercel:
   - `GOOGLE_MAPS_API_KEY`
   - `GOOGLE_PLACES_API_KEY`
5. Deploy.

Selepas deploy, uji endpoint:

```text
https://<domain-anda>/api/mosques?stationId=kl-sentral&radius=2&sort=nearest
```

### Google Cloud Minimum Setup

- Enable API:
  - `Places API`
  - `Distance Matrix API`
  - `Maps Embed API`
- Pastikan billing aktif.
- Jika guna API key restriction:
  - Benarkan domain production Vercel anda.
  - Tambah juga domain preview jika perlu.

## Routes

- `/` Home: pilih stesen + filter + list masjid ikut jarak.
- `/stations` Browse all stations + search.
- `/station/[id]` Detail stesen + auto list masjid.
- `GET /api/mosques?stationId=...&radius=...&sort=nearest|farthest`
- `GET /api/distance?origin=lat,lng&dest=lat,lng` (haversine helper)

## Notes API / Quota

- Carian masjid: Google Places Nearby Search (server-side).
- Jarak berjalan: Google Distance Matrix mode `walking` (server-side), fallback haversine bila API gagal/quota hit.
- Cache in-memory 10 minit berdasarkan kombinasi `stationId + radius + sort`.
- Radius dihadkan kepada 1km-3km, result dihadkan maksimum 40.
- Places/Distance dipanggil dari route server; client hanya panggil endpoint app sendiri.

## Dataset Stesen

Seed stesen disimpan di `data/stations.my.json`.
