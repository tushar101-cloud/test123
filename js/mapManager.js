class MapManager {
    constructor() {
        this.maps = new Map();
        this.currentMap = null;
        this.waypoints = [];
        this.initializeUI();
        this.setupARScene();
        this.loadMaps(); // Load maps from database on startup
    }

    async loadMaps() {
        try {
            const response = await fetch('/api/maps');
            const maps = await response.json();
            this.maps = new Map(maps.map(map => [map.id, map]));
            console.log('Loaded maps from database:', this.maps);
        } catch (error) {
            console.error('Error loading maps:', error);
        }
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
        } else {
            console.error('Create Map button not found');
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
        
        // Setup AR camera and cursor
        const camera = document.querySelector('a-camera');
        if (camera) {
            camera.addEventListener('componentchanged', (event) => {
                if (event.detail.name === 'position' || event.detail.name === 'rotation') {
                    this.updateCameraPose(camera.getAttribute('position'), camera.getAttribute('rotation'));
                }
            });
        }

        // Add raycaster to camera if not present
        const cursor = document.querySelector('a-cursor');
        if (!cursor) {
            const newCursor = document.createElement('a-cursor');
            newCursor.setAttribute('raycaster', 'objects: .waypoint-marker, .clickable');
            newCursor.setAttribute('cursor', 'fuse: false');
            camera.appendChild(newCursor);
        }

        // Make the ground plane clickable
        const plane = document.querySelector('a-plane');
        if (plane) {
            plane.classList.add('clickable');
        }

        console.log('AR Scene setup complete');
    }

    startMapCreation() {
        console.log('Starting map creation...');
        
        try {
            // Clear any existing map
            this.clearScene();
            
            this.currentMap = {
                id: Date.now().toString(),
                name: 'New Map',
                waypoints: [],
                features: []
            };

            console.log('New map created:', this.currentMap);

            if (this.statusDiv) {
                this.statusDiv.textContent = 'Creating new map. Click on the green plane to place waypoints. Press Save when done.';
            }

            if (this.createMapBtn) {
                this.createMapBtn.textContent = 'Save Map';
                this.createMapBtn.onclick = () => {
                    console.log('Save Map clicked');
                    this.saveCurrentMap();
                };
            }

            if (this.scene) {
                // Remove any existing click listener
                this.scene.removeEventListener('click', this.boundHandleMapClick);
                // Add new click listener using the bound function
                this.scene.addEventListener('click', this.boundHandleMapClick);
                console.log('Click listener added to scene');
            } else {
                console.error('Scene not found');
            }

            // Add debug info
            if (this.debugInterval) {
                clearInterval(this.debugInterval);
            }

            this.debugInterval = setInterval(() => {
                if (this.statusDiv) {
                    const camera = document.querySelector('a-camera');
                    const pos = camera ? camera.getAttribute('position') : null;
                    const waypoints = this.currentMap.waypoints.length;
                    this.statusDiv.textContent = `Camera: ${JSON.stringify(pos)}. Waypoints: ${waypoints}. Click to add more.`;
                }
            }, 1000);

            console.log('Map creation setup complete');
        } catch (error) {
            console.error('Error in startMapCreation:', error);
            if (this.statusDiv) {
                this.statusDiv.textContent = 'Error starting map creation. Check console for details.';
            }
        }
    }

    handleMapClick(event) {
        if (!this.currentMap) {
            console.log('No active map for click handling');
            return;
        }

        console.log('Map click detected:', event);

        const intersection = event.detail.intersection;
        if (!intersection) {
            console.log('No intersection point found');
            if (this.statusDiv) {
                this.statusDiv.textContent = 'No intersection point found. Try clicking on the green plane.';
            }
            return;
        }

        const position = intersection.point;
        console.log('Adding waypoint at position:', position);
        
        this.addWaypoint(position);
        
        if (this.statusDiv) {
            this.statusDiv.textContent = `Waypoint added at ${JSON.stringify(position)}. Total waypoints: ${this.currentMap.waypoints.length}`;
        }
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

        console.log('Saving map:', this.currentMap);

        try {
            // Save to database
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
            console.log('Map saved to database:', savedMap);

            this.statusDiv.textContent = 'Map saved successfully!';
            this.resetMapCreation();
        } catch (error) {
            console.error('Error saving map:', error);
            this.statusDiv.textContent = 'Error saving map. Check console for details.';
        }
    }

    async showMapList() {
        try {
            // Fetch latest maps from database
            const response = await fetch('/api/maps');
            const maps = await response.json();
            console.log('Available maps:', maps);

            // Clear any existing list
            const existingList = document.getElementById('map-list');
            if (existingList) {
                existingList.remove();
            }

            // Create map list container
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

            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.marginTop = '10px';
            closeBtn.onclick = () => listContainer.remove();
            listContainer.appendChild(closeBtn);

            document.body.appendChild(listContainer);
        } catch (error) {
            console.error('Error loading maps:', error);
            this.statusDiv.textContent = 'Error loading maps. Check console for details.';
        }
    }

    async loadMap(mapId) {
        try {
            const response = await fetch(`/api/maps/${mapId}`);
            if (!response.ok) {
                throw new Error('Map not found');
            }
            const map = await response.json();
            this.currentMap = map;
            this.clearScene();
            this.renderMap(map);
        } catch (error) {
            console.error('Error loading map:', error);
            this.statusDiv.textContent = 'Error loading map. Check console for details.';
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
        
        // Clear debug interval
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
            this.debugInterval = null;
        }
        
        this.statusDiv.textContent = 'Map creation cancelled. Click Create Map to start again.';
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
