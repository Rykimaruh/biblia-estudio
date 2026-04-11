# Changelog — Biblia Estudio Interactivo

## 2026-04-10

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
- The layers panel retains tile switching (Moderno/Satelite/Antiguo) and route toggle controls.

### Ancient Map Tile Fix
- **Problem:** The "Antiguo" map view used Esri World Physical Map tiles which only supported zoom level 10, showing "Map data not yet available" at higher zoom levels.
- **Fix (attempt 1):** Switched to OpenTopoMap — worked but had a heat-map appearance.
- **Fix (final):** Switched to **Esri NatGeo World Map** tiles (zoom 16), providing a classic National Geographic atlas style.
- Added dynamic `maxZoom` handling in `switchTile()` so changing tile layers auto-adjusts the map's zoom limit.

### Satellite View — Google Maps Imagery
- Switched the satellite tile layer from the default provider to Google Maps imagery (`mt1.google.com/vt/lyrs=s`) for better detail when zooming in. No API key required.

### Map Height Expansion
- Increased map container from default to `75vh` (min 500px) for a better viewing experience.

### Deployment
- Renamed Cloudflare Pages project from `crucigrama-exodo` to **`biblia-estudio-interactivo`**.
- Live URL: `https://biblia-estudio-interactivo.pages.dev`
- Deploy command: `npx wrangler pages deploy . --project-name=biblia-estudio-interactivo --branch=master`

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
- **Interactive maps** — Leaflet.js-based with emoji markers, route polylines, and event popups. Engine: `js/bible-map.js`.

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
  css/
    main.css              — Global styles, layout, tabs, cards
    crossword.css         — Crossword puzzle styles
    map.css               — Map container, layers panel, markers, popups
    quiz.css              — Quiz page styles
  js/
    admin.js              — Admin mode (PIN: 1074, SHA-256 hashed)
    layout.js             — Shared header/footer/breadcrumb injection
    bible-map.js          — BibleMap class (Leaflet.js)
    crossword-engine.js   — CrosswordGenerator (grid algorithm)
    crossword-game.js     — CrosswordGame (interactive play)
    quiz-engine.js        — QuizEngine / MultipleChoiceQuiz
  data/
    books.json            — All 66 books metadata
    genesis/
      chapters.json       — 50 chapter summaries
      locations.json      — 15 map locations + 3 routes
      crosswords.json     — 5 sections, 20 puzzles
      quiz-cap-01.json    — Quiz per chapter (50 files)
      ...
    exodo/
      chapters.json       — 40 chapter summaries
      locations.json      — 14 map locations + 2 routes
      crosswords.json     — 4 sections, 16 puzzles
      quiz-cap-01.json    — Quiz per chapter (40 files)
      ...
  genesis/
    index.html            — Book landing page
    mapa/index.html       — Interactive map
    crucigramas/index.html — Crossword puzzles
    cuestionarios/        — 50 quiz chapter pages (generated by build.js)
  exodo/
    index.html            — Book landing page
    mapa/index.html       — Interactive map
    crucigramas/index.html — Crossword puzzles
    cuestionarios/        — 40 quiz chapter pages (generated by build.js)
```

### Technical Stack
- Pure HTML/CSS/JS — no framework, no build step for the site itself.
- Leaflet.js (CDN) for interactive maps.
- Tile layers: CartoDB Voyager (modern), Google Satellite, Esri NatGeo (ancient).
- Hosted on Cloudflare Pages, source on GitHub (`Rykimaruh/biblia-estudio`).
