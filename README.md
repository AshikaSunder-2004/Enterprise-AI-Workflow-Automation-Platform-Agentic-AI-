# Enterprise AI Workflow Automation Platform (Agentic AI)

A robust, enterprise-grade platform for building, executing, and monitoring AI-driven workflows. The platform leverages Google Gemini models for agentic decision-making, PostgreSQL for persistent state tracking, Redis and BullMQ for workflow job queues, and React Flow for visual workflow creation.

---

## 🛠️ Technology Stack

*   **Frontend**: React (TypeScript), React Flow (visual graph editor), Vite, Zustand (state management)
*   **Backend**: Node.js (Express), TypeScript, Prisma ORM, BullMQ
*   **Database**: PostgreSQL
*   **Cache & Queue Broker**: Redis
*   **AI Engine**: Google Gemini API via `@google/genai`

---

## ⚙️ Prerequisites

Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Docker & Docker Desktop](https://www.docker.com/products/docker-desktop)
*   [Git](https://git-scm.com/)

---

## 🚀 Quick Start (Automated Script)

The easiest way to set up and run the platform is using the built-in launcher:

*   **Windows**: Simply double-click **`run.bat`** in the root directory.
*   **Manual PowerShell Command**:
    ```powershell
    .\run.ps1
    ```

The interactive script will guide you through:
1.  Setting up the `.env` configuration file.
2.  Launching in **Docker Compose Mode** (recommended; runs all services including Postgres/Redis).
3.  Launching in **Local Development Mode** (installs node modules, performs Prisma migrations, and launches Frontend, Backend, and Worker in separate pop-up windows).

---

## 🐳 Docker Compose Mode (Manual)

To manually run the full containerized stack:

1.  **Configure environment variables**:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and set your `GEMINI_API_KEY`. Make sure `ENCRYPTION_KEY` is **exactly 32 characters** long.

2.  **Start the containers**:
    ```bash
    docker-compose up --build
    ```

3.  **Access the application**:
    *   **Frontend Web App**: `http://localhost:3000`
    *   **Backend Health API**: `http://localhost:4000/health`

---

## 💻 Local Development Mode (Manual)

To develop with local hot-reloading:

### 1. Database & Cache
Ensure you have running instances of PostgreSQL and Redis. If you'd like to use Docker for just the dependencies:
```bash
docker run --name aiwf_postgres -p 5432:5432 -e POSTGRES_USER=aiwf -e POSTGRES_PASSWORD=aiwf_secret -e POSTGRES_DB=aiwf_db -d postgres:16-alpine
docker run --name aiwf_redis -p 6379:6379 -d redis:7-alpine
```

### 2. Configure Local Environment
Copy `.env` to both root and backend directories:
```bash
cp .env.example .env
cp .env backend/.env
```

### 3. Start Backend & Queue Worker
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev          # Starts API on port 4000
npm run dev:worker   # Starts background job worker (runs in separate terminal)
```

### 4. Start Frontend
```bash

cd ../frontend
npm install
npm run dev          # Starts Vite dev server on port 3000
```

---

## 🧪 Verification & Testing

Inside the `backend/` directory, you can run tests to verify the engine:

*   **Unit Tests**:
    ```bash
    npm run test
    ```
*   **Integration Tests** (requires Postgres and Redis to be running):
    ```bash
    npm run test:integration
    ```
*   **All Tests**:
    ```bash
    npm run test:all
    ```
*   **Linting**:
    ```bash
    npm run lint
    ```
