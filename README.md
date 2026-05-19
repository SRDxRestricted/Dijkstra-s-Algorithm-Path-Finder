# LifeLine Navigator 🚑🧭

LifeLine Navigator is a production-ready tactical dispatch dashboard designed for emergency services (ambulance riders and dispatchers). It solves routing paths in real-time, accounting for active city traffic congestions (normal road, heavy traffic, and gridlocks) by running an interactive Dijkstra pathfinding visualization from the Ambulance's starting location, through the selected Patient's emergency scene, to the designated Hospital.

## 🚀 Quick Start (Local Run)

You can run LifeLine Navigator locally in less than a minute either via standard Node.js/npm or via Docker.

### Method 1: Local Development (Node.js & npm)

Ensure you have Node.js (v18+) installed.

1. **Clone the repository and install all dependencies:**
   ```bash
   npm run install-all
   ```
   *This single command installs the required root CLI runner, the Express backend dependencies, and the React/Tailwind frontend dependencies.*

2. **Boot the development server:**
   ```bash
   npm run dev
   ```
   *This starts the Express API on port `5000` and the Vite React frontend on port `5173` concurrently, with dynamic proxy mapping from `localhost:5173/api` to the backend.*

3. **Access the application:**
   Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

### Method 2: One-Click Local Docker Compose

If you have Docker and Docker Compose installed, run:

```bash
docker compose up --build
```

The unified container compiles the React production assets, copies them into the Express public directory, and serves the entire full-stack app on port `8080`.
- Access the production build at: [http://localhost:8080](http://localhost:8080)

---

## 🛠️ Environment Variables Configuration

The app works fully zero-config, but you can customize ports and decoupled hosting configurations using the following environment variables:

| Environment Variable | Service | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend | `5000` | The port the Express backend will bind to. In Docker, it is overridden to `8080`. |
| `NODE_ENV` | Backend | `development` | Set to `production` in production mode to serve static frontend files. |
| `VITE_API_BASE_URL` | Frontend | `/api` | The base URL endpoint of the API backend. Useful when deploying the frontend decoupled (e.g., Vercel) and backend separately (e.g., Render). |

---

## 🌐 Production Deployment Guide

### Option 1: Unified Docker Deployment (Render / Google Cloud Run)

The easiest deployment strategy is to host the full-stack container on a platform like **Render** or **Google Cloud Run**. These platforms automatically detect the `Dockerfile` at the root and build/deploy it as a single unit.

#### Steps for Render:
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your Git repository.
3. Select **Docker** as the Runtime environment.
4. Under Advanced settings, add the environment variable:
   - `PORT` = `8080`
5. Click **Deploy Web Service**. Render will build the React bundle and start the Express server on port `8080`.

---

### Option 2: Decoupled Deployments (Vercel Frontend + Render Backend)

For optimized loading and performance, you can deploy the React app to **Vercel** and the Express API to **Render Web Services**.

#### A. Deploy the Backend to Render:
1. Create a **Web Service** on Render.
2. Connect your Git repository.
3. Set the **Build Command** to:
   ```bash
   npm install --prefix backend
   ```
4. Set the **Start Command** to:
   ```bash
   npm start --prefix backend
   ```
5. Note the deployed URL (e.g. `https://lifeline-backend.onrender.com`).

#### B. Deploy the Frontend to Vercel:
1. Create a project on [Vercel](https://vercel.com).
2. Connect the Git repository.
3. Set the **Framework Preset** to `Vite`.
4. Set the **Root Directory** to `frontend`.
5. Under Environment Variables, add the target backend URL:
   - `VITE_API_BASE_URL` = `https://lifeline-backend.onrender.com/api`
6. Click **Deploy**. Vercel will automatically build the static website and host it. The client-side queries will automatically point to your active Express backend on Render.

---

## 🧩 How the Dijkstra Engine Factors Traffic
Every edge in our city network is weighted. In standard routing apps, paths are calculated using static geometric distance. LifeLine Navigator dynamically computes traffic impacts using the formula:
$$\text{Weight} = \text{Base Distance} \times \text{Traffic Multiplier}$$
- **Normal Traffic**: Multiplier = $1.0$ (Clean roads)
- **Heavy Traffic**: Multiplier = $1.5$ (Delays around North Junction or Event Arenas)
- **Gridlock/Flood**: Multiplier = $5.0$ (High penalty, forcing Dijkstra to discover a longer physical route that is mathematically faster in travel minutes)

### Interactive Scenarios
- **Scenario 1**: Balanced grid. A standard path via North Junction is ideal.
- **Scenario 2**: Major collision at North Junction. The route automatically shifts to Southern crossings.
- **Scenario 3**: Flash flooding blocks Southern avenues. Dijkstra shifts to Northern transit corridors.
- **Scenario 4**: Stadium Concert congestion. Roads near Mercy Hospital (H1) are blocked; dispatchers are routed to alternative facilities (H2) instead.
- **Scenario 5**: Midnight Shift. Zero traffic, exhibiting purely geographical routing.
