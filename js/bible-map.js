/* ============================================
   Bible Map — Motor del Mapa Interactivo
   Multi-libro: carga datos de varios libros
   con filtros por libro y ruta.
   ============================================ */

class BibleMap {
    constructor(containerId, booksData, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('BibleMap: container not found:', containerId);
            return;
        }

        // Accept single book object or array of books
        this.booksData = Array.isArray(booksData) ? booksData : [booksData];
        this.options = options;

        // Which books are visible — default to options.activeBooks or ALL
        const defaultActive = options.activeBooks || this.booksData.map(b => b.bookSlug);
        this.activeBooks = new Set(defaultActive);

        // Auto-assign colors from palette if book doesn't declare one
        this._colorPalette = [
            '#8B6914', '#B22222', '#2E6B8A', '#6B8E23', '#8B4789',
            '#CD853F', '#4682B4', '#D4A017', '#DC143C', '#3CB371'
        ];

        // Data storage
        this.bookMarkers = {};   // bookSlug -> [markers]
        this.bookRoutes = {};    // bookSlug -> { routeId: { layer, route } }
        this.allMarkers = [];    // flat list for flyTo / fitAll
        this.activeRoutes = new Set();
        this.currentTile = 'modern';

        // Shared icon config
        this.iconEmojis = {
            city: '\u{1F3D8}', mountain: '\u26F0', water: '\u{1F30A}',
            battle: '\u2694', miracle: '\u2728', altar: '\u{1F54A}',
            home: '\u{1F3E0}', garden: '\u{1F331}', camp: '\u26FA',
            well: '\u{1F4A7}', destruction: '\u{1F525}', star: '\u2B50',
            fire: '\u{1F525}', oasis: '\u{1F334}', palace: '\u{1F451}'
        };
        this.markerColors = {
            city: '#8B6914', mountain: '#6B8E23', water: '#4682B4',
            battle: '#B22222', miracle: '#9B59B6', altar: '#D4A017',
            home: '#8B4513', garden: '#228B22', camp: '#CD853F',
            well: '#5B9BD5', destruction: '#DC143C', star: '#FFD700',
            fire: '#FF6347', oasis: '#3CB371', palace: '#8B4789'
        };
        this.iconLabels = {
            city: 'Ciudad', mountain: 'Monte', water: 'Agua',
            battle: 'Batalla', miracle: 'Milagro', altar: 'Altar',
            home: 'Hogar', garden: 'Jardin', camp: 'Campamento',
            well: 'Pozo', destruction: 'Destruccion', star: 'Encuentro',
            fire: 'Zarza', oasis: 'Oasis', palace: 'Palacio'
        };

        // Tile layers
        this.tiles = {
            modern: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 18,
                minZoom: 4
            }),
            satellite: L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                attribution: '&copy; Google Maps',
                maxZoom: 20,
                minZoom: 4
            }),
            ancient: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; National Geographic',
                maxZoom: 16,
                minZoom: 4
            })
        };

        this._initMap();
        this._loadAllBooks();
        this._setupTileControls();
        this._renderBookControls();
        this._renderRouteControls();
        this._renderLegend();
    }

    /* ------------------------------------------------
       Helpers
       ------------------------------------------------ */

    _getBookColor(bookData, index) {
        return bookData.bookColor || this._colorPalette[index % this._colorPalette.length];
    }

    /* ------------------------------------------------
       Map Initialization
       ------------------------------------------------ */

    _initMap() {
        const primaryBook = this.booksData.find(b => this.activeBooks.has(b.bookSlug)) || this.booksData[0];
        const center = primaryBook.center || [31.0, 35.0];
        const zoom = primaryBook.zoom || 6;

        this.map = L.map(this.container, {
            center: center,
            zoom: zoom,
            scrollWheelZoom: true,
            zoomControl: true
        });

        this.tiles.modern.addTo(this.map);
    }

    /* ------------------------------------------------
       Load All Books (Markers + Routes)
       ------------------------------------------------ */

    _loadAllBooks() {
        this.booksData.forEach((bookData, bookIndex) => {
            const slug = bookData.bookSlug;
            const isActive = this.activeBooks.has(slug);
            this.bookMarkers[slug] = [];
            this.bookRoutes[slug] = {};

            // --- Markers ---
            for (const loc of bookData.locations) {
                const emoji = this.iconEmojis[loc.icon] || '\u{1F4CD}';
                const markerClass = `marker-${loc.icon || 'city'}`;

                const icon = L.divIcon({
                    html: `<div class="bible-marker ${markerClass}">${emoji}</div>`,
                    className: 'bible-marker-wrapper',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    popupAnchor: [0, -18]
                });

                const marker = L.marker([loc.lat, loc.lng], { icon });

                marker.bindPopup(this._buildPopup(loc, bookData), {
                    className: 'bible-popup',
                    maxWidth: 320,
                    minWidth: 250
                });

                marker._locationData = loc;
                marker._bookSlug = slug;
                this.bookMarkers[slug].push(marker);
                this.allMarkers.push(marker);

                if (isActive) marker.addTo(this.map);
            }

            // --- Routes ---
            if (bookData.routes) {
                for (const route of bookData.routes) {
                    const polyline = L.polyline(route.points, {
                        color: route.color || '#c8a44e',
                        weight: 4,
                        opacity: 0.8,
                        dashArray: route.dashArray || null,
                        smoothFactor: 1.5
                    });

                    const routeMarkers = [];
                    if (route.labels) {
                        route.points.forEach((pt, i) => {
                            if (route.labels[i]) {
                                const circle = L.circleMarker(pt, {
                                    radius: 5,
                                    color: route.color || '#c8a44e',
                                    fillColor: '#fff',
                                    fillOpacity: 1,
                                    weight: 2
                                });
                                circle.bindTooltip(route.labels[i], {
                                    permanent: false,
                                    direction: 'top',
                                    offset: [0, -8]
                                });
                                routeMarkers.push(circle);
                            }
                        });
                    }

                    const group = L.layerGroup([polyline, ...routeMarkers]);
                    this.bookRoutes[slug][route.id] = { layer: group, route: route };

                    if (isActive) {
                        group.addTo(this.map);
                        this.activeRoutes.add(route.id);
                    }
                }
            }
        });
    }

    /* ------------------------------------------------
       Popup Builder
       ------------------------------------------------ */

    _buildPopup(loc, bookData) {
        const slug = bookData.bookSlug;
        let html = `<div class="popup-header">${loc.name}</div>`;
        html += `<div class="popup-book-label">${bookData.book}</div>`;
        html += '<div class="popup-events">';

        for (const evt of loc.events) {
            const chapterLinks = evt.chapters.map(ch =>
                `<a href="../../${slug}/cuestionarios/${ch}/" class="popup-event-link">Cap. ${ch}</a>`
            ).join(' ');

            html += `
                <div class="popup-event">
                    <div class="popup-event-title">${evt.title}</div>
                    <div class="popup-event-verse">${evt.verse}</div>
                    <div>${chapterLinks}</div>
                </div>`;
        }

        html += '</div>';
        return html;
    }

    /* ------------------------------------------------
       Tile Controls
       ------------------------------------------------ */

    _setupTileControls() {
        document.querySelectorAll('.tile-toggle-btn').forEach(btn => {
            const type = btn.id.replace('tile-', '');
            if (this.tiles[type]) {
                btn.addEventListener('click', () => this.switchTile(type));
            }
        });
    }

    switchTile(type) {
        if (this.currentTile === type) return;

        this.map.removeLayer(this.tiles[this.currentTile]);
        this.tiles[type].addTo(this.map);
        this.currentTile = type;

        const maxZoom = this.tiles[type].options.maxZoom || 18;
        this.map.setMaxZoom(maxZoom);
        if (this.map.getZoom() > maxZoom) {
            this.map.setZoom(maxZoom);
        }

        document.querySelectorAll('.tile-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `tile-${type}`);
        });
    }

    /* ------------------------------------------------
       Book Filter Controls (dynamic)
       ------------------------------------------------ */

    _renderBookControls() {
        const container = document.getElementById('book-filters');
        if (!container || this.booksData.length < 2) return;

        let html = '<span style="font-weight:600; color: var(--color-brown);">Libros:</span>';

        this.booksData.forEach((bookData, i) => {
            const slug = bookData.bookSlug;
            const color = this._getBookColor(bookData, i);
            const isActive = this.activeBooks.has(slug);

            html += `<button class="book-btn ${isActive ? 'active' : ''}"
                data-book="${slug}"
                style="border-color:${color}; ${isActive ? `background:${color}; color:#fff;` : `color:${color};`}">
                ${bookData.book}
            </button>`;
        });

        container.innerHTML = html;

        container.querySelectorAll('.book-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleBook(btn.dataset.book));
        });
    }

    toggleBook(bookSlug) {
        if (this.activeBooks.has(bookSlug)) {
            if (this.activeBooks.size <= 1) return; // keep at least one

            this.activeBooks.delete(bookSlug);
            for (const marker of this.bookMarkers[bookSlug]) {
                this.map.removeLayer(marker);
            }
            for (const routeId in this.bookRoutes[bookSlug]) {
                this.map.removeLayer(this.bookRoutes[bookSlug][routeId].layer);
                this.activeRoutes.delete(routeId);
            }
        } else {
            this.activeBooks.add(bookSlug);
            for (const marker of this.bookMarkers[bookSlug]) {
                marker.addTo(this.map);
            }
            for (const routeId in this.bookRoutes[bookSlug]) {
                this.bookRoutes[bookSlug][routeId].layer.addTo(this.map);
                this.activeRoutes.add(routeId);
            }
        }

        this._updateBookButtons();
        this._renderRouteControls();
        this._renderLegend();

        // Notify the page so it can update the events list
        if (this.options.onBookToggle) {
            this.options.onBookToggle(this.activeBooks);
        }
    }

    _updateBookButtons() {
        this.booksData.forEach((bookData, i) => {
            const slug = bookData.bookSlug;
            const color = this._getBookColor(bookData, i);
            const btn = document.querySelector(`.book-btn[data-book="${slug}"]`);
            if (!btn) return;

            const isActive = this.activeBooks.has(slug);
            btn.classList.toggle('active', isActive);
            btn.style.backgroundColor = isActive ? color : 'transparent';
            btn.style.color = isActive ? '#fff' : color;
        });
    }

    /* ------------------------------------------------
       Route Controls (dynamic, only for active books)
       ------------------------------------------------ */

    _renderRouteControls() {
        const container = document.getElementById('route-filters');
        if (!container) return;

        let html = '<span style="font-weight:600; color: var(--color-brown);">Rutas:</span>';
        let hasRoutes = false;

        for (const bookData of this.booksData) {
            const slug = bookData.bookSlug;
            if (!this.activeBooks.has(slug) || !bookData.routes) continue;

            for (const route of bookData.routes) {
                hasRoutes = true;
                const isActive = this.activeRoutes.has(route.id);
                html += `<button class="route-btn ${isActive ? 'active' : ''}"
                    data-route="${route.id}" data-book="${slug}"
                    style="border-color:${route.color}; ${isActive ? `background:${route.color}; color:#fff;` : `color:${route.color};`}">
                    ${route.name}
                </button>`;
            }
        }

        container.innerHTML = hasRoutes ? html : '';

        container.querySelectorAll('.route-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._toggleRoute(btn.dataset.route, btn.dataset.book, btn);
            });
        });
    }

    _toggleRoute(routeId, bookSlug, btn) {
        const routeData = this.bookRoutes[bookSlug]?.[routeId];
        if (!routeData) return;

        if (this.activeRoutes.has(routeId)) {
            this.map.removeLayer(routeData.layer);
            this.activeRoutes.delete(routeId);
            btn.classList.remove('active');
            btn.style.backgroundColor = 'transparent';
            btn.style.color = routeData.route.color;
        } else {
            routeData.layer.addTo(this.map);
            this.activeRoutes.add(routeId);
            btn.classList.add('active');
            btn.style.backgroundColor = routeData.route.color;
            btn.style.color = '#fff';
        }
    }

    /* ------------------------------------------------
       Legend (dynamic, based on active books)
       ------------------------------------------------ */

    _renderLegend() {
        const container = document.getElementById('map-legend');
        if (!container) return;

        // Collect unique icon types from active books
        const usedTypes = new Set();
        for (const bookData of this.booksData) {
            if (!this.activeBooks.has(bookData.bookSlug)) continue;
            for (const loc of bookData.locations) {
                usedTypes.add(loc.icon || 'city');
            }
        }

        let html = '';

        // Marker type dots
        for (const type of usedTypes) {
            const color = this.markerColors[type] || '#8B6914';
            const label = this.iconLabels[type] || type;
            html += `<div class="legend-item">
                <span class="legend-dot" style="background:${color};"></span> ${label}
            </div>`;
        }

        // Route lines for active books
        for (const bookData of this.booksData) {
            if (!this.activeBooks.has(bookData.bookSlug) || !bookData.routes) continue;
            for (const route of bookData.routes) {
                html += `<div class="legend-item">
                    <span class="legend-line" style="background:${route.color};"></span> ${route.name}
                </div>`;
            }
        }

        container.innerHTML = html;
    }

    /* ------------------------------------------------
       Public Methods
       ------------------------------------------------ */

    flyTo(locationId) {
        const marker = this.allMarkers.find(m => m._locationData.id === locationId);
        if (marker) {
            // Ensure the book is visible first
            if (!this.activeBooks.has(marker._bookSlug)) {
                this.toggleBook(marker._bookSlug);
            }
            this.map.flyTo(marker.getLatLng(), 8, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1600);
        }
    }

    fitAll() {
        const activeMarkers = this.allMarkers.filter(m => this.activeBooks.has(m._bookSlug));
        if (activeMarkers.length) {
            const bounds = L.latLngBounds(activeMarkers.map(m => m.getLatLng()));
            this.map.fitBounds(bounds, { padding: [40, 40] });
        }
    }

    getActiveBooks() {
        return new Set(this.activeBooks);
    }
}
