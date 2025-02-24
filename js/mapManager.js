class MapManager {
    constructor() {
        // Initialize maps from localStorage if available
        this.maps = new Map();
        const savedMaps = localStorage.getItem('maps');
        if (savedMaps) {
            try {
                const mapEntries = JSON.parse(savedMaps);
                this.maps = new Map(mapEntries);
                console.log('Loaded saved maps:', this.maps);
            } catch (error) {
                console.error('Error loading saved maps:', error);
                // Initialize empty storage if there's an error
                localStorage.setItem('maps', JSON.stringify([]));
            }
        } else {
            // Initialize empty storage if no maps exist
            localStorage.setItem('maps', JSON.stringify([]));
        }

        this.currentMap = null;
        this.waypoints = [];
        this.initializeUI();
        this.setupARScene();
    }

    initializeUI() {
        this.createMapBtn = document.getElementById('create-map');
        this.loadMapBtn = document.getElementById('load-map');
        this.statusDiv = document.getElementById('status');

        // Debug log to verify elements are found
        console.log('Create Map Button:', this.createMapBtn);
        console.log('Load Map Button:', this.loadMapBtn);
        console.log('Status Div:', this.statusDiv);

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
        
        // Setup AR camera and cursor events
        const camera = document.querySelector('a-camera');
        const cursor = document.querySelector('a-cursor');
        
        // Track camera position changes
        camera.addEventListener('componentchanged', (event) => {
            if (event.detail.name === 'position' || event.detail.name === 'rotation') {
                this.updateCameraPose(camera.getAttribute('position'), camera.getAttribute('rotation'));
            }
        });

        // Setup cursor events for better interaction feedback
        cursor.addEventListener('mouseenter', () => {
            cursor.setAttribute('scale', '1.2 1.2 1.2');
        });
        
        cursor.addEventListener('mouseleave', () => {
            cursor.setAttribute('scale', '1 1 1');
        });
    }

    startMapCreation() {
        console.log('Starting map creation...');
        
        try {
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
                // Remove any existing click listener first
                this.scene.removeEventListener('click', this.handleMapClick.bind(this));
                // Add new click listener
                this.scene.addEventListener('click', this.handleMapClick.bind(this));
                console.log('Click listener added to scene');
            } else {
                console.error('Scene not found');
            }

            // Add debug info
            if (this.debugInterval) {
                clearInterval(this.debugInterval);
            }

            this.debugInterval = setInterval(() => {
                const camera = document.querySelector('a-camera');
                if (camera) {
                    const pos = camera.getAttribute('position');
                    if (this.statusDiv) {
                        this.statusDiv.textContent = `Camera position: ${JSON.stringify(pos)}. Click to place waypoints.`;
                    }
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
        if (!this.currentMap) return;

        const intersection = event.detail.intersection;
        if (!intersection) {
            this.statusDiv.textContent = 'No intersection point found. Try clicking on the green plane.';
            return;
        }

        const position = intersection.point;
        this.addWaypoint(position);
        this.statusDiv.textContent = `Waypoint added at ${JSON.stringify(position)}`;
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
            // Get current camera features
            const features = await this.captureFeatures();
            this.currentMap.features = features;

            // Save to local storage
            this.maps.set(this.currentMap.id, this.currentMap);
            const mapData = Array.from(this.maps.entries());
            localStorage.setItem('maps', JSON.stringify(mapData));
            console.log('Map saved to localStorage:', mapData);

            this.statusDiv.textContent = 'Map saved successfully!';
            this.resetMapCreation();
        } catch (error) {
            console.error('Error saving map:', error);
            this.statusDiv.textContent = 'Error saving map. Check console for details.';
        }
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
