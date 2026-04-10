/* ============================================
   Bible Map — Motor del Mapa Interactivo
   Multi-libro con panel de capas flotante.
   Escala a cualquier cantidad de libros.
   ============================================ */

class BibleMap {
    constructor(containerId, booksData, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('BibleMap: container not found:', containerId);
            return;
        }

        this.booksData = Array.isArray(booksData) ? booksData : [booksData];
        this.options = options;

        const defaultActive = options.activeBooks || this.booksData.map(b => b.bookSlug);
        this.activeBooks = new Set(defaultActive);

        this._colorPalette = [
            '#8B6914', '#B22222', '#2E6B8A', '#6B8E23', '#8B4789',
            '#CD853F', '#4682B4', '#D4A017', '#DC143C', '#3CB371'
        ];

        this.bookMarkers = {};
        this.bookRoutes = {};
        this.allMarkers = [];
        this.activeRoutes = new Set();
        this.currentTile = 'modern';

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

        this.tiles = {
            modern: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 18, minZoom: 4
            }),
            satellite: L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                attribution: '&copy; Google Maps',
                maxZoom: 20, minZoom: 4
            }),
            ancient: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; National Geographic',
                maxZoom: 16, minZoom: 4
            })
        };
        this.tileLabels = { modern: 'Moderno', satellite: 'Satelite', ancient: 'Antiguo' };

        this._initMap();
        this._loadAllBooks();
        this._createLayersPanel();
        this._renderLegend();
    }

    /* ---- Helpers ---- */

    _getBookColor(bookData, index) {
        return bookData.bookColor || this._colorPalette[index % this._colorPalette.length];
    }

    /* ---- Map Init ---- */

    _initMap() {
        const primary = this.booksData.find(b => this.activeBooks.has(b.bookSlug)) || this.booksData[0];
        this.map = L.map(this.container, {
            center: primary.center || [31.0, 35.0],
            zoom: primary.zoom || 6,
            scrollWheelZoom: true,
            zoomControl: true
        });
        this.tiles.modern.addTo(this.map);
    }

    /* ---- Load Books ---- */

    _loadAllBooks() {
        this.booksData.forEach((bookData) => {
            const slug = bookData.bookSlug;
            const isActive = this.activeBooks.has(slug);
            this.bookMarkers[slug] = [];
            this.bookRoutes[slug] = {};

            for (const loc of bookData.locations) {
                const emoji = this.iconEmojis[loc.icon] || '\u{1F4CD}';
                const icon = L.divIcon({
                    html: `<div class="bible-marker marker-${loc.icon || 'city'}">${emoji}</div>`,
                    className: 'bible-marker-wrapper',
                    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18]
                });
                const marker = L.marker([loc.lat, loc.lng], { icon });
                marker.bindPopup(this._buildPopup(loc, bookData), {
                    className: 'bible-popup', maxWidth: 320, minWidth: 250
                });
                marker._locationData = loc;
                marker._bookSlug = slug;
                this.bookMarkers[slug].push(marker);
                this.allMarkers.push(marker);
                if (isActive) marker.addTo(this.map);
            }

            if (bookData.routes) {
                for (const route of bookData.routes) {
                    const polyline = L.polyline(route.points, {
                        color: route.color || '#c8a44e', weight: 4,
                        opacity: 0.8, dashArray: route.dashArray || null, smoothFactor: 1.5
                    });
                    const circles = [];
                    if (route.labels) {
                        route.points.forEach((pt, i) => {
                            if (route.labels[i]) {
                                const c = L.circleMarker(pt, {
                                    radius: 5, color: route.color || '#c8a44e',
                                    fillColor: '#fff', fillOpacity: 1, weight: 2
                                });
                                c.bindTooltip(route.labels[i], { permanent: false, direction: 'top', offset: [0, -8] });
                                circles.push(c);
                            }
                        });
                    }
                    const group = L.layerGroup([polyline, ...circles]);
                    this.bookRoutes[slug][route.id] = { layer: group, route };
                    if (isActive) {
                        group.addTo(this.map);
                        this.activeRoutes.add(route.id);
                    }
                }
            }
        });
    }

    _buildPopup(loc, bookData) {
        const slug = bookData.bookSlug;
        let html = `<div class="popup-header">${loc.name}</div>`;
        html += `<div class="popup-book-label">${bookData.book}</div>`;
        html += '<div class="popup-events">';
        for (const evt of loc.events) {
            const links = evt.chapters.map(ch =>
                `<a href="../../${slug}/cuestionarios/${ch}/" class="popup-event-link">Cap. ${ch}</a>`
            ).join(' ');
            html += `<div class="popup-event">
                <div class="popup-event-title">${evt.title}</div>
                <div class="popup-event-verse">${evt.verse}</div>
                <div>${links}</div>
            </div>`;
        }
        html += '</div>';
        return html;
    }

    /* ================================================
       LAYERS PANEL — floating control on the map
       ================================================ */

    _createLayersPanel() {
        const wrapper = this.container.closest('.map-wrapper');
        if (!wrapper) return;

        // --- Toggle button ---
        this.layersBtn = document.createElement('button');
        this.layersBtn.className = 'map-layers-btn';
        this.layersBtn.innerHTML = '\u{1F5FA}\uFE0F Capas';
        wrapper.appendChild(this.layersBtn);

        // --- Panel ---
        this.layersPanel = document.createElement('div');
        this.layersPanel.className = 'map-layers-panel';
        wrapper.appendChild(this.layersPanel);

        // Prevent clicks from reaching the map
        [this.layersBtn, this.layersPanel].forEach(el => {
            L.DomEvent.disableClickPropagation(el);
            L.DomEvent.disableScrollPropagation(el);
        });

        this.layersBtn.addEventListener('click', () => this._openPanel());
        this._renderPanel();
    }

    _openPanel() {
        this.layersPanel.classList.add('open');
        this.layersBtn.style.display = 'none';
    }

    _closePanel() {
        this.layersPanel.classList.remove('open');
        this.layersBtn.style.display = '';
    }

    _renderPanel() {
        this.layersPanel.innerHTML = `
            <div class="layers-header">
                <span>\u{1F5FA}\uFE0F Capas del Mapa</span>
                <button class="layers-close">&times;</button>
            </div>
            <div class="layers-section">
                <div class="layers-section-title">TIPO DE MAPA</div>
                <div class="tile-options" id="panel-tiles"></div>
            </div>
            <div class="layers-section">
                <div class="layers-section-title">LIBROS</div>
                <div id="panel-books"></div>
            </div>
            <div class="layers-section" id="panel-routes-section">
                <div class="layers-section-title">RUTAS</div>
                <div id="panel-routes"></div>
            </div>
        `;

        this.layersPanel.querySelector('.layers-close')
            .addEventListener('click', () => this._closePanel());

        this._renderTileOptions();
        this._renderBookOptions();
        this._renderRouteOptions();
    }

    /* ---- Tile Options ---- */

    _renderTileOptions() {
        const container = this.layersPanel.querySelector('#panel-tiles');
        let html = '';
        for (const [key, label] of Object.entries(this.tileLabels)) {
            html += `<button class="tile-option ${key === this.currentTile ? 'active' : ''}" data-tile="${key}">${label}</button>`;
        }
        container.innerHTML = html;

        container.querySelectorAll('.tile-option').forEach(btn => {
            btn.addEventListener('click', () => this._switchTile(btn.dataset.tile));
        });
    }

    _switchTile(type) {
        if (this.currentTile === type) return;
        this.map.removeLayer(this.tiles[this.currentTile]);
        this.tiles[type].addTo(this.map);
        this.currentTile = type;

        const maxZoom = this.tiles[type].options.maxZoom || 18;
        this.map.setMaxZoom(maxZoom);
        if (this.map.getZoom() > maxZoom) this.map.setZoom(maxZoom);

        this.layersPanel.querySelectorAll('.tile-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tile === type);
        });
    }

    /* ---- Book Options ---- */

    _renderBookOptions() {
        const container = this.layersPanel.querySelector('#panel-books');
        let html = '';
        this.booksData.forEach((bookData, i) => {
            const slug = bookData.bookSlug;
            const color = this._getBookColor(bookData, i);
            const on = this.activeBooks.has(slug);
            html += `
                <div class="layer-item" data-book="${slug}">
                    <span class="layer-checkbox ${on ? 'checked' : ''}"
                          style="border-color:${color}; ${on ? `background:${color};` : ''}">
                        ${on ? '\u2713' : ''}
                    </span>
                    <span class="layer-item-label">${bookData.book}</span>
                </div>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.layer-item').forEach(item => {
            item.addEventListener('click', () => this._toggleBook(item.dataset.book));
        });
    }

    _toggleBook(bookSlug) {
        if (this.activeBooks.has(bookSlug)) {
            if (this.activeBooks.size <= 1) return;
            this.activeBooks.delete(bookSlug);
            for (const m of this.bookMarkers[bookSlug]) this.map.removeLayer(m);
            for (const id in this.bookRoutes[bookSlug]) {
                this.map.removeLayer(this.bookRoutes[bookSlug][id].layer);
                this.activeRoutes.delete(id);
            }
        } else {
            this.activeBooks.add(bookSlug);
            for (const m of this.bookMarkers[bookSlug]) m.addTo(this.map);
            for (const id in this.bookRoutes[bookSlug]) {
                this.bookRoutes[bookSlug][id].layer.addTo(this.map);
                this.activeRoutes.add(id);
            }
        }

        this._renderBookOptions();
        this._renderRouteOptions();
        this._renderLegend();
        if (this.options.onBookToggle) this.options.onBookToggle(this.activeBooks);
    }

    /* ---- Route Options ---- */

    _renderRouteOptions() {
        const container = this.layersPanel.querySelector('#panel-routes');
        const section = this.layersPanel.querySelector('#panel-routes-section');
        let html = '';
        let hasRoutes = false;

        for (const bookData of this.booksData) {
            const slug = bookData.bookSlug;
            if (!this.activeBooks.has(slug) || !bookData.routes || !bookData.routes.length) continue;
            hasRoutes = true;

            const bookIdx = this.booksData.indexOf(bookData);
            const bookColor = this._getBookColor(bookData, bookIdx);

            html += `<div class="route-book-group">
                <div class="route-book-title" style="color:${bookColor}">${bookData.book}</div>`;

            for (const route of bookData.routes) {
                const on = this.activeRoutes.has(route.id);
                html += `
                    <div class="route-item" data-route="${route.id}" data-book="${slug}">
                        <span class="layer-checkbox small ${on ? 'checked' : ''}"
                              style="border-color:${route.color}; ${on ? `background:${route.color};` : ''}">
                            ${on ? '\u2713' : ''}
                        </span>
                        <span class="route-line-sample" style="background:${route.color};${route.dashArray ? ' background:repeating-linear-gradient(90deg,' + route.color + ' 0,' + route.color + ' 4px,transparent 4px,transparent 7px);' : ''}"></span>
                        <span class="route-item-label">${route.name}</span>
                    </div>`;
            }
            html += '</div>';
        }

        section.style.display = hasRoutes ? '' : 'none';
        container.innerHTML = html;

        container.querySelectorAll('.route-item').forEach(item => {
            item.addEventListener('click', () => {
                this._toggleRoute(item.dataset.route, item.dataset.book);
            });
        });
    }

    _toggleRoute(routeId, bookSlug) {
        const rd = this.bookRoutes[bookSlug]?.[routeId];
        if (!rd) return;

        if (this.activeRoutes.has(routeId)) {
            this.map.removeLayer(rd.layer);
            this.activeRoutes.delete(routeId);
        } else {
            rd.layer.addTo(this.map);
            this.activeRoutes.add(routeId);
        }
        this._renderRouteOptions();
    }

    /* ---- Legend ---- */

    _renderLegend() {
        const container = document.getElementById('map-legend');
        if (!container) return;

        const usedTypes = new Set();
        for (const bd of this.booksData) {
            if (!this.activeBooks.has(bd.bookSlug)) continue;
            for (const loc of bd.locations) usedTypes.add(loc.icon || 'city');
        }

        let html = '';
        for (const type of usedTypes) {
            html += `<div class="legend-item">
                <span class="legend-dot" style="background:${this.markerColors[type] || '#8B6914'};"></span> ${this.iconLabels[type] || type}
            </div>`;
        }
        for (const bd of this.booksData) {
            if (!this.activeBooks.has(bd.bookSlug) || !bd.routes) continue;
            for (const r of bd.routes) {
                html += `<div class="legend-item">
                    <span class="legend-line" style="background:${r.color};"></span> ${r.name}
                </div>`;
            }
        }
        container.innerHTML = html;
    }

    /* ---- Public ---- */

    flyTo(locationId) {
        const marker = this.allMarkers.find(m => m._locationData.id === locationId);
        if (marker) {
            if (!this.activeBooks.has(marker._bookSlug)) this._toggleBook(marker._bookSlug);
            this.map.flyTo(marker.getLatLng(), 8, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1600);
        }
    }

    fitAll() {
        const active = this.allMarkers.filter(m => this.activeBooks.has(m._bookSlug));
        if (active.length) {
            this.map.fitBounds(L.latLngBounds(active.map(m => m.getLatLng())), { padding: [40, 40] });
        }
    }

    getActiveBooks() {
        return new Set(this.activeBooks);
    }
}
