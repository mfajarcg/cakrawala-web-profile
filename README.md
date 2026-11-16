# Cakrawala — IT Consulting by PT Cartenz Technology Indonesia

Company profile interaktif untuk **Cakrawala**, unit IT consulting PT Cartenz Technology Indonesia.
Situs ini bukan halaman scroll biasa: seluruh konten hidup di dalam satu **dunia isometrik 3D**.
Satu karakter konsultan berjalan dari stasiun ke stasiun mengikuti scroll, lalu pengunjung bisa
masuk ke dalam dunia itu lewat mode **Play Character**.

- **Live:** <https://mfajarcg.github.io/cakrawala-web-profile/> (aktif setelah Settings → Pages → Source = GitHub Actions)
- **Base path:** `/cakrawala-web-profile/`
- **Bahasa:** Indonesia (default), English lewat toggle `EN/ID`
- **Target viewport:** 390 / 1440 / 1920 / 2560 / 3840 px
- **Konten:** 12 blok (Navigation + 11 panel stasiun), seluruhnya memakai data nyata PT Cartenz

---

## 1. Ringkasan pengalaman

| Fitur | Cara kerja singkat |
|---|---|
| Journey 3D | Canvas fixed di belakang DOM. Scroll menggerakkan karakter di sepanjang kurva Catmull-Rom melewati 11 stasiun. |
| Checkpoint snap | Satu gesture wheel/arrow key = satu stasiun. Scroll selalu berhenti di tengah card. |
| Kamera | Orthographic isometrik yang mengikuti karakter, bergeser ke sisi berlawanan card dengan akselerasi/de-selerasi. |
| First-person | Tombol PoV mengganti kamera ke perspektif mata karakter (tinggi 1,68 unit). |
| Play Character | Tombol di stasiun 9 memudarkan situs lalu mengganti scene menjadi arena voxel ala Roblox. Bangunan tersimpan di `localStorage`. |
| Exit | `Esc` memudarkan game dan mengembalikan scroll tepat ke checkpoint Play; blok yang dibangun tetap ada. |
| Tribute | Setiap library/aset yang dipakai dicatat di blok Footer → Tribute & Atribusi. |

Dua lapisan yang harus dipahami:

```
DOM  (scroll normal, 11 section min-h 110vh, card melayang kiri/kanan)
  │  wheel / arrow key / touch / nav click
  ▼
JourneyController  ──►  Lenis.scrollTo(stationTop, duration)
  │                            │ scroll event
  │                            ▼
  │                     progress = scrollY / (scrollHeight − innerHeight)
  │                            ▼
  │                     zustand: target → CharacterDriver → characterPos/gait
  │                            ▼
  └──────────────────►  CameraRig (ortho follow / first person)

Canvas (fixed, React Three Fiber)
  site mode: World + PathRibbon + Stations + Character  (z = −10, di belakang DOM)
  game mode: GameScene + Character                      (z = 10, di depan, DOM disembunyikan)
```

---

## 2. Tech stack

| Lapisan | Teknologi | Versi | Dipakai untuk |
|---|---|---|---|
| UI | React | 19.3 | Komponen blok, i18n context, HUD game |
| Bahasa | TypeScript | 7.0 | Seluruh `src/` (strict build `tsc -b`) |
| Bundler | Vite | 8.3 | Dev server, build produksi, base path GitHub Pages |
| Styling | Tailwind CSS | 4.3 | Utility layout, breakpoint `sm/lg`, tipografi responsif |
| 3D | three.js | 0.187 | Scene, kurva, orthographic/perspective camera, raycasting |
| 3D React | @react-three/fiber | 9.8 | Render scene deklaratif, `useFrame` loop |
| 3D helper | @react-three/drei | 10.7 | `useFBX`, `useTexture`, `OrthographicCamera`, `PerspectiveCamera` |
| State | Zustand | 5.1 | Store journey (`progress/target/activeStation/pov`) dan game (`mode/cover/blocks/selected`) |
| Smooth scroll | Lenis | 1.3.27 | `scrollTo` berbasis durasi + easing untuk hop antar-checkpoint |
| Ikon | lucide-react | 1.72 | Ikon DOM (ISC) |
| QA | playwright-core | 1.65 | Screenshot 5 viewport + uji gameplay memakai Edge sistem |
| Lint | oxlint | 1.90 | `npm run lint` |

> `gsap` dan `matter-js` masih tercantum di `package.json` sebagai sisa prototipe Play Moment
> berbasis fisika Matter.js. Keduanya **tidak diimpor** oleh `src/` saat ini; gameplay arena
> dibangun langsung di atas three.js.

**Font & warna:** Inter/system-ui; brand `#408fb4`, brand-dark `#2e6f8e`, ink `#101418`, paper `#f7f9fa`, aksen `#f2b23c` dan `#5aa66f`.

---

## 3. Struktur proyek

```
.
├─ index.html                  # meta, OG, favicon (base path GitHub Pages)
├─ vite.config.ts              # base: '/cakrawala-web-profile/'
├─ .github/workflows/deploy.yml# build + deploy GitHub Pages dari main
├─ public/
│  ├─ logo/                    # logo Cakrawala hitam & putih (SVG)
│  └─ models/eric/             # rp_eric_rigged_001_ue4.fbx + tex/ (diffuse, normal)
├─ src/
│  ├─ App.tsx                  # shell: World + DOM blocks + HUD + fade
│  ├─ main.tsx
│  ├─ index.css / styles/tokens.css   # Tailwind v4 + token warna + skala font
│  ├─ blocks/                  # 12 blok DOM
│  │  ├─ Nav.tsx               #   01 Navigation (sticky, ID/EN, hamburger)
│  │  ├─ Hero.tsx              #   02 Hero
│  │  ├─ Story.tsx             #   03 Cinematic Story
│  │  ├─ Services.tsx          #   04 Services (panel lebar 3 kolom)
│  │  ├─ Credibility.tsx       #   05 Credibility
│  │  ├─ Numbers.tsx           #   06 Numbers
│  │  ├─ Signature.tsx         #   07 Signature
│  │  ├─ Market.tsx            #   08 Market / Users
│  │  ├─ About.tsx             #   09 About
│  │  ├─ PlayMoment.tsx        #   10 Play Character (pintu masuk game)
│  │  ├─ Contact.tsx           #   11 Contact
│  │  ├─ Footer.tsx            #   12 Footer + tribute
│  │  ├─ Panel.tsx             #   section pembungkus: data-station, card kiri/kanan
│  │  └─ PovButton.tsx         #   toggle Orbit / First Person
│  ├─ journey/
│  │  ├─ stations.ts           # 11 stasiun: id, index, x, z, side
│  │  ├─ store.ts              # progress, target, activeStation, pov
│  │  ├─ JourneyController.tsx # wheel/keys/touch → snap ke checkpoint
│  │  ├─ scroll.ts             # scrollBridge (dipakai mode game)
│  │  └─ jump.ts               # navigasi in-page lewat scrollBridge
│  ├─ three/
│  │  ├─ World.tsx             # Canvas, kamera, ground, path ribbon, scene swap
│  │  ├─ path.ts               # CatmullRomCurve3 dari STATIONS
│  │  ├─ Character.tsx         # driver gerak + rig FBX + gait prosedural + blob shadow
│  │  ├─ Stations.tsx          # prop voxel tiap stasiun + pohon
│  │  └─ shared.ts             # characterPos/characterYaw/gait + cadenceFor()
│  ├─ game/
│  │  ├─ store.ts              # mode, cover, blocks, selected + localStorage
│  │  ├─ GameScene.tsx         # loop pemain, kamera, raycast, collision, place/break
│  │  ├─ GameHud.tsx           # kontrol, material 1–5, tombol keluar/hapus (mouse + touch)
│  │  ├─ GameFade.tsx          # cover hitam 300 ms saat swap scene
│  │  └─ input.ts              # state input bersama DOM ↔ game loop
│  ├─ lib/i18n.tsx             # LanguageProvider, dictionary id/en, persist
│  └─ content/id.json, en.json # seluruh copy + data nyata, satu sumber per bahasa
├─ scripts/
│  ├─ shot.mjs                 # screenshot 5 viewport → shots/
│  ├─ verify2.mjs              # uji gait, wheel-up, jump/break, persistensi
│  └─ play-qa.mjs              # uji snap, kolom services, pointer lock, return ke checkpoint
└─ PLAN.md                     # rencana produk & catatan data
```

---

## 4. Komponen & alur state

### 4.1 `App.tsx` — dua dunia, satu state

- `<JourneyController />` dan `<World />` selalu ter-mount.
- 11 blok DOM dibungkus `<div aria-hidden={inGame}>`; saat mode game, div diberi
  `opacity-0 pointer-events-none` sehingga canvas game (z-10) mengambil alih.
- `<GameHud />` hanya dirender saat `mode === 'game'`; `<GameFade />` selalu ada sebagai cover.

### 4.2 `JourneyController` — checkpoint snapping

| Aturan | Nilai |
|---|---|
| Posisi scroll yang “benar” | `el.offsetTop + (el.offsetHeight − innerHeight) / 2` |
| Durasi satu hop | `KEY_TRAVEL_S = 1.9 s`, easing `easeInOutCubic` |
| Kunci selama hop | durasi + 250 ms; wheel/scroll diabaikan |
| Ambang wheel | akumulasi 16 px |
| Jendela satu gesture | reset akumulasi setelah 240 ms tanpa wheel |
| Settle setelah scroll manual | 200 ms idle (touch: 320 ms) |
| Toleransi “sudah di tengah” | 32 px |
| Guard anti-loop | berhenti jika jarak ke posisi snap terakhir < 48 px |
| Arrow key saat hop | hanya satu hop diantrikan (`pending`), karakter selalu berjalan tiap etape |

Navigasi Nav/Hero/Footer tidak memakai `scrollIntoView` (bentrok dengan animasi Lenis), tetapi
memanggil `jumpTo(id)` → `scrollBridge.toStation(index)`.

### 4.3 Store

| Store | State | Ditulis oleh | Dibaca oleh |
|---|---|---|---|
| `journey/store.ts` | `progress`, `target`, `activeStation`, `pov` | controller (`setTarget`), driver (`tick`) | Character, CameraRig, Nav |
| `game/store.ts` | `mode`, `cover`, `blocks`, `selected` | PlayMoment, HUD, GameScene | App, World, GameScene |

`activeStation = round(progress × (STATION_COUNT − 1))`, dipakai untuk menentukan sisi card dan
titik fokus kamera.

### 4.4 Lapisan 3D

| File | Peran |
|---|---|
| `World.tsx` | Satu `<Canvas dpr={[1,2]}>`. Mode situs: `OrthographicCamera` (16,16,16) + ground + grid + path + stasiun + CameraRig. Mode game / first-person: `PerspectiveCamera` fov 65. |
| `path.ts` | `CatmullRomCurve3(STATIONS, closed=false, 'catmullrom', tension=0.15)`, di-cache. `getPointAt` / `getTangentAt` untuk posisi & arah hadap. |
| `Character.tsx` | `CharacterDriver` (gerak longitudinal, yaw, fase gait) + `EricVisual` (FBX, bone posing, bob pelvis, blob shadow). |
| `Stations.tsx` | Prop voxel per stasiun (gerbang, rak layanan, papan angka, war room, arena, resepsionis, gerbang akhir) + pohon tersebar. |
| `shared.ts` | `characterPos`, `characterYaw`, `gait {phase, speedNorm, moving, lift}` dan `cadenceFor()` — dipakai bersama situs dan game. |

### 4.5 Mode Play Character

1. `PlayMoment` memanggil `useGame.enter()`.
2. `swap()` menyalakan cover, menunggu **320 ms** agar cover pekat, lalu mengganti `mode`.
3. `scrollBridge.lock(true)` menghentikan Lenis dan menyembunyikan DOM.
4. `GameScene` berjalan: pemain voxel, kamera orang ketiga (jarak 5,4 · tinggi 1,9), raycast
   untuk pasang/hancurkan blok, collision grid.
5. `Esc` (atau tombol Keluar) memanggil `exit()`: cover 320 ms → mode `site` →
   `scrollBridge.lock(false)` → `scrollBridge.toStation(PLAY_STATION)`.
6. Setiap perubahan blok langsung disimpan ke `localStorage['cakrawala-play-world-v1']`.

Kontrol: `WASD`/panah, `Shift` lari, `Spasi` lompat, klik kiri hancurkan, klik kanan pasang,
`1–5` pilih material, `Esc` keluar. Di layar sentuh: joystick kiri, geser sisi kanan untuk
melihat, tombol aksi di kanan. Bila Pointer Lock tidak tersedia, aim memakai posisi kursor
(`freeAim`).

---

## 5. Peta blok → stasiun

| Blok | Komponen | Stasiun | `data-station` | Sisi card | Posisi path (x, z) |
|---|---|---|---|---|---|
| 01 Navigation | `Nav.tsx` | — (sticky, tanpa stasiun) | — | — | — |
| 02 Hero | `Hero.tsx` | 1 · `hero` | 1 | center | 0, 0 |
| 03 Story | `Story.tsx` | 2 · `story` | 2 | kanan | 13, −3,5 |
| 04 Services | `Services.tsx` | 3 · `services` | 3 | kiri | 26, 3,5 |
| 05 Credibility | `Credibility.tsx` | 4 · `credibility` | 4 | kanan | 39, −3,5 |
| 06 Numbers | `Numbers.tsx` | 5 · `numbers` | 5 | kiri | 52, 3,5 |
| 07 Signature | `Signature.tsx` | 6 · `signature` | 6 | kanan | 65, −3,5 |
| 08 Market | `Market.tsx` | 7 · `market` | 7 | kiri | 78, 3,5 |
| 09 About | `About.tsx` | 8 · `about` | 8 | kanan | 91, −3,5 |
| 10 Play Character | `PlayMoment.tsx` | 9 · `play` | 9 | kiri | 104, 3,5 |
| 11 Contact | `Contact.tsx` | 10 · `contact` | 10 | kanan | 117, −3,5 |
| 12 Footer | `Footer.tsx` | 11 · `footer` | 11 | center | 130, 0 |

Badge pada card menampilkan `01 / 11` … `11 / 11` (nomor stasiun, bukan nomor blok).

---

## 6. Perhitungan & referensi

Semua konstanta di bawah diambil langsung dari kode, sehingga angka di README ini bisa
diverifikasi ulang.

### 6.1 Tata letak stasiun & kurva

- Jarak antar-stasiun `GAP = 13` unit dunia, zig-zag `ZIG = 3,5` ke kiri/kanan path
  (`src/journey/stations.ts`). Tujuannya: satu etape ≈ satu burst langkah manusia, bukan
  “terbang” melintasi diorama.
- Path = `CatmullRomCurve3` dengan `tension 0.15`, di-resample 120 segmen menjadi
  `TubeGeometry` radius 1,3 yang di-flatten sumbu Y (`scale(1, 0.01, 1)`) menjadi ribbon.
- Panjang path dipakai untuk mengubah kecepatan progress (0–1) menjadi kecepatan dunia nyata:
  `worldSpeed = |velocity| × curve.getLength()`.

### 6.2 Gerak karakter (longitudinal)

Model kecepatan berbatas akselerasi, bukan lerp eksponensial:

```
desired = clamp((target − progress) × 4, −MAX_SPEED, +MAX_SPEED)
dv      = clamp(desired − velocity, −ACCELERATION·dt, +ACCELERATION·dt)
progress += velocity × turnBrake × dt
```

| Parameter | Nilai | Alasan |
|---|---|---|
| `MAX_SPEED` | 0,085 progress/s | ±11,8 s untuk seluruh path — cukup cepat untuk navigasi, cukup lambat agar gait terbaca |
| `ACCELERATION` | 0,6 progress/s² | start/stop terasa berbobot |
| `RUN_SPEED` | 10,5 unit dunia/s | ambang “lari penuh” untuk normalisasi gait |
| `TURN_RATE` | 9 rad/s (damped) | badan berbalik tanpa patah |
| Cut | `\|jump\| > 0,16` | lompatan nav/scrollbar memotong langsung, bukan diseret berjalan |
| `turnBrake` | `yawErr > 0,35 rad` → melambat sampai 0 | berbalik 180° = berhenti dulu, lalu jalan |

### 6.3 Model gait (berjalan & berlari)

Driver hanya menulis `gait.phase`, `speedNorm`, `moving`, dan `lift`; rig FBX dipose tiap frame.

**Cadence dikunci ke jarak tempuh** (menghilangkan kaki selip):

```
stride  = STRIDE_WALK + (STRIDE_RUN − STRIDE_WALK) × speedNorm   // 1,6 → 3,4 unit
cadence = clamp(worldSpeed / stride, 0,2 … 3,3)                  // siklus/s
phase  += cadence × 2π × dt
```

| Parameter gait | Idle/walk → run | Padanan |
|---|---|---|
| Fase stance | 62% → 40% siklus | jalan ±60% stance, lari ±40% stance |
| Knee saat stance | 0,32 → 0,50 rad | loading response lalu ekstensi push-off |
| Puncak knee saat swing | 1,05 → 2,05 rad | ±60° jalan, ±117° lari |
| Amplitudo hip | 0,30 → 0,62 rad | total ayun paha ≈34° → 71° |
| Ayun lengan | 0,10 → 0,72 rad (berlawanan fase kaki) | makin cepat = makin lebar |
| Fleksi siku | 0,22 → 1,50 rad (kuadratik) | siku terlipat saat lari |
| Lean badan | 0 → 0,32 rad (kuadratik) | condong depan saat lari |
| Flight lift | 0,025 × speedNorm | fase terbang saat kedua kaki tidak menapak |

**Tinggi badan mengikuti kaki penopang**, bukan konstanta:

```
reach(hip, knee) = L_THIGH·cos(hip) + L_SHIN·cos(hip + knee)
support          = max(reach kaki stance); bila flight → HIP_HEIGHT − ANKLE_TO_SOLE
soleGap          = HIP_HEIGHT − ANKLE_TO_SOLE − support
bodyY            = −soleGap + lift
```

`L_THIGH = 0,42`, `L_SHIN = 0,422`, `HIP_HEIGHT = 0,969`, `ANKLE_TO_SOLE = 0,127` (meter).
Model FBX diskalakan `0,01` karena authored dalam sentimeter.

**Temuan yang diperbaiki:** blob shadow awalnya diletakkan `y = 0,012`, di bawah permukaan
ribbon (≈0,033), sehingga bayangan tidak pernah terlihat dan karakter tampak melayang.
Sekarang shadow berada di `baseY + 0,045`, skala `1 + lift×0,35`, opacity `0,8 × fade`.

### 6.4 Kamera

| Aspek | Perhitungan |
|---|---|
| Isometrik | Orthographic di `(16, 16, 16)`, look-at ke `(x, 0, z)` karakter |
| Zoom responsif | `zoom = clamp(viewportWidth / 26, 14, 64)` → 390 px ≈ 15, 1440 px ≈ 55, 1920 px ke atas = 64 |
| Geser lateral | Target ±5,5 unit sepanjang `SCREEN_RIGHT = normalize(−1, 0, 1)` agar karakter tidak tertutup card |
| Akselerasi lateral | `LAT_MAX_SPEED = 13`, `LAT_ACCELERATION = 26` — model kecepatan yang sama dengan karakter |
| First person | Mata di `y = 1,68`, look-at searah yaw karakter; model disembunyikan |

### 6.5 Fisika arena Play Character

| Parameter | Nilai | Catatan |
|---|---|---|
| Ukuran sel blok | 1 unit | Blok = kubus 1×1×1, posisi integer |
| Arena | `x, z ∈ [−11, 11]`; `y ∈ [0, 10)` | ±23 × 23 sel, tinggi 10 |
| Walk / Run | 3,6 / 7,4 m/s | input kamera-relatif |
| Akselerasi pemain | 16 m/s² | sama untuk semua arah |
| Gravitasi | 24 m/s² | arcade, bukan 9,81 |
| Kecepatan lompat | 7,6 m/s | tinggi puncak `v²/2g = 7,6²/48 ≈ 1,20` unit, lama udara `2v/g ≈ 0,63` s |
| Radius / tinggi pemain | 0,34 / 1,72 | collision AABB per sel |
| Kamera game | jarak 5,4 · tinggi 1,9 | perspektif fov 65 |

Penempatan blok memakai **face normal** hasil raycast: `cell = floor(hitPoint ± normal × 0,5)`,
lalu ditolak bila sel sudah terisi (`cellKey = "x,y,z"`) atau di luar arena. Data disimpan
setelah setiap aksi; loader memvalidasi tipe, batas arena, dan duplikat sebelum menerima data.
Arena awal berisi 11 blok (alas 3×3 + tumpukan 2) agar dunia tidak terasa kosong.

### 6.6 Transisi situs ↔ game

| Tahap | Durasi |
|---|---|
| Cover mulai pekat → scene swap | 320 ms (cover `opacity` 300 ms) |
| Cover memudar | pada 420 ms |
| Kunci scroll | selama mode `game` |
| Kembali | `toStation(PLAY_STATION)` setelah unlock |

### 6.7 Ukuran responsif

- `html { font-size: clamp(14px, 0.45vw + 9px, 26px) }` → 390 px = 14 px, 1440 px ≈ 15,5 px,
  3840 px = 26 px.
- Card normal `min(92vw, 36rem)`; card lebar (Services) `min(94vw, 58rem)` dengan
  `lg:grid-cols-3` → satu baris muat tiga layanan.
- Setiap section `min-h-[110vh]` supaya karakter selalu punya ruang berhenti di tengah card.
- Canvas `dpr={[1, 2]}` membatasi biaya piksel di layar 4K.

### 6.8 Referensi perhitungan gerak

Model di atas **bukan simulasi biomekanik penuh**; parameter literatur dipetakan ke satu
variabel `speedNorm` (0–1) untuk menghasilkan gerak yang plausibel dan bebas foot-sliding.

| Referensi | Dipakai untuk |
|---|---|
| Perry J, Burnfield JM. *Gait Analysis: Normal and Pathological Function*, 2nd ed. Slack, 2010. | Pembagian stance/swing berjalan (±60/40) dan puncak fleksi lutut saat swing (±60°). |
| Novacheck TF. *The biomechanics of running.* Gait & Posture 7(1):77–95, 1998. | Fase stance lari (±40%), swing lebih panjang, fleksi lutut swing dalam (±100–120°), lean badan. |
| Weyand PG, Sternlight DB, Bellizzi MJ, Wright S. *Faster top running speeds are achieved with greater ground forces not more rapid leg movements.* J Appl Physiol 89(5):1991–1999, 2000. | Frekuensi langkah cenderung mendatar; kecepatan lebih ditentukan panjang langkah → cadence dibatasi `MAX_CADENCE = 3,3` siklus/s. |
| Cavanagh PR, Kram R. *Stride length in distance running: velocity, body dimensions, and added mass effects.* Med Sci Sports Exerc 21(4):467–479, 1989. | Panjang stride naik terhadap kecepatan → interpolasi `STRIDE_WALK 1,6` → `STRIDE_RUN 3,4`. |
| [three.js CatmullRomCurve3](https://threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3) | Kurva path, `tension`, `getPointAt`, `getTangentAt`. |
| [Lenis](https://github.com/darkroomengineering/lenis) | `scrollTo(target, { duration, easing })` dan perilaku `lerp: 0.09, smoothWheel: false`. |
| [React Three Fiber — hooks](https://r3f.docs.pmnd.rs/api/hooks) | `useFrame` delta (di-clamp 50 ms) dan `useThree` untuk kamera/ukuran. |
| [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) | Aim kamera game; fallback `freeAim` bila lock ditolak. |

---

## 7. Data & sumber

Seluruh copy dan angka berada di `src/content/id.json` dan `src/content/en.json`; tidak ada data
yang di-hardcode di komponen.

### 7.1 Sumber

| Sumber | Isi yang dipakai |
|---|---|
| Dokumen/deck resmi PT Cartenz Technology Indonesia | Profil perusahaan, portofolio proyek, sertifikasi, capaian, daftar klien. |
| Website resmi [cartenz.co.id](https://cartenz.co.id) | Posisi Cakrawala sebagai unit IT consulting, alamat Wisma Bumiputera Lt. 9 (Kav. 76), kanal kontak. |
| `PLAN.md` §3 dan §8 | Pemetaan 12 blok ke data nyata dan keputusan editorial (tahun 2014, alamat, warna brand, bahasa default). |

### 7.2 Data yang ditampilkan

| Klaim | Nilai | Dipakai di |
|---|---|---|
| Berdiri sejak | 2014 (“12 tahun berkarya”) | Hero, About, Numbers |
| Pemerintah daerah | 200+ | Numbers, Market |
| Kementerian/lembaga & institusi internasional | 15+ | Numbers |
| NIB tervalidasi (migrasi OSS 2.0) | 15,4 juta+ | Numbers, Signature |
| Proyek unggulan nasional | 15 | Numbers |
| Aplikasi Non-SAP PERURI dipelihara | 5 | Numbers, Services |
| PMQA OSS 2.0 | 2024–2026, 5 modul, KBLI 2020 → 2025 | Signature |
| Sertifikasi | BSSN, ISO 9001, ISO 27001, PSE | Credibility |
| Teknologi | Power Platform, Power BI, ARIS 10, BPMN 2.0, ISO/IEC 11179, RACI | Credibility |
| Kontak | +62 815-1941-5874 · Wisma Bumiputera Lt. 9, Jl. Jend. Sudirman Kav. 76, Jakarta 12920 | Contact, Footer |
| Email | `hello@cartenz.co.id` | Contact |

Catatan kejujuran data:

- Nomor/angka proyek berasal dari materi internal Cartenz dan tidak diverifikasi ulang secara
  independen oleh pengembang situs.
- Email `hello@cartenz.co.id` adalah alamat placeholder sampai alamat resmi dikonfirmasi
  (tercatat di `PLAN.md` §8).
- Logo mitra, kementerian, dan lembaga adalah merek milik masing-masing pemegangnya, ditampilkan
  sebagai referensi portofolio.
- Peta tidak memakai tile provider; Contact memakai tautan “Lihat di Google Maps”.

### 7.3 Persistensi di browser

| Key | Isi | Ditulis oleh |
|---|---|---|
| `cakrawala-play-world-v1` | Array blok `{ x, y, z, kind }` | `src/game/store.ts` |
| `cakrawala-lang` | `"id"` atau `"en"` | `src/lib/i18n.tsx` |

Tidak ada backend, analytics, atau cookie. Form kontak membuka aplikasi email pengunjung
(`mailto:`), sehingga tidak ada data yang dikirim ke server.

---

## 8. Menjalankan & build

Prasyarat: Node.js 24 (sama dengan workflow deploy) dan npm.

```bash
npm install
npm run dev -- --port 5199
# buka http://localhost:5199/cakrawala-web-profile/
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server Vite (base path tetap `/cakrawala-web-profile/`) |
| `npm run build` | `tsc -b` + `vite build` → `dist/` |
| `npm run preview` | Pratinjau hasil build |
| `npm run lint` | oxlint |

Base path diatur di `vite.config.ts` dan juga dipakai `index.html` (favicon/OG). Jika repo
diganti nama, ubah `base` agar aset 3D (`models/`, `logo/`) tetap termuat.

### Deploy

`.github/workflows/deploy.yml` berjalan pada setiap push ke `main` (atau manual
`workflow_dispatch`): `npm ci` → `npm run build` → upload `dist/` → `actions/deploy-pages`.
Aktifkan sekali di **Settings → Pages → Source: GitHub Actions**.

### QA

Skrip memakai `playwright-core` dengan Microsoft Edge sistem (Windows) dan mengharapkan dev
server di `http://localhost:5199/cakrawala-web-profile/`. Screenshot ditulis ke `shots/`
(di-ignore git).

```bash
node scripts/shot.mjs       # 5 viewport: 390 / 1440 / 1920 / 2560 / 3840
node scripts/verify2.mjs    # gait + shadow, wheel-up snap, jump/break, persistensi reload
node scripts/play-qa.mjs    # snap wheel, 3 kolom services, pointer lock, place, Esc → checkpoint
```

Yang diperiksa `play-qa.mjs`: delta scroll terhadap pusat stasiun = 0, `grid-template-columns`
services = 3, Pointer Lock aktif, blok bertambah setelah klik kanan, dan `scrollY` kembali ke
stasiun Play setelah `Esc` tanpa kehilangan data.

---

## 9. Atribusi

| Aset / library | Lisensi |
|---|---|
| React, React DOM, Vite, Tailwind CSS | MIT |
| three.js, @react-three/fiber, @react-three/drei | MIT |
| Zustand, Lenis | MIT |
| Lucide | ISC |
| Model “Eric Rigged 001” — Renderpeople (via free3d.com) | **Personal Use License** |
| Logo Cakrawala, screenshot, dan data proyek | Milik PT Cartenz Technology Indonesia |
| Logo mitra/kementerian | Milik masing-masing pemegang merek |

> **Catatan lisensi model:** “Eric Rigged 001” dirilis dengan *Personal Use License*, bukan
> lisensi komersial. Untuk penggunaan komersial jangka panjang, karakter ini sebaiknya diganti
> dengan model berlisensi komersial (atau model internal Cartenz). Detail tercatat juga di
> Footer → Tribute & Atribusi, bersama library lain yang dipakai.

Daftar tribute di UI bersifat wajib: setiap penambahan atau penghapusan aset/library harus
disertai pembaruan teks `footer.tribute` di `src/content/id.json` dan `en.json`.
