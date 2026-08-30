# Mindful Plate 🥗

A modern, full-stack nutrition, calorie, macro, and water tracking application.

- **Mobile App**: React Native (Expo SDK 57) with TypeScript and **100% NativeWind (Tailwind CSS)**.
- **Backend API**: **Bun + Fastify + Drizzle ORM**.
- **Database**: Local host **PostgreSQL 16** (not containerized).
- **Multimodal AI**: **Google Gemini 2.0/2.5 Flash** for natural language meal description parsing and plate photo nutrition analysis.
- **DevOps & Self-Hosting**: **Docker** (`oven/bun:1-alpine` + Caddy reverse proxy) deployed to a **Raspberry Pi** using automated **Ansible** playbooks.

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

## 🍓 Raspberry Pi Deployment (Ansible + Docker)

The deployment automates the setup on your Raspberry Pi:
1. Provisions native **PostgreSQL** service and creates user & database.
2. Installs **Docker CE** and Docker Compose plugin.
3. Configures **UFW firewall** (ports 22, 80, 443).
4. Synchronizes app files, generates `.env`, and launches the Bun Fastify container + Caddy reverse proxy.

### Deploying:
1. Update `deploy/ansible/inventory.ini` with your Raspberry Pi IP address and SSH user:
   ```ini
   [raspberrypi]
   pi-server ansible_host=192.168.1.100 ansible_user=pi
   ```
2. Set your Gemini API key in your terminal environment:
   ```bash
   export GEMINI_API_KEY="your_actual_gemini_key"
   ```
### Deploying to Production (Default - Swagger disabled):
```bash
ansible-playbook -i deploy/ansible/inventory.ini deploy/ansible/playbook.yml
```

### Deploying to Development on Pi (Swagger enabled at `/docs`):
```bash
ansible-playbook -i deploy/ansible/inventory.ini deploy/ansible/playbook.yml -e "env=development"
```

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
