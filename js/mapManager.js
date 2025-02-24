class MapManager {
    constructor() {
        this.maps = new Map();
        this.currentMap = null;
        this.waypoints = [];
        this.initializeUI();
        this.setupARScene();
    }

    initializeUI() {
        this.createMapBtn = document.getElementById('create-map');
        this.loadMapBtn = document.getElementById('load-map');
        this.statusDiv = document.getElementById('status');

        this.createMapBtn.addEventListener('click', () => this.startMapCreation());
        this.loadMapBtn.addEventListener('click', () => this.showMapList());
    }

    setupARScene() {
        this.scene = document.querySelector('a-scene');
        this.waypointsEntity = document.querySelector('#waypoints');
        
        // Setup AR camera events
        const camera = document.querySelector('a-camera');
        camera.addEventListener('pose-updated', (event) => {
            this.updateCameraPose(event.detail.position, event.detail.rotation);
        });
    }

    startMapCreation() {
        this.currentMap = {
            id: Date.now().toString(),
            name: 'New Map',
            waypoints: [],
            features: []
        };

        this.statusDiv.textContent = 'Tap to place waypoints. Press Save when done.';
        this.createMapBtn.textContent = 'Save Map';
        this.createMapBtn.onclick = () => this.saveCurrentMap();

        // Enable tap to place waypoints
        this.scene.addEventListener('click', this.handleMapClick.bind(this));
    }

    handleMapClick(event) {
        if (!this.currentMap) return;

        const intersection = event.detail.intersection;
        if (!intersection) return;

        const position = intersection.point;
        this.addWaypoint(position);
    }

    addWaypoint(position) {
        const waypoint = {
            id: Date.now().toString(),
            position: position,
            connections: []
        };

        // Create visual marker
        const marker = document.createElement('a-sphere');
        marker.setAttribute('position', position);
        marker.setAttribute('radius', '0.1');
        marker.setAttribute('color', '#ff4081');
        marker.setAttribute('class', 'waypoint-marker');
        marker.setAttribute('data-id', waypoint.id);

        this.waypointsEntity.appendChild(marker);
        this.currentMap.waypoints.push(waypoint);

        // Connect to nearest waypoint if exists
        if (this.currentMap.waypoints.length > 1) {
            this.connectToNearestWaypoint(waypoint);
        }
    }

    connectToNearestWaypoint(waypoint) {
        let nearest = null;
        let minDist = Infinity;

        for (const other of this.currentMap.waypoints) {
            if (other.id === waypoint.id) continue;

            const dist = this.distance(waypoint.position, other.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = other;
            }
        }

        if (nearest) {
            waypoint.connections.push(nearest.id);
            nearest.connections.push(waypoint.id);
            this.drawConnection(waypoint.position, nearest.position);
        }
    }

    drawConnection(pos1, pos2) {
        const line = document.createElement('a-entity');
        line.setAttribute('line', {
            start: pos1,
            end: pos2,
            color: '#4CAF50'
        });
        this.waypointsEntity.appendChild(line);
    }

    async saveCurrentMap() {
        if (!this.currentMap) return;

        // Get current camera features
        const features = await this.captureFeatures();
        this.currentMap.features = features;

        // Save to local storage
        this.maps.set(this.currentMap.id, this.currentMap);
        localStorage.setItem('maps', JSON.stringify(Array.from(this.maps.entries())));

        this.statusDiv.textContent = 'Map saved successfully!';
        this.resetMapCreation();
    }

    async captureFeatures() {
        // In a real implementation, this would capture AR features
        // For now, return mock data
        return [{
            position: { x: 0, y: 0, z: 0 },
            descriptor: new Float32Array(128)
        }];
    }

    showMapList() {
        const maps = Array.from(this.maps.values());
        // Implementation for showing map list UI
        console.log('Available maps:', maps);
    }

    loadMap(mapId) {
        const map = this.maps.get(mapId);
        if (!map) return;

        this.currentMap = map;
        this.clearScene();
        this.renderMap(map);
    }

    clearScene() {
        while (this.waypointsEntity.firstChild) {
            this.waypointsEntity.removeChild(this.waypointsEntity.firstChild);
        }
    }

    renderMap(map) {
        map.waypoints.forEach(waypoint => {
            this.addWaypoint(waypoint.position);
        });
    }

    resetMapCreation() {
        this.currentMap = null;
        this.createMapBtn.textContent = 'Create Map';
        this.createMapBtn.onclick = () => this.startMapCreation();
        this.scene.removeEventListener('click', this.handleMapClick);
    }

    distance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    updateCameraPose(position, rotation) {
        // Update AR camera pose
        // This would be used for feature tracking and map alignment
        if (this.currentMap) {
            this.statusDiv.textContent = `Camera: ${JSON.stringify(position)}`;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mapManager = new MapManager();
});
