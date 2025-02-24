class NavigationController {
    constructor() {
        this.astar = new AStar();
        this.currentPath = [];
        this.isNavigating = false;
        this.initializeUI();
        this.setupAREvents();
    }

    initializeUI() {
        this.startNavBtn = document.getElementById('start-nav');
        this.statusDiv = document.getElementById('status');
        this.startNavBtn.addEventListener('click', () => this.toggleNavigation());
    }

    setupAREvents() {
        this.scene = document.querySelector('a-scene');
        this.camera = document.querySelector('a-camera');
        this.pathEntity = document.querySelector('#path');

        // Listen for camera movement
        this.camera.addEventListener('pose-updated', (event) => {
            if (this.isNavigating) {
                this.updateNavigation(event.detail.position);
            }
        });
    }

    toggleNavigation() {
        if (!this.isNavigating) {
            this.startNavigation();
        } else {
            this.stopNavigation();
        }
    }

    startNavigation() {
        if (!window.mapManager.currentMap) {
            this.statusDiv.textContent = 'Please load a map first';
            return;
        }

        this.isNavigating = true;
        this.startNavBtn.textContent = 'Stop Navigation';
        this.statusDiv.textContent = 'Select destination...';

        // Enable clicking on waypoints
        const waypoints = document.querySelectorAll('.waypoint-marker');
        waypoints.forEach(waypoint => {
            waypoint.addEventListener('click', (event) => {
                this.setDestination(event.target.getAttribute('data-id'));
            });
        });

        // Initialize A* graph
        this.initializeGraph();
    }

    stopNavigation() {
        this.isNavigating = false;
        this.startNavBtn.textContent = 'Start Navigation';
        this.statusDiv.textContent = 'Navigation stopped';
        this.clearPath();
    }

    initializeGraph() {
        this.astar.clearNodes();
        const map = window.mapManager.currentMap;

        // Create nodes for each waypoint
        map.waypoints.forEach(waypoint => {
            const node = this.astar.addNode(
                waypoint.position.x,
                waypoint.position.y,
                waypoint.position.z
            );
            node.waypointId = waypoint.id;
        });

        // Connect nodes based on waypoint connections
        map.waypoints.forEach(waypoint => {
            const node = this.findNodeByWaypointId(waypoint.id);
            waypoint.connections.forEach(connectedId => {
                const connectedNode = this.findNodeByWaypointId(connectedId);
                if (node && connectedNode) {
                    this.astar.connectNodes(node, connectedNode);
                }
            });
        });
    }

    findNodeByWaypointId(waypointId) {
        return Array.from(this.astar.nodes.values())
            .find(node => node.waypointId === waypointId);
    }

    setDestination(waypointId) {
        const map = window.mapManager.currentMap;
        const destination = map.waypoints.find(w => w.id === waypointId);
        if (!destination) return;

        // Find nearest waypoint to current position
        const cameraPosition = this.camera.getAttribute('position');
        let nearestWaypoint = null;
        let minDist = Infinity;

        map.waypoints.forEach(waypoint => {
            const dist = this.distance(cameraPosition, waypoint.position);
            if (dist < minDist) {
                minDist = dist;
                nearestWaypoint = waypoint;
            }
        });

        if (!nearestWaypoint) return;

        // Find path using A*
        const startNode = this.findNodeByWaypointId(nearestWaypoint.id);
        const endNode = this.findNodeByWaypointId(waypointId);
        
        if (!startNode || !endNode) {
            this.statusDiv.textContent = 'Cannot find path to destination';
            return;
        }

        const path = this.astar.findPath(startNode, endNode);
        if (path) {
            this.currentPath = path;
            this.renderPath();
            this.statusDiv.textContent = 'Following path to destination...';
        } else {
            this.statusDiv.textContent = 'No path found to destination';
        }
    }

    renderPath() {
        this.clearPath();

        // Create visual path
        for (let i = 0; i < this.currentPath.length - 1; i++) {
            const start = this.currentPath[i];
            const end = this.currentPath[i + 1];

            const line = document.createElement('a-entity');
            line.setAttribute('line', {
                start: start.position,
                end: end.position,
                color: '#4CAF50'
            });
            this.pathEntity.appendChild(line);

            // Add direction indicator
            const arrow = document.createElement('a-entity');
            const midpoint = {
                x: (start.position.x + end.position.x) / 2,
                y: (start.position.y + end.position.y) / 2,
                z: (start.position.z + end.position.z) / 2
            };
            arrow.setAttribute('position', midpoint);
            arrow.setAttribute('geometry', {
                primitive: 'cone',
                height: 0.2,
                radiusBottom: 0.05,
                radiusTop: 0
            });
            arrow.setAttribute('material', { color: '#4CAF50' });
            arrow.setAttribute('look-at', end.position);
            this.pathEntity.appendChild(arrow);
        }
    }

    clearPath() {
        while (this.pathEntity.firstChild) {
            this.pathEntity.removeChild(this.pathEntity.firstChild);
        }
    }

    updateNavigation(currentPosition) {
        if (!this.currentPath.length) return;

        // Check if we've reached the next waypoint
        const nextWaypoint = this.currentPath[0];
        const distance = this.distance(currentPosition, nextWaypoint.position);

        if (distance < 0.5) { // Within 0.5 meters
            this.currentPath.shift();
            if (this.currentPath.length === 0) {
                this.statusDiv.textContent = 'Destination reached!';
                this.stopNavigation();
            } else {
                this.renderPath();
            }
        }

        // Update distance display
        this.statusDiv.textContent = `Distance to next waypoint: ${distance.toFixed(2)}m`;
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
    window.navigationController = new NavigationController();
});
