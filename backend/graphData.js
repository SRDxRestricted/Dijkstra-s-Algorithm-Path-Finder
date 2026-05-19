// Hardcoded scenarios for Dijkstra pathfinding demo
const scenarios = [
  {
    id: 1,
    name: "Scenario 1: Standard Rush Hour",
    description: "Moderate traffic across downtown. A direct route is available but slightly congested.",
    center: [51.505, -0.09],
    zoom: 13,
    nodes: [
      { id: "A", name: "Ambulance Station Alpha", type: "Ambulance", lat: 51.505, lng: -0.09 },
      { id: "N1", name: "North Junction", type: "Intersection", lat: 51.518, lng: -0.11 },
      { id: "N2", name: "South Crossing", type: "Intersection", lat: 51.492, lng: -0.08 },
      { id: "P_ALPHA", name: "Patient Alpha", type: "Patient", lat: 51.510, lng: -0.13 },
      { id: "P_BETA", name: "Patient Beta", type: "Patient", lat: 51.498, lng: -0.05 },
      { id: "H1", name: "Mercy Hospital", type: "Hospital", lat: 51.525, lng: -0.07 },
      { id: "H2", name: "City General Hospital", type: "Hospital", lat: 51.485, lng: -0.11 }
    ],
    edges: [
      { from: "A", to: "N1", weight: 5, traffic: "Normal" },
      { from: "A", to: "N2", weight: 4, traffic: "Normal" },
      { from: "N1", to: "P_ALPHA", weight: 3, traffic: "Heavy" },
      { from: "N2", to: "P_BETA", weight: 3, traffic: "Normal" },
      { from: "P_ALPHA", to: "H1", weight: 4, traffic: "Normal" },
      { from: "P_ALPHA", to: "H2", weight: 6, traffic: "Heavy" },
      { from: "P_BETA", to: "H1", weight: 8, traffic: "Gridlock" },
      { from: "P_BETA", to: "H2", weight: 5, traffic: "Normal" },
      { from: "N1", to: "H1", weight: 4, traffic: "Normal" },
      { from: "N2", to: "H2", weight: 4, traffic: "Normal" },
      { from: "N1", to: "N2", weight: 8, traffic: "Heavy" }
    ],
    patients: [
      { id: "P_ALPHA", name: "John Doe (Cardiac)", age: 64, severity: "CRITICAL", level: 1, startNode: "A", patientNode: "P_ALPHA", targetHospital: "H1", distance: "4.2 km" },
      { id: "P_BETA", name: "Jane Smith (Fracture)", age: 32, severity: "URGENT", level: 2, startNode: "A", patientNode: "P_BETA", targetHospital: "H2", distance: "3.8 km" }
    ]
  },
  {
    id: 2,
    name: "Scenario 2: Northside Gridlock",
    description: "A major accident has blocked North Junction. North roads are locked; routing must bypass through south.",
    center: [51.505, -0.09],
    zoom: 13,
    nodes: [
      { id: "A", name: "Ambulance Station Alpha", type: "Ambulance", lat: 51.505, lng: -0.09 },
      { id: "N1", name: "North Junction (BLOCKED)", type: "Intersection", lat: 51.518, lng: -0.11 },
      { id: "N2", name: "South Crossing", type: "Intersection", lat: 51.492, lng: -0.08 },
      { id: "P_ALPHA", name: "Patient Alpha", type: "Patient", lat: 51.510, lng: -0.13 },
      { id: "P_BETA", name: "Patient Beta", type: "Patient", lat: 51.498, lng: -0.05 },
      { id: "H1", name: "Mercy Hospital", type: "Hospital", lat: 51.525, lng: -0.07 },
      { id: "H2", name: "City General Hospital", type: "Hospital", lat: 51.485, lng: -0.11 }
    ],
    edges: [
      { from: "A", to: "N1", weight: 25, traffic: "Gridlock" }, // blocked
      { from: "A", to: "N2", weight: 4, traffic: "Normal" },
      { from: "N2", to: "N1", weight: 6, traffic: "Normal" },
      { from: "N1", to: "P_ALPHA", weight: 3, traffic: "Heavy" },
      { from: "N2", to: "P_ALPHA", weight: 8, traffic: "Normal" }, // bypass edge
      { from: "N2", to: "P_BETA", weight: 3, traffic: "Normal" },
      { from: "P_ALPHA", to: "H1", weight: 4, traffic: "Normal" },
      { from: "P_ALPHA", to: "H2", weight: 5, traffic: "Normal" },
      { from: "P_BETA", to: "H1", weight: 6, traffic: "Normal" },
      { from: "P_BETA", to: "H2", weight: 5, traffic: "Normal" }
    ],
    patients: [
      { id: "P_ALPHA", name: "John Doe (Cardiac)", age: 64, severity: "CRITICAL", level: 1, startNode: "A", patientNode: "P_ALPHA", targetHospital: "H2", distance: "6.8 km" },
      { id: "P_BETA", name: "Jane Smith (Fracture)", age: 32, severity: "URGENT", level: 2, startNode: "A", patientNode: "P_BETA", targetHospital: "H1", distance: "4.1 km" }
    ]
  },
  {
    id: 3,
    name: "Scenario 3: Storm Flooding",
    description: "Flooding in South Crossing. Ambulance must take northern routes; southern passages are extremely slow.",
    center: [51.505, -0.09],
    zoom: 13,
    nodes: [
      { id: "A", name: "Ambulance Station Alpha", type: "Ambulance", lat: 51.505, lng: -0.09 },
      { id: "N1", name: "North Junction", type: "Intersection", lat: 51.518, lng: -0.11 },
      { id: "N2", name: "South Crossing (FLOODED)", type: "Intersection", lat: 51.492, lng: -0.08 },
      { id: "P_GAMMA", name: "Patient Gamma", type: "Patient", lat: 51.501, lng: -0.11 },
      { id: "P_DELTA", name: "Patient Delta", type: "Patient", lat: 51.520, lng: -0.09 },
      { id: "H1", name: "Mercy Hospital", type: "Hospital", lat: 51.525, lng: -0.07 },
      { id: "H2", name: "City General Hospital", type: "Hospital", lat: 51.485, lng: -0.11 }
    ],
    edges: [
      { from: "A", to: "N1", weight: 4, traffic: "Normal" },
      { from: "A", to: "N2", weight: 30, traffic: "Gridlock" }, // Flooded/slow
      { from: "N1", to: "P_GAMMA", weight: 4, traffic: "Normal" },
      { from: "N2", to: "P_GAMMA", weight: 5, traffic: "Heavy" },
      { from: "N1", to: "P_DELTA", weight: 3, traffic: "Normal" },
      { from: "P_GAMMA", to: "H1", weight: 6, traffic: "Normal" },
      { from: "P_GAMMA", to: "H2", weight: 20, traffic: "Gridlock" }, // south road to H2 flooded
      { from: "P_DELTA", to: "H1", weight: 3, traffic: "Normal" },
      { from: "P_DELTA", to: "H2", weight: 9, traffic: "Heavy" }
    ],
    patients: [
      { id: "P_GAMMA", name: "Marcus Aurelius (Stroke)", age: 71, severity: "CRITICAL", level: 1, startNode: "A", patientNode: "P_GAMMA", targetHospital: "H1", distance: "5.4 km" },
      { id: "P_DELTA", name: "Alice Cooper (Allergy)", age: 25, severity: "URGENT", level: 2, startNode: "A", patientNode: "P_DELTA", targetHospital: "H1", distance: "3.2 km" }
    ]
  },
  {
    id: 4,
    name: "Scenario 4: Weekend Concert Event",
    description: "Massive concert in the east block. Roads near Mercy Hospital (H1) are heavily congested.",
    center: [51.505, -0.09],
    zoom: 13,
    nodes: [
      { id: "A", name: "Ambulance Station Alpha", type: "Ambulance", lat: 51.505, lng: -0.09 },
      { id: "N1", name: "North Junction", type: "Intersection", lat: 51.518, lng: -0.11 },
      { id: "N2", name: "South Crossing", type: "Intersection", lat: 51.492, lng: -0.08 },
      { id: "P_EPSILON", name: "Patient Epsilon", type: "Patient", lat: 51.512, lng: -0.05 },
      { id: "H1", name: "Mercy Hospital (CONCERT ZONE)", type: "Hospital", lat: 51.525, lng: -0.07 },
      { id: "H2", name: "City General Hospital", type: "Hospital", lat: 51.485, lng: -0.11 }
    ],
    edges: [
      { from: "A", to: "N1", weight: 5, traffic: "Normal" },
      { from: "A", to: "N2", weight: 4, traffic: "Normal" },
      { from: "N1", to: "P_EPSILON", weight: 6, traffic: "Heavy" },
      { from: "N2", to: "P_EPSILON", weight: 5, traffic: "Normal" },
      { from: "P_EPSILON", to: "H1", weight: 15, traffic: "Gridlock" }, // Concert area
      { from: "P_EPSILON", to: "H2", weight: 7, traffic: "Normal" },
      { from: "N1", to: "H1", weight: 10, traffic: "Heavy" },
      { from: "N2", to: "H2", weight: 4, traffic: "Normal" }
    ],
    patients: [
      { id: "P_EPSILON", name: "Bob Marley (Asthma)", age: 45, severity: "CRITICAL", level: 1, startNode: "A", patientNode: "P_EPSILON", targetHospital: "H2", distance: "5.9 km" }
    ]
  },
  {
    id: 5,
    name: "Scenario 5: Midnight Shift Clear Run",
    description: "Zero traffic. The algorithm will show pure geometric distance calculations.",
    center: [51.505, -0.09],
    zoom: 13,
    nodes: [
      { id: "A", name: "Ambulance Station Alpha", type: "Ambulance", lat: 51.505, lng: -0.09 },
      { id: "N1", name: "North Junction", type: "Intersection", lat: 51.518, lng: -0.11 },
      { id: "N2", name: "South Crossing", type: "Intersection", lat: 51.492, lng: -0.08 },
      { id: "P_ZETA", name: "Patient Zeta", type: "Patient", lat: 51.503, lng: -0.10 },
      { id: "H1", name: "Mercy Hospital", type: "Hospital", lat: 51.525, lng: -0.07 },
      { id: "H2", name: "City General Hospital", type: "Hospital", lat: 51.485, lng: -0.11 }
    ],
    edges: [
      { from: "A", to: "N1", weight: 3, traffic: "Normal" },
      { from: "A", to: "N2", weight: 3, traffic: "Normal" },
      { from: "A", to: "P_ZETA", weight: 2, traffic: "Normal" },
      { from: "N1", to: "P_ZETA", weight: 2, traffic: "Normal" },
      { from: "N2", to: "P_ZETA", weight: 2, traffic: "Normal" },
      { from: "P_ZETA", to: "H1", weight: 4, traffic: "Normal" },
      { from: "P_ZETA", to: "H2", weight: 4, traffic: "Normal" }
    ],
    patients: [
      { id: "P_ZETA", name: "Zack Snyder (Laceration)", age: 50, severity: "URGENT", level: 2, startNode: "A", patientNode: "P_ZETA", targetHospital: "H1", distance: "2.6 km" }
    ]
  }
];

module.exports = { scenarios };
