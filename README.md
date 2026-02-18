# Masjid Hunt

Web app mobile-first untuk cari masjid terdekat dari stesen LRT/MRT/ERL di Malaysia.

Live URL: `https://masjid-hunt.vercel.app/`

## Skop Liputan

- Aplikasi ini **tidak terhad kepada Klang Valley sahaja**.
- Liputan bergantung pada stesen yang ada dalam `data/stations.my.json`.
- Selagi stesen LRT/MRT/ERL ada dalam dataset, pengguna boleh cari masjid berdekatan stesen tersebut.

## Apa Website Ini Buat

Masjid Hunt bantu pengguna pejalan kaki cari masjid paling dekat dari stesen transit Malaysia
(LRT/MRT/ERL) dalam radius berjalan.

Fungsi utama:
- Pilih stesen transit.
- Pilih radius carian `1km / 2km / 3km`.
- Auto-senarai masjid berdekatan.
- Susun keputusan ikut jarak `Nearest` atau `Farthest`.
- Papar jarak dan anggaran masa berjalan.
- Sediakan link terus `Directions` ke Google Maps.
- Sediakan map preview route (station -> masjid) dalam card.
- Fokus pengalaman: pejalan kaki yang nak ke masjid terdekat dari stesen LRT/MRT/ERL.
- Papar panel auto-detect bawah header:
  - Waktu solat semasa (KL/Selangor sahaja)
  - Jarak lokasi semasa ke stesen LRT, MRT, dan ERL paling dekat

## Kandungan Website (Halaman)

1. `/` (Home)
- Header + tagline.
- Panel `Waktu Solat & Stesen Terdekat` (auto detect lokasi):
  - Auto detect kawasan (KL / Selangor)
  - Papar waktu Subuh, Zohor, Asar, Maghrib, Isyak
  - Papar stesen paling dekat secara keseluruhan (LRT/MRT/ERL)
  - Papar jarak ke LRT terdekat
  - Papar jarak ke MRT terdekat
  - Papar jarak ke ERL terdekat
- Filter bar:
  - Radius: `1km / 2km / 3km`
  - Line type: `All / LRT / MRT / ERL`
  - Sort: `Nearest / Farthest`
- Station picker (search + dropdown).
- Senarai card masjid:
  - Nama masjid
  - Jarak + masa berjalan
  - Alamat ringkas
  - Butang `Directions`
  - `Map preview` (expand/collapse)

2. `/stations` (Browse All Stations)
- Senarai semua stesen seed.
- Search stesen.
- Filter line type.
- Klik satu stesen untuk buka page detail stesen.

3. `/station/[id]` (Station Detail)
- Papar info stesen dipilih.
- Auto-load senarai masjid untuk stesen itu.
- Tetap boleh guna radius/sort filter.

## Cara Guna (Untuk Pengguna)

1. Buka `https://masjid-hunt.vercel.app/`
2. Pilih stesen dalam dropdown.
3. Pilih radius carian (cadangan mula `2km`).
4. Pastikan sort pada `Nearest` untuk cari paling dekat dulu.
5. Lihat hasil card masjid.
6. Klik `Directions` untuk buka laluan berjalan di Google Maps.
7. Jika perlu, klik `Papar map preview` untuk lihat route dalam page.

## Cara Guna (Untuk Developer - Local)

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
- `GET /api/map-embed?origin=lat,lng&destination=lat,lng` (redirect ke Google Maps Embed Directions)
- `GET /api/prayer-times?lat=...&lng=...` (waktu solat auto, KL/Selangor sahaja)

## Aliran Data & Logik Carian

1. User pilih stesen + radius + sort di client.
2. Client panggil `GET /api/mosques`.
3. Server cari masjid guna Google Places Nearby Search.
4. Server kira jarak berjalan guna Distance Matrix (`mode=walking`).
5. Jika Distance Matrix gagal/quota limit:
- fallback ke kiraan haversine (anggaran).
6. Hasil di-sort ikut pilihan user.
7. Server return JSON ke client untuk dipaparkan sebagai card.

## Notes API / Quota

- Carian masjid: Google Places Nearby Search (server-side).
- Jarak berjalan: Google Distance Matrix mode `walking` (server-side), fallback haversine bila API gagal/quota hit.
- Waktu solat: API Aladhan (server-side) berdasarkan lokasi semasa.
- Cache in-memory 10 minit berdasarkan kombinasi `stationId + radius + sort`.
- Cache waktu solat in-memory 10 minit (berdasarkan koordinat dibundarkan).
- Radius dihadkan kepada 1km-3km, result dihadkan maksimum 40.
- Places/Distance dipanggil dari route server; client hanya panggil endpoint app sendiri.
- Jika API key tiada/invalid, sistem guna fallback sample mosque data untuk demo UI.

## Troubleshooting Ringkas

1. Tiada result keluar
- Cuba radius `3km`.
- Tukar stesen lain.
- Semak API key dan API enable di Google Cloud.

2. Keluar label `anggaran`
- Ini bermaksud Distance Matrix tak tersedia untuk request itu.
- App fallback kepada jarak garis lurus (haversine).

3. Map preview tak muncul
- Semak `GOOGLE_MAPS_API_KEY`.
- Pastikan `Maps Embed API` enabled.
- Semak restriction domain API key untuk domain Vercel.

4. Waktu solat tak keluar
- Benarkan permission lokasi di browser.
- Pastikan anda berada dalam kawasan KL/Selangor (fitur waktu solat kini fokus dua kawasan ini).

5. Error Vercel pasal build/output/public
- Pastikan `Framework Preset = Next.js`.
- Jangan override `Output Directory`.
- Redeploy dengan clear build cache.

## Dataset Stesen

Seed stesen disimpan di `data/stations.my.json`.
Dataset kini diperluaskan untuk lebih banyak stesen LRT/MRT/ERL, dan boleh ditambah lagi bila-bila masa.

Contoh stesen dalam dataset semasa:
- Gombak
- Setiawangsa
- KL Sentral
- Masjid Jamek
- KLCC
- Pasar Seni
- Muzium Negara
- Bukit Bintang
- TRX
- Kajang
- Bandar Tasik Selatan
- Putrajaya & Cyberjaya
- KLIA
