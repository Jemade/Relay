# Relay — Deployment Guide & Endpoint Directory

This guide contains complete deployment instructions, configuration manifests, environment parameters, and service URLs for deploying **Relay** across local, containerized, cloud (Render), and Kubernetes environments.

---

## 1. Quick Reference & Service URLs

### Production & Repository URLs

| Service / Resource | Access URL / Path | Notes |
|---|---|---|
| **GitHub Repository** | [https://github.com/Jemade/Relay](https://github.com/Jemade/Relay) | Source code, workflows, manifests |
| **Render Blueprint Launcher** | [https://dashboard.render.com/blueprints/new](https://dashboard.render.com/blueprints/new) | 1-click infrastructure deploy |
| **Live Render Production App** | `https://relay-<your-service-name>.onrender.com` | Assigned automatically by Render |
| **Production Health Check** | `https://relay-<your-service-name>.onrender.com/api/health` | HTTP probe (returns status 200) |
| **Production OpenAPI Docs** | `https://relay-<your-service-name>.onrender.com/docs` | Interactive Swagger UI |

### Local Development & Testing URLs

| Endpoint | URL | Purpose |
|---|---|---|
| **Unified App (FastAPI + SPA)** | `http://localhost:8000/` | Full-stack production container or local Uvicorn |
| **Frontend Dev Server (Vite)** | `http://localhost:3000/` | Hot-reloading development server |
| **API Healthcheck** | `http://localhost:8000/api/health` | Service status & DB connection check |
| **Real System Metrics** | `http://localhost:8000/api/metrics` | Live token, thread, and scorecard counts |
| **Interactive API Documentation** | `http://localhost:8000/docs` | Swagger / OpenAPI testing dashboard |
| **Alternative API Specs** | `http://localhost:8000/redoc` | ReDoc API specifications |
| **Grading Task Submission** | `http://localhost:8000/api/grading/evaluate` | POST endpoint (HTTP 202 Accepted) |
| **Real-Time SSE Stream** | `http://localhost:8000/api/grading/tasks/{task_id}/events` | Server-Sent Events real-time telemetry |
| **Scorecard Listing** | `http://localhost:8000/api/grading/scorecards` | Historical multi-agent evaluations |

---

## 2. Deploying to Render (Cloud Production)

Relay includes a native Infrastructure-as-Code blueprint (`render.yaml`). Render reads this file to provision the service, build the Docker container, attach persistent storage, and monitor health automatically.

### Option A: 1-Click Blueprint Deploy (Recommended)

1. Navigate to the **Render Blueprint Dashboard**:
   👉 [https://dashboard.render.com/blueprints/new](https://dashboard.render.com/blueprints/new)
2. **Connect Repository**: Select `Jemade/Relay` (or your forked repository).
3. **Branch**: Select `main`.
4. Render will parse [`render.yaml`](./render.yaml) and automatically configure:
   - **Service Type**: Web Service
   - **Environment**: Docker (uses root [`Dockerfile`](./Dockerfile))
   - **Plan**: `starter`
   - **Port**: `8000`
   - **Health Check Path**: `/api/health`
   - **Persistent Disk**: 1 GB disk mounted at `/app/data` (preserves your SQLite database and scorecards across restarts and deployments)
5. **Environment Variables**:
   Under the service settings, add your optional model provider keys:
   - `OPENAI_API_KEY`: *(Optional)* Your OpenAI key
   - `ANTHROPIC_API_KEY`: *(Optional)* Your Anthropic Claude key
   - `GOOGLE_API_KEY`: *(Optional)* Your Google Gemini key
6. Click **Apply**.
7. Render will build the container, install backend requirements, compile the React SPA bundle, and start Uvicorn. Once complete, your service will be live at `https://relay-xxxx.onrender.com`.

### Option B: Manual Web Service Deploy on Render

If deploying without the Blueprint feature:

1. In Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository: `https://github.com/Jemade/Relay`.
3. Fill in the following settings:
   - **Name**: `relay`
   - **Runtime**: `Docker`
   - **Branch**: `main`
   - **Region**: `Oregon (US West)` or preferred region
   - **Instance Type**: `Starter` (or `Free`)
4. **Health Check Path**: Set to `/api/health`.
5. **Disks** (Under Advanced):
   - **Name**: `relay-data`
   - **Mount Path**: `/app/data`
   - **Size**: `1 GB`
6. **Environment Variables**:
   ```ini
   PORT=8000
   DATABASE_URL=sqlite+aiosqlite:////app/data/relay.db
   DEFAULT_PROVIDER=gemini
   DEFAULT_MODEL=models/gemini-3.6-flash
   DEBUG=false
   ```
7. Click **Create Web Service**.

### Option C: Automated CD via GitHub Actions & Render Deploy Hook

To trigger automatic deploys whenever you push to `main`:

1. In your Render Web Service dashboard, navigate to **Settings** $\rightarrow$ **Deploy Hook**.
2. Copy the unique webhook URL (e.g. `https://api.render.com/deploy/srv-xxxx?key=yyyy`).
3. In your GitHub repository, go to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
4. Click **New repository secret**:
   - **Name**: `RENDER_DEPLOY_HOOK_URL`
   - **Value**: *[Paste your Render Deploy Hook URL]*
5. The [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) workflow will now trigger zero-downtime Render deployments automatically on every push to `main`.

---

## 3. Deploying with Docker & Docker Compose

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+

### Quick Start with Docker Compose

```bash
# Clone repository
git clone https://github.com/Jemade/Relay.git
cd Relay

# Start application stack with persistent volume
docker compose up -d

# Verify container status
docker compose ps

# View live service logs
docker compose logs -f relay
```

The application is now accessible at `http://localhost:8000`.

### Production Parity with PostgreSQL

To test Relay with PostgreSQL instead of SQLite:

```bash
docker compose --profile with-postgres up -d
```

### Standalone Docker Build

```bash
# Build production multi-stage image
docker build -t relay-engine:latest .

# Run container with mapped port and volume
docker run -d \
  --name relay \
  -p 8000:8000 \
  -v relay_storage:/app/data \
  -e PORT=8000 \
  -e DATABASE_URL=sqlite+aiosqlite:////app/data/relay.db \
  relay-engine:latest
```

---

## 4. Deploying to Kubernetes

Relay includes modular Kubernetes manifests under the [`k8s/`](./k8s/) directory.

### Step-by-Step Cluster Deployment

```bash
# 1. Apply namespace, configmap, deployment, service, and ingress
kubectl apply -k k8s/

# 2. Configure API Secrets (copy from template)
kubectl apply -f k8s/secret.example.yaml

# 3. Monitor rollout status
kubectl rollout status deployment/relay-deployment -n relay

# 4. Verify pods and services
kubectl get pods,svc,ingress -n relay
```

### Accessing via Port-Forwarding (Local / Minikube)

```bash
kubectl port-forward svc/relay-service 8080:80 -n relay
```

Open `http://localhost:8080` in your browser.

### Ingress Configuration
The included [`k8s/ingress.yaml`](./k8s/ingress.yaml) is pre-configured with Nginx annotations to disable proxy buffering on SSE endpoints:
```yaml
nginx.ingress.kubernetes.io/server-snippets: |
  location /api/grading/tasks/ {
    proxy_buffering off;
    proxy_cache off;
  }
```

---

## 5. Deployment Verification & Testing

Verify that your deployment is healthy by running these commands against your deployment URL (replace `http://localhost:8000` with your live Render URL if testing production):

### 1. Health Probe
```bash
curl -i http://localhost:8000/api/health
```
**Expected Response** (`200 OK`):
```json
{
  "status": "operational",
  "app": "RELAY AI Engine",
  "version": "2.0.0",
  "database": "connected",
  "llm_engine": {
    "live_llm_ready": false,
    "status": "standby"
  },
  "pipeline": {
    "orchestration": "LangGraph StateGraph",
    "agents": [
      "intake",
      "clarity_evaluator",
      "actionability_evaluator",
      "grounding_evaluator",
      "scorecard_synthesizer"
    ],
    "schema": "Pydantic v2 (FinalScorecardSchema)"
  }
}
```

### 2. Multi-Agent Grading Evaluation
```bash
curl -i -X POST http://localhost:8000/api/grading/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "transcript_text": "User: How do we roll out containerized services safely?\nAssistant: 1. Set up health probes.\n2. Configure rolling updates.\n3. Monitor SSE metrics in real-time."
  }'
```
**Expected Response** (`202 Accepted`):
```json
{
  "task_id": "c85d7be4-b49b-43d9-b4b9-8730ad3c3e21",
  "thread_id": null,
  "status": "queued",
  "created_at": "2026-09-10T14:20:00Z"
}
```

### 3. Querying Task Status & Scorecard
```bash
curl http://localhost:8000/api/grading/tasks/<task_id>
```

---

## 6. Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `8000` | Port for the Uvicorn web server |
| `DATABASE_URL` | `sqlite+aiosqlite:////app/data/relay.db` | SQLAlchemy async database connection URI |
| `DEBUG` | `false` | Enable/disable debug mode |
| `DEFAULT_PROVIDER` | `gemini` | Default provider (`gemini`, `openai`, `anthropic`, or `auto`) |
| `DEFAULT_MODEL` | `models/gemini-3.6-flash` | Default model identifier |
| `OPENAI_API_KEY` | *None* | OpenAI API Key (starts with `sk-`) |
| `ANTHROPIC_API_KEY` | *None* | Anthropic Claude API Key (starts with `sk-ant-`) |
| `GOOGLE_API_KEY` | *None* | Google Gemini API Key (starts with `AIza` or `AQ.`) |
| `CUSTOM_API_BASE` | *None* | Optional custom base URL (e.g. Groq, Ollama, OpenRouter) |
| `CUSTOM_MODEL_NAME`| *None* | Custom model name for alternative endpoints |
| `RENDER_DEPLOY_HOOK_URL` | *None* | GitHub Actions secret for automated Render deployments |
