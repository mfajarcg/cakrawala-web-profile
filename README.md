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
| Checkpoint snap | Satu gesture wheel/arrow key = satu stasiun. Scroll selalu berhenti di tengah konten stasiun. |
| Kamera | Orthographic isometrik yang mengikuti karakter di tengah pane 3D dengan akselerasi/de-selerasi. |
| First-person | Tombol PoV mengganti kamera ke perspektif mata karakter (tinggi 1,68 unit). |
| Play Character | Tombol di stasiun 9 memudarkan situs lalu berpindah ke mode main. Arenanya bukan ruang baru: blok dibangun di tanah yang sama dengan jalur karakter, jadi hasil bangunan tetap terlihat saat kembali ke situs. |
| Exit | `Esc` bertahap: Esc pertama melepas pointer lock (kursor bebas, dunia tetap berjalan), Esc kedua membuka menu jeda, Esc ketiga keluar ke checkpoint Play. Blok yang dibangun tetap ada. |
| Tribute | Setiap library/aset yang dipakai dicatat di blok Footer → Tribute & Atribusi. |

Dua lapisan yang harus dipahami:

```
DOM  (scroll normal, 11 section min-h 110vh, konten langsung di kolom kiri)
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
  kedua mode: World + PathRibbon + Stations + Arena + Character
  site mode: + CameraRig (ortho follow / first person)
  game mode: + GameScene (player, kamera, raycast) — DOM disembunyikan
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
| State | Zustand | 5.1 | Store journey (`progress/target/activeStation/pov`) dan game (`mode/cover/paused/blocks/selected`) |
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
│  └─ logo/                    # logo Cakrawala hitam & putih (SVG)
│                              # (tanpa aset model eksternal — karakter dibuat prosedural)
├─ src/
│  ├─ App.tsx                  # shell: World + DOM blocks + HUD + fade
│  ├─ main.tsx
│  ├─ index.css / styles/tokens.css   # Tailwind v4 + token warna + skala font
│  ├─ blocks/                  # 12 blok DOM
│  │  ├─ Nav.tsx               #   01 Navigation (sticky, ID/EN, 11 link + highlight aktif, hamburger <xl;
│  │  │                        #     mobile: subtitle & label pill disembunyikan <sm agar header muat 360px)
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
│  │  ├─ Panel.tsx             #   section pembungkus: data-station, kolom konten kiri
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
│  │  ├─ runLoop.ts            # bentuk kurva lutut/siku lari dari loop referensi Sketchfab
│  │  ├─ Stations.tsx          # prop voxel tiap stasiun + pohon
│  │  ├─ FutureCity.tsx        # Jakarta 2045: menara neon, Monas, billboard, skytrain, mobil terbang
│  │  ├─ Robots.tsx            # 6 robot NPC idle/wander + lambai & bubble sapa
│  │  └─ shared.ts             # characterPos/characterYaw/gait + atmoMix + adventureSpawn
│  ├─ game/
│  │  ├─ store.ts              # mode, cover, paused, blocks, selected, adventure + localStorage
│  │  ├─ meaning.ts            # hukum fondasi, scanMeaning, cascade, kunci renungan
│  │  ├─ robots.ts             # definisi 6 NPC, radius sapa, daftar disapa persisten
│  │  ├─ audio.ts              # bunyi sintetis WebAudio + mute persisten
│  │  ├─ layout.ts             # ARENA_ORIGIN (stasiun Play) + arenaRefs
│  │  ├─ Arena.tsx             # blok yang dirender di dunia journey, kedua mode
│  │  ├─ GameScene.tsx         # loop pemain, kamera, raycast, collision, place/break
│  │  ├─ GameHud.tsx           # Control Deck, menu jeda, material 1–5, hapus/keluar
│  │  ├─ RunPanels.tsx         # gate masuk/difficulty/timeout, timer, hasil + papan skor
│  │  ├─ leaderboard.ts        # difficulty, batas waktu, skor localStorage, fmtClock/fmtTime
│  │  ├─ GameFade.tsx          # cover hitam 300 ms saat swap scene
│  │  └─ input.ts              # state input bersama DOM ↔ game loop
│  ├─ lib/i18n.tsx             # LanguageProvider, dictionary id/en, persist
│  ├─ lib/theme.ts             # store malam/siang (default night), applyTheme, persist
│  └─ content/id.json, en.json # seluruh copy + data nyata, satu sumber per bahasa
├─ scripts/
│  ├─ shot.mjs                 # screenshot 5 viewport → shots/
│  ├─ layout-qa.mjs            # uji split kiri/kanan, rail, PiP drag/expand/persist, breakpoint
│  ├─ verify2.mjs              # uji gait, wheel-up, jump/break, persistensi
│  ├─ play-qa.mjs              # uji snap, kolom services, pause/hapus/resume, Esc bertahap
│  ├─ jump-qa.mjs              # uji CMJ per fase + tribute + overflow 390
│  ├─ meaning-qa.mjs           # uji loop falsafah tumpukan blok
│  ├─ touch-qa.mjs             # uji swipe mengunci checkpoint di layar sentuh
│  ├─ mobile-play-qa.mjs       # uji kontrol Play sentuh: tap-aim, place/break, HUD bebas overlap
│  ├─ gait-qa.mjs              # 10 pose beku lari + 3 jalan (kamera samping) + live run
│  ├─ sk-loop-extract.mjs      # sampel loop lari Sketchfab via Viewer API → matriks tulang
│  └─ sk-loop-gen.mjs          # regenerasi runLoop.ts dari matriks hasil extract
└─ PLAN.md                     # rencana produk & catatan data
```

---

## 4. Komponen & alur state

### 4.1 `App.tsx` — dua dunia, satu state

- `<JourneyController />` dan `<World />` selalu ter-mount.
- 11 blok DOM dibungkus `<div aria-hidden={inGame}>` ber-`relative z-10 md:w-[46%]`; saat mode
  game, div diberi `opacity-0 pointer-events-none` sehingga canvas mengambil alih. Karena
  pointer-events diwariskan, section TIDAK boleh menyetel `pointer-events-auto` sendiri —
  bila tidak, konten tak terlihat (opacity-0) tetap menelan tap di mode game.
- Layout split: kolom substansi kiri 46%, pane 3D kanan 54% (desktop ≥768px); di mobile
  konten lebar penuh dan dunia 3D melayang sebagai jendela PiP yang bisa digeser/diperbesar.
- Yang benar-benar berganti antar-mode hanya kamera (`CameraRig` ↔ `GameScene`) dan HUD;
  dunia, karakter, dan blok arena tetap dirender dari scene yang sama.
- `<GameHud />` hanya dirender saat `mode === 'game'`; `<GameFade />` selalu ada sebagai cover.
- Aturan brand: marka hitam `logo/cakrawala-white.svg` di Hero dan Footer selalu duduk di atas
  plat `bg-white` rounded-2xl (border `#101418]/10` + shadow lembut), bukan langsung di atas
  kertas situs atau panel gelap — SVG-nya berlatar transparan. (`cakrawala-black.svg` adalah
  marka putih untuk latar gelap.)

### 4.2 `JourneyController` — checkpoint snapping

| Aturan | Nilai |
|---|---|
| Posisi scroll yang “benar” | `el.offsetTop + (el.offsetHeight − innerHeight) / 2` |
| Durasi satu hop | `KEY_TRAVEL_S = 1.9 s`, easing `easeInOutCubic` |
| Kunci selama hop | durasi + 250 ms; wheel/scroll diabaikan |
| Ambang wheel | akumulasi 16 px |
| Jendela satu gesture | reset akumulasi setelah 240 ms tanpa wheel |
| Settle setelah scroll manual | 200 ms idle; sentuh menunggu momentum benar-benar habis |
| Swipe (layar sentuh) | satu gestur = minimal satu checkpoint searah arah swipe (absolut dy ≥ 24 px); momentum tidak pernah dilawan mundur; `touchstart` membatalkan hop yang sedang berjalan |
| Toleransi “sudah di tengah” | 10 px — checkpoint berhenti tepat di tengah stasiun, bukan “cukup dekat” |
| Guard anti-loop | berhenti jika jarak ke posisi snap terakhir < 24 px |
| Peta scroll → progress | piecewise-linear: `stationTop(i) → i/(N−1)`, di antara dua top diinterpolasi linear; di luar rentang di-clamp 0/1. Karena itu `progress` (dan posisi karakter) berhenti persis di stasiun, tanpa drift sub-pixel |
| Cache `stationTops()` | di-invalidate oleh listener `resize` **dan** perubahan `document.scrollHeight` (ganti bahasa/font mengubah tinggi panel); fallback bagi hasil scroll bila elemen stasiun belum ada |
| Arrow key saat hop | hanya satu hop diantrikan (`pending`), karakter selalu berjalan tiap etape |
| Wheel di fase capture | `window.addEventListener('wheel', …, { capture: true, passive: false })` + `stopPropagation()`. Listener wheel Lenis sendiri (`smoothWheel: false`) memanggil `animate.stop()` pada **setiap** event wheel; tanpa capture, notch kedua dari gesture alami mematikan hop yang sedang berjalan (halaman membeku 2–3 px setelah stasiun pertama) |
| Normalisasi `deltaMode` | 1 (baris) → ×33 px; 2 (halaman) → ×`innerHeight`. Mouse line-mode (±3/baris) tetap melewati ambang 16 |
| Heal kunci | `lockLive(now)`: kunci dilepas bila hop sudah berjalan > durasi + 700 ms dan `lenis.isScrolling` false — kunci tidak pernah nyangkut permanen |
| Resync kursor | `\|scrollY − stationTop(cursor)\| > 64` → kursor = `nearestIndex()` sebelum menghitung arah notch berikutnya |
| Lompatan ≥ 2 stasiun | `scrollBridge.toStation`: `lenis.scrollTo(top, { immediate: true, force: true })` — panel mendarat seketika sehingga urutan teleport berangkat dari stasiun asal sesungguhnya, bukan dari tengah animasi |

Navigasi Nav/Hero/Footer tidak memakai `scrollIntoView` (bentrok dengan animasi Lenis), tetapi
memanggil `jumpTo(id)` → `scrollBridge.toStation(index)`.

### 4.3 Store

| Store | State | Ditulis oleh | Dibaca oleh |
|---|---|---|---|
| `journey/store.ts` | `progress`, `target`, `activeStation`, `pov` | controller (`setTarget`), driver (`tick`) | Character, CameraRig, Nav |
| `game/store.ts` | `mode`, `cover`, `paused`, `blocks`, `selected`, `gate`, `difficulty`, `remaining`, `finished`, `result` | PlayMoment, HUD, GameScene, RunPanels | App, World, GameScene |

`activeStation = round(progress × (STATION_COUNT − 1))`, dipakai untuk highlight section aktif
di nav (`aria-current="page"` + garis emas beranimasi) dan titik fokus kamera.

### 4.4 Lapisan 3D

| File | Peran |
|---|---|
| `World.tsx` | Satu `<Canvas dpr={[1,2]}>`. Ground + grid + path + stasiun + arena + karakter selalu ada; kamera berganti sesuai mode. Mode situs: `OrthographicCamera` (16,16,16) + CameraRig. Mode game / first-person: `PerspectiveCamera` fov 65. |
| `path.ts` | `CatmullRomCurve3(STATIONS, closed=false, 'catmullrom', tension=0.15)`, di-cache. `getPointAt` / `getTangentAt` untuk posisi & arah hadap. |
| `Character.tsx` | `CharacterDriver` (gerak longitudinal, yaw, fase gait, cut teleport) + `TeleportBeams` (sinar & cincin) + `ConsultantVisual` (karakter konsultan low-poly prosedural dari geometri Three.js, pose gait/lompat, bob pelvis, blob shadow). |
| `Stations.tsx` | Prop voxel per stasiun (gerbang, rak layanan, papan angka, war room, papan tanda Play, resepsionis, gerbang akhir) + pohon tersebar. Arena tidak punya slab sendiri. |
| `game/Arena.tsx` | Blok voxel pemain, dirender di dunia journey pada kedua mode lewat `ARENA_ORIGIN`; menyediakan plane raycast tak terlihat untuk pasang/hancurkan. |
| `shared.ts` | `characterPos`, `characterYaw`, `gait {phase, speedNorm, move01, moving, lift}`, `gaitNorm()`/`RUN_SPEED` dan `cadenceFor()` — dipakai bersama situs dan game. |

### 4.5 Mode Play Character

1. `PlayMoment` memanggil `useGame.enter()`.
2. `swap()` menyalakan cover, menunggu **320 ms** agar cover pekat, lalu mengganti `mode`.
3. `scrollBridge.lock(true)` menghentikan Lenis dan menyembunyikan DOM.
4. Tidak ada scene baru: `Arena` sudah dirender di dunia journey pada stasiun Play. `GameScene`
   hanya menambahkan kontrol pemain, kamera orang ketiga (jarak 5,4 · tinggi 1,9), raycast
   pasang/hancurkan, dan collision grid. Karakter memakai `characterPos` yang sama, jadi ia
   mulai dari tempat ia berhenti di mode situs.
5. **Esc bertahap.** Saat pointer terkunci, Esc pertama hanya melepas lock: `lockState.escAt`
   menandai rilis sukarela sehingga `pointerlockchange` tidak menjeda — kursor bebas, dunia tetap
   berjalan. Esc kedua membuka menu jeda: loop berhenti, semua tombol bisa diklik. Esc ketiga di
   menu jeda memanggil `exit()`: cover 320 ms → mode `site` → `scrollBridge.toStation(PLAY_STATION)`.
   `lockState.lastLostAt` (300 ms) mencegah Esc yang sama melakukan dua aksi; kehilangan lock tak
   sukarela (mis. alt-tab) tetap menjeda agar jam tantangan tertahan.
6. `Lanjutkan` tidak mengunci kursor lagi; klik dunia mengunci ulang sesuai permintaan
   (bila lock ditolak, aim jatuh ke `freeAim`).
7. Setiap perubahan blok langsung disimpan ke `localStorage['cakrawala-play-world-v1']`, dan
   blok itu tetap terlihat di stasiun Play setelah keluar maupun setelah reload.
8. **Lapisan falsafah.** Lima jenis blok adalah lima lapis sistem hidup — I Fondasi /
   Roadmap & Blueprint (server), II Karya / Platform Development (cloud), III Mutu /
   PMQA (doc), IV Perubahan / Change Management (laptop), V Rawat /
   Operation/Maintenance (gear). Urutan `LAYERS` = `BLOCK_KINDS`, jadi slot hotbar N
   selalu sama dengan lapis N. Hukum fondasi
   (`isSupported`) menolak blok melayang; klik sisi vertikal berarti "teruskan di atasnya";
   mencabut fondasi meruntuhkan yang bertumpu (`cascade`). `scanMeaning` mengukur run
   terpanjang berurutan dari tanah (tangga makna HUD 0–5); menyelesaikannya memunculkan
   mercusuar + kartu "Cakrawala terbuka" + cahaya fajar permanen, dan berdiri di ketinggian
   ≥4 membuka vista. Enam aforisme peristiwa terkoleksi sebagai **Renungan** di menu jeda.
   Bunyi sintetis WebAudio (`audio.ts`, tanpa dependensi baru) menyertai tiap peristiwa
   terlihat; satu tombol mute di kanan atas HUD, aktif default, persisten. Panel Play di
   laman utama menyebut tujuan ini secara eksplisit (`play.ctaNote`) dan menampilkan
   ladder target berurutan I–V beserta warna blok, sehingga pemain tahu apa yang harus
   dibuat sebelum masuk ke arena.

Kontrol desktop ditampilkan di **Control Deck** kiri bawah: `WASD`/panah + `Shift`, `Space`
lompat, `Klik kiri` hancurkan, `Klik kanan` pasang, `1–5` pilih material, dan `Esc` dengan
catatan “Esc: kursor → jeda → keluar”. Tombol **Hapus semua** memakai konfirmasi dua tahap.

Di layar sentuh **tidak ada pointer lock** (lock akan me-retarget semua `click` ke kanvas dan
mematikan tombol HUD). Sebagai gantinya: **ketuk di mana pun untuk membidik** — cincin amber
muncul tepat di titik ketuk (`input.pointAim` + `setTapAim`), menggantikan crosshair tengah;
**geser sisi kanan untuk melihat** (LookPad membedakan tap vs geser dengan ambang 6 px, dan
geser mengembalikan aim ke tengah). Joystick kiri untuk bergerak, kolom aksi kanan
(Lompat/Hancurkan/Pasang/Lari), hotbar material berupa strip vertikal kiri yang bebas overlap,
dan tombol Menu membuka panel jeda yang sama. Semua tombol HUD memakai pola `press()`
(`onPointerDown` + `onClick` hanya untuk keyboard) agar tetap hidup dalam keadaan apa pun;
LookPad diletakkan di bawah kluster HUD (`-z-10`) supaya tidak mencegat ketukan tombol.

### 4.6 Tantangan berwaktu & papan skor

Setiap masuk Play, gate masuk (`RunPanels.EntryGate`) menawarkan **Lanjutkan tantangan**
(bila run berwaktu belum selesai dan masih tersimpan) atau **Tetap masuk (bebas)** bila
tidak ada run aktif / run sebelumnya sudah selesai — masuk bebas tidak memunculkan notif
apa pun. **Mulai dari awal** membuka gate difficulty: Easy 10:00, Medium 5:00, Hard 2:00,
Epic 0:30 (`TIME_LIMIT` di `leaderboard.ts`); memilih difficulty mengosongkan arena dan
menyalakan countdown.

- **Timer** (`RunTimer`, chip di kartu HUD kiri) hanya berjalan bila `runTicking(state)`
  benar: mode game, tidak jeda, tidak ada gate/modal/hasil, difficulty terpilih, belum
  selesai. Jeda, keluar ke situs, atau modal apa pun **menahan** timer; sisa waktu dan
  blok disimpan ke `cakrawala-run-v1` tiap detik penuh dan saat jeda/keluar, sehingga
  masuk lagi melanjutkan dari detik yang sama.
- **Menang**: `scanMeaning` progress 5 dengan difficulty aktif mencatat
  `elapsed = TIME_LIMIT − remaining`, membandingkan dengan `bestTime()` (rekor tercepat
  global semua difficulty), lalu membuka panel hasil: waktu tercatat, badge mahkota
  "Rekor baru" bila lebih cepat, input nama (Enter = simpan), dan papan skor 5 teratas
  setelah simpan. Skor persist di `cakrawala-scores-v1` (maks 50, urut waktu naik).
  Deploy berupa situs statis tanpa backend, jadi "server" skor adalah penyimpanan
  browser ini; tidak ada data yang dikirim ke mana pun.
- **Waktu habis**: gate `timeout` (alertdialog) lalu **restart otomatis** setelah 1,8 s
  dengan difficulty sama, arena kosong, dan clock penuh lagi.
- Tombol trofi di kluster HUD kanan membuka papan skor 10 teratas kapan saja; Esc
  menutupnya lebih dulu sebelum aksi jeda/keluar biasa.
- Bunyi baru: `timeWarn` (tiap detik ≤5), `timeout` (slide saw + noise), `record`
  (empat nada triangle) — semuanya tetap hormat pada mute.

### 4.7 Jelajah Bebas — Jakarta 2045

Tombol **Jelajah** di Nav (dan tombol sekunder di PlayMoment) masuk ke mode
`adventure`: flag boolean di atas `mode: 'game'`, sehingga seluruh mesin Play
(kamera, collision, input, HUD, jeda, Esc bertahap) dipakai ulang tanpa mode ketiga.
Bedanya: mulai di posisi karakter saat itu (bukan arena), bebas berjalan ke seluruh
dunia, dan tidak ada pasang/hancurkan blok.

- **Kota malam** (`three/FutureCity.tsx`): 22 menara berjendela instanced (satu draw
  call) menghadap jalur pejalan, crown neon + beacon atap, Monas bercahaya, tiga
  billboard holo (JAKARTA 2045 / CAKRAWALA / NUSANTARA AI), skytrain layang melingkar,
  10 mobil terbang berjejak neon pada 5 lane, bintang, dan dome gradient horizon.
  Semua neon memakai `meshBasicMaterial toneMapped={false} fog={false}` agar menyala
  siang maupun malam; `Atmosphere` menulis `atmoMix.night` untuk melerp langit,
  cahaya bulan, aspal, grid, dan pita jalur — kini mengikuti tema malam/siang
  (§4.8) di **semua** mode, bukan hanya adventure.
- **Kamera jelajah**: fov 75 (vs 65), jarak 7,6 / tinggi 2,5 (vs 5,4 / 1,9), pitch
  awal 0,02 supaya skyline, mobil terbang, dan Monas tetap dalam frame.
- **Zoom jelajah** (`game/input.ts` `roamZoom`): scroll mouse atau tombol ikon
  ZoomIn/ZoomOut di tepi kanan HUD mengalikan jarak/tinggi boom 0,4×–2,6×
  (tombol melangkah 1,25×, wheel `exp(dy·0,0016)` dengan deltaMode dinormalisasi).
  Target di-damp (λ 9) oleh loop lalu tetap tunduk pada boom anti-tembus, jadi
  memperkecil tidak pernah menembus menara. Hanya adventure: jeda/gate/result
  mengabaikan wheel (scroll milik menu jeda), tombol sembunyi saat jeda, dan
  tiap masuk jelajah mulai dari 1×. Mode Play tidak terpengaruh.
- **Robot NPC** (`game/robots.ts` + `three/Robots.tsx`): 6 robot voxel (BIMA-07,
  SRI-11, GATOT-3, MERAK-5, NUSA-21, KOMODO-8) ber-idle wander di tiap etape.
  Mendekat ≤2,4 m memunculkan prompt **Sapa** (tombol `E` / ketuk di sentuh); robot
  menghadap pemain, melompat kecil, melambai, dan membuka bubble dialog
  (`Html`, di-clamp ke viewport lewat `calculatePosition`). Daftar robot yang sudah
  disapa persist di `cakrawala-npc-v1` dan ditampilkan sebagai `n/6` di kartu HUD.
- **Lompat etape**: kartu HUD kiri memuat 11 chip stasiun; menekan chip memakai
  grammar teleport yang sama dengan lompatan situs (sinar dari atas, 0,95 s) lalu
  mendarat 1,6 m di depan stasiun. Keluar (Esc bertahap / menu) mengembalikan
  situs ke etape terdekat dari posisi karakter, bukan selalu Play.
- HUD adventure menyembunyikan hotbar/crosshair/trofi/hapus; Control Deck dan
  kontrol sentuh bertukar ke aksi jelajah (Lompat, Sapa, Lari); menu jeda menampilkan
  jumlah robot disapa, bukan hapus arena.

### 4.8 Tema malam/siang (default malam) + panel gelap

`src/lib/theme.ts` — store zustand `{ night, toggle }`, persist
`localStorage['cakrawala-theme-v1']` (`'night'`/`'day'`, absen = **night**).
`applyTheme(night)` menulis `document.documentElement.dataset.theme` +
`style.colorScheme`; dipanggil sekali di tingkat modul sehingga muat pertama
tidak pernah flash siang, lalu disinkronkan `useEffect` di `App`.

- **Tombol tema ada di tiga tempat**: Nav kanan (ikon + label Malam/Siang, juga baris
  di menu mobile), HUD game pojok kanan-atas (ikon saja, sebelah mute), sehingga
  browsing normal, tantangan, dan Jelajah Bebas semuanya bisa berganti tema.
- **Lapisan CSS gelap** (`index.css`, *unlayered* agar menang atas Tailwind
  `@layer utilities`): di bawah `html[data-theme='night']` semua permukaan
  `bg-white` → `#141d27`, kertas body → `#0b1118`, PiP → `#0f1720`, kartu tribute
  → `#16202b`; border hitam transparan → putih transparan; seluruh tinta
  `text-[#101418]/α` → `rgba(226,234,240,…)`; biru brand → lift `#7fd0ff`/`#8fc9e8`,
  emas teks → `#ffd075`; scrollbar, placeholder, focus ring, dan gradien
  `.journey-col` ikut palet malam. Pengecualian sengaja: plat logo
  (`.logo-plate` di Hero/Footer/Nav) tetap putih, dan teks `text-[#101418]`
  polos di atas tombol emas tetap gelap agar kontras terjaga. Varian
  `hover:`/`focus:` dideklarasikan ulang di lapisan malam karena override base
  akan menang atas varian Tailwind bila tidak disebut ulang.
- **Dunia 3D**: `Atmosphere` men-damp `atmoMix.night` ke tema (λ 1,4) di semua mode;
  ref malam diinisialisasi dari tema agar tidak ada flash siang saat masuk game.
  Kamera isometrik turun 6 unit saat malam (`ISO_OFFSET.y − 6·night`) supaya
  skyline lebih terbaca; `OrthographicCamera near={0.1}` (bukan −100) agar menara
  di belakang/dekat kamera tidak meng-oklusi karakter. Jendela menara kini
  di-instance di **kedua** sisi z (jalur orbit melihat sisi luar, jelajah melihat
  sisi dalam).
- **Kamera third-person anti-tembus** (`GameScene.tsx` + `three/shared.ts`
  `cameraColliders`): grup solid Arena, badan menara FutureCity, dan props stasiun
  mendaftar diri via `useEffect`. `boomCamera` menarik kamera ke
  `max(0,9, hit.distance − 0,4)` sepanjang ray kepala→kamera; `placeBoom` memakai
  hysteresis yaw (ikuti yaw bila clearance ≥ 0,9·horiz, cari 8 arah alternatif bila
  < 0,85) sehingga kamera tidak pernah duduk di dalam paviliun/menara saat
  jelajah maupun tantangan.
- **Garis neon tepi jalur** (`World.tsx` `NeonPathEdges`, hanya malam): dua pita
  ribbon offset lateral ±1,22 m dari kurva jalur (lebar 0,44 m, y 0,05), UV-x =
  meter terakumulasi. Shader additive: core `smoothstep(0.16, 0.03, d)` + glow
  `pow(1−d, 2)` + comet berjalan `fract(uv.x/26 − t·0.11)` (energy 0,6→1,8) + fog
  jarak `1−smoothstep(45, 130, depth)`; warna `#18b7ff` / core `#c9f6ff`, dikali
  `atmoMix.night` sehingga siang bersih. Material dibuat imperatif
  (`new THREE.ShaderMaterial` di `useMemo` + prop `material=`): wiring JSX
  `<shaderMaterial uniforms={…}>` terbukti meninggalkan uniforms tak terhubung
  (render hitam tanpa error). `#include <tonemapping_fragment>` dan
  `<colorspace_fragment>` wajib di dalam `main()` dan di awal baris.
  `FutureCity StreetGlow` (dua garis cyan jalan kota) kini juga dikali
  `atmoMix.night` — sebelumnya opacity tetap 0,45 sehingga bocor ke siang.
- **Neon malam karakter** (`Character.tsx`): tiap bagian utama (jas, celana, sepatu,
  lengan, telapak tangan, kepala, rambut) dirender dua kali — mesh asli plus *hull*
  anak ber-`MeshBasicMaterial` `#ffcf6e`, `side: BackSide`, `depthWrite: false`,
  `toneMapped: false`. Vertex shader hull mengganti `#include <begin_vertex>` dengan
  `vec3 transformed = vec3( position ) + normal * 0.014`, sehingga siluet menyala
  1,4 cm di luar mesh. Hull hanya `visible` saat `atmoMix.night > 0.02`, dengan
  opasitas `0,95 × atmoMix.night`. Material jas/celana/kulit **tanpa** `emissive`,
  jadi warna karakter di malam identik dengan siang — hanya outline neon yang muncul.

---

## 5. Peta blok → stasiun

| Blok | Komponen | Stasiun | `data-station` | Kolom konten | Posisi path (x, z) |
|---|---|---|---|---|---|
| 01 Navigation | `Nav.tsx` | — (sticky; 11 link semua stasiun, highlight aktif) | — | — | — |
| 02 Hero | `Hero.tsx` | 1 · `hero` | 1 | kiri | 0, 0 |
| 03 Story | `Story.tsx` | 2 · `story` | 2 | kiri | 13, −3,5 |
| 04 Services | `Services.tsx` | 3 · `services` | 3 | kiri | 26, 3,5 |
| 05 Credibility | `Credibility.tsx` | 4 · `credibility` | 4 | kiri | 39, −3,5 |
| 06 Numbers | `Numbers.tsx` | 5 · `numbers` | 5 | kiri | 52, 3,5 |
| 07 Signature | `Signature.tsx` | 6 · `signature` | 6 | kiri | 65, −3,5 |
| 08 Market | `Market.tsx` | 7 · `market` | 7 | kiri | 78, 3,5 |
| 09 About | `About.tsx` | 8 · `about` | 8 | kiri | 91, −3,5 |
| 10 Play Character | `PlayMoment.tsx` | 9 · `play` | 9 | kiri | 104, 3,5 |
| 11 Contact | `Contact.tsx` | 10 · `contact` | 10 | kiri | 117, −3,5 |
| 12 Footer | `Footer.tsx` | 11 · `footer` | 11 | kiri | 130, 0 |

Badge eyebrow pada kolom konten menampilkan `01 / 11` … `11 / 11` (nomor stasiun, bukan nomor blok).

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
| `JOURNEY_SPEED` | 3,4 unit dunia/s (`maxSpeed = JOURNEY_SPEED / pathLength`) | hop antar checkpoint terasa seperti lari pendek, bukan teleport |
| `JOURNEY_ACCEL` | 2,0 unit dunia/s² | start/stop terasa berbobot |
| `RUN_SPEED` | 4,4 unit dunia/s | ambang “lari penuh” untuk normalisasi gait (sama dengan game) |
| `TURN_RATE` | 9 rad/s (damped) | badan berbalik tanpa patah |
| Cut | `\|jump\| > 0,16` | lompatan nav/scrollbar memicu urutan teleport bersinar (bawah), bukan diseret berjalan |
| `turnBrake` | `yawErr > 0,35 rad` → melambat sampai 0 | berbalik 180° = berhenti dulu, lalu jalan |

#### Teleportasi (lompatan tak berurutan)

Bila cut terjadi, driver memainkan urutan 0,95 s (`TP_DUR`, `three/shared.ts`): sinar turun
dari langit di stasiun asal, karakter menyusut-lenyap, kamera whoosh, lalu sinar kedua dan
cincin mengembang di stasiun tujuan saat karakter muncul kembali. Lompatan ≤ 1 stasiun tetap
hop berjalan 1,9 s tanpa sinar.

| Fase | Jendela | Perilaku |
|---|---|---|
| Vanish | 0–0,30 s | skala `1−u²`, naik 0,4 unit, spin 3 rad; blob shadow ikut menyusut |
| Whoosh | 0,30–0,55 s | posisi lerp asal→tujuan `easeInOutCubic`; karakter tersembunyi |
| Materialise | 0,55–0,95 s | skala `easeOutBack` (c1 = 1,70158); cincin tanah radius 0,4→2,6, opacity `(1−u)·0,6` |
| Sinar asal | in 0–0,10 s, out 0,32–0,52 s | tabung terbuka (r 0,62/0,5, tinggi 14) di y=14, `scale.y = env` tumbuh **ke bawah** dari langit |
| Sinar tujuan | in 0,45–0,55 s, out 0,75–0,95 s | envelope sama; pointLight `#ffd9a0` intensitas `env·26`, distance 14 |

Sinar memakai `NormalBlending` — additive washed-out di langit terang `#e9eff3`: outer
`#f2a13c` opacity `0,42·env`, core `#fff7e6` `0,75·env`. Selama urutan seluruh state gait
dinolkan (`move01`, `lift`, `jumpState`, `vy`, …) sehingga rig tidak berstride di udara.
Audio `audio.teleport()`: whoosh noise + tone turun 720→200 Hz, lalu chime naik 240→720 Hz
pada 0,48 s (materialise); tetap hormat pada mute. Masuk Play di tengah urutan membatalkan
teleport di GameScene — driver yang memajukan `teleport.t` hanya hidup di mode situs, tanpa
pembatalan karakter akan membeku mid-vanish (menyusut + spin). Probe QA permanen:
`window.__jdebug = { lenis, lock(), hop(), cursor() }` di JourneyController dan
`window.__consultantDebug = { g }` (group root karakter untuk kamera QA).

### 6.3 Model gait (berjalan & berlari)

Driver hanya menulis `gait.phase`, `speedNorm`, `move01`, `moving`, dan `lift`; rig FBX dipose
tiap frame. Dua normalisasi kecepatan berbeda tugas:

```
speedNorm = gaitNorm(v) = clamp((v − 1,9) / (4,4 − 1,9), 0, 1)   // bentuk kurva jalan→lari
move01    = clamp(v / 0,6, 0, 1)                              // amplitudo stride saat berhenti
```

Plateau 1,9 unit/s menjaga jalan tetap memakai kurva jalan murni (jalan 1,6 m/s → `speedNorm` 0);
tanpa plateau, jalan terlihat seperti setengah lari karena lutut terlipat terlalu dalam.
`move01` harus mengikuti kecepatan tanah nyata, bukan `speedNorm` — kalau tidak, pose jalan
membeku jadi berdiri setiap kali `speedNorm` 0.

**Cadence dikunci ke jarak tempuh** (menghilangkan kaki selip). Stride adalah panjang satu
siklus penuh (dua langkah), dan `phase` maju `2π` per siklus — pasangan yang konsisten:

```
stride  = STRIDE_WALK + (STRIDE_RUN − STRIDE_WALK) × speedNorm   // 1,5 → 3,0 m per siklus
cadence = clamp(worldSpeed / stride, 0,2 … 1,9)                  // siklus/s
phase  += cadence × 2π × dt
```

| Parameter gait | Idle/walk → run | Padanan |
|---|---|---|
| Fase stance | 62% → 40% siklus | jalan ±60% stance, lari ±40% stance |
| Hip contact → toe-off | +0,52 → −0,17 rad (jalan), +0,70 → −0,35 rad (lari) | ayun paha sagittal penuh |
| Puncak knee saat swing | 1,05 → 2,09 rad, puncak di awal swing | ±60° jalan, ±120° lari |
| Knee stance (loading → push) | 0,09 → 0,26 rad (jalan), 0,26 → 0,78 rad (lari) | loading response lalu ekstensi push-off |
| Sudut kaki dunia (ankle) | −0,12 → +0,32 rad (jalan), −0,06 → +0,50 rad (lari); toes-down positif | telapak rata saat midstance, plantar fleksi saat push-off |
| Ayun lengan | berlawanan fase kaki, rentang bahu terpusat: ±0,26 rad jalan → ±0,61 rad lari | tangan hip-pocket → chin, bukan mengambang di depan dada |
| Fleksi siku | 0,35 rad jalan → 1,57 ± 0,375 rad lari (±21° sekitar 90°) | siku ~90° rapat ke rusuk, carriage maskulin (Freelap; Pfaff; Scharl 2024) |
| Abduksi bahu | 0,60 rad idle → +0,07 rad saat lari (sisa A-pose menyusut) | siku rapat ke rusuk, bukan melebar ke samping |
| Pergelangan & jari | telapak pronasi 0,47 rad ke paha; curl jari 0,35–0,85 rad per sendi (rileks) | tangan tidak melebar dan tidak mengepal keras |
| Lean badan | 0,04·sn + 0,22·sn² | condong depan saat lari |
| Busur flight | lerp(reachTO → reachIC, prog) + sin(π·prog)·lerp(0; 0,06)·move01 | tinggi badan kontinu melewati toe-off/contact; double float saat lari |

**Tinggi badan mengikuti kaki penopang**, bukan konstanta:

```
reach(hip, knee) = L_THIGH·cos(hip) + L_SHIN·cos(hip + knee)
support          = max(reach kaki stance)
                   bila flight → lerp(reach(jTO), reach(jIC), flightProg)
                                 + sin(π·flightProg)·lerp(0; 0,06)·speedNorm·move01
soleGap          = HIP_HEIGHT − ANKLE_TO_SOLE − support
bodyY            = −soleGap + lift
```

`jTO`/`jIC` adalah sendi tepat sebelum toe-off dan tepat saat contact berikutnya, jadi busur
flight berangkat dan mendarat pada tinggi penopang yang sama — tidak ada teleport vertikal
di batas stance/swing. Hop terpisah dihapus; busur ini sendiri yang memberi double float.

`L_THIGH = 0,42`, `L_SHIN = 0,422`, `HIP_HEIGHT = 0,932` (= `L_THIGH + L_SHIN + ANKLE_TO_SOLE`),
`ANKLE_TO_SOLE = 0,09` (meter). `soleGap` di atas memastikan sol sepatu menyentuh `y = 0`
saat kaki stance lurus.

**Temuan yang diperbaiki:** blob shadow awalnya diletakkan `y = 0,012`, di bawah permukaan
ribbon (≈0,033), sehingga bayangan tidak pernah terlihat dan karakter tampak melayang.
Sekarang shadow berada di `baseY + 0,045`, skala `1 + lift×0,35`, opacity `0,8 × fade`.

**Carriage lari maskulin (perbaikan terakhir):** lengan bawah dulu melebar ke samping
seperti pose feminin karena hinge siku di-`applyAxisAngle(front, ±ARM_ABDUCT)` di memo,
padahal rotasi pose bahu sudah *membawa* sumbu sendi anak (sumbu dunia anak = rotasi pose
parent × sumbu lokal) — abduksi terhitung ganda (±1,2 rad) memiringkan hinge keluar bidang
sagittal. Hinge kini murni `cross(armDir, front)` tanpa prerotasi; bahu menambah abduksi
+0,07 rad seiring `speedNorm` agar siku rapat ke rusuk, osilasi siku dipersempit ke
±0,375 rad sekitar 90°, dan lean trunk ~15° dipertahankan. Referensi ciri maskulin:
Rubio 2023 (fleksi trunk pria 16,9–24,6% > wanita) dan Scharl 2024 (ROM pinggul/pelvis
wanita lebih besar → sway lateral minimal); keduanya masuk tribute.

#### Proporsi tubuh karakter

Model memakai kanon artistik 7,5 kepala dengan tinggi total `H ≈ 1,76 m`; fraksi segmen
mengikuti Drillis & Contini terhadap tinggi tubuh:

| Segmen | Fraksi `H` | Nilai model | Konstanta |
|---|---|---|---|
| Tinggi total | 1,00 | 1,76 m (7,7 kepala) | — |
| Kepala (dagu→ubun) | 0,130 | 0,229 m | cincin `head` |
| Sendi bahu | 0,80 | 1,402 m | `SHOULDER_Y 0,44` + torso 0,03 |
| Sendi pinggul | 0,53 | 0,932 m | `HIP_HEIGHT` |
| Lutut | 0,29 | 0,512 m | `L_THIGH` |
| Pergelangan | 0,47 | 0,818 m | `L_UPPER + L_FORE` |
| Ujung jari | 0,36 | 0,640 m | telapak 0,178 m |
| Lengan atas | 0,186 | 0,327 m | `L_UPPER` |
| Lengan bawah | 0,146 | 0,257 m | `L_FORE` |
| Telapak kaki | 0,152 | 0,275 m | `loftZ` sepatu |
| Lebar bahu | 0,259 | 0,475 m | `SHOULDER_X ±0,185` + lengan |

Sendi bahu sengaja diturunkan ~1 cm dari 0,808H agar lingkar lengan atas bertemu
*yoke* jaket tanpa celah *armhole*. Sumber: [Body proportions](https://en.wikipedia.org/wiki/Body_proportions)
(kanon 7,5 kepala, Richer/Loomis), [Drillis & Contini 1964](https://www.oandplibrary.org/al/1964_01_044.asp)
(fraksi segmen), [GridMaker figure proportion](https://gridmakerpro.com/grids/artist-guides/figure-proportion/).

### 6.4 Kamera

| Aspek | Perhitungan |
|---|---|
| Isometrik | Orthographic di `(16, 16 − 6·night, 16)`, look-at ke `(x, 0, z)` karakter; `near 0.1`, `far 200` |
| Zoom responsif | `zoom = clamp(min(width, height) / 10, 24, 96)` |
| Tengah pane | Look-at tepat ke karakter; seluruh pane 54% (atau PiP) adalah ruang bebas, tanpa geser lateral |
| First person | Mata di `y = 1,68`, look-at searah yaw karakter; model disembunyikan |
| Boom third-person | ray kepala→kamera terhadap `cameraColliders`; tarik ke `max(0,9, hit − 0,4)`; hysteresis yaw 8 arah (§4.8) |

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
| Origin arena | `(104, 0, −0,5)` — `PLAY.z − 4` | sel lokal `x,z` dipetakan ke dunia sekitar stasiun Play; arena memakai tanah journey yang sama |

Penempatan blok memakai **face normal** hasil raycast: `cell = floor(hitPoint ± normal × 0,5)`,
lalu ditolak bila sel sudah terisi (`cellKey = "x,y,z"`) atau di luar arena. Data disimpan
setelah setiap aksi; loader memvalidasi tipe, batas arena, dan duplikat sebelum menerima data.
Arena awal berisi 11 blok (alas 3×3 + tumpukan 2) agar dunia tidak terasa kosong.

#### Hukum fondasi, pindaian makna, runtuh berantai

Semua aturan makna adalah fungsi murni di `src/game/meaning.ts`:

- **Dukungan:** `isSupported(c, occupied) = c.y === 0 || occupied.has("x,y−1,z")`.
  Penempatan yang gagal dukungan memicu notice `reject` + bunyi deny, dunia tidak berubah.
- **Niat menumpuk:** bila raycast mengenai sisi vertikal (`normal.y === 0`) dan sel di atas
  blok kosong, target naik ke atas blok itu; bila terisi, target tetap sel samping sehingga
  hukum fondasi tetap dapat menolak.
- **Pindaian:** per kolom `(x,z)`, jalan `y = 0…4` selama `kind === LAYERS[y]`;
  `progress = max(run.length)`, `column = run` pemenang (untuk mercusuar),
  `height = max(y+1)` seluruh blok; `best = max(best, height)` persisten.
- **Runtuh:** `cascade(blocks, removed)` mengulang filter `isSupported` sampai stabil;
  `fell = len(before) − len(kept) − direct` menentukan notice/bunyi collapse vs break.
- **Vista:** `player.y ≥ 4` atau `progress === 5` membuka `vista` (sekali, persisten);
  `Atmosphere` di `World.tsx` me-lerp latar `#e9eff3 → #f5e2c4` dan lampu
  `#ffffff → #ffd9a0` dengan damp λ1,1 hanya selama mode game.

#### Lompat countermovement (CMJ)

Lompat bukan sekadar translasi naik: rig memainkan empat fase sesuai kurva force-time CMJ
(Owen et al. 2018): **braking dip → propulsion → flight → landing absorption**. State mesin
(`jumpState 0–3`) ditulis `GameScene` ke `gait`, lalu `ConsultantVisual` mem-blend pose lompat
di atas stride dengan damp eksponensial (λ = 16 pose, λ = 12 bobot).

| Fase | Durasi | Hip | Lutut | Lengan | Sumber |
|---|---|---|---|---|---|
| Braking dip | `CROUCH_S = 0,22 s` | −0,85 rad | 1,45 rad (≈83°) | ayun ke belakang +0,8 rad | Owen 2018; McHugh 2024; Komi & Bosco 1978 |
| Propulsion / rise | sampai apex | −0,15 → −0,6 rad | 0,2 → 1,2 rad (tuck) | belakang → overhead −2,35 rad | Harman 1990; Lees 2004 |
| Fall / reach | sisa flight | −0,42 rad | 0,8 rad | depan −0,95 rad (balance) | Petushek 2011 |
| Landing absorption | `LAND_S = 0,3 s` | −0,95 rad | 1,6 rad (≈92°) | depan −0,7 rad | Petushek 2011; impulse–momentum |

Kedalaman dip lowering pelvis otomatis lewat solver kontak tanah (`reach(hip, knee)`), bukan
offset hardcoded; bobot absorpsi mendarat diskalakan oleh `impact = v_touchdown / v_takeoff`.

Rumus fisika lompat ( projectile / flight-time / impulse–momentum ):

| Rumus | Nilai di game | Sumber |
|---|---|---|
| `h = v₀² / 2g` | `7,6² / 48 ≈ 1,20` unit | Linthorne 2001; McGinnis 2013 |
| `t_udara = 2v₀ / g` | `2·7,6 / 24 ≈ 0,63 s` | Linthorne 2001 |
| `h = g·t² / 8` (flight-time) | identik dengan dua di atas untuk take-off=landing | Linthorne 2001 |
| `J = ∫F dt = m·Δv` | dasar take-off & absorpsi mendarat | Linthorne 2001; McGinnis 2013 |
| `v += −g·dt; y += v·dt` | semi-implicit Euler, `g = 24` arcade | integrasi numerik standar |

#### Gait lari & jalan (`jointAt`)

Karakter konsultan dibuat prosedural dari geometri *loft* Three.js — penampang cincin
(`loftY` untuk badan/lengan/kepala, `loftZ` untuk sepatu) dijahit menjadi `BufferGeometry`
ditambah sphere/kapsul kecil untuk sendi, tanpa aset model eksternal. Kurva sendi per fase
siklus normalised `u` (0 = heel strike) ditulis `jointAt(u, speedNorm)` dan
di-interpolasi jalan→lari:

| Sendi | Jalan (`speedNorm` 0) | Lari (`speedNorm` 1) | Sumber |
|---|---|---|---|
| Stance fraction | 0,62 | 0,40 | Perry 2010; Novacheck 1998 |
| Hip saat contact → toe-off | +0,52 → −0,17 rad | +0,70 → −0,35 rad | Novacheck 1998 |
| Hip drive swing (puncak s≈0,5) | 0,10 rad | 0,78 rad (≈45°) | Novacheck 1998 |
| Lutut stance (loading → push) | 0,09 → 0,26 rad | 0,26 → 0,78 rad | Perry 2010 |
| Lutut swing (puncak awal swing) | 1,05 rad (≈60°) | 2,09 rad (≈120°); bentuk kurva lari dari loop referensi 20-key | Novacheck 1998; Van Hooren 2024; Almaral (Sketchfab) |
| Ankle (sudut kaki dunia, toes-down +) | −0,12 → +0,32 rad; stance rata sampai akhir lalu plantar | −0,06 → +0,50 rad; push-off plantar tegas | Perry 2010; Novacheck 1998 |
| Siku | 0,35 rad | 1,57 ± 0,5 rad (menutup front-side / membuka back-side) | Freelap; De Vlieger 2025 |
| Lean badan | 0,04·sn | 0,22·sn² + 0,04·sn | Novacheck 1998 |

Ayun lengan **berlawanan fase kaki** dengan rentang bahu terpusat
(`armSwing = (hip − hipMean)·lerp(0,75; 1,08)`): ±15° jalan, ±35° lari, sehingga tangan
mengayun hip-pocket → chin; siku menutup di front-side (~120°) dan membuka di back-side
(~60°) — bukan terkunci 90° — memakai kurva siku referensi dengan fase dibalik. Tangan
tetap dalam bentuk rileks. Fase flight
(selang dua kaki melayang, ciri lari vs jalan menurut Physio-pedia) diberi busur vertikal
`sin(π·flightProg)·lerp(0; 0,06)` di atas interpolasi reach toe-off→contact, supaya lari tidak
terlihat seperti jalan cepat tanpa membuat badan melompat di batas stance.

**Ankle sebagai sudut kaki dunia:** kurva ankle menulis sudut telapak terhadap tanah (toes-down
positif), lalu pose lokal kaki = `−(hip + knee) + ankle` — pembatalan penuh rotasi shin. Dengan
begitu telapak stance tetap rata di midstance (dulu bump dorsifleksi lama memiringkan telapak
±13° dan kaki terlihat berrocking), sementara push-off tetap plantarfleksi autentik.

**Bentuk kurva lari dari referensi (`runLoop.ts`):** bentuk fleksi lutut & siku saat lari
di-retarget dari loop lari 20-frame *"Male Running (20 frames loop)"* karya **Denys Almaral**
(Sketchfab, Free Standard). Loop 0,667 s @30fps disampel lewat Sketchfab Viewer API
(`scripts/sk-loop-extract.mjs`); lutut (bip L Calf) dan siku (bip L Forearm) adalah hinge
satu-sumbu bersih, sehingga rotasi Z lokalnya memberi kurva fleksi autentik — loading-response
bump di stance dan lipatan swing asimetris, bukan sinus murni. Kurva dinormalisasi 0..1,
dirotasi agar index 0 = heel strike, di-interpolasi **Catmull-Rom periodik**, lalu dipetakan
ke rentang sendi karakter (`scripts/sk-loop-gen.mjs` untuk regenerasi). Amplitudo mengikuti
proporsi karakter agar solver `reach()` menjaga telapak stance di tanah; bentuk referensi
diblend masuk lewat
`speedNorm` sehingga jalan tetap memakai kurva analitik. Siku lari menambah osilasi ±11°
di sekitar hold 90°, berfase terhadap kaki masing-masing.

**Kadens & stride:** `STRIDE_WALK 1,5 m` / `STRIDE_RUN 3,0 m` adalah panjang **satu siklus
penuh (dua langkah)**, sedangkan `gait.phase` maju `2π` per siklus — pasangan yang konsisten
membuat kaki stance menyapu tanah tepat sejauh jarak yang ditempuh (bebas foot-slide).
`cadenceFor = clamp(v/stride, 0,2, 1,9)` siklus/s → ±128 langkah/menit jalan (1,6 m/s) dan
±176 langkah/menit lari (4,4 m/s); batas 1,9 siklus/s mengikuti plateau frekuensi langkah
Weyand 2000. Kecepatan dunia sengaja manusiawi terhadap panjang kaki ±0,85 m.

QA: `scripts/gait-qa.mjs` memotret 10 pose beku lari (`speedNorm` 1) + 3 jalan (`speedNorm` 0,
`move01` 1) dari kamera samping. Karena path pause `GameScene` menulis `gait.moving = 0` tiap
frame, harness **mem-pin field `gait` lewat accessor property** (getter membaca nilai beku,
setter mengabaikan tulisan sim) selama potret, lalu memulihkan property data sebelum live run.

#### Kerangka rotasi pose rig

Rig UE4 tidak memakai basis tulang three.js, jadi setiap sendi di-pose terhadap **sumbu
anatomis karakter** (fleksi sagittal, depan, atas) yang diturunkan dari landmark tulang
(`head−pelvis` = atas, `ball_l−foot_l` = depan, `cross(atas, depan)` = fleksi). Sumbu tersebut
diubah ke kerangka rest tulang lewat `invRestWorldQ = (q_parent · q_rest)⁻¹`, lalu rotasi
di-post-multiply: `q = q_rest · R(sumbu_lokal, sudut)`. Identitas `Q·R(Q⁻¹v, θ) = R(v, θ)·Q`
menjamin rotasi world benar-benar terjadi tentang sumbu anatomis, bukan tentang sumbu twist
tulang (yang tak terlihat pada kaki lurus). Sudut sendi tetap sama untuk lari dan lompat;
solver `reach(hip, knee)` menjaga telapak kaki stance menempel tanah.

Verifikasi visual wajib dari **kamera samping**: dari kamera depan/belakang, gerak sagittal
(maju/mundur) ter-foreshorten sehingga squat/tuck terlihat seperti kaki lurus walau sudut lutut
terukur 45–63°. QA memakai freeze in-page per fase (`jumpState`/`vy`/`landT`) + piksel jujur
`canvas.toDataURL()` agar latensi screenshot tidak menggeser fase yang difoto.

### 6.6 Transisi situs ↔ game

| Tahap | Durasi |
|---|---|
| Cover mulai pekat → scene swap | 320 ms (cover `opacity` 300 ms) |
| Cover memudar | pada 420 ms |
| Kunci scroll | selama mode `game` |
| Escape tahap 1 | lepas pointer lock; kursor bebas, dunia tetap berjalan |
| Escape tahap 2 | menu jeda; loop berhenti |
| Escape tahap 3 | `exit()` → `toStation(PLAY_STATION)` setelah unlock |

### 6.7 Ukuran responsif

- `html { font-size: clamp(14px, 0.45vw + 9px, 26px) }` → 390 px = 14 px, 1440 px ≈ 15,5 px,
  3840 px = 26 px.
- Layout split (≥768px): wrapper konten `md:w-[46%]`, pane 3D `fixed` menempati 54% kanan
  (`left:46%`, tinggi penuh). Konten duduk **langsung** di kolom kiri tanpa kartu mengambang:
  `Panel` hanya section `min-h-[110vh]` + pembatas `@container max-w-[56rem]` dengan eyebrow
  `NN / 11` dan hairline gradien. Grid layanan memakai container query (`@container` pada
  pembatas itu, `@[40rem]:grid-cols-3`) sehingga jumlah kolom mengikuti lebar kolom, bukan
  lebar viewport (dua kolom di pane 46% pada 1440, tiga bila kolom ≥40rem).
- Konten dipadatkan agar selalu muat di bawah nav tetap: tinggi konten < tinggi viewport − nav,
  sehingga snapping tengah tidak menyembunyikan judul di balik nav (terverifikasi 11 stasiun
  × ID/EN di 1440×900 dan 390×844).
- Setiap section `min-h-[110vh]` supaya karakter selalu punya ruang berhenti di tengah konten.
- PiP mobile: lebar `min(46vw,210px)` (diperbesar `min(86vw,400px)`), tinggi ≈1.18× lebar,
  posisi + status diperbesar disimpan di `cakrawala-pip-v1`; drag memakai pointer capture
  dan clamp ke viewport; `data-pip` membuat JourneyController mengabaikan gesture di atasnya.
- Zoom kamera ortho `clamp(min(paneW,paneH)/10, 24, 96)` menjaga karakter tetap menonjol
  baik di pane 54% maupun jendela PiP kecil.
- Canvas `dpr={[1, 2]}` membatasi biaya piksel di layar 4K.

### 6.8 Referensi perhitungan gerak

Model di atas **bukan simulasi biomekanik penuh**; parameter literatur dipetakan ke dua
variabel — `speedNorm` (0–1, bentuk kurva dengan plateau jalan) dan `move01` (0–1, amplitudo
stride) — untuk menghasilkan gerak yang plausibel dan bebas foot-sliding.

| Referensi | Dipakai untuk |
|---|---|
| Perry J, Burnfield JM. *Gait Analysis: Normal and Pathological Function*, 2nd ed. Slack, 2010. | Pembagian stance/swing berjalan (±60/40) dan puncak fleksi lutut saat swing (±60°). |
| Novacheck TF. *The biomechanics of running.* Gait & Posture 7(1):77–95, 1998. | Fase stance lari (±40%), swing lebih panjang, fleksi lutut swing dalam (±100–120°), lean badan. |
| Weyand PG, Sternlight DB, Bellizzi MJ, Wright S. *Faster top running speeds are achieved with greater ground forces not more rapid leg movements.* J Appl Physiol 89(5):1991–1999, 2000. | Frekuensi langkah cenderung mendatar; kecepatan lebih ditentukan panjang langkah → cadence dibatasi `MAX_CADENCE = 1,9` siklus/s (±228 langkah/menit). |
| Cavanagh PR, Kram R. *Stride length in distance running: velocity, body dimensions, and added mass effects.* Med Sci Sports Exerc 21(4):467–479, 1989. | Panjang stride naik terhadap kecepatan → interpolasi `STRIDE_WALK 1,5` → `STRIDE_RUN 3,0` meter per siklus penuh. |
| Van Hooren B, dkk. *The Relationship Between Running Biomechanics and Running Economy: A Systematic Review and Meta-Analysis of Observational Studies.* Sports Med 54(5), 2024. | Kontak singkat & fleksi lutut swing yang efisien menandai lari ekonomis → puncak lutut di awal swing, bukan tengah. |
| [Physio-pedia: Running Biomechanics](https://www.physio-pedia.com/Running_Biomechanics) | Fase *double float* (kedua kaki melayang) membedakan lari dari jalan → busur vertikal saat flight. |
| [The Movement System: Biomechanics of Running](https://www.themovementsystem.com/blog/biomechanics-of-running-4-tweaks-to-fix-your-running-form) | Siku ±90° digerakkan ke belakang; kadens nyaman 155–160 langkah/menit → elbowFlex lari 1,57 rad & ayun lengan berlawanan kaki. |
| [Freelap USA: A Call to Arms — Sprint Mechanics Revisited](https://freelapusa.com/blogs/articles/a-call-to-arms-sprint-mechanics-revisited) | Siku menutup di front-side dan membuka saat shoulder extend; tangan hip-pocket → chin; bahu & tangan rileks → ayun bahu terpusat + open/close siku + curl jari rileks. |
| De Vlieger D, dkk. *Speed-dependent changes in the arm swing during walking.* PMC, 2025. | ROM sagittal bahu sisi sehat ~25–30° naik dengan kecepatan; fleksi siku rata-rata ~41° → ayun lengan jalan ±15° & siku 0,35 rad. |
| Owen NJ, Watkins J, Kilduff LP, Bevan HR, Bennett MA. *Understanding the key phases of the countermovement jump force-time curve.* Strength Cond J 40(4):96–106, 2018. | Enam fase CMJ → mesin `jumpState` (dip, propulsion, flight, landing). |
| Bobbert MF, Gerritsen KGM, Litjens MCA, Van Soest AJ. *Why is countermovement jump height greater than squat jump height?* Med Sci Sports Exerc 28(11):1402–1412, 1996. | Alasan memakai countermovement (dip) sebelum take-off, bukan squat jump langsung. |
| Komi PV, Bosco C. *Utilization of stored elastic energy in leg extensor muscles by men and women.* Med Sci Sports Exerc 10(4):261–265, 1978. | Energi elastis fase braking → dip singkat 0,22 s lalu explode. |
| Harman EA, Rosenstein MT, Frykman PN, Rosenstein RM. *The effects of arms and countermovement on vertical jumping.* Med Sci Sports Exerc 22(6):817–823, 1990. | Arm swing menambah ±10–11 cm → lengan ayun belakang→overhead saat rise. |
| Lees A, Vanrenterghem J, De Clercq D. *Understanding how an arm swing enhances performance in the vertical jump.* J Biomech 37(12):1929–1940, 2004. | Arm swing +8,6 cm → konfirmasi arah ayun lengan. |
| McHugh MP et al. *Effect of countermovement depth on the neuromechanics of countermovement jumps.* 2024. | Kedalaman dip & fleksi lutut braking → sudut hip/lutut fase dip. |
| Petushek EJ. *2D video vs electrogoniometry: CMJ and landing knee flexion angle.* Tesis, Northern Michigan University, 2011. | Fleksi lutut saat mendarat → pose absorpsi landing. |
| Linthorne NP. *Analysis of standing vertical jumps using a force platform.* Am J Phys 69(11):1198–1206, 2001. | Rumus flight-time `h = g·t²/8` dan impulse–momentum `J = m·Δv`. |
| McGinnis PM. *Biomechanics of Sport and Exercise*, 3rd ed. Human Kinetics, 2013. | Projectile motion `h = v₀²/2g`, `t = 2v₀/g` dan impulse–momentum mendarat. |
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
| Deck company profile PT Cartenz Technology Indonesia (PPTX) | Profil perusahaan, portofolio proyek, sertifikasi, capaian, daftar klien, ±42 logo mitra (slide 2). |
| Website resmi [cartenz.co.id](https://cartenz.co.id) | Posisi Cakrawala sebagai unit IT consulting, alamat Wisma Bumiputera Lt. 9 (Kav. 76), kanal kontak. |
| `PLAN.md` §3 dan §8 | Pemetaan 12 blok ke data nyata dan keputusan editorial (tahun 2014, alamat, warna brand, bahasa default). |
| Literatur biomekanika (§6.8, §9.1) | Asal rumus gerak **lari** & **lompat** serta rumus fisika; ditampilkan juga di Footer tribute. |

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
| `cakrawala-meaning-v1` | `{ best, done, vista, unlocked[] }` — rekor tinggi, status selesai, koleksi renungan | `src/game/store.ts` |
| `cakrawala-run-v1` | `{ difficulty, remaining, finished }` — run berwaktu yang ditahan saat jeda/keluar | `src/game/store.ts` |
| `cakrawala-scores-v1` | Array skor `{ name, time, difficulty, at }` maks 50, urut waktu naik | `src/game/leaderboard.ts` |
| `cakrawala-npc-v1` | Array id robot yang sudah disapa di Jelajah Bebas | `src/game/robots.ts` |
| `cakrawala-audio-v1` | `'off'` bila mute, `'on'` bila aktif (absen = aktif) | `src/game/audio.ts` |
| `cakrawala-hud-deck-v1` | `'closed'` bila Control Deck dilipat | `src/game/GameHud.tsx` |
| `cakrawala-lang` | `"id"` atau `"en"` | `src/lib/i18n.tsx` |
| `cakrawala-pip-v1` | `{ x, y, expanded }` — posisi & status jendela 3D mobile | `src/three/World.tsx` |
| `cakrawala-theme-v1` | `'night'` atau `'day'` (absen = night) — tema DOM + dunia 3D | `src/lib/theme.ts` |

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
node scripts/layout-qa.mjs  # split 46/54, rail 11 titik, PiP drag/clamp/expand/persist, swipe vs PiP
node scripts/verify2.mjs    # gait + shadow, wheel-up snap, burst multi-notch, lompatan teleport immediate, jump/break, persistensi reload
node scripts/play-qa.mjs    # snap wheel, 3 kolom services, pause/hapus/resume, Esc bertahap
node scripts/jump-qa.mjs    # CMJ per fase dari kamera samping, tribute 5/11/11, overflow 390
node scripts/meaning-qa.mjs # loop falsafah: 5 lapis, reject, cascade, perayaan, renungan, mute
node scripts/touch-qa.mjs   # swipe mengunci checkpoint (emulasi sentuh CDP, 390×844)
node scripts/mobile-play-qa.mjs # kontrol Play sentuh: tanpa lock, tap-aim, place/break, HUD bebas overlap
node scripts/gait-qa.mjs    # 10 pose beku lari + 3 jalan dari kamera samping + live run
```

Yang diperiksa `play-qa.mjs`: delta scroll terhadap pusat stasiun = 0, kolom services
adaptif (2 di kolom 46% pada 1440, 3 bila kolom ≥40rem), Pointer Lock aktif, blok bertambah
setelah klik kanan, **Esc pertama melepas kursor** (dunia tetap berjalan), **Esc kedua membuka
dialog jeda** (bukan keluar), **Batal** dan **Ya, hapus** berperilaku sesuai konfirmasi,
**Lanjutkan** membiarkan kursor bebas (klik dunia mengunci ulang), dan **Esc ketiga** mengembalikan
`scrollY` ke stasiun Play tanpa kehilangan blok. `verify2.mjs` juga menekan Esc tiga kali untuk
memastikan alur kursor → jeda → keluar.

`meaning-qa.mjs` menghitung aim crosshair secara closed-form dari model kamera orbit lalu
mengirim delta look sintetis (klik tanpa gerak mouse, karena pointer lock mengubah gerakan
mouse virtual menjadi delta look nyata). Ia membangun kolom lima lapis berurutan, memastikan
penolakan fondasi, runtuh berantai, kartu perayaan + kursor bebas, mercusuar yang tidak
mencegat raycast, koleksi Renungan enam entri, mute persisten, persistensi reload, dan HUD
390 px. `touch-qa.mjs` memakai `Input.dispatchTouchEvent` (CDP) pada konteks 390×844
`hasTouch`: swipe pendek maju satu checkpoint, swipe naik kembali, swipe panjang terkunci di
checkpoint depan, sentuh baru mengambil alih hop, dan tap tidak melompat stasiun.
`mobile-play-qa.mjs` (390×844 `hasTouch`/`isMobile`) memproyeksikan sel dunia ke piksel lewat
kamera live (`__gameDebug`) lalu mengetuknya: ia memastikan **tidak ada pointer lock**, reticle
muncul tepat di titik ketuk dan mengikuti re-aim, Menu/jeda/hapus/resume bekerja lewat pointer,
slot hotbar terpilih, tap tanah + Pasang menempatkan sel yang diketuk, tap muka blok menumpuk
di atasnya, Hancurkan memecah sel yang diketuk, mute persisten, geser LookPad memutar kamera
dan menghapus reticle, joystick menggerakkan pemain, kluster HUD tidak saling overlap maupun
keluar layar, dan Keluar mengembalikan journey dengan build tersimpan.

### Panduan pengguna (PDF)

Sumber manual: `docs/user-manual.html` — 16 halaman A4 berbahasa Indonesia (cover +
15 bagian), memakai 27 screenshot fitur di `docs/manual/m01…m27.png` (desktop malam/siang,
EN, gate/difficulty/HUD run, jeda, menang/rekor/papan skor, timeout, selebrasi, renungan,
jelajah + sapa robot, tribute, kontak, dan mobile browse/play/jelajah). Render PDF:
`playwright-core` + Edge headless membuka HTML via `file://`, menunggu semua img complete,
lalu `page.pdf({ printBackground: true, preferCSSPageSize: true })` dengan
`@page { size: A4; margin: 13mm 12mm 14mm }` dan `.page { page-break-after: always }`.
Hasil distribusi: `Cakrawala-User-Manual.pdf` di folder Downloads pengguna (16 halaman,
±4,5 MB). Figur dua-tumpuk memakai `.fig.w120` (121 mm); bagian 7 & 11 yang padat memakai
`.fig.w110` (110 mm) agar footer tidak yatim ke halaman berikutnya.

---

## 9. Atribusi & lisensi

Rincian lisensi repositori (§9.2), komponen pihak ketiga (§9.3), aset & karya turunan
(§9.4), serta catatan history/visibility (§9.5). Sumber ilmiah & dokumen ada di §9.1.

### 9.1 Sumber ilmiah & dokumen (gerak, fisika, data)

Daftar lengkap juga tampil di situs pada **Footer → Tribute & Atribusi** (lima grup:
teknologi/aset, dokumen perusahaan, gerak lari, gerak lompat, rumus fisika).

| Sumber | Dipakai untuk |
|---|---|
| Deck company profile PT Cartenz Technology Indonesia (PPTX) | Seluruh fakta/angka/layanan + ±42 logo mitra (slide 2). |
| [cartenz.co.id](https://cartenz.co.id) | Posisi Cakrawala, alamat, kanal kontak. |
| Perry & Burnfield 2010; Novacheck 1998 | Rumus/fase gerak **lari** (stance/swing, fleksi lutut, lean). |
| Weyand et al. 2000; Cavanagh & Kram 1989 | Cadence & panjang stride gerak **lari**. |
| Van Hooren et al. 2024; Physio-pedia; The Movement System; Freelap; De Vlieger 2025 | Bentuk kurva lutut swing, fase double float, ayun lengan & open/close siku, postur tangan rileks. |
| [Denys Almaral — Male Running (20 frames loop)](https://sketchfab.com/3d-models/male-running-20-frames-loop-ed3d7a4b8b124e1591be83ccb4c02dcd) | **Bentuk** kurva fleksi lutut & siku lari (runLoop.ts), disampel via Viewer API. |
| Owen et al. 2018; Bobbert et al. 1996; Komi & Bosco 1978 | Fase & alasan countermovement gerak **lompat**. |
| Harman et al. 1990; Lees et al. 2004 | Kontribusi arm swing gerak **lompat**. |
| McHugh et al. 2024; Petushek 2011 | Kedalaman dip & absorpsi lutut mendarat. |
| Linthorne 2001; McGinnis 2013 | **Rumus fisika**: flight-time `h=g·t²/8`, impulse–momentum `J=m·Δv`, projectile `h=v₀²/2g`. |

> **Catatan aset karakter:** karakter konsultan dibuat dari geometri *loft* prosedural Three.js di
> `src/three/Character.tsx` dan tidak memakai model, tekstur, atau rig eksternal. Seluruh
> gerak (gait, lompat, teleport) dibangun prosedural di atas hierarki group tersebut. Detail
> tercatat juga di Footer → Tribute & Atribusi, bersama library lain yang dipakai.

Daftar tribute di UI bersifat wajib: setiap penambahan atau penghapusan aset/library harus
disertai pembaruan teks `footer.tribute` di `src/content/id.json` dan `en.json`.

### 9.2 Lisensi repositori

Kode sumber Cakrawala adalah **milik PT Cartenz Technology Indonesia** dan dilindungi hak
cipta (*all rights reserved*). Repo ini **source-available**: boleh dibaca dan dipelajari,
tetapi **tidak** memberikan hak untuk memakai ulang, memodifikasi, menjual, atau
mendistribusikan ulang — termasuk fork untuk keperluan komersial — tanpa izin tertulis
dari pemilik. Mengubah visibility repo menjadi public **tidak** mengubah ketentuan ini.

Komponen pihak ketiga pada §9.3 tetap tunduk pada lisensi masing-masing dan tidak dicakup
oleh klaim hak cipta di atas.

### 9.3 Komponen pihak ketiga (versi terpasang)

| Komponen | Versi | Lisensi | Dipakai untuk |
|---|---|---|---|
| `react`, `react-dom` | 19.3.1 | MIT | UI |
| `three` | 0.187.0 | MIT | renderer 3D |
| `@react-three/fiber` | 9.8.2 | MIT | reconciler React ↔ Three.js |
| `@react-three/drei` | 10.7.9 | MIT | helper 3D |
| `zustand` | 5.1.0 | MIT | state global |
| `lenis` | 1.3.27 | MIT | smooth scroll |
| `matter-js` | 0.20.0 | MIT | fisika arena Play Character |
| `lucide-react` | 1.72.0 | ISC | ikon |
| `gsap` | 3.15.1 | **Standard “No Charge” (Webflow)** — bukan MIT | animasi DOM; lihat catatan di bawah |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.5 | MIT | styling |
| `vite`, `@vitejs/plugin-react` | 8.3.8 / 6.3.0 | MIT | build & dev server |
| `typescript` | 7.0.2 | Apache-2.0 | type checking |
| `oxlint` | 1.93.0 | MIT | lint |
| `playwright-core` | 1.65.0 | Apache-2.0 | QA headless |
| `@types/react`, `@types/react-dom`, `@types/node`, `@types/matter-js` | 19.3.0 / 19.3.0 / 24.19.2 / 0.20.2 | MIT | deklarasi tipe |

**Catatan GSAP.** Sejak 30 April 2025 GSAP memakai *Standard “No Charge” License*
(© Webflow), **bukan MIT**. Gratis untuk proyek komersial; yang dilarang: memakai GSAP
untuk *visual animation builder* yang bersaing dengan Webflow, reverse-engineer untuk
membuat produk pesaing, dan menghapus notice/branding GSAP. Pemakaian di situs profil ini
termasuk *Permitted Use*. Teks lengkap: <https://gsap.com/standard-license>.

Teks lisensi tiap dependensi ikut terdistribusi dalam paket npm-nya
(`node_modules/<paket>/LICENSE*`). Untuk repo public, disarankan menambahkan
`LICENSE` (proprietary) dan `THIRD_PARTY_NOTICES.md` berisi teks lisensi lengkap.

### 9.4 Aset & karya turunan

| Aset | Status / lisensi |
|---|---|
| Karakter konsultan 3D prosedural (`Character.tsx`, geometri *loft*) | Karya in-house, milik PT Cartenz Technology Indonesia; tanpa model/tekstur/rig eksternal |
| Kurva sendi lari (`runLoop.ts`) | Karya turunan dari “Male Running (20 frames loop)” — Denys Almaral, Sketchfab **Free Standard**; yang dipakai hanya bentuk kurva numerik (bukan aset 3D), dengan atribusi |
| Proporsi tubuh (kanon 7,5 kepala; fraksi Drillis & Contini) | Fakta/rujukan ilmiah, bukan kode berhak cipta; sumber di §6.3 |
| Logo Cakrawala, screenshot manual, konten & angka proyek | Milik PT Cartenz Technology Indonesia |
| Nama/logo mitra, kementerian, lembaga | Merek milik masing-masing pemegang; ditampilkan sebagai referensi portofolio |
| Font `Inter` | Hanya dirujuk sebagai nama family dengan fallback `system-ui`; **tidak ada file font yang dibundel/diunduh**. Bila kelak memuat webfont Inter, lisensinya SIL OFL 1.1 |
| Model “Eric Rigged 001” (Renderpeople, free3d.com) | **Tidak dipakai di produk akhir**; lisensi *Personal Use* melarang redistribusi. File sudah dihapus dari tree — lihat §9.5 |

### 9.5 Catatan history, visibility, dan data publik

- **History ≠ tree.** Menghapus file di commit terakhir tidak menghapusnya dari git
  history. Blob `public/models/eric/**` masih tersimpan di commit `d858e73` dan dapat
  diambil siapa pun bila repo public. Karena lisensi Renderpeople *Personal Use* melarang
  redistribusi, history perlu dibersihkan (`git filter-repo` atau repo baru dengan satu
  commit bersih) sebelum repo di-public-kan, atau repo tetap private.
- **Tanggung jawab fork.** Pihak yang mem-fork untuk komersial bertanggung jawab atas
  tindakannya sendiri *jika* repo yang di-fork memang berlisensi untuk itu. Repo ini
  proprietary (§9.2); memublikasikan aset berlisensi *Personal Use* tetap merupakan
  redistribusi oleh pemilik repo, bukan oleh forker — jadi pembersihan history tetap
  diperlukan terlepas dari perilaku forker.
- **Andrew Ryan Sinaga (Managing Director PT Cartenz Technology Indonesia)** adalah
  informasi publik perusahaan. Fitur likeness pernah dibuat lalu **dicabut**; tidak ada
  foto atau aset likeness di repo. Catatan perencanaannya ada di `PLAN.md` §18–§19.
- **Metadata commit.** Sebagian commit memakai email pribadi author; untuk repo public
  disarankan memakai email noreply GitHub (`git config user.email`).
