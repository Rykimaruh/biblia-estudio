# Changelog — Biblia Estudio Interactivo

## 2026-04-11

### Reverted Google Maps Migration
- **Attempted:** Migrated maps from Leaflet+Esri to Google Maps JavaScript API to get consistent language labels.
- **Issue:** Google Maps API key restrictions (HTTP referrer) did not propagate correctly on Cloudflare Pages, causing persistent "Oops! Something went wrong" errors on the deployed site. Additionally, the API key was flagged by GitGuardian as an exposed secret in the public repository.
- **Resolution:** Reverted all map code back to **Leaflet.js with Esri tiles** (no API key required). Removed all Google Maps config files and dependencies.
- **Files reverted:** `js/bible-map.js`, `css/map.css`, `css/main.css`, `genesis/mapa/index.html`, `exodo/mapa/index.html`, `js/layout.js`, `build.js`
- **Files removed:** `js/config.js`, `js/config.example.js`

## 2026-04-10

### History & Culture Encyclopedia
- Added a comprehensive **Historia y Cultura** section — an encyclopedia of biblical history and culture.
- **20 articles** covering 5 categories:
  - **Pueblos** (5): Caldeos, Egipto Antiguo, Cananeos, Filisteos, Hititas
  - **Geografia** (4): Mesopotamia, Ur de los Caldeos, Tierra de Canaan, Desierto del Sinai
  - **Vida Cotidiana** (5): Vida Patriarcal, Pastoreo y Nomadismo, Esclavitud en Egipto, Comercio Antiguo, Clases Sociales
  - **Religion** (3): Religion Mesopotamica, Religion Egipcia, El Tabernaculo
  - **Gobierno** (3): Pactos Antiguos, Ley Mosaica, Los Faraones
- **Landing page:** Article grid grouped by category with search filter and category tab buttons.
- **Article detail view:** Full article with content sections, key verses, related book chapters, and related articles. URL parameter routing (`?articulo=caldeos`).
- **Navigation:** Added "Historia" link to header nav and "Historia y Cultura" link to mobile drawer. Added section link card on homepage.
- **Files added:** `historia-cultura/index.html`, `css/historia.css`, `data/historia-cultura/articles.json`, `data/historia-cultura/categories.json`
- **Files changed:** `index.html`, `js/layout.js`

### Interactive Map — Water Body Labels
- Added labeled names for all major bodies of water on both Genesis and Exodus maps.
- **Genesis map (13 labels):** Mar Mediterraneo, Mar Rojo, Mar Muerto, Mar de Galilea, Rio Jordan, Rio Nilo, Rio Eufrates, Rio Tigris, Golfo Persico, Estrecho de Ormuz, Golfo de Suez, Golfo de Aqaba, Mar Caspio.
- **Exodus map (8 labels):** Subset focused on Egypt-Sinai region.
- Labels use italic serif font with text-shadow for readability. Each label has configurable fontSize, letterSpacing, and rotation.
- Togglable via "Cuerpos de agua" checkbox in the Capas panel under "REFERENCIAS" section.
- **Water label positioning fix:** Initial labels overlapped land because `L.divIcon` anchored from top-left. Fixed with `transform: translate(-50%, -50%)` to center-anchor each label on its coordinate. Adjusted font sizes for small water bodies (Dead Sea, Sea of Galilee, gulfs) to 8px.
- **Files changed:** `js/bible-map.js`, `css/map.css`, `data/genesis/locations.json`, `data/exodo/locations.json`

### Map Tile Switch to Esri
- **Problem:** CartoDB Voyager / OpenStreetMap tiles displayed location labels in the region's native language (Kazakh for Caspian Sea, Arabic for Persian Gulf, etc.).
- **Fix:** Switched all four tile layers to Esri services with consistent English labels:
  - Modern: Esri World Street Map
  - Satellite: Esri World Imagery
  - Terrain: Esri World Topo Map
  - Ancient: Esri NatGeo World Map
- No API key required for Esri tiles.
- **Note:** Later replaced by Google Maps migration (see 2026-04-11).
- **Files changed:** `js/bible-map.js`

### Map Frame Resize
- **Problem:** Map container at 75vh was too tall, showing excessive areas (all of Africa, India) that were irrelevant to biblical geography.
- **Fix:** Reduced map container to `50vh` with `min-height: 350px; max-height: 500px`. Responsive breakpoints: 45vh/300px/450px at 900px, 40vh/250px/400px at 500px.
- **Files changed:** `css/map.css`

### Navigation & Layout Redesign
- **Problem:** Header nav listed each book individually (Genesis, Exodo...), which would not scale to 66 books.
- **Fix:** Replaced flat nav links with a slim header containing "Inicio" + "Libros" mega-dropdown button.
- **Mega-dropdown:** Full-width panel showing all 66 books organized by testament (AT/NT) and category (Pentateuco, Historicos, Poeticos, etc.). Active books are clickable; coming-soon books grayed out. Current book highlighted in gold. Loaded dynamically from `books.json`.
- **Mobile drawer:** Hamburger menu opens a slide-in drawer with accordion sections per testament/group for touch-friendly navigation.
- **Footer redesign:** Three-column professional footer on dark brown background — site info, content links, activities list.
- **Files changed:** `js/layout.js`, `css/main.css`

### Chapter Study Analysis
- Added comprehensive biblical study analysis for every chapter of Genesis (50) and Exodus (40) — 90 chapters total.
- Each chapter analysis includes: themes, historical context, key people, study insights, cross-references, and reflection questions.
- Expandable "Estudio" button on each chapter card toggles the analysis section.
- Chapter search filter now includes analysis content (themes, people, context).
- **Files changed:** `data/genesis/chapters.json`, `data/exodo/chapters.json`, `genesis/index.html`, `exodo/index.html`, `css/main.css`

### Crossword Navigation Fix
- **Problem:** Crossword pages had two identical-looking rows of tab buttons (section tabs and puzzle tabs), making it confusing to tell which was primary navigation vs sub-navigation.
- **Fix:** Replaced puzzle tabs with small numbered pill buttons and a "CRUCIGRAMA:" label. Section tabs remain as large rectangular buttons for chapter group navigation.
- **Files changed:** `css/crossword.css`, `genesis/crucigramas/index.html`, `exodo/crucigramas/index.html`

### Interactive Map — Layers Panel
- **Problem:** Horizontal filter buttons (tile type, book filters, route toggles) in a bar above the map would not scale as more books are added.
- **Fix:** Replaced the controls bar with a floating **"Capas" (Layers) panel** on the map, similar to Google Maps. The panel has organized sections for tile type, and route toggles. Opens/closes with a single button click.
- **Files changed:** `js/bible-map.js`, `css/map.css`, `genesis/mapa/index.html`, `exodo/mapa/index.html`

### Interactive Map — One Map Per Book
- Each book now has its own dedicated map instance showing only that book's locations and routes.
- Removed the multi-book filter system from individual book map pages.
- The layers panel retains tile switching (Moderno/Satelite/Terreno/Antiguo) and route toggle controls.

---

## Previous (initial release)

### Platform Architecture
- Multi-book static site: Genesis (50 chapters) and Exodus (40 chapters).
- Shared layout injection via `js/layout.js` reading `<meta name="book">` for context.
- Session-based admin mode via `js/admin.js` with SHA-256 PIN hashing.
- All content stored as JSON data files under `data/{book}/`.

### Content per Book
- **Chapter summaries** — `data/{book}/chapters.json` with title, summary, and key verses per chapter.
- **Quizzes** — 7 multiple-choice questions per chapter (630 total across 90 JSON files). Engine: `js/quiz-engine.js`.
- **Crosswords** — Grouped by chapter range, algorithmically generated grids. Engine: `js/crossword-engine.js` + `js/crossword-game.js`.
- **Interactive maps** — Leaflet.js with Esri tile layers, emoji markers, route polylines, water body labels, and event popups. Engine: `js/bible-map.js`.

### Book Landing Pages
- Each book (`genesis/index.html`, `exodo/index.html`) has: overview, section link cards (Chapters, Map, Crosswords, Quizzes), chapter list with search filter.

### Home Page
- Pure navigation hub listing all 66 Bible books, grouped by testament.
- Shows "Disponible" / "Proximamente" badges per book.
- Loads from `data/books.json`.

### File Structure
```
biblia-estudio/
  index.html              — Home page (navigation hub)
  build.js                — Node.js script to generate quiz HTML shells
  CHANGELOG.md            — This file
  css/
    main.css              — Global styles, layout, tabs, cards, mega-dropdown, mobile drawer
    crossword.css         — Crossword puzzle styles
    map.css               — Map container, layers panel, markers, popups, water labels
    quiz.css              — Quiz page styles
    historia.css          — History & Culture encyclopedia styles
  js/
    admin.js              — Admin mode (PIN: 1074, SHA-256 hashed)
    layout.js             — Shared header/footer/breadcrumb injection, mega-dropdown, mobile drawer
    bible-map.js          — BibleMap class (Leaflet.js + Esri tiles), emoji markers, water labels
    crossword-engine.js   — CrosswordGenerator (grid algorithm)
    crossword-game.js     — CrosswordGame (interactive play)
    quiz-engine.js        — QuizEngine / MultipleChoiceQuiz
  data/
    books.json            — All 66 books metadata
    historia-cultura/
      categories.json     — 5 encyclopedia categories (pueblos, geografia, vida-cotidiana, religion, gobierno)
      articles.json       — 20 historical/cultural articles
    genesis/
      chapters.json       — 50 chapter summaries + study analysis
      locations.json      — 15 map locations + 3 routes + 13 water body labels
      crosswords.json     — 5 sections, 20 puzzles
      quiz-cap-01.json    — Quiz per chapter (50 files)
      ...
    exodo/
      chapters.json       — 40 chapter summaries + study analysis
      locations.json      — 14 map locations + 2 routes + 8 water body labels
      crosswords.json     — 4 sections, 16 puzzles
      quiz-cap-01.json    — Quiz per chapter (40 files)
      ...
  genesis/
    index.html            — Book landing page
    mapa/index.html       — Interactive map (Leaflet + Esri)
    crucigramas/index.html — Crossword puzzles
    cuestionarios/        — 50 quiz chapter pages (generated by build.js)
  exodo/
    index.html            — Book landing page
    mapa/index.html       — Interactive map (Leaflet + Esri)
    crucigramas/index.html — Crossword puzzles
    cuestionarios/        — 40 quiz chapter pages (generated by build.js)
  historia-cultura/
    index.html            — History & Culture encyclopedia (landing + article detail views)
```

### Technical Stack
- Pure HTML/CSS/JS — no framework, no build step for the site itself.
- Leaflet.js 1.9.4 for interactive maps with Esri tile layers (no API key required).
- Map tile layers: Esri World Street Map (modern), Esri World Imagery (satellite), Esri World Topo Map (terrain), Esri NatGeo World Map (ancient).
- Hosted on Cloudflare Pages, source on GitHub (`Rykimaruh/biblia-estudio`).
- Deploy: `npx wrangler pages deploy . --project-name=biblia-estudio-interactivo --branch=main`
- Live URL: `https://biblia-estudio-interactivo.pages.dev`
