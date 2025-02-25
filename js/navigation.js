class NavigationController {
    constructor() {
        this.currentPath = [];
        this.isNavigating = false;
        this.initializeUI();
    }

    initializeUI() {
        this.startNavBtn = document.getElementById('start-nav');
        this.statusDiv = document.getElementById('status');

        if (this.startNavBtn) {
            this.startNavBtn.addEventListener('click', () => {
                if (!this.isNavigating) {
                    this.startNavigation();
                } else {
                    this.stopNavigation();
                }
            });
        }
    }

    startNavigation() {
        if (!window.mapManager || !window.mapManager.currentMap) {
            this.statusDiv.textContent = 'Please load a map first';
            return;
        }

        this.isNavigating = true;
        this.startNavBtn.textContent = 'Stop Navigation';
        this.statusDiv.textContent = 'Navigation started';

        // Start AR tracking
        this.setupARTracking();
    }

    stopNavigation() {
        this.isNavigating = false;
        this.startNavBtn.textContent = 'Start Navigation';
        this.statusDiv.textContent = 'Navigation stopped';

        // Clean up AR tracking
        this.cleanupARTracking();
    }

    setupARTracking() {
        // Get the camera element
        this.camera = document.querySelector('a-camera');
        if (!this.camera) {
            console.error('Camera not found');
            return;
        }

        // Add position change listener
        this.camera.addEventListener('componentchanged', (event) => {
            if (this.isNavigating && (event.detail.name === 'position' || event.detail.name === 'rotation')) {
                this.updateNavigation(
                    this.camera.getAttribute('position'),
                    this.camera.getAttribute('rotation')
                );
            }
        });
    }

    cleanupARTracking() {
        if (this.camera) {
            // Remove position change listener
            this.camera.removeEventListener('componentchanged', this.updateNavigation);
        }
    }

    updateNavigation(position, rotation) {
        // Update user's position in the AR space
        console.log('User position:', position);
        console.log('User rotation:', rotation);

        // Find nearest waypoint
        const nearestWaypoint = this.findNearestWaypoint(position);
        if (nearestWaypoint) {
            this.statusDiv.textContent = `Near waypoint: ${nearestWaypoint.id}`;
        }
    }

    findNearestWaypoint(position) {
        if (!window.mapManager || !window.mapManager.currentMap) return null;

        let nearest = null;
        let minDist = Infinity;

        for (const waypoint of window.mapManager.currentMap.waypoints) {
            const dist = this.distance(position, waypoint.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = waypoint;
            }
        }

        return nearest;
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
