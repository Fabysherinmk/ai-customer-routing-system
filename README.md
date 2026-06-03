# Centrric | Customer Request Routing System (CRRS)

An AI-powered operations portal that processes, classifies, prioritizes, and routes incoming customer support requests in real time. Designed for startups and customer success teams.

---

## ⚡ Key Features

1. **Intake API & Webhook Simulation**: Public endpoints to ingest customer requests from different channels (Email, WhatsApp, Webform, Chat) with signature verification explanations.
2. **Asynchronous Processing Queue**: A worker queue simulation that processes tickets in the background with simulated latency (2-3 seconds), ensuring the API is never blocked.
3. **AI Classification & Summary**: Categorizes requests (Billing, Technical Support, Sales, General Inquiry), assigns routing priority (High, Medium, Low), generates a concise summary, and logs explanations.
4. **Idempotency Validation**: Prevents duplicate submissions in quick succession using custom headers (`X-Idempotency-Key`) and duplicate checks.
5. **Real-time Live Updates**: Fully integrated with Socket.io. Dashboard counts, request statuses, note updates, and timeline events update live in the browser with active status indicator indicators.
6. **Detailed Audit Timelines**: Tracks the complete lifecycle of a support ticket (submission, queue updates, AI classification, agent notes, status changes).
7. **Interactive API Specs**: Exposes interactive Swagger/OpenAPI documentation for all REST API routes.
8. **Dual-Database Engines (Switcher)**: Connects to **PostgreSQL** by default, but includes switcher utilities to easily run with **SQLite** for zero-dependency local development.

---

## 📂 Project Structure

```text
ai-customer-routing-system
│
├── backend
│   ├── src
│   │   ├── controllers        # REST handlers (Auth, Requests, Webhooks)
│   │   ├── routes             # API endpoints matching Swagger spec
│   │   ├── services           # Business logic (AI classifier, socket triggers)
│   │   ├── workers            # In-memory worker queue & latency simulation
│   │   ├── sockets            # Socket.io connection manager
│   │   ├── middleware         # JWT Verification & Express Rate limit filters
│   │   ├── prisma             # Prisma database client wrapper
│   │   ├── types              # Shared TypeScript declarations
│   │   └── app.ts             # Bootstrapping & server entry point
│   ├── prisma
│   │   ├── schema.prisma      # DB models (User, Request, Classification, Note, RequestEvent)
│   │   └── seed.ts            # Seeding script with 20 sample tickets
│   ├── use-sqlite.js          # Helper script to swap DB engine to SQLite
│   ├── use-postgres.js        # Helper script to swap DB engine back to Postgres
│   └── Dockerfile             # Multi-stage production container setup
│
├── frontend
│   ├── src
│   │   ├── pages              # Router pages (Login, Dashboard, RequestDetails)
│   │   ├── components         # Reusable dashboard UI blocks
│   │   ├── layouts            # Responsive Sidebar & status header
│   │   ├── services           # Axios API client helper
│   │   ├── context            # Socket.io connection status context
│   │   ├── App.tsx            # Protected routing and router mapping
│   │   └── index.css          # Tailwind CSS style overrides
│   ├── tailwind.config.js     # Custom brand styling tokens
│   ├── nginx.conf             # Production Nginx SPA redirect handler
│   └── Dockerfile             # Multi-stage SPA server container
│
└── docker-compose.yml         # Devops orchestration (DB, API, UI)
```

---

## 🚀 Local Setup (Zero-Dependency SQLite Fallback)

To run the application immediately on your local machine without needing Docker or a PostgreSQL service running:

### 1. Configure the Database
The project contains an automated database engine switcher:
```bash
cd backend
node use-sqlite.js
```
This automatically updates your Prisma schema to SQLite and creates a local `.env` pointing to a file database (`dev.db`).

### 2. Install and Seed the Backend
```bash
# Inside backend directory
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
```
*Note: This creates the SQLite database `dev.db` and seeds it with **20 diverse tickets**, events, and two default users:*
- **Admin**: `admin@crrs.com` | Password: `admin123`
- **Agent**: `agent@crrs.com` | Password: `agent123`

### 3. Boot the Server
```bash
npm run dev
```
The server will start on [http://localhost:5000](http://localhost:5000).
- Open **Swagger Docs** at: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- Run health check at: [http://localhost:5000/health](http://localhost:5000/health)

### 4. Boot the Frontend Portal
In a new terminal window:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
The interface is now live at [http://localhost:5173](http://localhost:5173). Log in instantly using the **Developer Quick Login** buttons on the login screen!

---

## 🐳 Docker Deployment (Production PostgreSQL Stack)

To deploy the production-ready stack (React Frontend, Node.js API, PostgreSQL Database) with single-command Docker Orchestration:

### 1. Ensure Docker is running and backend uses Postgres
```bash
cd backend
node use-postgres.js
```

### 2. Boot the stack
At the root directory of the workspace, run:
```bash
docker-compose up --build
```
This builds both multi-stage containers and spins up:
- **Frontend Container**: Exposed at [http://localhost:5173](http://localhost:5173)
- **Backend API Container**: Exposed at [http://localhost:5000](http://localhost:5000) (running migrations & seeding database auto-magically)
- **PostgreSQL Database Container**: Running internally on port `5432`

---

## 🛠 API Documentation (Summary of Endpoints)

Full documentation is accessible via Swagger UI at `/api-docs`. Here is the REST overview:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Staff Authentication (returns JWT and profile data) | Public |
| **GET** | `/api/auth/me` | Fetch active profile metadata | JWT (Admin/Agent) |
| **POST** | `/api/requests` | Ingest new customer ticket (rate-limited) | Public |
| **POST** | `/api/webhooks/inbound` | Inbound messaging integration simulation | Public |
| **GET** | `/api/requests` | List, search, filter, and sort support tickets | JWT (Admin/Agent) |
| **GET** | `/api/requests/:id` | Fetch ticket details, notes, and audit timeline | JWT (Admin/Agent) |
| **PATCH** | `/api/requests/:id/status` | Update ticket workflow status | JWT (Admin/Agent) |
| **POST** | `/api/requests/:id/notes` | Add internal collaboration notes | JWT (Admin/Agent) |

---

## 🤖 AI Classification Rules

The mock engine simulates advanced NLP matching based on message contents:

- **Billing**: Triggered by keywords `payment`, `refund`, `invoice`, `charge`, `card`, `billing`.
- **Technical Support**: Triggered by keywords `bug`, `error`, `crash`, `broken`, `fail`, `not working`, `server down`.
- **Sales**: Triggered by keywords `demo`, `pricing`, `quote`, `buy`, `purchase`, `cost`.
- **General Inquiry**: Fallback category.

### Routing Priority Logic
- **HIGH**: If the message contains outage or security terms: `urgent`, `server down`, `outage`, `security`, `critical`, `emergency`, `hacked`.
- **MEDIUM**: If the message matches standard operational terms: `payment`, `refund`, `invoice`, `bug`, `broken`, `error`.
- **LOW**: Fallback priority.
