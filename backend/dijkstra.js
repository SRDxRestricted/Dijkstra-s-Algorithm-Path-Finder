/**
 * Dijkstra's Algorithm Implementation for LifeLine Navigator
 */

function runDijkstra(nodes, edges, startNodeId, endNodeId) {
  // Create adjacency list
  const adj = {};
  nodes.forEach(node => {
    adj[node.id] = [];
  });

  // Since it's an undirected graph of roads, add both directions
  edges.forEach(edge => {
    adj[edge.from].push({ to: edge.to, weight: edge.weight });
    adj[edge.to].push({ to: edge.from, weight: edge.weight });
  });

  const distances = {};
  const previous = {};
  const visited = new Set();
  const steps = []; // Track algorithm steps for step-by-step animation

  // Initialize distances
  nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
  });
  distances[startNodeId] = 0;

  const queue = [...nodes];

  while (queue.length > 0) {
    // Find node with minimum distance
    queue.sort((a, b) => distances[a.id] - distances[b.id]);
    const curr = queue.shift();

    // If the node has Infinity distance, it's unreachable
    if (distances[curr.id] === Infinity) {
      break;
    }

    visited.add(curr.id);

    // Record the exploration step
    steps.push({
      currentNode: curr.id,
      distances: { ...distances },
      visited: Array.from(visited),
      evaluatingNeighbors: adj[curr.id].map(e => e.to)
    });

    if (curr.id === endNodeId) {
      break;
    }

    // Relax neighbors
    for (const edge of adj[curr.id]) {
      if (visited.has(edge.to)) continue;

      const alt = distances[curr.id] + edge.weight;
      if (alt < distances[edge.to]) {
        distances[edge.to] = alt;
        previous[edge.to] = curr.id;
      }
    }
  }

  // Reconstruct path
  const path = [];
  let u = endNodeId;
  if (previous[u] !== null || u === startNodeId) {
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
  }

  return {
    path,
    distance: distances[endNodeId],
    steps
  };
}

/**
 * Solves the full route: Ambulance -> Patient -> Hospital
 */
function solveFullRoute(nodes, edges, startNodeId, patientNodeId, hospitalNodeId) {
  // Solve segment 1: Start -> Patient
  const segment1 = runDijkstra(nodes, edges, startNodeId, patientNodeId);

  // Solve segment 2: Patient -> Hospital
  const segment2 = runDijkstra(nodes, edges, patientNodeId, hospitalNodeId);

  // Combine paths (avoid duplicating the patient node in the middle)
  const fullPath = [...segment1.path];
  if (segment2.path.length > 1) {
    fullPath.push(...segment2.path.slice(1));
  }

  // Combine steps with labels to know which segment is active
  const combinedSteps = [
    ...segment1.steps.map(step => ({ ...step, phase: "Ambulance to Patient" })),
    ...segment2.steps.map(step => ({ ...step, phase: "Patient to Hospital" }))
  ];

  return {
    fullPath,
    totalWeight: segment1.distance + segment2.distance,
    segment1Distance: segment1.distance,
    segment2Distance: segment2.distance,
    steps: combinedSteps,
    success: segment1.path.length > 0 && segment2.path.length > 0
  };
}

module.exports = { runDijkstra, solveFullRoute };
