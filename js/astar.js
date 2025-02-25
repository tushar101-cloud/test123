class AStar {
    constructor() {
        this.nodes = new Map();
    }

    addNode(id, position, connections) {
        this.nodes.set(id, { id, position, connections });
    }

    heuristic(a, b) {
        return Math.sqrt(
            Math.pow(a.x - b.x, 2) +
            Math.pow(a.y - b.y, 2) +
            Math.pow(a.z - b.z, 2)
        );
    }

    findPath(startId, goalId) {
        const start = this.nodes.get(startId);
        const goal = this.nodes.get(goalId);

        if (!start || !goal) return null;

        const openSet = new Set([start]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        gScore.set(start, 0);
        fScore.set(start, this.heuristic(start.position, goal.position));

        while (openSet.size > 0) {
            const current = Array.from(openSet).reduce((a, b) => 
                fScore.get(a) < fScore.get(b) ? a : b
            );

            if (current === goal) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.delete(current);

            for (const neighborId of current.connections) {
                const neighbor = this.nodes.get(neighborId);
                const tentativeGScore = gScore.get(current) + this.heuristic(current.position, neighbor.position);

                if (!gScore.has(neighbor) || tentativeGScore < gScore.get(neighbor)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeGScore);
                    fScore.set(neighbor, gScore.get(neighbor) + this.heuristic(neighbor.position, goal.position));

                    if (!openSet.has(neighbor)) {
                        openSet.add(neighbor);
                    }
                }
            }
        }

        return null; // No path found
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }
        return path;
    }
}
