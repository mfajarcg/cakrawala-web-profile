# Cakrawala — Company Profile Website Plan

**Brand:** Cakrawala (IT Consulting) · by PT Cartenz Technology Indonesia
**Konsep:** "Kehidupan Konsultan TI" — dunia isometric satu atap: satu karakter konsultan berjalan dari block 01 sampai 12, dikendalikan scroll mouse & arrow keys, responsive 390 px → 3840 px
**Kompetisi:** The Qoder Challenge (Alicloud) — 12 blocks, ABC-level precision

---

## 1. Tech Stack (rekomendasi)

| Layer | Pilihan | Alasan |
|---|---|---|
| Build | Vite + React + TypeScript | Cepat, mudah di-deploy statis |
| Styling | Tailwind CSS v4 + CSS custom properties | Fluid tokens via `clamp()`, container queries |
| 3D | Three.js via React Three Fiber + drei | Orthographic camera = isometric sejati; satu kanvas dunia + follow-cam karakter |
| Karakter | GLTF low-poly CC0 (Quaternius / Kenney) + walk-cycle | Animasi jalan siap pakai; fallback rig procedural dari primitives |
| Scroll / motion | GSAP ScrollTrigger + Lenis | Progress perjalanan 0→1 di sepanjang spline; damping halus |
| Input | Wheel/touch (Lenis) + keyboard ArrowKeys (←→↑↓) | Satu `targetProgress`; TV remote arrow otomatis terdukung |
| Physics (Play Moment) | Matter.js (2D isometric-look) | Ringan, stabil di phone & TV; tidak perlu WASM |
| i18n | JSON dictionary `en.json` / `id.json` + React context | EN / ID toggle tanpa library berat |
| Map | MapLibre GL + OpenStreetMap tiles | Gratis, wajib attribution → masuk Tribute |
| Icons | Lucide | MIT → masuk Tribute |
| Fonts | Google Fonts (self-hosted via @fontsource) | Offline-safe, masuk Tribute |
| Deploy | Qoder Sites (atau static host lain) | Cocok dengan konteks lomba |

**Fallback:** `prefers-reduced-motion` & no-WebGL → static SVG isometric illustration, counters tanpa animasi.

---

## 2. Strategi Responsive (390 → 3840)

Target viewport uji: **390** (phone) · **1440** (laptop) · **1920** (TV/FHD) · **2560** (27") · **3840** (4K / TV).

1. **Root scaling:** `html { font-size: clamp(14px, 0.45vw + 9px, 26px) }` → semua `rem` ikut skala; 4K tidak terlihat "kecil di tengah".
2. **Content width:** `max-width: min(92vw, 120rem)` — di 4K tetap lebar tapi line-length terkendali.
3. **Breakpoint tokens:** `sm 390 · md 768 · lg 1024 · xl 1440 · 2xl 1920 · 3xl 2560 · 4k 3840`.
4. **Canvas 3D:** `dpr = min(devicePixelRatio, 2)`; resolusi internal dibatasi agar 4K tidak membebani GPU; `ResizeObserver` → `camera.zoom` disesuaikan agar skala isometric konsisten.
5. **Smart TV (10-foot UI):** tap/focus target ≥ 48 px, kontras tinggi, keyboard/remote navigation (focus ring jelas), tidak ada hover-only interaction.
6. **Phone:** hamburger menu, 3D scene disederhanakan (fewer objects, no shadows), physics object count dikurangi.
7. **Assets:** logo SVG (vector), partner logo PNG → dikonversi/dioptimasi, `srcset` untuk raster.

---

## 3. Peta 12 Blocks → Real Data (dari deck Cartenz)

| # | Block | Isi (real data) | Visual / 3D |
|---|---|---|---|
| 01 | **Navigation** | Logo Cakrawala (SVG putih/hitam), links ke 12 section, EN/ID toggle, phone hamburger | Sticky, blur backdrop |
| 02 | **Hero** | "Cakrawala — IT Consulting by PT Cartenz Technology Indonesia". Tagline: *Kolaborasi untuk Negeri*. CTA: Services / Contact | Stasiun 1 — gerbang masuk kantor Cakrawala: karakter mulai berjalan dari sini |
| 03 | **Cinematic Story** | Satu hari konsultan TI: Discover → Design → Build → Assure → Operate | Stasiun 2 — path melewati 5 "ruang kerja" isometric yang bermorf seiring karakter lewat (bukan pinned lagi; perjalanan karakter itu sendiri yang sinematik) |
| 04 | **Services** | 7 layanan nyata: Advisory & Technical Assistance · System Integration · PMQA / Quality Assurance · Platform Development · Data Platform & Governance · Business Process Management · Operations & Maintenance | Stasiun 3 — rak/mural 7 layanan di sisi path |
| 05 | **Credibility** | Sertifikasi: **BSSN, ISO 9001, ISO 27001, PSE**. Partner logos dari slide 2 (OSS/BKPM, SmartGov, CitiGov, bank, kementerian). Tech: Microsoft Power Platform, Power BI, ARIS 10, BPMN 2.0, ISO/IEC 11179 | Stasiun 4 — dinding penghargaan & logo partner berputar mengikuti path |
| 06 | **Numbers** | **12** tahun · **200+** Pemda · **15+** K/L & institusi internasional · **15.4 jt+** NIB tervalidasi (OSS 2.0) · **15** proyek unggulan · **5** aplikasi Non-SAP PERURI dipelihara | Stasiun 5 — papan angka raksasa, counter berjalan saat karakter lewat |
| 07 | **Signature** | Kisah nyata: **PMQA OSS 2.0 (2024–2026)** — menjaga service continuity saat cutover, validasi migrasi KBLI 2020→2025 & 15.4 jt NIB. Alternatif: SILANI pilot Yogyakarta & Bali | Stasiun 6 — diorama "war room" OSS 2.0, karakter berhenti sejenak (idle) |
| 08 | **Market / Users** | Pemerintah Daerah (Banjarmasin, Palu, Badung, Bandung, NTB, Padang, Yogyakarta, Tangerang, Deli Serdang, Sulut, Balikpapan, Jakarta); K/L: Kemenkeu (DJPK/DJPPR), Kementerian Investasi/BKPM, Bappenas, SKK Migas, Bareskrim Polri, PERURI, Universitas Indonesia, Setnas OECD; perbankan | Stasiun 7 — peta Indonesia isometric dengan pin kota menyala berurutan |
| 09 | **About** | PT Cartenz Technology Indonesia (12 tahun), posisi Cakrawala sebagai unit IT consulting, visi "Merubah Visi Jadi Aksi" | Stasiun 8 — "ruang tim": karakter menyapa rekan-rekan isometric |
| 10 | **Play Moment** | "Build the stack": user men-drop blok isometric (server, laptop, dokumen, cloud) — physics Matter.js; tombol reset; counter blok | Stasiun 9 — area sandbox; karakter duduk/idle, fokus pindah ke interaksi physics |
| 11 | **Contact** | Form (nama, email, pesan) + alamat + telepon + email + peta MapLibre | Stasiun 10 — meja resepsionis + map; karakter wave |
| 12 | **Footer** | © 2026 PT Cartenz Technology Indonesia · Cakrawala™ · trademark pihak ketiga milik masing-masing · back-to-top · **Tribute / Attribution** | Stasiun 11 — garis finish & logo Cakrawala raksasa; tombol back-to-top = karakter jalan balik ke start |

---

## 4. Konsep 3D Isometric "Kehidupan Konsultan TI"

### 4.1 Karakter Utama — "Satu Perjalanan"

Satu karakter konsultan TI (low-poly, membawa laptop/briefcase) **berjalan terus-menerus dari block 01 (Navigation/Hero) sampai block 12 (Footer)**. Seluruh situs adalah satu dunia isometric yang tersusun sebagai "jalur perjalanan" — setiap block adalah satu **stasiun/etape** di sepanjang path.

- **Kamera:** `OrthographicCamera` rotasi (35.264°, 45°) = true isometric; kamera **mengikuti karakter** (follow-cam halus dengan lerp).
- **Kendali karakter (dua mode, satu state):**
  - **Scroll mouse / touch:** progress perjalanan global (0 → 1). Lenis/GSAP menghaluskan; posisi karakter = fungsi dari progress di sepanjang spline path.
  - **Arrow keys ← → ↑ ↓:** langsung menggerakkan karakter di sepanjang path (←/↑ mundur, →/↓ maju). Smart TV remote (arrow keys) ikut terdukung otomatis.
  - Konflik scroll vs key ditangani lewat satu `targetProgress` tunggal; siapa pun yang terakhir menulis menang (lerp mengikuti).
- **Animasi karakter:** walk-cycle (bone-based GLTF atau rig sederhana dari primitives), arah menghadap mengikuti vektor path; idle/sit saat di stasiun interaktif (Play Moment), wave saat masuk Contact.
- **Progres:** indikator "Etape 1–12" kecil di pojok (dot/timeline), etape aktif menyala; juga jadi anchor navigasi.
- **Stasiun:** setiap block dibangun di tepi path — Hero = pintu masuk kantor, Services = rak proyek, Numbers = papan angka, Signature = war room diorama, Play Moment = area sandbox, Contact = meja resepsionis, Footer = gerbang akhir/logo besar.
- **Mobile:** touch scroll/drag = scroll (mode utama); arrow-key fallback via on-screen d-pad kecil (opsional).
- **Fallback `prefers-reduced-motion` / no-WebGL:** karakter & perjalanan dinonaktifkan; 12 block tampil sebagai halaman statis normal, konten tidak hilang.

### 4.2 Scene & Teknis

- **Style:** low-poly flat-shaded, palet brand Cartenz — putih + teks gelap + aksen biru **`#408FB4`** (khas cartenz.co.id), outline tipis. Logo Cakrawala monokrom dipakai sebagai glyph/pattern.
- **Karakter & props:** model CC0 (Quaternius Universal Animation Library / Kenney Character Kit) — walk-cycle siap pakai, lisensi CC0/CC-BY dicatat di Tribute; alternatif: rig dari primitives dengan animasi procedural.
- **Satu kanvas global:** satu `Canvas` R3F memuat dunia + karakter + semua stasiun; panel konten HTML (DOM) melayang di atas sebagai overlay per etape → aksesibilitas & SEO tetap utuh (konten tetap HTML, bukan teks di canvas).
- **Performance:** instancing untuk pohon/props berulang, `frameloop="demand"` ketika karakter diam & tidak ada animasi aktif, DPR ≤ 2, LOD sederhana (props hilang di phone), suspend saat tab hidden.
- **Collision/interaksi:** raycast ringan untuk "masuk" stasiun interaktif (Play Moment berpindah ke physics 2D/Matter.js overlay; MapLibre tetap DOM overlay).

---

## 5. Footer Tribute (wajib)

Daftar yang harus dicantumkan dengan nama + lisensi + link:
- Library: React, Three.js, React Three Fiber, drei, GSAP, Lenis, Matter.js, MapLibre GL, Tailwind
- Map data: © OpenStreetMap contributors (ODbL)
- Fonts: nama font + lisensi (OFL)
- Icons: Lucide (MIT)
- 3D models & karakter: Quaternius (CC0) / Kenney (CC0) / Poly Pizza (CC-BY, sebut author) — jika dipakai
- Partner/client logos: milik masing-masing pemegang merek, digunakan untuk referensi portofolio
- Foto (jika ada): Unsplash/Pexels + nama fotografer

---

## 6. Struktur Project

```
cakrawala/
├─ public/
│  ├─ logo/ (cakrawala-black.svg, cakrawala-white.svg)
│  ├─ partners/ (logo hasil ekstraksi PPTX, dioptimasi)
│  └─ models/ (glb low-poly, opsional)
├─ src/
│  ├─ content/ (en.json, id.json, projects.json, partners.json, numbers.json, journey.json)
│  ├─ blocks/ (01-Navigation … 12-Footer, satu folder per block = panel DOM per stasiun)
│  ├─ journey/ (path spline, progress store, keyboard/wheel binding, etape indicator)
│  ├─ three/ (World canvas, IsoCamera follow-cam, character/ walk-cycle, stations/)
│  ├─ play/ (physics world Matter.js)
│  ├─ styles/ (tokens.css, fluid.css)
│  └─ lib/ (i18n, breakpoints, reduced-motion)
├─ PLAN.md
└─ TRIBUTE.md (sumber Footer tribute)
```

Semua teks & angka hanya dari `src/content/*.json` → mudah diaudit "real data only".

---

## 7. Fase Pengerjaan

| Fase | Output | Verifikasi |
|---|---|---|
| **0. Content & assets** | `content/*.json` EN+ID, ekstrak ~42 logo partner dari PPTX, optimasi SVG logo | Review data vs deck |
| **1. Scaffold & responsive system** | Vite+React+Tailwind, tokens, fluid root, layout shell, i18n | Screenshot 390/1440/1920/2560/3840 |
| **2. Blocks statis** | Panel konten DOM 01 Nav, 04 Services, 05 Credibility, 06 Numbers, 08 Market, 09 About, 11 Contact, 12 Footer+Tribute | Lighthouse ≥ 90, a11y |
| **3. Journey core** | Spline path, `targetProgress` store, wheel + arrow-key binding, follow-cam, indikator etape 1–12 | Karakter jalan mulus via scroll & ←→↑↓, konsisten di 5 viewport |
| **4. Dunia 3D + karakter** | World canvas, stasiun dasar, karakter + walk-cycle CC0, Hero (02) & Cinematic (03) jadi etape perjalanan | FPS ≥ 50 di laptop, ≥ 30 di phone; reduced-motion fallback |
| **5. Stasiun lanjutan** | Numbers trigger saat dilewati, Signature diorama (07), Market pins (08), About (09) | Konten faktual sesuai deck |
| **6. Play Moment (10)** | Matter.js sandbox, touch/keyboard, karakter idle di stasiun | Tidak crash di TV/phone |
| **7. QA & polish** | Cross-viewport, TV arrow-key nav, SEO meta, OG image | Checklist 12 blocks + uji kendali scroll & keyboard |
| **8. Deploy** | GitHub Pages (Actions) + opsional Qoder Sites | URL live + smoke test |

---

## 8. Keputusan Terkonfirmasi

1. **Tahun berdiri:** 2014 ("12 tahun berkarya" ✅ konsisten).
2. **Alamat:** Wisma Bumiputera Lt. 9, Jl. Jenderal Sudirman Kav. 76, Jakarta Selatan 12920 — sesuai cartenz.co.id (catatan: terdaftar di companieshouse sebagai Kav. 75; pakai Kav. 76 per website resmi).
3. **Kontak:** telepon/WhatsApp **+62 815 1941 5874** · LinkedIn **linkedin.com/company/cartenz** · email: *TBC* (tidak ditemukan di cartenz.co.id — pakai `hello@cartenz.co.id` sebagai placeholder sampai dikonfirmasi).
4. **Partner logos:** boleh dipakai — merepresentasikan layanan/klien lembaga pemerintah pusat yang dilayani Cartenz.
5. **Aksen warna:** biru Cartenz **#408FB4**, gaya khas cartenz.co.id (putih, bersih, modern).
6. **Play Moment:** konsep "Build the Stack" (dijelaskan di bawah).
7. **Bahasa default:** **Indonesia** (EN via toggle).
8. **Deadline: deploy maksimal Jumat, 13 Nov 2026.**

## 9. Deadline Jumat — Strategi Kompresi

Waktu sisa < 2 hari kerja, jadi prioritas tegas:

- **Wajib (MVP lomba):** journey core + karakter berjalan, 12 block tampil utuh dengan real data, responsive 5 viewport, footer tribute, deploy Jumat.
- **Boleh dikompromikan bila kepepet:** peta MapLibre → diganti tombol "Lihat di Google Maps"; partner logo dijadikan subset (±12 logo utama); Play Moment pakai preset level (bukan drag bebas); OG image sederhana.
- **Urutan eksekusi:** Blocks statis + konten (rabu malam) → Journey core (kamis pagi) → 3D stasiun + karakter (kamis siang–malam) → Play Moment + polish (jumat pagi) → deploy & smoke test (jumat siang).
- **Play Moment — "Build the Stack":** saat karakter tiba di stasiun 9, ia duduk idle dan muncul area sandbox 2D-look isometric. User men-drag blok dari tray (server, laptop, dokumen, cloud, gelas kopi) lalu melepasnya; blok jatuh dan bertumpuk dengan physics Matter.js — bisa ditabrak, didorong, runtuh. Setiap blok berlabel layanan nyata Cartenz (server = System Integration, cloud = Data Platform & Governance, dokumen = PMQA, laptop = Platform Development, kopi = O&M 😄) sehingga main sekaligus edukatif. Ada counter tinggi tumpukan + tombol reset + high score di localStorage. Input: touch, mouse, dan keyboard (panah pilih blok, Enter lepas). Aman untuk TV remote.

## 10. Transisi Ganti Bahasa (ID ↔ EN) — "Epic Language Flip"

**Pengalaman:** satu gerakan penuh layar yang terasa seperti "tirai dunia" — bukan sekadar fade.

### Konsep visual
1. **Cover** — layar tertutup panel tinta gelap (`#101418`) yang menyapu dari arah tombol bahasa memakai `clip-path: circle()` yang mengembang ke seluruh viewport (kurang lebih 500 ms, easing `power3.inOut`).
2. **Midpoint** — di tengah layar gelap: logo perisai Cakrawala melakukan **flip 3D** (rotateY 180°) sementara huruf besar bergulir `"ID → EN"` / `"EN → ID"` melewati tengah layar seperti papan kedatangan bandara (efek roll / marquee vertikal). Di puncak cover, **state bahasa React di-swap** — scroll position dipertahankan.
3. **Reveal** — panel gelap menyusut lewat `clip-path` ke arah berlawanan (atau iris ke logo), konten baru terlihat dengan **stagger cascade**: panel stasiun yang terlihat di viewport fade+slide masuk satu per satu (±60 ms antar panel, hanya panel dalam viewport via IntersectionObserver — hemat di TV/hp).
4. Bonus kamera: saat cover, kamera 3D melakukan **dolly-in kecil** ke arah karakter (zoom +8 lalu balik) sehingga dunia ikut "bernafas". Opsional, hanya jika frame budget aman.

### Spesifikasi teknis
- **Durasi total:** 1,2–1,5 detik; seluruhnya `transform` + `opacity` + `clip-path` (composite-friendly, tanpa layout thrash).
- **Implementasi:** `src/lib/languageTransition.ts` (zustand mini-store: `phase: 'idle' | 'cover' | 'swap' | 'reveal'`) + komponen `LanguageTransitionOverlay.tsx` (fixed inset-0 z-50, pointer-events hanya saat aktif). Timeline diorkestrasi GSAP; swap bahasa terjadi di callback `onComplete` fase cover.
- **Trigger:** tombol EN/ID di Nav memanggil `transitionTo(nextLang)` — tidak lagi toggle instan.
- **A11y:** `aria-live="polite"` mengumumkan "Bahasa diubah ke English/Indonesia"; fokus keyboard tidak hilang (overlay `aria-hidden` saat idle; tombol bahasa tetap fokusable setelah transisi).
- **`prefers-reduced-motion`:** swap instan tanpa animasi apa pun.
- **Risiko & mitigasi:** tinggi konten beda antar bahasa bisa menggeser scroll → kunci scroll (`overflow: hidden` di body selama transisi) lalu pulihkan; jangan animasikan semua 11 panel sekaligus — hanya yang visible; disable dolly kamera di phone bila FPS < 40.

### Fase pengerjaan (masuk setelah Play Moment)
1. Store fase + overlay cover/reveal (clip-path + logo flip + rolling letters).
2. Integrasi trigger Nav, swap di midpoint, kunci scroll.
3. Stagger reveal panel terlihat + uji 5 viewport & reduced-motion.
4. Polish timing/easing berdasarkan feel di TV & phone.

## 11. HUD Play Character — Kontras, Control Deck, dan Menu Pause/Esc

### 11.1 Masalah yang dilaporkan

1. Tombol **"Hapus semua"** tidak kontras: hanya border `white/25` + teks `white/85` di atas
   latar transparan, sehingga nyaris hilang di langit 3D yang terang.
2. Petunjuk keyboard masih berupa satu paragraf kecil di pojok kiri atas — tidak terbaca,
   tidak berkarakter, dan berdesakan dengan judul serta jumlah blok.
3. **Esc** belum punya tempat yang jelas di petunjuk, padahal itu satu-satunya jalan keluar
   yang cepat.
4. Tombol **Keluar** dan **Hapus semua** tidak bisa diklik saat bermain.

### 11.2 Akar masalah (dari kode)

- `src/game/GameScene.tsx` memanggil `requestPointerLock()` pada klik canvas. Selama pointer
  terkunci, OS menyembunyikan kursor dan **semua event kursor dikirim ke canvas**, bukan ke
  HUD. `pointer-events-auto` pada tombol tidak menolong karena tidak ada kursor yang bisa
  mencapainya.
- `src/game/GameHud.tsx` menangani `case 'Escape': exit()`, tetapi browser memakai Esc untuk
  **melepas pointer lock**. Perilaku keydown-nya berbeda antar-browser: di sebagian browser
  Esc tidak sampai ke halaman saat terkunci, di browser lain sampai tetapi sudah terlambat
  konsisten. Akibatnya Esc kadang keluar, kadang hanya membebaskan kursor, kadang tidak terjadi
  apa-apa.

### 11.3 Keputusan UX: Esc dua tahap

Tidak mungkin membuat tombol HUD bisa diklik selama kursor terkunci (batasan Pointer Lock API).
Solusi standar game: sediakan **menu jeda** yang otomatis muncul saat kursor dilepas.

| Kondisi | Aksi Esc | Hasil |
|---|---|---|
| Sedang bermain (pointer terkunci) | Esc | Browser melepas lock → `pointerlockchange` → **menu jeda**: pemain berhenti, kursor kembali, semua tombol bisa diklik |
| Menu jeda terbuka | Esc | Batal konfirmasi "Hapus semua" bila sedang terbuka; jika tidak, **keluar ke situs** dan kembali ke checkpoint Play |
| Mode `freeAim` (lock ditolak browser) | Esc | Langsung keluar (kursor memang sudah bebas) |
| Layar sentuh | Tombol **Menu** | Membuka panel jeda yang sama (paritas tanpa Esc) |

Saat terkunci, dua tombol di kanan atas **diganti chip non-klik** `Esc · Menu` agar tidak ada
affordance palsu (tombol yang terlihat bisa diklik tetapi tidak bisa). Tombol asli hanya
muncul di panel jeda.

Penanganan event: satu sumber kebenaran adalah `pointerlockchange`, bukan `keydown Escape`.
`keydown Escape` hanya bertindak ketika **tidak** terkunci, agar tidak dobel aksi.

### 11.4 Control Deck (panel petunjuk baru)

Panel "epic" menggantikan paragraf petunjuk, khusus pointer halus (desktop); di layar sentuh
tetap memakai `gameHintTouch` + tombol kontrol sentuh.

- **Posisi:** kiri bawah, di atas joystick sentuh (desktop), lebar 20–23rem; hotbar material
  tetap di tengah bawah.
- **Gaya:** glass gelap `#101418/85` + `backdrop-blur`, garis aksen 3 px `#408fb4` di tepi atas,
  corner tick tipis, label `KONTROL` dengan titik kuning `#f2b23c`, shadow lembut.
- **Isi 3 grup, grid 2 kolom di dalam grup:**
  - **GERAK** — keycap `W` `A` `S` `D` dalam formasi silang, `Shift` (lari).
  - **AKSI** — `Space` (lompat), ikon klik kiri + `Klik kiri` (hancurkan), klik kanan +
    `Klik kanan` (pasang).
  - **SISTEM** — `1`–`5` (material), `Esc` dengan keycap merah `#a12f22` + label
    **Jeda / Keluar**.
- **Keycap:** `kbd` 1,9rem, sudut 6 px, gradien putih ke `#e6edf1`, border bawah 2 px
  `#b9c7cf`, teks ink, `box-shadow` inset — terlihat seperti tombol fisik. Keycap `Esc`
  memakai palet bahaya.
- **Ringkas / lipat:** tombol chevron di header; state disimpan di
  `localStorage['cakrawala-hud-deck-v1']`. Saat dilipat, menyisakan pill
  `Esc · Kontrol` agar jalan keluar tetap terlihat.
- **Motion:** fade + slide 12 px dalam 180 ms saat masuk; `prefers-reduced-motion` → tanpa
  animasi.
- **Top-left:** dikecilkan menjadi chip dunia: judul `Cakrawala Playground` + `Blok tersimpan:
  N`. Paragraf hint lama dihapus dari sana.
- **Responsif:** `< lg` atau `pointer: coarse` → deck disembunyikan; petunjuk sentuh
  ditampilkan sekali di awal.

### 11.5 Tombol "Hapus semua" yang kontras + aman

- Permukaan **solid** `#f7f9fa`, teks `#a12f22`, ikon `Trash2`, border `#a12f22/35`,
  shadow. Rasio kontras ≈ 7:1 (target WCAG AA ≥ 4,5:1).
- Hover: isi `#a12f22`, teks putih. Fokus keyboard: ring 2 px `#f2b23c`.
- **Konfirmasi dua tahap** karena aksi ini destruktif dan tidak ada undo:
  klik pertama → tombol berubah menjadi `Yakin hapus N blok?` + tombol `Batal`; auto-batal
  setelah 4 detik; `Esc` saat menu jeda membatalkan konfirmasi lebih dulu.
  Teks jumlah blok diambil dari store agar jelas apa yang akan hilang.
- Setelah dihapus, jumlah di HUD dan panel jeda langsung menjadi 0; tetap di menu jeda.

### 11.6 Panel jeda

- Overlay `role="dialog"` + `aria-modal="true"`, backdrop `#0b1216/55` + blur ringan.
- Kartu tengah maks 26rem: judul **"Jeda"**, subjudul "Kursor aktif. Tekan Esc lagi untuk
  keluar.", statistik `Blok tersimpan: N`, lalu tiga aksi:
  1. **Lanjutkan** (primary, `autoFocus`) — meminta pointer lock lagi (klik = user gesture
     yang sah).
  2. **Hapus semua** (danger, aturan 11.5).
  3. **Keluar ke situs** (secondary) — memanggil `exit()` seperti sekarang.
- Selama jeda: `useFrame` melewati look, gerak, lompat, dan build/break; kamera diam; karakter
  idle. `resetInput()` dipanggil agar tidak ada input “nyangkut” saat resume.
- Fokus keyboard masuk ke tombol Lanjutkan; Tab berputar di dalam dialog (focus trap
  sederhana); Esc menutup dialog = keluar.
- `prefers-reduced-motion` → backdrop tanpa blur transisi.

### 11.7 Perubahan kode

| File | Perubahan |
|---|---|
| `src/game/store.ts` | Tambah `paused: boolean`, `setPaused()`; `enter()` selalu reset `paused = false`. |
| `src/game/GameScene.tsx` | Listener `pointerlockchange`: jika sebelumnya terkunci lalu lock hilang → `setPaused(true)`; saat `paused` lewati input & build. Jangan memaksa lock saat resume (butuh gesture). Tidak lagi merender lantai/dinding/blok arena. |
| `src/game/GameHud.tsx` | Hook status lock, panel jeda, Esc dua tahap, tombol kontras, konfirmasi hapus, Control Deck, chip `Esc · Menu` saat terkunci, tombol Menu di sentuh. Keycap mouse memakai label eksplisit `Klik kiri` / `Klik kanan`. |
| `src/game/input.ts` | Tambah `lockState.lastLostAt` sebagai penjaga 300 ms agar Esc yang melepas lock tidak ikut keluar; `resetInput()` dipanggil saat jeda. |
| `src/game/Arena.tsx`, `src/game/layout.ts` | Blok dirender di dunia journey (`ARENA_ORIGIN` = stasiun Play, `z − 4`); `arenaRefs` menyambungkan mesh ke `GameScene`. |
| `src/three/World.tsx` | `<Arena />` dirender di **kedua** mode; kamera saja yang bertukar. |
| `src/three/Stations.tsx` | Stasiun Play hanya menyisakan papan tanda; slab plaza 10×8 dihapus karena arena memakai tanah yang sama dengan jalur karakter. |
| `src/content/id.json`, `en.json` | String baru: `menu`, `pauseTitle`, `pauseLead`, `resume`, `clearConfirm`, `clearYes`, `clearCancel`, `deckTitle`, `deckMove`, `deckAction`, `deckSystem`, `deckRun`, `deckJump`, `deckBreak`, `deckPlace`, `deckPick`, `deckEscTitle`, `deckEsc`, `escHint`, `mouseLeft`, `mouseRight`, `saved`. `gameHint` panjang tidak lagi tampil di HUD desktop (disimpan sebagai fallback). |
| `README.md` | Perbarui kontrol game: Esc dua tahap, menu jeda, konfirmasi hapus, Control Deck, arena berbagi dunia. |
| `scripts/play-qa.mjs` | Uji jeda, hapus, resume, dan keluar dua tahap. |

Tidak ada library baru → tribute di Footer tidak berubah.

### 11.8 Kriteria selesai

1. Masuk game → klik kanan/kiri canvas → pointer lock aktif → tekan **Esc** → panel jeda
   muncul, karakter berhenti, kursor terlihat, dan **semua tombol bisa diklik**.
2. Klik **Hapus semua** → muncul konfirmasi jumlah blok → konfirmasi → HUD 0 dan
   `localStorage['cakrawala-play-world-v1']` = `[]`; **Batal**/Esc tidak menghapus apa pun.
3. Klik **Lanjutkan** → pointer lock kembali, WASD/look berfungsi, tidak ada gerakan
   “tersangkut”.
4. Dari panel jeda, tekan **Esc** → fade ke situs, scroll tepat di checkpoint Play, blok yang
   tidak dihapus tetap ada saat masuk lagi.
5. Control Deck terbaca di 1440/1920/2560/3840; di 390 px tersembunyi dan petunjuk sentuh
   tampil; keycap `Esc` selalu terlihat.
6. Kontras tombol hapus ≥ 4,5:1 (diverifikasi manual dari warna final).
7. `scripts/play-qa.mjs` lulus: setelah lock, `document.exitPointerLock()` → panel jeda
   terdeteksi; hapus → 0 blok; resume → `document.pointerLockElement` terisi lagi; Esc
   (terkunci) → panel jeda; Esc kedua dari jeda → `scrollY` kembali ke stasiun 9.

### 11.9 Risiko & mitigasi

- **Esc tidak konsisten antar-browser** → jangan bergantung pada keydown saat terkunci; pakai
  `pointerlockchange` sebagai pemicu jeda, keydown hanya untuk kondisi sudah bebas.
- **Resume ditolak** karena bukan user gesture → resume hanya lewat klik tombol, bukan
  otomatis saat jeda.
- **Safari/Firefox** bisa menolak `requestPointerLock` → fallback `freeAim` tetap jalan; tombol
  HUD memang selalu bisa diklik di mode itu.
- **iPhone/tablet tanpa Esc** → tombol Menu membuka panel yang sama.
- **Pointer lock hilang karena alt-tab** → dianggap jeda; aman, pemain tidak berjalan sendiri.

### 11.10 Arena = ruang yang sudah dilalui karakter

Arena bukan ruang baru. Blok dibangun tepat di jalur journey, di stasiun Play, sehingga situs
dan mode main memakai satu dunia yang sama:

- `ARENA_ORIGIN` = posisi stasiun Play (`x = 104`, `z = −0,5`, yaitu `PLAY.z − 4`), pusat sel
  blok.
- `<Arena />` hidup di dalam `<World />` dan dirender pada **kedua** mode; yang bertukar hanya
  kamera (`CameraRig` ↔ `GameScene`) dan lapisan HUD.
- Tanah arena adalah tanah grid yang sama; raycast blok memakai `arenaRefs.floor`, sebuah
  plane tak terlihat, bukan lantai terpisah.
- Karakter memakai satu model dan satu posisi modul (`characterPos`), jadi saat masuk mode main
  ia berdiri di tempat ia berhenti di mode situs.
- Slab plaza tan 10×8 di `Stations.tsx` dihapus: sebelumnya terlihat seperti ruang terpisah
  yang melayang di atas grid.
- Saat keluar, blok tetap terlihat di stasiun Play dan setelah reload (persisten di
  `localStorage['cakrawala-play-world-v1']`).

Kriteria: blok yang dibangun terlihat di mode situs tanpa masuk mode main; tidak ada mesh
lantai/dinding tambahan; tanda stasiun (papan) tetap menjadi satu-satunya penanda arena.

## 12. Perbaikan gerakan lompat (countermovement) + tribute sumber lengkap

### 12.1 Masalah gerakan lompat lama

`GameScene` lama hanya men-set `player.vy = JUMP_SPEED` lalu `gait.lift = y − surface`;
`EricVisual` menambah `lift` ke `bodyY` tanpa mengubah pose. Hasilnya karakter **naik seperti
lift/elevator**: kaki tetap lurus/idle, tidak ada ancang-ancang, tidak ada tuck di udara, tidak
ada absorpsi saat mendarat. Ini terbaca sebagai cacat visual utama pada mode main.

### 12.2 Riset internet (biomekanika lompat)

Sumber terpublikasi yang dipakai (tautan aktif di Footer tribute & README §6.8/§9.1):

| Sumber | Temuan yang dipakai |
|---|---|
| Owen NJ et al. *Understanding the key phases of the countermovement jump force-time curve.* Strength Cond J 40(4):96–106, 2018. doi:10.1519/SSC.0000000000000375 | Enam fase: weighing, unweighting, **braking**, **propulsion**, **flight**, **landing** → mesin state lompat. |
| Bobbert MF et al. Med Sci Sports Exerc 28(11):1402–1412, 1996. | Countermovement (dip) menambah kerja push-off vs squat jump → wajib ada dip sebelum take-off. |
| Komi PV, Bosco C. Med Sci Sports Exerc 10(4):261–265, 1978. | Energi elastis tersimpan saat braking → dip singkat lalu explode. |
| Harman EA et al. Med Sci Sports Exerc 22(6):817–823, 1990. (pubmed 2287261) | Arm swing menambah ±10–11 cm tinggi lompat → lengan ayun belakang→overhead. |
| Lees A et al. J Biomech 37(12):1929–1940, 2004. | Arm swing +8,6 cm (via Theia Markerless) → konfirmasi arah ayun. |
| McHugh MP et al. 2024. PMC11208864. | Kedalaman countermovement & fleksi lutut braking → sudut hip/lutut dip. |
| Petushek EJ. Tesis NMU, 2011. | Fleksi lutut saat mendarat (absorpsi) → pose landing. |
| Linthorne NP. Am J Phys 69(11):1198–1206, 2001. | Rumus flight-time `h = g·t²/8` dan impulse–momentum `J = ∫F dt = m·Δv`. |
| McGinnis PM. *Biomechanics of Sport and Exercise*, 3rd ed. 2013. | Projectile `h = v₀²/2g`, `t = 2v₀/g`. |

Rumus fisika yang dipakai game (sudah ada, kini didokumentasikan eksplisit):
`h = v₀²/2g = 7,6²/48 ≈ 1,20 unit`; `t_udara = 2v₀/g ≈ 0,63 s`; `h = g·t²/8`;
`J = m·Δv`; integrasi semi-implicit Euler `v += −g·dt; y += v·dt`; damp eksponensial
`x += (target−x)(1−e^{−λ·dt})`.

### 12.3 Keputusan pose & state

- Mesin lompat di `GameScene`: `jumpState 0 idle / 1 braking dip / 2 flight / 3 landing`.
  `CROUCH_S = 0,22 s` (braking), `LAND_S = 0,3 s` (absorpsi). Take-off hanya setelah dip selesai.
- `gait` diperluas: `jumpState, crouch, vy, airT, landT, impact`. `CharacterDriver` (mode situs)
  mereset semuanya ke 0 agar pose lompat tidak bocor ke journey.
- `EricVisual` mem-blend pose lompat di atas stride (damp λ=16 pose, λ=12 bobot):
  dip (hip −0,85 / lutut 1,45 / lengan belakang +0,8 / spine 0,42), rise (tuck lutut 1,2 /
  lengan overhead −2,35), fall (reach lutut 0,8 / lengan depan −0,95), landing (lutut 1,6 /
  hip −0,95, bobot × impact).
- Kedalaman dip & absorpsi lowering pelvis **otomatis** lewat solver kontak tanah
  `reach(hip,knee)`, bukan offset hardcoded; shadow memberi pulse saat mendarat.
- Touch-down nyata dibedakan dari frame berdiri via `hitSpeed > 3` (frame berdiri hanya
  berdarah ~g·dt), sehingga jatuh dari blok juga memakai pose absorpsi.

### 12.4 Tribute: semua sumber, termasuk dokumen perusahaan & rumus

Footer tribute berubah dari daftar datar menjadi **lima grup** (`footer.tributeGroups`,
item `{text, href?, mono?}`), dirender grid 2 kolom (grup rumus fisika span penuh):

1. **Teknologi & aset** — React/TS/Vite/Tailwind, three/R3F, GSAP/Lenis, Zustand, Lucide,
   Playwright-core, model Eric (Personal Use).
2. **Dokumen perusahaan** — deck company profile Cartenz (PPTX, ±42 logo slide 2),
   cartenz.co.id, PLAN.md §3/§8, merek logo mitra.
3. **Gerak lari — sumber & rumus** — Perry & Burnfield 2010, Novacheck 1998, Weyand 2000,
   Cavanagh & Kram 1989 + rumus cadence/stride/fleksi lutut (mono).
4. **Gerak lompat — sumber & rumus** — Owen 2018, Bobbert 1996, Komi & Bosco 1978,
   Harman 1990, Lees 2004, McHugh 2024, Petushek 2011, Linthorne 2001 + rumus
   `h=v₀²/2g`, `t=2v₀/g`, `h=g·t²/8`, `J=m·Δv` (mono).
5. **Rumus fisika & integrasi** — Euler semi-implicit, damp eksponensial, clamp akselerasi,
   phase terkunci tanah, raycast face-normal (mono).

`Panel` Footer memakai `wide` (58rem) agar dua kolom kutipan terbaca. README §6.5 (tabel pose
+ rumus), §6.8 (baris referensi lompat), §7.1, §9/§9.1 diselaraskan.

### 12.5 Perubahan kode

| File | Perubahan |
|---|---|
| `src/three/shared.ts` | `gait` + field lompat (`jumpState/crouch/vy/airT/landT/impact`). |
| `src/game/GameScene.tsx` | Mesin CMJ (dip→explode→flight→absorb), publish state lompat, `moving=0` saat dip/absorb. |
| `src/three/Character.tsx` | Blend pose lompat di atas stride; reset state lompat di mode situs; shadow landing pulse. |
| `src/blocks/Footer.tsx` | Render `tributeGroups` (grid, link, mono), `Panel wide`. |
| `src/content/id.json`, `en.json` | `tribute` → `tributeGroups` lima grup lengkap. |
| `README.md`, `PLAN.md` | Dokumentasi pose/rumus/referensi lompat + tribute sumber. |

Tidak ada library baru → tidak ada perubahan lisensi di luar penambahan Playwright (sudah ada).

### 12.6 Kriteria selesai

1. Tekan Spasi → terlihat **dip** (lutut menekuk, lengan ke belakang) sebelum badan naik.
2. Saat rise → kaki tuck + lengan overhead; saat fall → kaki reach + lengan depan.
3. Saat mendarat → lutut/hip absorpsi singkat lalu kembali idle/stride; shadow pulse.
4. Lompat berulang & lompat sambil lari tidak menghasilkan pose "nyangkut" atau kaki selip.
5. Jatuh dari blok memakai pose absorpsi yang sama.
6. Mode situs tidak pernah menampilkan pose lompat (state direset driver).
7. Footer tribute menampilkan lima grup dengan tautan sumber aktif dan rumus mono; terbaca
   di 390 px (satu kolom) dan ≥768 px (dua kolom).
8. `tsc -b`, `npm run build`, `play-qa.mjs`, `verify2.mjs` lulus tanpa console error.

### 12.7 Perbaikan kerangka pose & verifikasi visual (selesai)

Gejala "kaki tetap lurus saat lompat" ternyata **dua hal berbeda**:

1. **Kerangka rotasi pose.** `poseBone` kini mem-post-multiply rotasi terhadap sumbu anatomis
   karakter yang dipetakan ke kerangka rest tulang: `q = q_rest · R(invRestWorldQ · sumbu, sudut)`
   dengan `invRestWorldQ = (q_parent · q_rest)⁻¹` (dihitung sekali saat mount, ketika FBX masih
   lepas dari group root sehingga skala 0,01 + yaw root tidak mencemari kerangka). Identitas
   `Q·R(Q⁻¹v, θ) = R(v, θ)·Q` membuat rotasi world tepat tentang sumbu fleksi sagittal — bukan
   sumbu twist tulang yang tak terlihat. Sumbu diturunkan dari landmark (`head−pelvis`,
   `ball_l−foot_l`), bukan hardcoded basis UE4.
2. **Artefak kamera QA.** Kamera tepat di depan/belakang karakter mem-foreshorten seluruh gerak
   sagittal: squat 45° dan tuck 63° terbaca "kaki lurus" dari sudut itu. Verifikasi akhir memakai
   kamera samping (orbit `player.yaw` ≠ `facing`) dan freeze in-page per fase CMJ, plus piksel
   jujur `toDataURL()` (DEV `preserveDrawingBuffer`). Hasil terukur: dip lutut ≈45–83°, apex tuck
   ≈63° dengan lengan overhead, fall reach, landing absorpsi ≈92°; run cycle tetap grounded
   (fleksi swing ≈117°, lean badan, ayun lengan berlawanan).

Hook debug DEV (`__poseDebug`, `__poseOff`, `__timeScale`, `__camDist`, `__jumpDebug`, `skinInfo`)
dan skrip probe sementara dihapus setelah verifikasi; regresi dijalankan lewat `play-qa.mjs`,
`jump-qa.mjs`, `verify2.mjs` (semua lulus, console error kosong, tribute 5 grup / 8 tautan /
10 rumus mono, tanpa overflow horizontal di 390 px).

### 12.8 Risiko & mitigasi

- **Dip menambah latency lompat** (0,22 s) → terasa "berat" bila terlalu lama; 0,22 s sesuai
  braking CMJ dan masih responsif; QA memverifikasi frame rise tepat setelah dip.
- **Pose blend bertabrakan dengan stride** → bobot `w` dan damp memastikan transisi mulus;
  `moving=0` saat dip/absorb agar stride tidak ikut menggerakkan kaki.
- **Kutipan salah atribusi** → semua entri tribute memakai penulis/tahun/jurnal yang
  diverifikasi lewat pencarian web (Owen 2018 Strength Cond J, bukan JSCR 2014).

## 13. Gameplay bermakna — falsafah tumpukan blok (selesai)

### 13.1 Ide falsafah yang diwujudkan

Arena bukan sekadar sandbox menumpuk kubus: lima jenis blok adalah **lima lapis
sistem yang hidup**, dibangun dari tanah ke langit dalam urutan yang jujur:

| Lapis | Jenis blok | Makna (ID / EN) | Layanan Cartenz |
|---|---|---|---|
| I | server | Fondasi / Foundation | Roadmap & Blueprint |
| II | cloud | Karya / Craft | Platform Development |
| III | doc | Mutu / Quality | PMQA |
| IV | laptop | Perubahan / Change | Change Management |
| V | gear | Rawat / Care | Operation/Maintenance |

Aturan dan konsekuensi (semuanya di `src/game/meaning.ts`, murni & teruji):

1. **Hukum fondasi** — `isSupported`: blok hanya berdiri di tanah atau di atas blok
   lain. Penempatan melayang ditolak (`notice: reject` + bunyi deny).
2. **Niat menumpuk** — klik sisi vertikal blok berarti "teruskan di atasnya":
   target otomatis naik satu sel bila sel atas kosong (`GameScene.tsx`), sehingga
   menara lima lapis dapat dibangun dari tanah tanpa memanjat; bila sel atas
   sudah terisi, klik sisi menghasilkan sel samping yang melayang → hukum
   fondasi tetap punya gigi.
3. **Runtuh berantai** — `cascade`: mencabut fondasi menjatuhkan seluruh yang
   bertumpu padanya (iterasi sampai stabil), dengan notice + bunyi collapse.
4. **Pindaian makna** — `scanMeaning`: run terpanjang dari tanah ke atas dalam
   urutan kanonik I→V = `progress` (0–5); `height` = kolom tertinggi; `best`
   persisten. Tangga makna HUD menyalakan chip romawi I–V sesuai progress.
5. **Hadiah cakrawala** — progress 5 memunculkan **mercusuar** (cap amber
   berdenyut, beam aditif, cincin tanah, 42 mote naik; di luar grup raycast
   sehingga cahaya bukan blok), kartu perayaan "Cakrawala terbuka", dan
   **cahaya fajar** permanen (`Atmosphere` di `World.tsx`: latar & warna lampu
   di-lerp ke amber). Berdiri di ketinggian ≥4 juga membuka vista — janji brand:
   semakin kokoh yang dibangun, semakin luas yang dilihat.
6. **Renungan** — enam aforisme (`first, pair, reject, collapse, complete, vista`)
   muncul sebagai toast saat peristiwanya terjadi dan terkoleksi permanen di
   menu pause (daftar Renungan, scrollbar gelap berpalet).
7. **Bunyi sintetis** — `src/game/audio.ts` (WebAudio native, tanpa dependensi
   baru): place thock, break, deny, collapse, arpeggio complete, swell vista.
   Aktif default; satu tombol mute terlihat di kanan atas HUD, persisten
   (`cakrawala-audio-v1`). Tribute tidak berubah karena tidak ada aset/library baru.

### 13.2 Persistensi & state

- `cakrawala-play-world-v1` — blok (sudah ada).
- `cakrawala-meaning-v1` — `{best, done, vista, unlocked[]}` dengan validasi saat load.
- `cakrawala-audio-v1` — `'off'` bila mute.
- Perayaan hanya sekali (`done`); vista permanen; rebuild tetap memunculkan mercusuar.

### 13.3 QA deterministik (`scripts/meaning-qa.mjs`)

Aim crosshair dihitung closed-form dari model kamera orbit
(`yawT = atan2(−dx, −dz)`, `pitchT = asin(−0,13889/√(1+m²)) − atan m`,
`m = (F.y−1,15)/hypot(dx,dz)`), dikirim sebagai `MouseEvent('mousemove')`
sintetis dengan delta dibulatkan dan dilacak agar galat tidak menumpuk.
**Pelajaran QA:** `page.mouse.click(x,y)` menggerakkan mouse virtual terlebih
dahulu — di bawah pointer lock gerakan itu menyuntik delta look nyata dan
merusak aim; gunakan `mouse.down/up` tanpa move. Hook ground-truth DEV-only
`window.__gameDebug = {player, camera, raycaster}` di `GameScene.tsx`.

Cakupan lulus: fondasi→lima lapis berurutan, toast first/pair, kartu perayaan +
kursor bebas + tangga 5/5, meta persisten, mute/unmute persisten, reject tanpa
mengubah dunia, cascade −5 blok, mercusuar tidak mencegat ray (blok y5 tetap
terpasang), Renungan 6 entri, keluar ke journey membawa blok, reload persisten,
HUD & pause 390 px tanpa overflow, console error kosong. Regresi `play-qa`,
`jump-qa`, `verify2` tetap lulus; `npx tsc -b` dan `npm run build` bersih.

## 14. Identitas visual — logo hitam di atas latar putih (selesai)

Keputusan: marka hitam `logo/cakrawala-black.svg` **selalu** duduk di atas bidang
putih murni, bukan langsung di atas kertas situs (`#f7f9fa`) maupun panel gelap.
Implementasi: plat `bg-white` rounded-2xl dengan border `#101418]/10` dan shadow
lembut membungkus `<img>` di `Hero.tsx` (h-20/sm:h-24, padding p-3) dan
`Footer.tsx` (h-16, p-2.5). Alasan: SVG berlatar transparan; tanpa plat, kontras
marka bergantung pada latar panel dan bisa tenggelam di permukaan gelap.
Verifikasi: computed background `rgb(255,255,255)` di kedua lokasi, screenshot
hero 1440/390 dan plat footer; tanpa overflow horizontal.

## 15. Scroll layar sentuh mengunci checkpoint (selesai)

### 15.1 Masalah

`settle()` lama memilih stasiun **ternearest** setelah scroll diam. Di mobile,
swipe setengah layar berhenti di antara dua stasiun dan tertarik **kembali** ke
stasiun asal (terukur: y 505 → 44) — gestur terasa dibatalkan, bukan dikunci.

### 15.2 Keputusan

Kontrak sentuh = kontrak wheel: **satu swipe = minimal satu checkpoint searah
gestur**, dan momentum tidak pernah dilawan mundur.

- `touchstart`: tandai `touch.active`, simpan stasiun awal (`nearestIndex`),
  batalkan hop yang sedang berjalan (`lockUntil = 0`, `pending = null`,
  `lenis.scrollTo(scrollY, {immediate:true, force:true})`) sehingga jari baru
  selalu mengambil alih.
- `touchend`/`touchcancel`: hitung `dy = startY − endY`; `|dy| ≥ 24 px` menentukan
  arah (selain itu = tap → settle nearest seperti semula).
- `settle()`: bila ada arah gestur, clamp stasiun nearest ke
  `[stasiunAwal+1 … akhir]` (swipe turun) atau `[0 … stasiunAwal−1]` (swipe naik);
  momentum yang membawa lebih jauh tetap dihormati (tidak mundur), lalu
  `scrollToStation` mengunci pusat kartu. Debounce `onScroll` (200 ms) menunda
  settle sampai momentum benar-benar habis; `touch.active` menahan settle selama
  jari masih di layar.

### 15.3 QA (`scripts/touch-qa.mjs`, emulasi CDP `Input.dispatchTouchEvent`, 390×844 hasTouch)

Lulus: swipe pendek maju satu stasiun (dist 0), swipe naik kembali satu stasiun,
swipe panjang terkunci di checkpoint depan, sentuh baru di tengah hop mengambil
alih dan tetap terkunci, tap tidak melompat stasiun, pageerror kosong.
Catatan: CDP tidak mensimulasikan momentum, sehingga swipe panjang diuji sebagai
"minimal satu langkah, terkunci" — perilaku momentum nyata ditangani clamp.

## 16. Kontrol Play mode di layar sentuh (selesai)

### 16.1 Masalah (dua penyebab, terlihat di screenshot Android)

1. **Pointer lock mencuri klik.** Ketukan kanvas memanggil `requestPointerLock()`;
   Chrome Android mengabulkannya (infobar "To show your cursor…"). Selama lock,
   setiap event `click` compatibility di-retarget ke elemen terkunci (kanvas),
   sehingga tombol HUD berbasis `onClick` (Menu, mute, hotbar) mati — hanya tombol
   aksi berbasis `onPointerDown` (Lompat/Hancurkan/Pasang/Lari) yang hidup.
2. **LookPad menutupi tombol.** `LookPad` (setengah kanan, `inset-y-0`) dirender
   setelah top bar dalam DOM sehingga melukis **di atas** tombol Menu/mute dan
   mencegat tap-nya (`intercepts pointer events`). Inilah sebabnya hanya tombol
   aksi (dirender setelah LookPad) yang bisa diketuk.

### 16.2 Keputusan

- **Tanpa pointer lock di sentuh.** Cabang `onClick` kanvas untuk
  `(pointer: coarse)` tidak pernah mengunci; ia membidik lewat tap. Efek HUD
  additionally melepas lock liar bila ada (`touch && pointerLockElement → exit`),
  dan `resume()` kembali lebih awal tanpa meminta lock.
- **Tap = bidik, geser = lihat.** `setTapAim(clientX, clientY)` (input.ts) menjadi
  satu sumber matematika aim: NDC dari rect kanvas + `input.pointAim` (koordinat
  layar) + `emitAim()`. Dipakai cabang kanvas (setengah kiri) **dan** LookPad.
  LookPad membedakan tap vs geser dengan ambang 6 px: tap → `setTapAim`; geser →
  delta look dan menghapus `pointAim` (kembali ke crosshair tengah). Dengan ini
  tap di mana pun (termasuk tengah, di atas LookPad) membidik.
- **Reticle terlihat.** HUD berlangganan `subscribeAim` (`useSyncExternalStore`):
  bila `touch && pointAim`, crosshair tengah disembunyikan dan cincin amber
  (`data-reticle`) digambar tepat di titik tap; bila belum ada aim, chip petunjuk
  `play.touchHint` tampil. Geser LookPad mengembalikan crosshair tengah + hint.
- **Semua kontrol HUD pakai `press()`.** `onPointerDown` (preventDefault + aksi)
  plus `onClick` hanya bila `detail === 0` (keyboard). Berlaku untuk mute, Menu,
  slot hotbar, dan toggle ControlDeck — tetap hidup walau lock aktif, dan sekali
  jalan untuk pointer maupun keyboard.
- **LookPad di bawah kluster HUD.** `-z-10` dalam stacking context root HUD
  (`fixed inset-0 z-40`): ia tetap di atas kanvas (menerima tap/geser setengah
  kanan) tetapi di bawah top bar, hotbar, joystick, dan tombol aksi.
- **Hotbar sentuh = strip vertikal kiri.** Varian desktop tetap di tengah-bawah;
  varian sentuh (`data-hotbar="touch"`) di `bottom-44 left-2`: chip label
  truncate + kolom 5 slot `h-11 w-11`. Terukur bebas overlap dengan joystick
  (kiri-bawah) maupun kolom aksi (kanan-bawah).
- **NoticeToast pindah ke `top-40` di sentuh** agar tidak menutupi hotbar/aksi.

### 16.3 QA (`scripts/mobile-play-qa.mjs`, 390×844 `hasTouch`/`isMobile`)

Lulus: masuk game; coarse terdeteksi; **tanpa lock** setelah tap; reticle tepat di
koordinat tap dan mengikuti re-aim; Menu membuka jeda lewat pointer; Hapus
semua/Ya/Lanjutkan bekerja; slot hotbar terpilih (`aria-pressed`); tap tanah +
Pasang menempatkan sel yang diketuk (proyeksi kamera live → piksel); tap muka
blok + Pasang menumpuk di atasnya; Hancurkan memecah sel yang diketuk; mute
persist; geser LookPad memutar kamera dan menghapus reticle; joystick menggerakkan
player; kluster HUD tidak overlap dan tidak keluar layar; Keluar kembali ke
journey dengan build tersimpan; console error kosong. Regresi desktop tetap hijau
(`meaning-qa`, `play-qa`, `jump-qa`, `verify2`, `touch-qa`) + `tsc -b` + `build`.

## 17. Keterangan laman utama menjelaskan apa yang harus dibuat (selesai)

### 17.1 Masalah

`play.ctaNote` lama hanya mengajak "hancurkan dan susun blok sesukamu" tanpa
menyebut tujuan, sehingga pengunjung laman utama tidak tahu apa yang harus
dibangun sebelum masuk ke arena.

### 17.2 Keputusan

- `ctaNote` (ID + EN) kini menyebut tujuan secara eksplisit: **Tumpukan Bermakna**,
  lima lapis berurutan dari tanah ke langit (I Fondasi → II Karya → III Mutu →
  IV Perubahan → V Rawat), hukum fondasi (blok hanya berdiri di atas yang kokoh;
  mencabut fondasi meruntuhkan yang bertumpu), dan persistensi browser — dengan
  framing "bermain sebagai karakter Eric di arena blok isometrik" (lihat §19).
- Panel `PlayMoment` menampilkan **ladder target berurutan** (angka Romawi +
  warna blok + nama lapis, urutan `LAYERS`) di bawah keterangan, menggantikan
  chip material yang sebelumnya tidak berurutan. Caption memakai
  `meaning.objectiveLead` ("Susun lima lapis dari tanah ke langit:").

### 17.3 QA

Screenshot panel pada 1440×900 dan 390×844: teks terbaca kontras baik, ladder
satu baris di desktop dan wrap dua baris di ponsel tanpa overflow/clipping.
`play-qa.mjs` (masuk via CTA, pause/hapus/resume/Esc) hijau, `tsc -b` + `build` bersih.

## 18. Likeness karakter: Andrew Ryan Sinaga (Managing Director Cartenz) — DICABUT, lihat §19

> **Status: tidak berlaku.** Permintaan berikutnya mengembalikan karakter ke scan Eric
> asli (rig + tekstur bawaan). Seluruh keputusan di bawah dipertahankan hanya sebagai
> riwayat; kode, copy, tribute, dan QA likeness sudah dihapus pada §19.

Permintaan: jadikan karakter 3D menyerupai foto Andrew Ryan Sinaga — rambut hitam
pendek, kacamata persegi hitam, kemeja putih kerah band dengan lengan digulung
(lengan bawah kulit terbuka), smartwatch hitam di pergelangan kiri, kulit tan,
senyum. Rig, gait, dan pose CMJ tetap utuh.

### 18.1 Kendala aset & keputusan

- Scan `rp_eric_rigged_001` = **satu SkinnedMesh, satu material, satu atlas diffuse**
  (61.626 vertex, tanpa geometry groups) → recolor per bagian lewat material tidak
  mungkin. Keputusan: **palet vertex** berdasar dominant skin weight + mask spasial
  wajah, normal map atlas dipertahankan, diffuse dilepas (`vertexColors: true`).
- Wilayah: sepatu `foot/ball`, celana `thigh/calf`, kemeja `pelvis/spine/clavicle/
  upperarm` (di bawah garis pinggang 1.07 m jadi celana — ekor kemeja scan yang
  tidak dimasukkan), kulit `lowerarm/hand/jari`, leher `neck_01` (kerah putih),
  kepala `head` dengan mask rambut/mata/senyum/gigi/stubble. Garis wajah diturunkan
  dari extents vertex head (chin/top), bukan angka tebakan.
- **Bedah vertex** (sekali, statis): ridge tie ditekan ke `chestX` (permukaan dada
  referensi dari vertex spine_02 sisi), kerah spread dilipat jadi band mandarin
  (clamp radius 0.062 m + tinggi chin+0.012 m, termasuk vertex clavicle).
- **Aksesori rigid** ter-parent ke bone dengan matriks lokal tetap dihitung di ruang
  rest: kacamata (rim box + lensa tinted opacity 0.28 + bridge + temple) di `head`;
  smartwatch (torus strap + box face + screen emissive) di `hand_l`; cuff torus putih
  di kedua `lowerarm`. Karena lokal tetap, gait/CMJ membawa aksesori tanpa kerja per
  frame; pose rest vs posed tidak menggeser offset (motion bone cancels out).
- **Jebakan satuan**: ruang bone FBX = sentimeter sedangkan offset/geometry ditulis
  meter → attach mengalikan `S100`, mask wajah membaca `×0.01`, dan invers bedah
  vertex = `rootSpace⁻¹ · S100`. Tanpa faktor ini aksesori render 1/100 ukuran dan
  vertex yang diedit runtuh ke origin (terlihat sebagai tiang putih di antara kaki).
- **StrictMode**: FBX di-cache drei lintas remount → aksesori di-tag `userData.andrew`
  dan diganti (dispose geometry/material lama), bukan ditumpuk.
- Komponen visual dinamai `AndrewVisual`; copy `play.ctaNote` ID/EN menyebut
  "Andrew Ryan Sinaga, Managing Director Cartenz"; tribute menambah kredit foto
  arsip perusahaan dan memperjelas rig dasar Renderpeople (Personal Use) + diffuse
  diganti palet vertex. README §4 (subseksi Likeness), tabel lisensi, dan daftar QA
  diperbarui.

### 18.2 QA

`scripts/andrew-qa.mjs`: pause membekukan simulasi → kamera ditempatkan manual
(depan/samping/kepala dekat) dengan HUD disembunyikan sementara; top-down saat
berjalan memverifikasi arah hadap = arah gerak (sumbu kamera up = arah gerak);
390×844 sentuh untuk tampilan jarak nyata. Hasil: kacamata/watch/cuff/kerah terbaca
di jarak permainan; senyum & rambut terbaca di potret; console error kosong.
Regresi hijau: `play-qa`, `meaning-qa`, `jump-qa`, `mobile-play-qa`, `touch-qa`,
`verify2` + `tsc -b` + `build`.

## 19. Kembali ke Eric + betulkan lari (sendi normal berbasis riset)

Permintaan: (a) kembalikan karakter menjadi Eric; (b) fokus betulkan cara Eric berlari
agar sendi-sendinya bergerak normal, dengan referensi riset dari internet.

### 19.1 Revert likeness

- `Character.tsx` dipulihkan ke bentuk pra-likeness: `EricVisual` memakai tekstur
  diffuse + normal bawaan scan (`MeshStandardMaterial`, roughness 0,78), tanpa palet
  vertex, bedah vertex, maupun aksesori ter-parent.
- `scripts/andrew-qa.mjs` dihapus; pengganti `scripts/gait-qa.mjs` (lihat 19.3).
- Copy `play.ctaNote` ID/EN kembali menyebut "karakter Eric"; item tribute likeness
  dihapus dan kredit rig kembali bersih ("Model karakter 3D Eric Rigged 001 …
  Personal Use License"); README subseksi Likeness diganti subseksi gait, tabel
  lisensi dan catatan model dibersihkan; §18 ditandai dicabut.

### 19.2 Akar masalah lari & perbaikan

Dua bug membuat lari terlihat aneh:

1. **Turnover ganda.** `STRIDE_*` dulu panjang per *langkah*, padahal `gait.phase`
   maju `2π` per *langkah* juga di driver lama — kombinasi dengan kurva lutut membuat
   kaki tampak mengayuh dua kali lebih cepat dari jarak yang ditempuh. Kini stride =
   panjang **siklus penuh (dua langkah)**: `STRIDE_WALK 1,5 m`, `STRIDE_RUN 3,0 m`,
   dan `phase += cadence·2π·dt` dengan `cadence = v/stride` (clamp 0,2…1,9 siklus/s).
2. **Kecepatan superhuman.** 7,4–10,5 m/s terhadap kaki ±0,85 m memaksa sapuan stance
   lebih lebar dari amplitudo sendi → kaki selip. Kini `WALK_SPEED 1,6` /
   `RUN_SPEED 4,4` m/s di game dan `JOURNEY_SPEED 3,4` m/s di journey → ±128 spm
   jalan, ±176 spm lari (Novacheck 1998; The Movement System 155–160 spm nyaman).

Kurva sendi baru `jointAt(u, speedNorm)` (satu sumber untuk jalan→lari): stance
62%→40%; hip contact +0,52→+0,70 rad, toe-off −0,17→−0,35 rad, drive swing puncak
0,78 rad di tengah swing; lutut stance loading 0,26→0,78 rad lalu push-off; lutut
swing puncak 1,05→2,09 rad (≈60°→120°) **di awal swing** (`sin(π·s^0,65)^0,9`,
Van Hooren 2024); ankle dorsifleksi saat contact lalu plantar −0,35→−0,44 rad saat
toe-off; siku lari 1,57 rad (±90°) dengan ayun lengan berlawanan kaki; lean
0,04·sn + 0,22·sn²; hop flight `sin(π·prog)·lerp(0,015; 0,07)` menandai double float
(Physio-pedia). Solver `reach(hip, knee)` tetap menjaga telapak stance di tanah.

Sumber baru masuk tribute grup "Gerak lari" + README §6.8/§9.1: Van Hooren et al.
2024 (Sports Med 54(5), PMC11127892), Physio-pedia Running Biomechanics, The Movement
System Biomechanics of Running; angka Weyand/Cavanagh diperbarui ke konstanta baru.

### 19.3 QA gait

`scripts/gait-qa.mjs`: masuk Play → pause → **pin field `gait` lewat accessor
property** (path pause menulis `gait.moving = 0` tiap frame; getter membaca nilai
beku, setter mengabaikan) → kamera samping tegak lurus facing → 10 pose beku lari
(u = 0…0,9) + 3 jalan (sn 0,36) → pulihkan property data → live run Shift+W dua
potret berjarak 260 ms untuk membuktikan turnover. Hasil visual: contact dengan
tumit depan + heel recovery belakang, mid-stance lutut memberi, toe-off ekstensi +
plantar fleksi, swing lutut ±120° terlipat, siku 90°, lean depan; frame walk tenang
dengan ayun kecil; console error kosong.

## 20. Loop lari 20-keyframe dari referensi Sketchfab

Permintaan: perbaiki animasi berlari memakai sample loop
https://sketchfab.com/3d-models/male-running-20-frames-loop-ed3d7a4b8b124e1591be83ccb4c02dcd
("Male Running (20 frames loop)" — Denys Almaral, Free Standard).

### 20.1 Ekstraksi data referensi (bukan tebakan)

- Model = satu SkinnedMesh biped 3ds Max (`bip_01 … bip R Toe0`), animasi "Take 001"
  uid `d93cbbeb…` durasi **0,667 s = 20 frame @30fps** (1,5 siklus/s ≈ 180 langkah/menit).
- Viewer API resmi hanya mengekspos node representasi (Group/MatrixTransform/Geometry);
  visitor-nya **melewati Bone**, jadi `getNodeMap`/`getMatrix` tidak menjangkau skeleton.
  Solusi: baca **scene graph osg asli** in-page (webpack `CUcO` resource singleton →
  traverse anak sampai `osgAnimation.Bone`), sambil menggerakkan waktu lewat API `seekTo`.
- Jebakan handshake yang dipecahkan: (a) API baru hanya terdaftar bila URL embed memakai
  `api_version=1.12.0`; (b) `api.initialize` menuntut `instanceId` yang cocok → set
  `api_id=cakrawala1`; (c) iframe lintas-origin dengan cookie pihak-ketiga diblokir masuk
  mode "embed-sandboxed" (viewer tidak start) → pakai **halaman embed langsung**
  (parent === window) di Playwright headless dengan SwiftShader; (d) hinge lutut/siku
  berputar tentang **−Z**, sehingga sudut fleksi = magnitudo rotasi (trace-based acos),
  bukan atan2 bertanda.
- `scripts/sk-loop-extract.mjs` menulis 20 frame × 32 tulang (local+world) ke JSON;
  `scripts/sk-loop-gen.mjs` menurunkan kurva ternormalisasi → `src/three/runLoop.ts`.

### 20.2 Retarget ke rig Eric

- Lutut (`bip L Calf`) dan siku (`bip L Forearm`) = hinge satu-sumbu bersih (stabilitas
  sumbu 1,00) → kurva fleksi autentik. Hip/ankle multi-sumbu + offset rest pose tidak
  bersih → **tetap kurva analitik Eric** yang sudah terverifikasi (solver reach() aman).
- Kurva dirotasi agar **frame 6 = heel strike (u=0)**: lutut ±0,07 saat contact, bump
  loading-response di u≈0,2, ekstensi 0 saat toe-off (u≈0,35), puncak lipatan 1,0 di
  u≈0,75 — cocok stanceFrac lari 0,40. Interpolasi **Catmull-Rom periodik** (C1 di wrap).
- `jointAt`: `knee = lerp(kneeAnalitik, kneeRef, speedNorm)` dengan
  `kneeRef = 0,26 + shape·(2,09−0,26)` — amplitudo tetap Eric, bentuk dari referensi;
  jalan (sn≈0) tidak berubah. Siku: hold 90° + osilasi ±11° (`ELBOW_SHAPE`) berfase per
  kaki (`uL`/`uR`), tetap menyatu dengan blend pose lompat.
- Kredit masuk tribute grup "Gerak lari" (ID+EN), README §6.3/§9 (tabel lisensi + sumber),
  dan komentar `runLoop.ts`. Aset referensi **tidak dibundel** — hanya bentuk kurva.

### 20.3 QA

`gait-qa` hijau: 10 pose beku lari menunjukkan contact lutut sedikit fleksi, toe-off
kaki belakang ekstensi, swing lipatan tumit-ke-bokong asimetris + flight; 3 pose jalan
tetap tenang (referensi tidak bocor ke jalan); live run turnover benar; console kosong.
`tsc -b` bersih.

## 21. Logo Hero: cakrawala-white.svg di plate putih

Penamaan file logo berbasis **latar**, bukan warna tinta: `cakrawala-white.svg` =
mark **hitam** untuk latar putih (fill #000000); `cakrawala-black.svg` = mark putih
untuk latar gelap. Permintaan user: ganti img Hero ke `cakrawala-white.svg`.Karena
mark-nya hitam, plate harus **putih** (brand rule "black mark on pure white field"),
bukan ink gelap — percobaan plate gelap menghasilkan hitam-di-hitam (kontras nol) dan
dikoreksi. Hasil: emblem kuda-catur + laurel + handshake hitam tajam di plate putih,
selaras dengan Nav; terverifikasi di 1440×900 dan 390×844 tanpa overflow.

## 22. Layout split konsisten: kiri substansi, kanan dunia 3D

### 22.1 Desktop (≥768px)

- Wrapper konten (`src/App.tsx`): `relative z-10 md:w-[46%]` — seluruh teks stasiun
  (Hero … Footer) hidup di kolom kiri; tidak ada lagi floating window di desktop.
- Pane dunia (`src/three/World.tsx`): `fixed top/bottom/right-0`, `left:46%`, border-l +
  shadow lembut; **satu Canvas tetap ter-mount** lintas layout (journey ↔ game ↔ mobile).
- `Panel` jadi kartu penuh kolom: `@container` di kartu, isi memakai varian `@[40rem]:`
  (queries resolve ke ANCESTOR container — jangan taruh `@container` dan varian di elemen
  yang sama). Services: grid 2 kolom dasar, 3 kolom hanya bila kartu ≥40rem.
- **Aturan clearance kartu**: tinggi kartu < viewport − nav(56px) agar snap-centering
  tidak pernah menyembunyikan judul di bawah Nav. Services dipadatkan (p-2.5, teks
  0.65–0.7rem) → 616px @390 ID, 741px @1440; 11 kartu lolos di 5 viewport × 2 locale.
- StationRail: 11 dot di tepi kiri pane (amber pill aktif + glow), klik →
  `scrollBridge.toStation(i)`. PovButton pindah ke dalam pane (`absolute bottom-3 right-3`).
- CameraRig: lateral shift dihapus (pane sudah jadi ruang bebas) →
  `lookTarget.copy(characterPos)`; zoom `clamp(min(w,h)/10, 24, 96)` → karakter ~130px
  @1440, ~160px @2560.

### 22.2 Mobile (<768px): PiP draggable

- Konten full-width; dunia 3D jadi jendela kecil `fixed z-20 rounded-xl` dengan header
  28px (grip + "Dunia 3D" + tombol expand). Collapsed `min(46vw,210)`, expanded
  `min(86vw,400)`, tinggi `w×1.18`; drag via `setPointerCapture` di header
  (`touch-action:none`), clamp ke viewport, posisi + expanded persist di
  **`cakrawala-pip-v1`**; re-clamp saat resize / kembali dari game.
- `data-pip` pada frame; JourneyController mengabaikan wheel (preventDefault) dan
  touchstart/touchend yang berasal dari PiP → swipe di jendela 3D tidak membajak journey.

### 22.3 Atmosfer pane

Fog `#e9eff3 45–130` (warna lerps mengikuti langit fajar di Atmosphere); JourneyDust
90 titik amber hangat mengikuti karakter (rotation.y lambat + bob sin); wayside scatter
26 objek (Lamp emissive warm, Rock flat-shaded, Tree) di Stations. Journey-only.

### 22.4 Jebakan pointer-events (KRITIS)

Wrapper mode game = `pointer-events-none opacity-0`, tetapi **inheritance**: anak yang
men-set `pointer-events-auto` tetap menangkap tap walau tak terlihat (wrapper z-10 ==
World game z-10, wrapper belakangan di DOM → painted above). Panel section TIDAK boleh
set pointer-events-auto; ini dulu membuat reticle mobile-play mati. Tercatat di README §4.1.

### 22.5 QA

`scripts/layout-qa.mjs` (baru, 27 assertion): split 46/54 @1440, rail 11 dot + klik,
PoV dalam pane, kartu < viewport−nav di semua stasiun, breakpoint 767/768, PiP drag +
expand + persist reload + swipe-on-Pip guard @390; pageerrors []. Regresi hijau:
touch-qa (lane swipe dipindah x=120 — pojok kanan-bawah kini permukaan PiP),
mobile-play-qa, play-qa, verify2, gait-qa, jump-qa, meaning-qa; shot.mjs 5 viewport.

## 23. Konten langsung di kolom kiri + rename lapisan + gait jalan/lari final

### 23.1 Floating card dihapus (menggantikan chrome §22.1)

Permintaan: "Tidak perlu menggunakan floating window, langsung saja konten yang
memaksimalkan substansi di container di sebelah kiri." `Panel.tsx` kini hanya
section `journey-col flex min-h-[110vh] w-full items-center justify-center px-[5vw]
md:justify-start md:px-[3.5vw]` + pembatas `@container w-full max-w-[56rem]`;
eyebrow chip `NN / 11` + hairline gradien menggantikan header kartu. Tanpa bg/border/
shadow kartu. Snap math tidak berubah (offsetTop/offsetHeight section).
Services di-bump sebagai refinement pass: lead text-sm, grid gap-2.5/3, li p-3.5/4
rounded-xl shadow-sm hover-lift, h3 text-xs/sm, p 0.7rem/xs → kolom terasa berisi,
bukan padat kecil. Clearance terverifikasi: 1440×900 services h645 (bottom 773),
contact h649; sweep 390×844 ID+EN 11 stasiun semua lolos (tertinggi EN services
h720, top 62 ≥ 56, bottom 782 ≤ 844); tanpa oklusi teks oleh PiP.

### 23.2 Urutan blok 3/4 tertukar → LAYERS = BLOCK_KINDS + rename

Akar masalah: `LAYERS` (meaning.ts) berurutan server,cloud,**laptop,doc**,gear
sedangkan `BLOCK_KINDS` (store.ts) server,cloud,**doc,laptop**,gear → hotbar slot N
≠ lapis N. Fix: LAYERS disamakan ke BLOCK_KINDS. Rename sesuai permintaan:
I Fondasi — **Roadmap & Blueprint** (server), II Karya — **Platform Development**
(cloud), III Mutu — PMQA (doc, tetap), IV Perubahan — **Change Management**
(laptop), V Rawat — **Operation/Maintenance** (gear). Semua narasi disapu:
content/id.json + en.json (hint, ctaNote, layers, notices.pair/complete,
completeBody, blocks), README §8, PLAN §17.2, meaning-qa CANON. Data layanan
perusahaan asli tidak diubah. QA: meaning-qa MEANING_QA_OK (34 PASS), play-qa
slot 4 = laptop, HUD "Berikutnya: II - Karya" + pill "I · Fondasi — Roadmap &
Blueprint" terlihat di shot live.

### 23.3 Gait jalan & lari: diagnosis pose beku + fix

Keluhan: "Gerakan karakter Erick ketika berjalan dan berlari masih aneh."
Diagnosis lewat gait-qa (kamera samping, pose beku):
1. **Jalan = setengah lari.** speedNorm = v/4.4 memberi 0.36 pada 1.6 m/s → lutut
   terlipat 82°. Fix: plateau `gaitNorm(v) = clamp((v−1.9)/2.5, 0, 1)` di shared.ts
   (RUN_SPEED 4.4 diekspor, dipakai CharacterDriver + GameScene).
2. **Telapak rocking / toes-up midstance.** Kurva ankle lama menumpuk bump
   dorsifleksi di atas cancel shin 0.9 → telapak miring ±13°. Fix: ankle = sudut
   kaki dunia (toes-down +): IC lerp(−0.12,−0.06), TO lerp(0.32,0.5), clearance
   lerp(0.12,0.2); stance lerp(IC,TO,pow(s,1.7)) rata sampai akhir stance; swing
   lerp(TO,IC,s) − clear·sin(πs); pose lokal = −(hip+knee) + ankle (cancel penuh).
3. **Teleport vertikal di batas flight.** Cabang flight lama konstan
   HIP_HEIGHT−ANKLE_TO_SOLE → pop 2.7 cm saat toe-off, drop 9.4 cm saat contact.
   Fix: support flight = lerp(reach(jTO), reach(jIC), prog) + sin(π·prog)·
   lerp(0,0.06,sn)·walkBlend; hop terpisah dihapus; bodyY = −soleGap + lift.
4. **Regresi jalan membeku** setelah plateau: walkBlend dulu gated speedNorm →
   0 pada jalan murni. Fix: field baru `gait.move01 = clamp(v/0.6,0,1)` ditulis
   kedua driver; walkBlend = move01; journey `gait.moving = worldSpeed > 0.05`;
   gait-qa pin move01 dan set 1, pose jalan sn 0.
5. **Sign spine salah koreksi**: tulang distal menunjuk bawah (+flex = belakang)
   tetapi spine menunjuk atas (+flex = depan). Sign lean/neck/jump-spine asli
   benar → enam edit sign dibatalkan kembali.

Hasil visual: walk-00/03/06 stride penuh (contact, passing, mirror contact);
run-00 lean depan + ayun lengan berlawanan; run-04 push-off plantar + lipatan
swing; run-07 flight knee-drive; live-run HUD normal. Regresi hijau: jump-qa
(termasuk tribute full-screen + wheel pane + close return, ID & 390), verify2,
play-qa, meaning-qa, mobile-play-qa, touch-qa, layout-qa (LAYOUT_OK), sweep
clearance 390 ID+EN (CLEAR390_OK, scratch dihapus). tsc -b bersih.

## 24. Scroll mouse mati (root cause Lenis) + teleportasi bersinar

### 24.1 Wheel: tiga lapis akar masalah

Laporan: "scroll mouse tidak bisa dipakai". Probe bertahap (wheelcheck states A–F,
wheeltraj, burst dengan `__jdebug`) menemukan tiga lapis:

1. **Mouse line-mode** (`deltaMode 1`, ±3 px/baris) tidak pernah melewati ambang
   akumulasi 16 → normalisasi: mode 1 ×33, mode 2 ×`innerHeight`.
2. **Desync kursor/kunci**: `keyCursor` bisa tertinggal dari posisi scroll nyata
   (scroll manual, tribute, resize) → resync `nearestIndex()` bila
   `|scrollY − stationTop(cursor)| > 64`; kunci nyangkut dilepas `lockLive(now)`
   bila hop > durasi+700 ms dan `!lenis.isScrolling`.
3. **Akar inti — Lenis sendiri mematikan hop.** Dengan `smoothWheel: false`,
   listener wheel Lenis (`node_modules/lenis/dist/lenis.mjs` ±621) menjalankan
   `isScrolling = "native"; animate.stop(); event.lenisStopPropagation = true`
   pada **setiap** event wheel. Notch kedua dari gesture alami tiba saat hop
   1,9 s masih berjalan → `animate.stop()` membekukan halaman 2–3 px setelah
   stasiun pertama; `isScrolling` nyangkut truthy. Hop satu notch lolos karena
   tidak ada wheel susulan. Fix: milik gesture di **fase capture** pada window
   (`{ capture: true, passive: false }`) + `e.stopPropagation()` sehingga Lenis
   tidak pernah melihat wheel situs; cleanup memakai capture yang sama.
   Efek samping terjaga: pane tribute tetap scroll native (default action tidak
   di-prevent di dalam pane), ctrl+wheel zoom browser tetap hidup.

Regresi permanen ditambahkan ke `scripts/verify2.mjs`: burst 4 notch trusted
(`page.mouse.wheel`, jeda 90 ms) harus maju **tepat satu** stasiun
(`wheel burst ok: true`), dan `clickNav('Kontak')` dari stasiun ≥2 jarak harus
mendarat seketika (`teleport jump immediate: true`). Probe QA permanen
`window.__jdebug = { lenis, lock(), hop(), cursor() }` di JourneyController.

### 24.2 Teleportasi: sinar dari atas saat lompat tak berurutan

Permintaan: animasi teleport dengan sinar dari atas ketika perpindahan section
tidak berurutan. Grammar (0,95 s, `TP_DUR` di `three/shared.ts`):

- **Trigger**: driver cut `|target − progress| > 0,16` → `teleport.t = 0`,
  simpan `from` (posisi nyata) dan `to` (titik kurva tujuan), `audio.teleport()`.
- **Vanish 0–0,30 s**: skala `1−u²`, rise 0,4, spin 3 rad; shadow ikut menyusut.
- **Whoosh 0,30–0,55 s**: karakter tersembunyi, posisi lerp `easeInOutCubic`.
- **Materialise 0,55–0,95 s**: `easeOutBack` (c1 1,70158); cincin tanah
  radius 0,4→2,6 opacity `(1−u)·0,6`.
- **Sinar**: tabung terbuka (0,62/0,5 × 14) di y=14 dengan geometri di-translate
  (0,−7,0) sehingga `scale.y = env` tumbuh ke bawah dari langit; envelope asal
  in 0/out 0,32+0,2, tujuan in 0,45+0,1/out 0,75+0,2. `NormalBlending` (additive
  washed-out di langit `#e9eff3`): outer `#f2a13c` 0,42·env, core `#fff7e6`
  0,75·env; pointLight `#ffd9a0` env·26. Selama urutan seluruh state gait nol.
- **Aturan lompat**: `scrollBridge.toStation` dengan selisih ≥2 stasiun →
  `lenis.scrollTo(top, { immediate: true, force: true })` supaya panel mendarat
  seketika dan sinar berangkat dari stasiun asal sesungguhnya; selisih ≤1 tetap
  hop berjalan 1,9 s tanpa sinar (tp-05-walk-hop).
- **Audio**: `audio.teleport()` — noise whoosh + tone 720→200 Hz, chime
  240→720 Hz pada 480 ms; hormat pada mute.

QA visual: tp-01-vanish (kolom sinar + karakter di dalamnya), tp-02-whoosh
(sinar dari langit + karakter kecil materialise + cincin amber), tp-03-materialise
bersih, tp-05-walk-hop tanpa sinar; mobile 390×844 lewat hamburger → Kontak:
panel mendarat seketika (y 0→8398) dan sinar terlihat di dalam PiP
(tp-mobile-beam), frame settled bersih (tp-mobile-settled). Regresi hijau penuh:
layout-qa LAYOUT_OK, touch-qa TOUCH_OK, meaning-qa MEANING_QA_OK, mobile-play-qa
MOBILE_PLAY_OK, verify2 (burst + teleport baru) errors [], play-qa, jump-qa,
gait-qa errors []. `tsc -b` + `npm run build` bersih. Scratch probe dihapus.

## 25. Gerakan tangan Eric: ayun bahu terpusat, siku open/close, tangan rileks

Permintaan: perbaiki gerakan tangan Eric + cari referensi internet + update tribute.

Diagnosis dari pose beku (sebelum fix): kedua tangan mengambang di depan dada saat
lari ("membawa nampan") karena ayun bahu terlalu kecil dan asimetris (mengikuti kurva
hip mentah); jari melebar penuh (bind pose, tidak pernah dipose); tidak ada pose
pergelangan; osilasi siku ±11° berfase "fleksi saat lengan ke belakang" — kebalikan
dari referensi.

Referensi (ditambahkan ke tribute ID/EN + README §9.1):
- Freelap USA, *A Call to Arms — Sprint Mechanics Revisited*: siku tidak terkunci 90°;
  menutup di front-side, membuka saat shoulder extend; tangan hip-pocket → chin;
  bahu & tangan rileks (kuat juga dari coaching cue "hip pocket to eye socket").
- De Vlieger dkk. 2025 (PMC11698429): ROM sagittal bahu sisi sehat ~25–30° naik
  dengan kecepatan; fleksi siku rata-rata ~41° → kalibrasi jalan ±15° & siku 0,35 rad.

Implementasi (Character.tsx):
1. `armSwing = (hip − hipMean)·lerp(0,75; 1,08)·move01`, hipMean = lerp(0,17; 0,21):
   rentang bahu terpusat ±0,26 rad jalan / ±0,61 rad lari → tangan hip-pocket → chin.
2. `elbowFlex = lerp(0,35; 1,57; sn²) + (0,5 − sampleLoop(ELBOW_SHAPE, u))·lerp(0,12; 1,0; sn)`:
   fase kurva referensi DIBALIK → siku menutup ~120° front-side, membuka ~60° back-side.
3. Pose baru: `hand_l/r` (pronasi PRON 0,47 rad tentang sumbu forearm → telapak ke
   paha; wrist sagittal ±0,15 rad berfase ayun) + 15 sendi jari per sisi
   (index/middle/ring/pinky/thumb × 3): sumbu curl = cross(dir sendi, normal telapak),
   normal telapak = cross(finger, thumb) dari landmark bind-pose; curl rileks
   0,35–0,85 rad (thumb ×0,6), sisi kanan tanda curl dibalik (cross product mirror).
4. `ARM_ABDUCT` 0,52 → 0,60 rad: lengan menggantung lebih rapat ke badan.

Bug produk ditemukan QA: entering Play di tengah urutan teleport membuat Eric
membeku mid-vanish (scale ~0,92 + spin hingga ~108°) selamanya — `teleport.t` hanya
dimajukan CharacterDriver yang early-return di mode game. Fix: GameScene membatalkan
(`teleport.t = -1`) tiap frame mode game. Probe QA baru `window.__ericDebug = { g }`
(group root Eric) + `characterYaw` di `__gameDebug`; kamera QA close-up tangan
dibingkai dari transform world nyata, bukan tebakan sumbu.

QA: close-up sisi/depan jalan & lari (hand-walk/run-*) — telapak ke paha, jari cup
rileks, tangan belakang di hip pocket dengan siku terbuka, tangan depan di chin
dengan siku tertutup; gait-qa 10 pose lari + 3 jalan + live-run errors [];
verify2 (burst ok, teleport immediate) errors []; play-qa, jump-qa, meaning-qa
(MEANING_QA_OK), mobile-play-qa (MOBILE_PLAY_OK), touch-qa (TOUCH_OK), layout-qa
(LAYOUT_OK) semua hijau. Tribute: +2 sumber (Freelap, De Vlieger) ID+EN, baris mono
rumus lengan diperbarui; README §6.3 tabel + §9.1 + peta tribute diperbarui.
`tsc -b` + build bersih; scratch (hand/yaw/yawtrace) dihapus.

## 26. Top menu lengkap semua section (11 link) + highlight aktif

**Masalah:** menu atas hanya memuat 7 link (services…contact); station `hero`, `story`,
`play`, `footer` tidak bisa dicapai dari menu (hero hanya lewat logo).

**Perubahan:**
- `content/id.json` + `en.json`: `nav.links` diisi 11 entri dalam urutan station —
  hero (Beranda/Home), story (Satu Hari/A Day), services, credibility, numbers,
  signature (Kisah/Story), market, about, play (Play), contact, footer (Tribute).
  Label story ≠ signature agar tidak bentrok ("Satu Hari" vs "Kisah").
- `blocks/Nav.tsx`: subscribe `useJourney(s => s.activeStation)` → `STATIONS[i].id`;
  link aktif diberi `aria-current="page"`, teks putih semibold, dan garis emas
  `#f2b23c` beranimasi (`scale-x`); mobile aktif = bg-white/10 + semibold.
  Breakpoint desktop `lg→xl` (≥1280px) agar 11 link muat tanpa overflow; di bawah xl
  hamburger. Menu mobile `max-h-[70vh] overflow-y-auto` agar 11 item muat di layar pendek.
  Logo + kontrol `shrink-0`, link `whitespace-nowrap`.

**QA (nav-qa scratch, dihapus setelah):** 7 viewport (390/1024/1280/1440/1920/2560/3840)
semua 11 link, label cocok, tanpa overflow horizontal; ≥1280 inline, <1280 hamburger.
Highlight: awal Beranda → klik Play → Play → Tribute → Tribute → Satu Hari → Satu Hari.
Mobile: buka 11 item, klik Kontak menutup menu + scroll, buka lagi highlight Kontak.
Console errors []. Regresi verify2 (burst ok, teleport immediate) + jump-qa (tribute
close-return, phone overflow false) errors []; `tsc -b` + build bersih.
README baris Nav + §store activeStation + tabel blok 01 diperbarui.

## 27. Tantangan berwaktu: gate masuk, difficulty, timer hold, rekor & papan skor

**Permintaan:** masuk Play setelah selesai menawarkan ulang atau masuk bebas tanpa notif;
setiap masuk Play beri popup lanjutkan / mulai dari awal; dari awal pilih easy 10 menit,
medium 5 menit, hard 2 menit, epic 30 detik; menang → popup waktu tercatat + notif new
high score + catat waktu + input nama; waktu habis → restart; keluar → hold timer.

**Keputusan desain:**
- Satu sumber kebenaran di `game/store.ts`: `gate: 'none'|'entry'|'difficulty'|'timeout'`,
  `difficulty`, `remaining`, `finished`, `result`. `runTicking(s)` = mode game && !paused
  && gate none && !result && !celebrate && difficulty != null && !finished && remaining > 0.
  Clock digerakkan `GameHud` setInterval 100 ms → `tickRun(0.1)`; simpan run tiap detik
  penuh + saat jeda/keluar/menang → `cakrawala-run-v1` (holdtimer lintas reload).
- `swap()` ke game selalu membuka gate `entry`. Run belum selesai → "Lanjutkan tantangan";
  selesai/bebas → "Tetap masuk (bebas)" (tanpa notif lain). "Mulai dari awal" → gate
  difficulty 4 kartu (nama + fmtClock batas + desc). Pilih difficulty = arena kosong +
  clock penuh. Kembali ke entry lewat tombol Kembali.
- Menang: `rescan` progress 5 && difficulty != null && !finished → elapsed =
  max(0.1, LIMIT − remaining); record = bestTime() null || elapsed < best; set
  done/vista/finished/result (bukan celebrate legacy). Panel hasil: badge mahkota
  "Rekor baru — waktu tercepat!", waktu besar fmtTime (m:ss.t), input nama (Enter simpan,
  kosong → nama default), Simpan → `addScore` + daftar 5 teratas; aksi Main lagi /
  Lanjut bebas / Keluar.
- Timeout: remaining ≤ 0 → gate `timeout` (alertdialog) + `audio.timeout()`;
  `TimeoutPanel` auto `restartAfterTimeout()` setelah 1800 ms: difficulty sama, blok [],
  clock penuh.
- **Server skor:** deploy statis GitHub Pages tanpa backend → papan skor persist di
  `localStorage['cakrawala-scores-v1']` (maks 50, urut waktu naik, badge difficulty per
  entri). Disebut jujur di README §4.6; wiring backend sungguhan ditawarkan menyusul.
- `leaderboard.ts` mandiri (tanpa import store) agar tidak ada siklus: DIFFICULTIES,
  TIME_LIMIT {600,300,120,30}, loadScores/addScore/bestTime, fmtClock (ceil m:ss),
  fmtTime (m:ss.t).
- Pause-guard diperluas: `GameScene` onClick/useFrame freeze bila gate != none || result;
  pointerlockchange hanya menjeda bila gate none && !result && !celebrate (modal run
  melepas lock tanpa memunculkan panel Jeda di belakangnya). GameHud melepas pointer lock
  saat gate/result terbuka; keydown guard mengabaikan input selama gate/result.
- Escape bertingkat: papan skor → tutup; result → dismiss; gate entry/difficulty → keluar;
  timeout → diabaikan (auto restart).
- Bunyi baru di `audio.ts`: `timeWarn` (880 Hz square tiap detik ≤5), `timeout` (220 Hz saw
  slide + noise), `record` (4 nada triangle). Tetap hormat mute.
- HUD: `RunTimer` chip di kartu kiri (nama difficulty, clock mono, bar progres, merah
  berdenyut ≤10 s; bebas → "Bebas"; selesai → "Selesai · waktu"); tombol trofi membuka
  `ScoreBoard` 10 teratas.
- Probe DEV permanen: `window.__gameStore = useGame` untuk QA membangun kolom 5 lapis.

**QA:** run-qa scratch (dihapus): loop desktop penuh — entry → difficulty (4 kartu waktu
benar) → epic tick → hold saat jeda (Δ<0,05/1,5 s) → resume tick → kolom 5 lapis via probe
→ menang + badge rekor → simpan nama → skor localStorage + baris papan → lanjut bebas →
keluar → masuk lagi menawarkan "Tetap masuk (bebas)" → timeout 0,4 → auto restart (blok 0,
clock penuh) → hold saat keluar (27,9 → resume 27,0) → warn ≤5 s. RUN_QA_OK, errors [].
run-mobile-qa scratch (dihapus): 390×844 touch — bounding box entry/diff/win/saved semua
di dalam viewport, tanpa overflow horizontal, input nama + Simpan bekerja; screenshot
shots/run-mobile-{entry,diff,win,saved}.png bersih. RUN_MOBILE_OK, errors [].
Regresi: play-qa, meaning-qa (MEANING_QA_OK), mobile-play-qa (MOBILE_PLAY_OK), gait-qa,
verify2, layout-qa (LAYOUT_OK), touch-qa (TOUCH_OK), jump-qa — semua errors []; skrip QA
lama dismiss gate entry lewat tombol "Tetap masuk". `tsc -b` + `npm run build` bersih.
README §4.6 + pohon file + tabel state + tabel persistensi; PLAN §27 ini.

---

## 28. Jakarta 2045: kota malam, mobil terbang, robot NPC, Jelajah Bebas

**Permintaan:** environment keren bertema Jakarta masa depan (mobil terbang, robot
NPC), tombol switch ke mode free adventure yang bisa mulai di mana saja, dan bisa
menyapa NPC robot.

**Arsitektur:** bukan mode ketiga. `useGame.adventure: boolean` di atas `mode:'game'`
memakai ulang seluruh mesin Play (kamera, collision, input, HUD, jeda, Esc dua tahap).
`swap(mode, adventure)` sets gate `'none'` untuk adventure (tanpa gate entry) dan
`adventureSpawn` di posisi karakter saat itu; keluar kembali ke etape terdekat
(`nearestStation()`), bukan selalu Play. `runTicking` mengecualikan adventure.

**Kota (`three/FutureCity.tsx`):** 22 menara (shell gelap) + jendela instanced satu
draw call menghadap jalur pejalan (sisi dalam, karena follow-cam melihat dari dalam),
crown neon + beacon, Monas skala 0,62 bercahaya, 3 billboard holo canvas-texture,
skytrain layang (beam + strip neon + 3 gerbong jendela menyala), 10 mobil terbang
(5 lane, jejak neon), 220 bintang, dome gradient horizon (opacity = night), dan dua
garis kerb neon menyusuri jalur. Semua neon `meshBasicMaterial toneMapped={false}
fog={false}` agar menyala siang/malam dan tidak pudar oleh fog.

**Malam (`World.tsx`):** `Atmosphere` menulis `atmoMix.night` (damp 1,4) hanya saat
adventure; melerp langit ke `#0d1524`, cahaya bulan `#8fb6e4`, intensitas dir/ambient
turun, `GroundPlane` ke aspal `#141c26`, `GroundGrid` ke `#20304a`, `PathRibbon` ke
`#33465c`. Siang/situs & tantangan tetap palet brand terang.

**Kamera jelajah (`GameScene.tsx`):** fov 75 (vs 65), `ROAM_DISTANCE 7,6` /
`ROAM_HEIGHT 2,5` (vs 5,4/1,9), pitch awal 0,02 — skyline, mobil terbang, dan Monas
tetap dalam frame (pitch lama 0,24 + fov 65 membuat semua neon di atas frame).

**Robot (`game/robots.ts` + `three/Robots.tsx`):** 6 NPC voxel ber-idle wander;
`GreetProbe` (throttle 0,12 s) set `near` bila ≤2,4 m dan hanya saat adventure aktif.
Sapa (E / ketuk) → robot menghadap pemain, hop, lambai, visor menyala, bubble `Html`
(di-clamp viewport via `calculatePosition`), bunyi `audio.greet()`, daftar disapa
persist `cakrawala-npc-v1`, penghitung `n/6` di kartu HUD.

**HUD:** kartu AdventureCard (11 chip lompat etape memakai grammar teleport sinar),
GreetPrompt, deck/touch/pause varian jelajah; hotbar/crosshair/trofi/hapus disembunyikan.
Nav + PlayMoment menambah tombol Jelajah emas/sian.

**QA:** adventure-qa scratch (dihapus): desktop 1440×900 — masuk tanpa gate, mobil
terbang bergerak, lompat etape 5 mendarat x≈52, prompt sapa + bubble BIMA-07 + persist,
gerak bebas, pause tanpa hapus + ada robot, keluar ke etape terdekat; mobile 390×844 —
joystick, tanpa hotbar, chip etape 9, prompt & bubble NUSA-21 muat viewport, tanpa
overflow, keluar ke situs. ADVENTURE_QA_OK, errors []. Screenshot
shots/adventure-{night,greet,monas,mobile}.png. Regresi: regression-qa scratch (dihapus)
21 cek + suite permanen play-qa, meaning-qa, layout-qa, mobile-play-qa, verify2,
touch-qa, jump-qa, gait-qa — semua errors []. `tsc -b` + `npm run build` bersih.
README §4.7 + pohon file + persistensi; PLAN §28 ini.

## 29. Tema malam default + panel gelap penuh + checkpoint presisi

**Masalah:** (1) tempat berhenti scroll hanya “cukup dekat” sehingga karakter
masih bergeser setelah mendarat; (2) mode malam hanya ada di adventure, padahal
user ingin malam sebagai default browsing dengan tombol ganti di mana-mana;
(3) panel DOM tetap terang saat dunia malam.

**Tema (`src/lib/theme.ts`):** zustand `{ night, toggle }`, key
`cakrawala-theme-v1`, absen = night. `applyTheme` menulis `dataset.theme` +
`colorScheme` di `<html>`; dipanggil di tingkat modul (sebelum render pertama,
tanpa flash siang) dan disinkronkan `useEffect` App. Tombol: Nav kanan (ikon+label,
plus baris menu mobile), HUD game kanan-atas (ikon, sebelah mute) — terlihat di
browsing, tantangan, dan jelajah. String `nav.night/day/themeToNight/themeToDay`
di id.json/en.json.

**Lapisan gelap (`index.css`, unlayered):** `html[data-theme='night']` meng-override
permukaan (`bg-white`→#141d27 kecuali `.logo-plate`, body→#0b1118, PiP→#0f1720,
tribute→#16202b), border hitam→putih transparan, tinta `text-[#101418]/α`→
rgba(226,234,240,…), biru→#7fd0ff/#8fc9e8, emas teks→#ffd075, scrollbar/placeholder/
focus ring/gradien journey-col. Unlayered menang atas `@layer utilities` tanpa
perang spesifisitas; selector escape (`text-\[\#101418\]\/70`). Varian hover/focus
dideklarasi ulang karena override base otherwise menang. Plat logo tetap putih;
teks gelap di tombol emas sengaja tidak di-override.

**Checkpoint presisi (`JourneyController.tsx`):** `stationTop(i) = offsetTop +
(offsetHeight − innerHeight)/2`; cache di-invalidate oleh resize + perubahan
`scrollHeight`. `progressFromScroll` piecewise-linear tops[i]→i/(N−1) (clamp di
luar rentang) menggantikan bagi hasil scroll polos. Toleransi settle 32→10 px,
guard drift 48→24 px. Hasil ukur: drift 0,0 px pada lompatan nav/wheel/teleport;
karakter bergerak 0,000 m saat istirahat.

**Dunia malam semua mode (`World.tsx`):** `Atmosphere` damp night ke tema (λ1,4),
ref awal dari tema; kamera iso turun 6 unit saat malam; `OrthographicCamera
near 0.1` (dari −100) — near negatif membuat menara di belakang kamera
meng-oklusi walker; jendela menara di-instance dua sisi z. Azimuth swing malam
dicoba lalu dibatalkan (kamera masuk barisan menara → fasad raksasa menutupi
karakter); hanya dip vertikal yang dipakai.

**Kamera anti-tembus (`shared.ts cameraColliders`, Arena/FutureCity/Stations
register via useEffect, `GameScene.boomCamera/boomClearance/placeBoom`):** ray
kepala→kamera menarik boom ke `max(0,9, hit−0,4)`; hysteresis yaw: ikuti yaw bila
clearance ≥0,9·horiz, else bila <0,85 cari 8 offset k·π/4 ambil terbaik. Gejala
awal: pita beige selebar layar saat jelajah = kamera 0,2 m di dalam paviliun
Tentang; setelah fix kamera berayun ke diagonal bersih (probe-adventure.png).

**QA:** theme-qa scratch (dihapus) 26 cek — default night storage baru, computed
style body/card/plate/ink/input/gradien, toggle+persist, drift 0,0 px tiga cara,
karakter 0,000 m, toggle HUD adventure & challenge, mobile 390 night+PiP gelap+
tanpa overflow+baris menu, errors []. Regresi 8 suite permanen hijau; satu
regresi ditemukan & diperbaiki: pill tema membuat cluster HUD kanan lewat 390 px
→ padding px-2/sm:px-3 + gap-1,5/sm:gap-2 (meaning-qa 390px no overflow PASS).
`tsc -b` + `npm run build` bersih. README §4.2/§4.7/§4.8/§6.4 + persistensi;
PLAN §29 ini.
