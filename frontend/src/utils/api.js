/**
 * LifeLine Navigator API Client
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchScenarios() {
  const response = await fetch(`${API_BASE}/scenarios`);
  if (!response.ok) {
    throw new Error('Failed to fetch scenarios');
  }
  return response.json();
}

export async function fetchScenarioDetails(id) {
  const response = await fetch(`${API_BASE}/scenarios/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch details for scenario ${id}`);
  }
  return response.json();
}

export async function calculateRoute(scenarioId, patientId) {
  const response = await fetch(`${API_BASE}/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scenarioId, patientId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to calculate shortest path route');
  }
  return response.json();
}
