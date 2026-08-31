# Mindful Plate 🥗

A modern, full-stack nutrition, calorie, macro, and water tracking application.

- **Mobile App**: React Native (Expo SDK 57) with TypeScript and **100% NativeWind (Tailwind CSS)**.
- **Backend API**: **Bun + Fastify + Drizzle ORM**.
- **Database**: Local host **PostgreSQL 16** (not containerized).
- **Multimodal AI**: **Google Gemini 2.0/2.5 Flash** for natural language meal description parsing and plate photo nutrition analysis.
- **DevOps & Self-Hosting**: **Docker** (`oven/bun:1-alpine`) deployed to your own server via a minimal Bun script or **Ansible** playbook (pull code, build, run); an optional Caddy reverse-proxy setup is available separately via direct Docker Compose.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Bun](https://bun.sh) (v1.2+) installed
- PostgreSQL installed and running locally
- Google Gemini API Key

### 2. Install Dependencies
```bash
bun install
```

### 3. Setup Backend Environment
In `apps/server`:
Create `.env`:
```env
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mindful_plate
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Generate and run Drizzle migrations:
```bash
cd apps/server
bun run db:push
```

Start Fastify backend in dev mode:
```bash
bun run dev
```
Swagger interactive API docs will be available at: `http://localhost:3000/docs`.

### 4. Start React Native Mobile App
```bash
cd apps/mobile
bun run dev
```
Scan the QR code with Expo Go on iOS or Android.

---

## 🧪 Testing

Run test suites across the monorepo:
```bash
bun test
```

---

## 🚀 Server Deployment

A deliberately minimal deploy — it does exactly three things and nothing
else, and **not** install or remove any software on the host; Docker and
Postgres are assumed to already be set up there.
1. SSHes to the host and `git pull`s the code (clones on first run).
2. Rotates images: drops any existing `mindful-plate:previous`, re-tags the
   current `mindful-plate:latest` as `previous`, then builds the new image
   as `latest`.
3. Stops/removes the existing `mindful-plate` container and starts a new one
   from the freshly built image.

Two equivalent ways to run it — a Bun script (no extra dependencies) or the
Ansible playbook (if you already have Ansible).

### Setup (once):
Copy `deploy/ansible/.env.example` to `deploy/ansible/.env` and fill in real values — your host's IP/hostname and SSH user (`HOST`, `SSH_USER`, `SSH_KEY`), a `DATABASE_URL`, and a 32+ character JWT secret at minimum. This file is gitignored — never commit real secrets.
```bash
cp deploy/ansible/.env.example deploy/ansible/.env
# edit deploy/ansible/.env with real values
```
Both tools refuse to run if `DATABASE_URL` or `JWT_SECRET` are missing, rather than silently deploying with a placeholder secret.

### Deploying (Bun script):
```bash
bun run deploy          # deploy
bun run deploy:revert   # roll back to the "previous" image (only one generation is kept)
```

### Deploying (Ansible):
```bash
set -a && source deploy/ansible/.env && set +a
ansible-playbook -i deploy/ansible/inventory.yml deploy/ansible/playbook.yml
```
To roll back with Ansible, SSH in and run the previous image directly: `docker run -d --name mindful-plate --restart unless-stopped -p 3000:3000 --add-host=host.docker.internal:host-gateway <same -e flags as the playbook> mindful-plate:previous` — or just use `bun run deploy:revert` instead.

---

## 🐳 Docker Deployment (Direct)

You can also run the containers directly with Docker Compose:

### Development Mode (Swagger available at `http://localhost:3000/docs`):
```bash
docker compose -f deploy/docker/docker-compose.dev.yml up -d --build
```

### Production Mode (Swagger completely disabled):
```bash
docker compose -f deploy/docker/docker-compose.prod.yml up -d --build
```
