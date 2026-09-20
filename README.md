# Transit2Masjid

Cari masjid dan surau berhampiran stesen LRT, MRT dan ERL di Lembah Klang serta koridor KLIA. Pilih kategori, laluan dan stesen; semak jarak, kemudian buka navigasi berjalan.

[Buka website](https://transit2masjid.vercel.app/) · [Sumber dan kemas kini transit](docs/transit-data.md) · [Data masjid OpenStreetMap](data/README-mosques.md)

## Pengalaman pengguna

- Reka bentuk responsif: senarai/peta boleh ditukar pada mobile; senarai dan peta bersebelahan pada desktop.
- Kategori **Semua / LRT / MRT / ERL**, pilihan laluan sebenar dan carian nama/kod stesen dengan sokongan keyboard.
- Pilih stesen secara terus atau tekan **Guna lokasi saya** untuk melihat tiga cadangan stesen berhampiran. Lokasi hanya diminta selepas tindakan pengguna.
- Jarak maksimum **1 / 2 / 3 km**, susunan terdekat/terjauh dan carian nama dalam hasil stesen itu.
- Kad masjid dengan alamat apabila tersedia, jenis jarak dan **Laluan berjalan** ke Google Maps.
- Simpan stesen pada peranti dan kongsi carian melalui URL. Tajuk, URL dan hasil kekal merujuk stesen yang dipilih.
- Waktu solat rasmi **JAKIM**, dengan zon pilihan WLY01, SGR01, SGR02 atau SGR03, tarikh Malaysia dan pilihan zon yang disimpan.
- Keadaan loading, tiada padanan, gangguan API, penolakan lokasi dan kegagalan imej peta mempunyai mesej serta tindakan pemulihan.

## Laluan yang tersedia

Disemak **20 September 2026**. Senarai ini bukan jadual tren atau status gangguan langsung.

| Kategori | Laluan | Entri stesen |
| --- | --- | ---: |
| LRT | Kelana Jaya | 37 |
| LRT | Ampang | 18 |
| LRT | Sri Petaling | 29 |
| LRT | Shah Alam (LRT3) | 20 |
| MRT | Kajang | 29 |
| MRT | Putrajaya | 36 |
| ERL | KLIA Transit | 6 |
| ERL | KLIA Ekspres | 3 |

Jumlah: **178 entri stesen mengikut laluan**, bukan 178 stesen fizikal unik. Stesen pertukaran disenaraikan bagi setiap laluan. Shah Alam dimasukkan berdasarkan feed operasi dan pengesahan pembukaan 29 Jun 2026. Sungai Buloh dan Kampung Selamat berada pada Laluan Putrajaya.

MRT3 dan stesen provisional yang belum beroperasi tidak ditawarkan sebagai pilihan perjalanan. KTM, Monorail dan BRT belum diliputi. Sumber, pemetaan laluan, alias URL lama dan prosedur semakan ada dalam [dokumentasi transit](docs/transit-data.md).

## Mulakan pembangunan

Keperluan: **Node.js 22.13+** (CI menggunakan Node 24) dan **pnpm 11.19.0**, seperti ditetapkan dalam `package.json`.

```sh
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm dev
```

Buka [localhost:3000](http://localhost:3000). Carian masjid boleh digunakan tanpa sebarang API key: aplikasi membaca snapshot OpenStreetMap yang disertakan. Sambungan internet masih diperlukan untuk imej peta, navigasi luar dan jadual JAKIM.

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Lucide dan Leaflet. Lockfile dikomit; gunakan pnpm untuk mengelakkan dependency berubah secara tidak sengaja.

## Konfigurasi pilihan

Salin `.env.example` kepada `.env.local` jika memerlukan integrasi tambahan. Jangan komit nilai rahsia atau letakkan key server dalam pemboleh ubah `NEXT_PUBLIC_*`.

| Pemboleh ubah | Kegunaan |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Google Places Nearby Search pada server. |
| `GOOGLE_MAPS_API_KEY` | Distance Matrix berjalan pada server; juga digunakan untuk Places jika key Places tidak diisi. |
| `GOOGLE_MAPS_EMBED_API_KEY` | Key berasingan yang kelihatan dalam browser, hanya untuk Maps Embed API. Hadkan API serta HTTP referrer kepada domain aplikasi/preview. Jangan guna key server yang sama. |
| `OVERPASS_API_URL` | Endpoint Overpass pilihan untuk carian OSM langsung. Kosongkan untuk menggunakan snapshot dengan segera. |

Aktifkan API Google yang berkaitan, billing dan sekatan key yang sesuai jika menggunakan integrasi Google. Data Google dipaparkan melalui Google Maps; apabila key Embed tiada, UI menyediakan pautan Google Maps. Data OSM tanpa jarak daripada Google menggunakan Leaflet/OpenStreetMap.

## Data, jarak dan waktu solat

- **Stesen Rapid Rail:** nama, kod, koordinat dan keahlian laluan daripada [GTFS rasmi Prasarana/data.gov.my](https://developer.data.gov.my/realtime-api/gtfs-static). Pemetaan menggunakan trips dan stop times, dengan hash sumber direkodkan.
- **ERL:** keahlian laluan daripada operator; koordinat daripada OpenStreetMap. Snapshot koordinat ERL bertarikh **31 Mei 2026**, diperoleh pada 20 September 2026.
- **Masjid/surau:** snapshot **1,485** lokasi sebenar OpenStreetMap, bukan data demo. Tarikh replikasi sumber ialah **15 Julai 2026**, walaupun eksport diperoleh pada 20 September 2026. Tarikh sumber dan atribusi dipaparkan bersama hasil.
- Jika Google dikonfigurasi, ia menjadi sumber utama. Respons `ZERO_RESULTS` yang sah kekal kosong. Kegagalan Google menggunakan OSM dengan makluman; kegagalan Overpass pilihan menggunakan snapshot bertarikh. Data demo lama telah dibuang.
- Hasil ditapis mengikut radius. Apabila routing Google tersedia, jarak dan masa berjalan daripada API digunakan. Jika tidak, jarak dilabel **anggaran garis lurus** dan tiada masa berjalan rekaan dipaparkan. Laluan sebenar boleh lebih jauh daripada anggaran.
- **Waktu solat:** [e-Solat JAKIM](https://www.e-solat.gov.my/), berdasarkan zon yang dipilih dan tarikh `Asia/Kuala_Lumpur`. Zon lalai WLY01 dilabel jelas; zon tidak diteka daripada lokasi pengguna. Respons dengan zon/tarikh tidak sepadan ditolak.
- Cache memori terhad bagi setiap instance: carian 10 minit, jadual solat 6 jam dengan key zon+tarikh. Permintaan serentak dikongsi; timeout dan had pagination mengawal permintaan upstream. Ini bukan cache teragih atau rate limiter per pengguna.

Koordinat merujuk titik/kompleks stesen atau pusat objek peta, **bukan pintu masuk yang disahkan**. Liputan, nama, akses dan kemudahan mungkin tidak lengkap. Semak navigasi serta akses masuk sebelum berjalan. Aplikasi belum menyediakan PWA/offline, status tren langsung atau data kemudahan yang disahkan di lapangan.

Data OSM tertakluk kepada [ODbL](https://opendatacommons.org/licenses/odbl/1-0/) dan atribusi **© OpenStreetMap contributors**. Kekalkan fail data, provenance dan [notis sumber masjid](data/README-mosques.md) apabila mengedar semula.

## Halaman dan API

| Route | Fungsi |
| --- | --- |
| `/` | Cari stesen; parameter `station` dan `radius` boleh dikongsi. |
| `/stations` | Direktori kategori, laluan dan stesen. |
| `/station/[id]` | Hasil untuk stesen tetap, dengan radius pilihan. Alias lama yang diketahui dialih ke ID semasa. |
| `/api/mosques?stationId=kl-sentral&radius=2&sort=nearest` | Radius hanya 1, 2 atau 3; sort `nearest` atau `farthest`. Respons menyertakan sumber, atribusi, liputan dan jenis peta. |
| `/api/prayer-times?zone=WLY01&date=2026-09-20` | Zon diperlukan; tarikh pilihan, lalai hari Malaysia semasa. |
| `/api/distance?origin=3.13442,101.68625&dest=3.1412,101.6918` | Jarak garis lurus dengan validasi koordinat. |
| `/api/map-embed?origin=3.13442,101.68625&destination=3.1412,101.6918` | Redirect menggunakan key Embed berasingan; tanpa key, preview destinasi OSM. |

Parameter API tidak sah menghasilkan 400; stesen tidak ditemui 404; kegagalan sumber yang tidak boleh dipulihkan 503. Sorting dalam UI dilakukan pada hasil sedia ada tanpa fetch tambahan.

## Semakan dan ujian

```sh
pnpm check             # lint, typecheck, 20 ujian data/API dan build production
pnpm exec playwright install chromium
pnpm test:e2e          # 22 ujian browser: 11 aliran × mobile/desktop
pnpm audit --audit-level=high
```

Jalankan `pnpm build` sebelum `pnpm test:e2e`; Playwright memulakan server production pada port 3100. Untuk server sedia ada, tetapkan `TEST_BASE_URL`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` boleh menunjuk kepada Chrome tempatan.

CI melakukan pemasangan frozen lockfile, lint, semakan jenis, ujian data/API, build, ujian Chromium dan audit dependency. Ujian browser meliputi kategori laluan, pemilihan stesen, radius, penapisan nama, navigasi/back, zon solat, geolokasi, retry, simpanan, keyboard dan sinkronisasi serta pemulihan peta. Jadual JAKIM dalam ujian browser menggunakan fixture; respons sebenar perlu disemak berasingan apabila integrasi berubah.

Semakan responsif turut dibuat pada lebar 320, 390, 768 dan 1440 px. Ini emulasi Chromium; ujian telefon fizikal, Safari/iOS, pembaca skrin dan laluan berjalan di lapangan masih perlu dibuat.

Aliran kerja repo: buat perubahan terus pada `main` mengikut pilihan maintainer. Jalankan semakan yang berkaitan sebelum push dan kemas kini README selepas kerja selesai. Jangan cipta branch, PR atau bot branch automatik tanpa arahan baharu.

## Kemas kini data

```sh
node scripts/sync-transit.mjs
node scripts/import-mosques.mjs /path/to/overpass-export.json
pnpm check
```

Sync transit menggunakan feed rasmi semasa; keperluan ekstraksi dan pilihan `--feed-dir` diterangkan dalam [docs/transit-data.md](docs/transit-data.md). Perubahan bilangan stesen yang belum disemak menyebabkan sync gagal supaya stesen masa depan tidak ditambah secara senyap.

Untuk masjid, dapatkan eksport sebenar menggunakan query dan bounds dalam [data/README-mosques.md](data/README-mosques.md). Semak tarikh replikasi, koordinat, kiraan dan diff sebelum komit. Jangan menukar tarikh semakan tanpa menyemak sumber.

## Deploy ke Vercel

1. Import repo dan pilih framework **Next.js**.
2. Gunakan Node.js 24 serta package manager daripada `package.json`; pasang melalui frozen lockfile dan bina dengan `pnpm build`.
3. Biarkan Output Directory pada tetapan lalai Next.js. Jangan pilih `public`.
4. Tambah pemboleh ubah pilihan hanya jika integrasi Google/Overpass diperlukan. Carian asas menggunakan snapshot tanpa key.
5. Uji preview pada mobile dan desktop sebelum menerbitkan production.

Selepas deployment, semak direktori Shah Alam, hasil KL Sentral/Gombak/KLIA, sumber data, navigasi berjalan, peta dan jadual JAKIM. Jika peta luar gagal, gunakan pautan peta yang disediakan; jika waktu solat gagal, semak zon dan tekan **Cuba lagi**. Deploy baharu tidak mengemas kini snapshot data secara automatik.
