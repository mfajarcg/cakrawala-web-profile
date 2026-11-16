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
