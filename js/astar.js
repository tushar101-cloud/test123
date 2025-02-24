class Node {
    constructor(x, y, z) {
        this.position = { x, y, z };
        this.g = 0; // Cost from start to current node
        this.h = 0; // Heuristic cost from current node to target
        this.f = 0; // Total cost (g + h)
        this.neighbors = [];
        this.parent = null;
        this.id = `${x},${y},${z}`;
    }

    addNeighbor(node) {
        this.neighbors.push(node);
    }

    distanceTo(node) {
        const dx = this.position.x - node.position.x;
        const dy = this.position.y - node.position.y;
        const dz = this.position.z - node.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

class AStar {
    constructor() {
        this.nodes = new Map();
    }

    addNode(x, y, z) {
        const node = new Node(x, y, z);
        this.nodes.set(node.id, node);
        return node;
    }

    connectNodes(node1, node2) {
        node1.addNeighbor(node2);
        node2.addNeighbor(node1);
    }

    findPath(startNode, targetNode) {
        const openSet = new Set([startNode]);
        const closedSet = new Set();

        startNode.g = 0;
        startNode.h = startNode.distanceTo(targetNode);
        startNode.f = startNode.h;

        while (openSet.size > 0) {
            // Find node with lowest f cost
            let current = Array.from(openSet).reduce((a, b) => a.f < b.f ? a : b);

            if (current === targetNode) {
                return this.reconstructPath(current);
            }

            openSet.delete(current);
            closedSet.add(current);

            for (let neighbor of current.neighbors) {
                if (closedSet.has(neighbor)) {
                    continue;
                }

                const tentativeG = current.g + current.distanceTo(neighbor);

                if (!openSet.has(neighbor)) {
                    openSet.add(neighbor);
                } else if (tentativeG >= neighbor.g) {
                    continue;
                }

                neighbor.parent = current;
                neighbor.g = tentativeG;
                neighbor.h = neighbor.distanceTo(targetNode);
                neighbor.f = neighbor.g + neighbor.h;
            }
        }

        return null; // No path found
    }

    reconstructPath(node) {
        const path = [];
        let current = node;

        while (current !== null) {
            path.unshift(current);
            current = current.parent;
        }

        return path;
    }

    clearNodes() {
        this.nodes.clear();
    }

    getNode(x, y, z) {
        const id = `${x},${y},${z}`;
        return this.nodes.get(id);
    }
}

// Export for use in other modules
window.AStar = AStar;
window.Node = Node;
