# Relay

[![CI](https://github.com/Jemade/Relay/actions/workflows/ci.yml/badge.svg)](https://github.com/Jemade/Relay/actions/workflows/ci.yml)

Conversation evaluation workspace with a React frontend, FastAPI backend, and LangGraph assessment pipeline. Submit a transcript, follow evaluation progress over SSE, and inspect a structured scorecard.

## Features

- Conversation threads and message history.
- Evaluators for clarity, actionability, grounding, and tone.
- Weighted scorecard synthesis and actionable feedback.
- Real-time pipeline transition events.
- Provider integrations and deterministic fallback scoring.
- SQLite development storage and optional PostgreSQL configuration.

## Run locally

Requires Python 3.11 or newer and Node.js.

```bash
git clone https://github.com/Jemade/Relay.git
cd Relay
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd frontend
npm ci
npm run build
cd ..
uvicorn backend.app.main:app --reload --port 8000
```

Open http://localhost:8000. API documentation is at http://localhost:8000/docs.

For frontend development, run `npm run dev` in `frontend/`; Vite serves port 3000 and proxies `/api` to port 8000.

Use `backend/.env.example` as a reference. Configuration loads `.env` from the working directory. Set the selected provider credentials, `DEFAULT_PROVIDER`, and a supported `DEFAULT_MODEL` for live model requests.

## Containers

```bash
docker compose up --build
```

Compose persists SQLite in a named volume. Its optional PostgreSQL profile starts a database; switching the application also requires setting `DATABASE_URL` to a `postgresql+asyncpg://` connection string.

## Verification

Run the backend tests from the repository root:

```bash
pytest -q backend/tests
```

See [GitHub Actions](https://github.com/Jemade/Relay/actions) for configured checks.

## Current scope

Rubric scores depend on the selected evaluator and input. Fallback results use heuristics. Evaluation work and SSE broadcasting run in the API process; the service does not provide a durable distributed worker queue.

## Engineering and contribution guide

Read the [engineering notes](docs/ENGINEERING.md) for implementation boundaries and verification commands, the [review checklist](docs/REVIEW_CHECKLIST.md) for evidence still required, and [CONTRIBUTING.md](CONTRIBUTING.md) to propose changes. Report vulnerabilities through [SECURITY.md](SECURITY.md).

[![Repository hygiene](https://github.com/Jemade/Relay/actions/workflows/repository-hygiene.yml/badge.svg)](https://github.com/Jemade/Relay/actions/workflows/repository-hygiene.yml)
