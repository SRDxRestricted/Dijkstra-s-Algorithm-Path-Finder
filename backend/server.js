const express = require('express');
const cors = require('cors');
const path = require('path');
const { scenarios } = require('./graphData');
const { solveFullRoute } = require('./dijkstra');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Endpoints
app.get('/api/scenarios', (req, res) => {
  try {
    const summary = scenarios.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      patientCount: s.patients.length
    }));
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to load scenarios." });
  }
});

app.get('/api/scenarios/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const scenario = scenarios.find(s => s.id === id);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found." });
    }
    res.json(scenario);
  } catch (error) {
    res.status(500).json({ error: "Failed to load scenario details." });
  }
});

app.post('/api/route', (req, res) => {
  try {
    const { scenarioId, patientId } = req.body;
    const scenario = scenarios.find(s => s.id === parseInt(scenarioId));
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found." });
    }

    const patient = scenario.patients.find(p => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    const result = solveFullRoute(
      scenario.nodes,
      scenario.edges,
      patient.startNode,
      patient.patientNode,
      patient.targetHospital
    );

    res.json({
      patient,
      result
    });
  } catch (error) {
    console.error("Route calculation error:", error);
    res.status(500).json({ error: "Error calculating route." });
  }
});

// Serve frontend static files in production
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));

app.get('*', (req, res) => {
  // If request is not for API, serve index.html
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  } else {
    res.status(404).json({ error: "API endpoint not found." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
