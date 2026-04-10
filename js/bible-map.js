/* ============================================
   Bible Map — Motor del Mapa Interactivo
   Usa Leaflet.js para renderizar mapas con
   ubicaciones y rutas biblicas.
   ============================================ */

class BibleMap {
    constructor(containerId, data, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('BibleMap: container not found:', containerId);
            return;
        }

        this.data = data;
        this.options = options;
        this.markers = [];
        this.routeLayers = {};
        this.activeRoutes = new Set();
        this.currentTile = 'modern';

        // Tile layers
        this.tiles = {
            modern: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 18,
                minZoom: 4
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> — World Imagery',
                maxZoom: 18,
                minZoom: 4
            }),
            ancient: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> — World Physical Map',
                maxZoom: 10,
                minZoom: 4
            })
        };

        this._initMap();
        this._addMarkers();
        this._addRoutes();
        this._setupControls();
    }

    /* ------------------------------------------------
       Map Initialization
       ------------------------------------------------ */

    _initMap() {
        const center = this.data.center || [31.0, 35.0];
        const zoom = this.data.zoom || 6;

        this.map = L.map(this.container, {
            center: center,
            zoom: zoom,
            scrollWheelZoom: true,
            zoomControl: true
        });

        this.tiles.modern.addTo(this.map);
    }

    /* ------------------------------------------------
       Markers
       ------------------------------------------------ */

    _addMarkers() {
        const iconEmojis = {
            city: '\u{1F3D8}', mountain: '\u26F0', water: '\u{1F30A}',
            battle: '\u2694', miracle: '\u2728', altar: '\u{1F54A}',
            home: '\u{1F3E0}', garden: '\u{1F331}', camp: '\u26FA',
            well: '\u{1F4A7}', destruction: '\u{1F525}', star: '\u2B50',
            fire: '\u{1F525}', oasis: '\u{1F334}', palace: '\u{1F451}'
        };

        for (const loc of this.data.locations) {
            const emoji = iconEmojis[loc.icon] || '\u{1F4CD}';
            const markerClass = `marker-${loc.icon || 'city'}`;

            const icon = L.divIcon({
                html: `<div class="bible-marker ${markerClass}">${emoji}</div>`,
                className: 'bible-marker-wrapper',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -18]
            });

            const marker = L.marker([loc.lat, loc.lng], { icon })
                .addTo(this.map);

            marker.bindPopup(this._buildPopup(loc), {
                className: 'bible-popup',
                maxWidth: 320,
                minWidth: 250
            });

            marker._locationData = loc;
            this.markers.push(marker);
        }
    }

    _buildPopup(loc) {
        const bookSlug = this.data.bookSlug;
        let html = `<div class="popup-header">${loc.name}</div>`;
        html += '<div class="popup-events">';

        for (const evt of loc.events) {
            const chapterLinks = evt.chapters.map(ch =>
                `<a href="../cuestionarios/${ch}/" class="popup-event-link">Cap. ${ch}</a>`
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
       Routes
       ------------------------------------------------ */

    _addRoutes() {
        if (!this.data.routes) return;

        for (const route of this.data.routes) {
            const polyline = L.polyline(route.points, {
                color: route.color || '#c8a44e',
                weight: 4,
                opacity: 0.8,
                dashArray: route.dashArray || null,
                smoothFactor: 1.5
            });

            // Add small circle markers at route points with labels
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
            this.routeLayers[route.id] = {
                layer: group,
                route: route
            };

            // Show all routes by default
            group.addTo(this.map);
            this.activeRoutes.add(route.id);
        }
    }

    /* ------------------------------------------------
       Controls
       ------------------------------------------------ */

    _setupControls() {
        // Tile toggle — bind all tile buttons
        document.querySelectorAll('.tile-toggle-btn').forEach(btn => {
            const type = btn.id.replace('tile-', '');
            if (this.tiles[type]) {
                btn.addEventListener('click', () => this.switchTile(type));
            }
        });

        // Route toggles
        const routeBtns = document.querySelectorAll('.route-btn');
        routeBtns.forEach(btn => {
            const routeId = btn.dataset.route;
            if (routeId) {
                // Style the button with route color
                const routeData = this.routeLayers[routeId];
                if (routeData) {
                    btn.style.borderColor = routeData.route.color;
                    btn.style.color = routeData.route.color;
                    if (this.activeRoutes.has(routeId)) {
                        btn.classList.add('active');
                        btn.style.backgroundColor = routeData.route.color;
                        btn.style.color = '#fff';
                    }
                }

                btn.addEventListener('click', () => this.toggleRoute(routeId, btn));
            }
        });
    }

    switchTile(type) {
        if (this.currentTile === type) return;

        const oldTile = this.tiles[this.currentTile];
        const newTile = this.tiles[type];

        this.map.removeLayer(oldTile);
        newTile.addTo(this.map);
        this.currentTile = type;

        // If switching to ancient and zoom is too high, limit it
        if (type === 'ancient' && this.map.getZoom() > 10) {
            this.map.setZoom(10);
        }

        // Update button states
        document.querySelectorAll('.tile-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `tile-${type}`);
        });
    }

    toggleRoute(routeId, btn) {
        const routeData = this.routeLayers[routeId];
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
       Public Methods
       ------------------------------------------------ */

    flyTo(locationId) {
        const marker = this.markers.find(m => m._locationData.id === locationId);
        if (marker) {
            this.map.flyTo(marker.getLatLng(), 8, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1600);
        }
    }

    fitAll() {
        const bounds = L.latLngBounds(
            this.markers.map(m => m.getLatLng())
        );
        this.map.fitBounds(bounds, { padding: [40, 40] });
    }
}
