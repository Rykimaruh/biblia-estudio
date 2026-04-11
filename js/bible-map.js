/* ============================================
   Bible Map — Motor del Mapa Interactivo (Google Maps)
   Un mapa por libro con panel de capas flotante.
   ============================================ */

/* ---- Custom Overlay: Emoji Marker ---- */

class EmojiMarkerOverlay extends google.maps.OverlayView {
    constructor(position, locationData, bibleMap) {
        super();
        this.position = position;
        this._locationData = locationData;
        this.bibleMap = bibleMap;
        this.div = null;
    }

    onAdd() {
        const emoji = this.bibleMap.iconEmojis[this._locationData.icon] || '\u{1F4CD}';
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.cursor = 'pointer';
        this.div.innerHTML = `<div class="bible-marker marker-${this._locationData.icon || 'city'}">${emoji}</div>`;

        this.div.addEventListener('click', (e) => {
            e.stopPropagation();
            this.bibleMap._openInfoWindow(this);
        });

        this.getPanes().overlayMouseTarget.appendChild(this.div);
    }

    draw() {
        const projection = this.getProjection();
        if (!projection || !this.div) return;
        const pos = projection.fromLatLngToDivPixel(this.position);
        if (pos) {
            this.div.style.left = (pos.x - 16) + 'px';
            this.div.style.top = (pos.y - 16) + 'px';
        }
    }

    onRemove() {
        if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
        }
        this.div = null;
    }

    getPosition() {
        return this.position;
    }
}

/* ---- Custom Overlay: Water Label ---- */

class WaterLabelOverlay extends google.maps.OverlayView {
    constructor(position, config) {
        super();
        this.position = position;
        this.config = config;
        this.div = null;
    }

    onAdd() {
        const wb = this.config;
        const fs = wb.fontSize || '12px';
        const rot = wb.rotation || 0;
        const ls = wb.letterSpacing || '0px';

        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.innerHTML = `<div class="water-label" style="font-size:${fs};transform:translate(-50%,-50%) rotate(${rot}deg);letter-spacing:${ls};">${wb.name}</div>`;

        this.getPanes().overlayLayer.appendChild(this.div);
    }

    draw() {
        const projection = this.getProjection();
        if (!projection || !this.div) return;
        const pos = projection.fromLatLngToDivPixel(this.position);
        if (pos) {
            this.div.style.left = pos.x + 'px';
            this.div.style.top = pos.y + 'px';
        }
    }

    onRemove() {
        if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
        }
        this.div = null;
    }
}

/* ---- BibleMap Class ---- */

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
        this.currentTile = 'roadmap';
        this.infoWindow = null;

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

        this.tileLabels = {
            roadmap: 'Moderno',
            satellite: 'Satelite',
            terrain: 'Terreno',
            styled: 'Antiguo'
        };

        /* Vintage / antique map style */
        this.ancientStyle = [
            { elementType: 'geometry', stylers: [{ color: '#f5f1e6' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
            { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9b2a6' }] },
            { featureType: 'administrative.land_parcel', elementType: 'geometry.stroke', stylers: [{ color: '#dcd2be' }] },
            { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#ae9e90' }] },
            { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
            { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#93817c' }] },
            { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#a5b076' }] },
            { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#447530' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f1e6' }] },
            { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fdfcf8' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8c967' }] },
            { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e9bc62' }] },
            { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#e98d58' }] },
            { featureType: 'road.highway.controlled_access', elementType: 'geometry.stroke', stylers: [{ color: '#db8555' }] },
            { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#806b63' }] },
            { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
            { featureType: 'transit.line', elementType: 'labels.text.fill', stylers: [{ color: '#8f7d77' }] },
            { featureType: 'transit.line', elementType: 'labels.text.stroke', stylers: [{ color: '#ebe3cd' }] },
            { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
            { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#b9d3c2' }] },
            { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#92998d' }] }
        ];

        this.waterLabelOverlays = [];
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
        this.map = new google.maps.Map(this.container, {
            center: { lat: this.data.center[0], lng: this.data.center[1] },
            zoom: this.data.zoom || 6,
            mapTypeId: 'roadmap',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            gestureHandling: 'greedy',
            minZoom: 4,
            maxZoom: 18
        });

        this.infoWindow = new google.maps.InfoWindow({ maxWidth: 340 });
    }

    /* ---- Markers ---- */

    _addMarkers() {
        for (const loc of this.data.locations) {
            const overlay = new EmojiMarkerOverlay(
                new google.maps.LatLng(loc.lat, loc.lng),
                loc, this
            );
            overlay.setMap(this.map);
            this.markers.push(overlay);
        }
    }

    _openInfoWindow(markerOverlay) {
        const loc = markerOverlay._locationData;
        this.infoWindow.setContent(this._buildPopup(loc));
        this.infoWindow.setPosition(markerOverlay.getPosition());
        this.infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -20) });
        this.infoWindow.open(this.map);
    }

    _buildPopup(loc) {
        const slug = this.data.bookSlug;
        let html = `<div class="bible-popup-content">`;
        html += `<div class="popup-header">${loc.name}</div>`;
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
        html += '</div></div>';
        return html;
    }

    /* ---- Routes ---- */

    _addRoutes() {
        if (!this.data.routes) return;

        for (const route of this.data.routes) {
            const path = route.points.map(pt => ({ lat: pt[0], lng: pt[1] }));

            let polyline;
            if (route.dashArray) {
                const dashVals = route.dashArray.split(',').map(v => parseInt(v.trim()));
                const repeatPx = (dashVals[0] + (dashVals[1] || dashVals[0])) + 'px';

                polyline = new google.maps.Polyline({
                    path: path,
                    strokeOpacity: 0,
                    strokeWeight: 4,
                    icons: [{
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 0.8,
                            strokeColor: route.color || '#c8a44e',
                            scale: 3
                        },
                        offset: '0',
                        repeat: repeatPx
                    }],
                    map: this.map
                });
            } else {
                polyline = new google.maps.Polyline({
                    path: path,
                    strokeColor: route.color || '#c8a44e',
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                    map: this.map
                });
            }

            const waypointMarkers = [];
            if (route.labels) {
                route.points.forEach((pt, i) => {
                    if (route.labels[i]) {
                        const marker = new google.maps.Marker({
                            position: { lat: pt[0], lng: pt[1] },
                            map: this.map,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 5,
                                fillColor: '#fff',
                                fillOpacity: 1,
                                strokeColor: route.color || '#c8a44e',
                                strokeWeight: 2
                            },
                            title: route.labels[i],
                            clickable: false,
                            zIndex: 1
                        });
                        waypointMarkers.push(marker);
                    }
                });
            }

            this.routeLayers[route.id] = { polyline, waypointMarkers, route };
            this.activeRoutes.add(route.id);
        }
    }

    /* ---- Water Body Labels ---- */

    _addWaterLabels() {
        if (!this.data.waterBodies || !this.data.waterBodies.length) return;

        for (const wb of this.data.waterBodies) {
            const overlay = new WaterLabelOverlay(
                new google.maps.LatLng(wb.lat, wb.lng),
                wb
            );
            overlay.setMap(this.map);
            this.waterLabelOverlays.push(overlay);
        }
    }

    _toggleWaterLabels() {
        this.waterLabelsVisible = !this.waterLabelsVisible;
        for (const overlay of this.waterLabelOverlays) {
            overlay.setMap(this.waterLabelsVisible ? this.map : null);
        }
        this._renderWaterToggle();
    }

    /* ================================================
       LAYERS PANEL
       ================================================ */

    _createLayersPanel() {
        const wrapper = this.container.closest('.map-wrapper');
        if (!wrapper) return;

        this.layersBtn = document.createElement('button');
        this.layersBtn.className = 'map-layers-btn';
        this.layersBtn.innerHTML = '\u{1F5FA}\uFE0F Capas';
        wrapper.appendChild(this.layersBtn);

        this.layersPanel = document.createElement('div');
        this.layersPanel.className = 'map-layers-panel';
        wrapper.appendChild(this.layersPanel);

        /* Prevent map interaction when clicking on panel elements */
        [this.layersBtn, this.layersPanel].forEach(el => {
            ['mousedown', 'mouseup', 'click', 'dblclick', 'wheel',
             'touchstart', 'touchmove', 'pointerdown'].forEach(evt => {
                el.addEventListener(evt, e => e.stopPropagation());
            });
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

        if (type === 'styled') {
            this.map.setMapTypeId('roadmap');
            this.map.setOptions({ styles: this.ancientStyle });
        } else {
            this.map.setMapTypeId(type);
            this.map.setOptions({ styles: null });
        }

        this.currentTile = type;

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
            rd.polyline.setMap(null);
            rd.waypointMarkers.forEach(m => m.setMap(null));
            this.activeRoutes.delete(routeId);
        } else {
            rd.polyline.setMap(this.map);
            rd.waypointMarkers.forEach(m => m.setMap(this.map));
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
            this.map.panTo(marker.getPosition());
            this.map.setZoom(8);
            setTimeout(() => this._openInfoWindow(marker), 600);
        }
    }

    fitAll() {
        if (this.markers.length) {
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(m => bounds.extend(m.getPosition()));
            this.map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
    }
}
