/* ============================================
   Bible Map — Motor del Mapa Interactivo
   Un mapa por libro con panel de capas flotante.
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
            modern: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Sources: Esri, HERE, Garmin, USGS',
                maxZoom: 18, minZoom: 4
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Sources: Esri, Maxar, Earthstar',
                maxZoom: 19, minZoom: 4
            }),
            terrain: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Sources: Esri, HERE, Garmin, USGS',
                maxZoom: 18, minZoom: 4
            }),
            ancient: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; National Geographic',
                maxZoom: 16, minZoom: 4
            })
        };
        this.tileLabels = { modern: 'Moderno', satellite: 'Satelite', terrain: 'Terreno', ancient: 'Antiguo' };

        this.waterLabelLayer = null;
        this.waterLabelsVisible = true;

        this._initMap();
        this._addMarkers();
        this._addRoutes();
        this._addWaterLabels();
        this._createLayersPanel();
        this._renderLegend();
    }

    /* ---- Map Init ---- */

    _initMap() {
        this.map = L.map(this.container, {
            center: this.data.center || [31.0, 35.0],
            zoom: this.data.zoom || 6,
            scrollWheelZoom: true,
            zoomControl: true
        });
        this.tiles.modern.addTo(this.map);
    }

    /* ---- Markers ---- */

    _addMarkers() {
        for (const loc of this.data.locations) {
            const emoji = this.iconEmojis[loc.icon] || '\u{1F4CD}';
            const icon = L.divIcon({
                html: `<div class="bible-marker marker-${loc.icon || 'city'}">${emoji}</div>`,
                className: 'bible-marker-wrapper',
                iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18]
            });

            const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(this.map);
            marker.bindPopup(this._buildPopup(loc), {
                className: 'bible-popup', maxWidth: 320, minWidth: 250
            });
            marker._locationData = loc;
            this.markers.push(marker);
        }
    }

    _buildPopup(loc) {
        const slug = this.data.bookSlug;
        let html = `<div class="popup-header">${loc.name}</div>`;
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

    /* ---- Routes ---- */

    _addRoutes() {
        if (!this.data.routes) return;

        for (const route of this.data.routes) {
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
                        c.bindTooltip(route.labels[i], {
                            permanent: false, direction: 'top', offset: [0, -8]
                        });
                        circles.push(c);
                    }
                });
            }

            const group = L.layerGroup([polyline, ...circles]);
            this.routeLayers[route.id] = { layer: group, route };
            group.addTo(this.map);
            this.activeRoutes.add(route.id);
        }
    }

    /* ---- Water Body Labels ---- */

    _addWaterLabels() {
        if (!this.data.waterBodies || !this.data.waterBodies.length) return;

        this.waterLabelLayer = L.layerGroup();

        for (const wb of this.data.waterBodies) {
            const fs = wb.fontSize || '12px';
            const rot = wb.rotation || 0;
            const ls = wb.letterSpacing || '0px';

            const icon = L.divIcon({
                html: `<div class="water-label" style="font-size:${fs};transform:translate(-50%,-50%) rotate(${rot}deg);letter-spacing:${ls};">${wb.name}</div>`,
                className: 'water-label-wrapper',
                iconSize: [0, 0],
                iconAnchor: [0, 0]
            });

            L.marker([wb.lat, wb.lng], { icon, interactive: false, keyboard: false })
                .addTo(this.waterLabelLayer);
        }

        this.waterLabelLayer.addTo(this.map);
    }

    _toggleWaterLabels() {
        if (!this.waterLabelLayer) return;
        if (this.waterLabelsVisible) {
            this.map.removeLayer(this.waterLabelLayer);
        } else {
            this.waterLabelLayer.addTo(this.map);
        }
        this.waterLabelsVisible = !this.waterLabelsVisible;
        this._renderWaterToggle();
    }

    /* ================================================
       LAYERS PANEL
       ================================================ */

    _createLayersPanel() {
        const wrapper = this.container.closest('.map-wrapper');
        if (!wrapper) return;

        // Toggle button
        this.layersBtn = document.createElement('button');
        this.layersBtn.className = 'map-layers-btn';
        this.layersBtn.innerHTML = '\u{1F5FA}\uFE0F Capas';
        wrapper.appendChild(this.layersBtn);

        // Panel
        this.layersPanel = document.createElement('div');
        this.layersPanel.className = 'map-layers-panel';
        wrapper.appendChild(this.layersPanel);

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
        const hasRoutes = this.data.routes && this.data.routes.length > 0;
        const hasWater = this.data.waterBodies && this.data.waterBodies.length > 0;

        let html = `
            <div class="layers-header">
                <span>\u{1F5FA}\uFE0F Capas del Mapa</span>
                <button class="layers-close">&times;</button>
            </div>
            <div class="layers-section">
                <div class="layers-section-title">TIPO DE MAPA</div>
                <div class="tile-options" id="panel-tiles"></div>
            </div>`;

        if (hasWater) {
            html += `
            <div class="layers-section">
                <div class="layers-section-title">REFERENCIAS</div>
                <div id="panel-water"></div>
            </div>`;
        }

        if (hasRoutes) {
            html += `
            <div class="layers-section">
                <div class="layers-section-title">RUTAS</div>
                <div id="panel-routes"></div>
            </div>`;
        }

        this.layersPanel.innerHTML = html;

        this.layersPanel.querySelector('.layers-close')
            .addEventListener('click', () => this._closePanel());

        this._renderTileOptions();
        if (hasWater) this._renderWaterToggle();
        if (hasRoutes) this._renderRouteOptions();
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

    /* ---- Water Labels Toggle ---- */

    _renderWaterToggle() {
        const container = this.layersPanel.querySelector('#panel-water');
        if (!container) return;

        const on = this.waterLabelsVisible;
        container.innerHTML = `
            <div class="route-item" id="water-toggle">
                <span class="layer-checkbox small ${on ? 'checked' : ''}"
                      style="border-color:#4682B4; ${on ? 'background:#4682B4;' : ''}">
                    ${on ? '\u2713' : ''}
                </span>
                <span style="color:#4682B4; font-size:0.9rem;">\u{1F30A}</span>
                <span class="route-item-label">Cuerpos de agua</span>
            </div>
        `;

        container.querySelector('#water-toggle')
            .addEventListener('click', () => this._toggleWaterLabels());
    }

    /* ---- Route Options ---- */

    _renderRouteOptions() {
        const container = this.layersPanel.querySelector('#panel-routes');
        let html = '';

        for (const route of this.data.routes) {
            const on = this.activeRoutes.has(route.id);
            html += `
                <div class="route-item" data-route="${route.id}">
                    <span class="layer-checkbox small ${on ? 'checked' : ''}"
                          style="border-color:${route.color}; ${on ? `background:${route.color};` : ''}">
                        ${on ? '\u2713' : ''}
                    </span>
                    <span class="route-line-sample" style="background:${route.color};"></span>
                    <span class="route-item-label">${route.name}</span>
                </div>`;
        }

        container.innerHTML = html;

        container.querySelectorAll('.route-item').forEach(item => {
            item.addEventListener('click', () => this._toggleRoute(item.dataset.route));
        });
    }

    _toggleRoute(routeId) {
        const rd = this.routeLayers[routeId];
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
        for (const loc of this.data.locations) usedTypes.add(loc.icon || 'city');

        let html = '';
        for (const type of usedTypes) {
            html += `<div class="legend-item">
                <span class="legend-dot" style="background:${this.markerColors[type] || '#8B6914'};"></span> ${this.iconLabels[type] || type}
            </div>`;
        }
        if (this.data.routes) {
            for (const r of this.data.routes) {
                html += `<div class="legend-item">
                    <span class="legend-line" style="background:${r.color};"></span> ${r.name}
                </div>`;
            }
        }
        container.innerHTML = html;
    }

    /* ---- Public ---- */

    flyTo(locationId) {
        const marker = this.markers.find(m => m._locationData.id === locationId);
        if (marker) {
            this.map.flyTo(marker.getLatLng(), 8, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1600);
        }
    }

    fitAll() {
        if (this.markers.length) {
            const bounds = L.latLngBounds(this.markers.map(m => m.getLatLng()));
            this.map.fitBounds(bounds, { padding: [40, 40] });
        }
    }
}
