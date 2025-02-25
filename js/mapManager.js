class MapManager {
    constructor() {
        this.maps = new Map();
        this.currentMap = null;
        this.waypoints = [];
        this.selectedWaypoint = null;
        this.isCreatingMap = false;
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
                if (!this.isCreatingMap) {
                    this.startMapCreation();
                } else {
                    this.saveCurrentMap();
                }
            });
        }

        if (this.loadMapBtn) {
            this.loadMapBtn.addEventListener('click', () => this.showMapList());
        }
    }

    setupARScene() {
        this.scene = document.querySelector('a-scene');
        this.waypointsEntity = document.querySelector('#waypoints');
        this.cursor = document.querySelector('a-cursor');
        
        if (!this.scene || !this.waypointsEntity) {
            console.error('Required AR elements not found');
            return;
        }

        // Set up click handlers
        this.scene.addEventListener('click', (event) => {
            if (!this.isCreatingMap) return;
            this.handleMapClick(event);
        });

        // Set up cursor feedback
        if (this.cursor) {
            this.cursor.addEventListener('mouseenter', () => {
                this.cursor.setAttribute('scale', '1.2 1.2 1.2');
            });
            this.cursor.addEventListener('mouseleave', () => {
                this.cursor.setAttribute('scale', '1 1 1');
            });
        }
        
        console.log('AR Scene setup complete');
    }

    startMapCreation() {
        console.log('Starting map creation...');
        
        try {
            this.clearScene();
            this.isCreatingMap = true;
            
            this.currentMap = {
                id: Date.now().toString(),
                name: `Map ${new Date().toLocaleString()}`,
                waypoints: [],
                features: []
            };

            if (this.statusDiv) {
                this.statusDiv.textContent = 'Creating new map. Click on the plane to place waypoints.';
            }

            if (this.createMapBtn) {
                this.createMapBtn.textContent = 'Save Map';
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
        if (!this.isCreatingMap || !this.currentMap) return;

        // Check if we clicked on a waypoint
        const clickedEl = event.detail.intersectedEl;
        if (clickedEl && clickedEl.classList.contains('waypoint-marker')) {
            const waypointId = clickedEl.getAttribute('data-id');
            const waypoint = this.currentMap.waypoints.find(w => w.id === waypointId);
            if (waypoint) {
                this.handleWaypointClick(waypoint, clickedEl);
                return;
            }
        }

        // Otherwise, check for intersection with the plane
        const intersection = event.detail.intersection;
        if (!intersection) {
            console.log('No intersection point found');
            return;
        }

        const position = intersection.point;
        console.log('Adding waypoint at position:', position);
        this.addWaypoint(position);
    }

    handleWaypointClick(waypoint, element) {
        if (this.selectedWaypoint) {
            // If clicking the same waypoint, deselect it
            if (this.selectedWaypoint.id === waypoint.id) {
                this.deselectWaypoint();
                return;
            }

            // If clicking a different waypoint, create a connection
            this.createConnection(this.selectedWaypoint, waypoint);
            this.deselectWaypoint();
        } else {
            // Select the waypoint
            this.selectWaypoint(waypoint, element);
        }
    }

    selectWaypoint(waypoint, element) {
        this.selectedWaypoint = waypoint;
        element.setAttribute('color', '#4CAF50');
        this.statusDiv.textContent = 'Waypoint selected. Click another waypoint to create connection.';
    }

    deselectWaypoint() {
        if (!this.selectedWaypoint) return;

        const element = this.waypointsEntity.querySelector(`[data-id="${this.selectedWaypoint.id}"]`);
        if (element) {
            element.setAttribute('color', '#ff4081');
        }
        this.selectedWaypoint = null;
        this.statusDiv.textContent = 'Click on waypoints to create connections.';
    }

    addWaypoint(position) {
        const waypoint = {
            id: Date.now().toString(),
            position: {
                x: parseFloat(position.x.toFixed(3)),
                y: parseFloat(position.y.toFixed(3)),
                z: parseFloat(position.z.toFixed(3))
            },
            connections: []
        };

        // Create visual marker
        const marker = document.createElement('a-sphere');
        marker.setAttribute('position', waypoint.position);
        marker.setAttribute('radius', '0.1');
        marker.setAttribute('color', '#ff4081');
        marker.setAttribute('class', 'waypoint-marker clickable');
        marker.setAttribute('data-id', waypoint.id);

        this.waypointsEntity.appendChild(marker);
        this.currentMap.waypoints.push(waypoint);

        if (this.statusDiv) {
            this.statusDiv.textContent = `Added waypoint. Total: ${this.currentMap.waypoints.length}. Click waypoints to create connections.`;
        }
    }

    createConnection(waypoint1, waypoint2) {
        // Check if connection already exists
        if (waypoint1.connections.includes(waypoint2.id)) {
            console.log('Connection already exists');
            return;
        }

        // Add connection to both waypoints
        waypoint1.connections.push(waypoint2.id);
        waypoint2.connections.push(waypoint1.id);

        // Draw the visual connection
        this.drawConnection(waypoint1.position, waypoint2.position);

        this.statusDiv.textContent = 'Connection created';
    }

    drawConnection(pos1, pos2) {
        const cylinder = document.createElement('a-cylinder');
        
        // Calculate midpoint
        const midpoint = {
            x: (pos1.x + pos2.x) / 2,
            y: (pos1.y + pos2.y) / 2,
            z: (pos1.z + pos2.z) / 2
        };

        // Calculate distance
        const distance = this.distance(pos1, pos2);

        // Calculate direction
        const direction = {
            x: pos2.x - pos1.x,
            y: pos2.y - pos1.y,
            z: pos2.z - pos1.z
        };
        
        // Calculate rotation
        const rotationX = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z)) * (180 / Math.PI);
        const rotationY = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
        
        // Set cylinder properties
        cylinder.setAttribute('position', midpoint);
        cylinder.setAttribute('radius', '0.02');
        cylinder.setAttribute('height', distance);
        cylinder.setAttribute('color', '#4CAF50');
        cylinder.setAttribute('rotation', `${rotationX} ${rotationY} 0`);
        
        this.waypointsEntity.appendChild(cylinder);
    }

    async saveCurrentMap() {
        if (!this.currentMap || !this.currentMap.waypoints.length) {
            this.statusDiv.textContent = 'Error: No waypoints to save';
            return;
        }

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

            if (!maps || maps.length === 0) {
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

            // Remove any existing map list dialog
            const existingList = document.getElementById('map-list');
            if (existingList) existingList.remove();
        } catch (error) {
            console.error('Error loading map:', error);
            this.statusDiv.textContent = 'Error loading map';
        }
    }

    clearScene() {
        while (this.waypointsEntity.firstChild) {
            this.waypointsEntity.removeChild(this.waypointsEntity.firstChild);
        }
        this.selectedWaypoint = null;
    }

    renderMap(map) {
        if (!map.waypoints || !Array.isArray(map.waypoints)) {
            console.error('Invalid map data:', map);
            return;
        }

        // First, create all waypoints
        map.waypoints.forEach(waypoint => {
            this.addWaypoint(waypoint.position);
        });

        // Then, create all connections
        map.waypoints.forEach(waypoint => {
            if (waypoint.connections && Array.isArray(waypoint.connections)) {
                waypoint.connections.forEach(connectedId => {
                    const connectedWaypoint = map.waypoints.find(w => w.id === connectedId);
                    if (connectedWaypoint && waypoint.id < connectedId) { // Only draw connection once
                        this.drawConnection(waypoint.position, connectedWaypoint.position);
                    }
                });
            }
        });
    }

    resetMapCreation() {
        this.isCreatingMap = false;
        this.currentMap = null;
        this.selectedWaypoint = null;
        this.createMapBtn.textContent = 'Create Map';
        this.statusDiv.textContent = 'Map creation cancelled. Click Create Map to start again.';
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
