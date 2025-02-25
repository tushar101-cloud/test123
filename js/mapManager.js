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

        if (this.createMapBtn) {
            this.createMapBtn.addEventListener('click', () => {
                console.log('Create Map button clicked');
                this.startMapCreation();
            });
        }

        if (this.loadMapBtn) {
            this.loadMapBtn.addEventListener('click', () => this.showMapList());
        }
    }

    setupARScene() {
        this.scene = document.querySelector('a-scene');
        this.waypointsEntity = document.querySelector('#waypoints');
        
        if (!this.scene || !this.waypointsEntity) {
            console.error('Required AR elements not found');
            return;
        }

        // Bind the click handler to this instance
        this.boundHandleMapClick = this.handleMapClick.bind(this);
        
        console.log('AR Scene setup complete');
    }

    startMapCreation() {
        console.log('Starting map creation...');
        
        try {
            this.clearScene();
            
            this.currentMap = {
                id: Date.now().toString(),
                name: 'New Map',
                waypoints: [],
                features: []
            };

            if (this.statusDiv) {
                this.statusDiv.textContent = 'Creating new map. Click to place waypoints. Press Save when done.';
            }

            if (this.createMapBtn) {
                this.createMapBtn.textContent = 'Save Map';
                this.createMapBtn.onclick = () => this.saveCurrentMap();
            }

            if (this.scene) {
                this.scene.addEventListener('click', this.boundHandleMapClick);
            }

            console.log('Map creation setup complete');
        } catch (error) {
            console.error('Error in startMapCreation:', error);
            if (this.statusDiv) {
                this.statusDiv.textContent = 'Error starting map creation';
            }
        }
    }

    handleMapClick(event) {
        if (!this.currentMap) return;

        const intersection = event.detail.intersection;
        if (!intersection) {
            console.log('No intersection point found');
            return;
        }

        const position = intersection.point;
        console.log('Adding waypoint at position:', position);
        
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

        if (this.statusDiv) {
            this.statusDiv.textContent = `Added waypoint. Total: ${this.currentMap.waypoints.length}`;
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
        // Create a cylinder to represent the connection
        const cylinder = document.createElement('a-cylinder');
        
        // Calculate midpoint
        const midpoint = {
            x: (pos1.x + pos2.x) / 2,
            y: (pos1.y + pos2.y) / 2,
            z: (pos1.z + pos2.z) / 2
        };

        // Calculate distance between points
        const distance = this.distance(pos1, pos2);

        // Set cylinder properties
        cylinder.setAttribute('position', midpoint);
        cylinder.setAttribute('radius', '0.02');
        cylinder.setAttribute('height', distance);
        cylinder.setAttribute('color', '#4CAF50');
        
        // Calculate rotation to point from pos1 to pos2
        const direction = {
            x: pos2.x - pos1.x,
            y: pos2.y - pos1.y,
            z: pos2.z - pos1.z
        };
        
        // Convert direction to rotation (in degrees)
        const rotationX = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z)) * (180 / Math.PI);
        const rotationY = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
        
        cylinder.setAttribute('rotation', `${rotationX} ${rotationY} 0`);
        
        this.waypointsEntity.appendChild(cylinder);
    }

    async saveCurrentMap() {
        if (!this.currentMap) return;

        try {
            const response = await fetch('/api/maps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.currentMap)
            });

            if (!response.ok) {
                throw new Error('Failed to save map');
            }

            const savedMap = await response.json();
            this.maps.set(savedMap.id, savedMap);
            
            this.statusDiv.textContent = 'Map saved successfully!';
            this.resetMapCreation();
        } catch (error) {
            console.error('Error saving map:', error);
            this.statusDiv.textContent = 'Error saving map';
        }
    }

    async showMapList() {
        try {
            const response = await fetch('/api/maps');
            const maps = await response.json();

            const listContainer = document.createElement('div');
            listContainer.id = 'map-list';
            listContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
            `;

            if (maps.length === 0) {
                listContainer.innerHTML = '<p>No saved maps found</p>';
            } else {
                const list = document.createElement('ul');
                list.style.listStyle = 'none';
                list.style.padding = '0';
                
                maps.forEach(map => {
                    const item = document.createElement('li');
                    item.style.margin = '10px 0';
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>Map: ${map.name} (${map.waypoints.length} waypoints)</span>
                            <button onclick="window.mapManager.loadMap('${map.id}')">Load</button>
                        </div>
                    `;
                    list.appendChild(item);
                });
                
                listContainer.appendChild(list);
            }

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.onclick = () => listContainer.remove();
            listContainer.appendChild(closeBtn);

            document.body.appendChild(listContainer);
        } catch (error) {
            console.error('Error loading maps:', error);
            this.statusDiv.textContent = 'Error loading maps';
        }
    }

    async loadMap(mapId) {
        try {
            const response = await fetch(`/api/maps/${mapId}`);
            if (!response.ok) throw new Error('Map not found');
            
            const map = await response.json();
            this.currentMap = map;
            this.clearScene();
            this.renderMap(map);
            
            this.statusDiv.textContent = `Loaded map: ${map.name}`;
        } catch (error) {
            console.error('Error loading map:', error);
            this.statusDiv.textContent = 'Error loading map';
        }
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
        this.scene.removeEventListener('click', this.boundHandleMapClick);
    }

    distance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mapManager = new MapManager();
});
