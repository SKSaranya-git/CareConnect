# AI-Enabled Smart Healthcare Platform (Microservices)

Full microservices stack: API Gateway, JWT auth, per-service MongoDB databases, RabbitMQ events, React SPA (CareConnect) talking **only** to the gateway.

## Folder structure

```txt
DS_ASS1/
  gateway/                 # API Gateway (Express + proxy)
  services/
    auth-service/
    patient-service/
    doctor-service/
    appointment-service/
    telemedicine-service/
    payment-service/
    notification-service/
    ai-service/
  client/                  # Vite + React + Tailwind
  docker-compose.microservices.yml
  k8s-microservices/
    all-in-one.yaml
    ingress.yaml           # Optional: nginx ingress → api-gateway
  docs/
    GATEWAY_API.md         # Endpoint reference
    ARCHITECTURE.md        # Diagram + service list
```

## Run with Docker Compose

From the repo root:

```bash
docker compose -f docker-compose.microservices.yml up --build
```

On Windows you can use **`stack-up.cmd`** (same as `up -d` with **`--remove-orphans`**). **Do not** run `up -d api-gateway` until databases are healthy: the gateway depends on all microservices, which wait on Mongo/RabbitMQ. If you see `dependency failed to start` / `unhealthy`, start the **full** stack once, wait **5–15 minutes** (first boot or low RAM), run `docker compose -f docker-compose.microservices.yml ps`, then open `http://localhost:8081/health`. Give Docker Desktop **8GB+ RAM** in Settings → Resources if checks keep failing.

**“zombie and can not be killed”** when recreating containers: Mongo/RabbitMQ healthchecks spawn short-lived processes; without an init as PID 1, Docker Desktop can hit this on `up --force-recreate`. This compose file sets **`init: true`** on those services. If it still happens: **Quit Docker Desktop fully** (tray → Quit), start it again, then `docker compose -f docker-compose.microservices.yml down` and `stack-up.cmd`.

The long **`docker logs telemedicine-db`** lines are normal MongoDB JSON logs (connections, checkpoints, health `mongosh` pings); the tail shows a clean **SIGTERM shutdown** when something stopped the container.

**RabbitMQ `Restarting (1)`:** the stack uses a fixed **`hostname: rabbitmq`** for stable data. Old Mnesia data from a *different* node name can make the broker exit immediately. Run **`reset-rabbitmq.cmd`** once (removes the RabbitMQ volume), wait until `docker compose … ps` shows **rabbitmq** healthy, then **`stack-up.cmd`** again. Do not set **`init: true`** on the RabbitMQ service (Erlang + docker-init often breaks on Windows).

| URL | Purpose |
|-----|---------|
| `http://localhost:8081` | **API Gateway** (use this as the only backend URL for the client; host **8081** avoids clashes with other apps on 8080) |
| `http://localhost:8081/health` | Gateway health |
| `http://localhost:15672` | RabbitMQ management (guest/guest) |

**Rebuild only the gateway** (after editing `gateway/`): run `rebuild-api-gateway.cmd`. If `docker compose build api-gateway` also builds other images (depends on your Compose version), you can build just the image with: `docker build -t ds_ass1-api-gateway -f gateway/Dockerfile gateway` (adjust the tag prefix if your compose project name differs), then `docker compose -f docker-compose.microservices.yml up -d api-gateway`.

**Default admin** (seeded by auth-service when using Compose):  
Email `admin@hospital.local`, password `Admin@123`.

## React client → gateway

1. Copy `client/.env.example` to `client/.env`.
2. Set `VITE_API_BASE_URL=http://localhost:8081` (default in example). To publish the gateway on host port 8080 instead, add `GATEWAY_HOST_PORT=8080` to a `.env` file in the repo root next to the compose file.
3. Run the SPA:

```bash
cd client
npm install
npm run dev
```

Production build: `npm run build` → static assets in `client/dist`.

## Core API (summary)

Detailed tables: [docs/GATEWAY_API.md](docs/GATEWAY_API.md).

- **Auth:** `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Patients:** `/api/patients/me`, reports, prescriptions; doctor routes for patient reports/prescriptions
- **Doctors:** `/api/doctors`, `/api/doctors/me`, `/api/doctors/me/availability` (profile uses **`PUT /api/doctors/me`**, not `/me/profile`)
- **Appointments:** create, list mine, patch status & payment-status
- **Telemedicine:** `/api/telemedicine/sessions`
- **Payments:** checkout, status, by appointment
- **Notifications:** me, all (admin), email/sms log stubs
- **AI:** `/api/ai/symptom-checker`
- **Admin (gateway):** `/api/admin/users`, `/api/admin/doctors/pending`, `/api/admin/doctors/:userId/verify`

## Doctor approval flow

1. Doctor registers → doctor profile in doctor-service is **PENDING**; auth `doctorApproval` must be set **ACTIVE** by admin for future **logins** to succeed.
2. Admin opens **Approve doctors**, clicks **Approve** → gateway updates doctor-service status and auth approval.
3. Doctor can sign in and appear in public doctor listings (**ACTIVE** only).

## End-to-end checklist (demo)

1. Register patient → patient dashboard → find doctors → book appointment.
2. Register doctor → admin approves → doctor accepts/completes appointment → optional prescription.
3. Patient: reports, prescriptions, pay flow, AI symptom checker, telemedicine session link.
4. Admin: users list, pending doctors, notification test logs.

## Kubernetes

1. Build images locally and load into your cluster (e.g. `minikube image load ...` or Docker Desktop K8s).
2. Apply manifests:

```bash
kubectl apply -f k8s-microservices/all-in-one.yaml
```

3. Gateway is exposed as **LoadBalancer** on port **8080** (or use port-forward):

```bash
kubectl port-forward -n hospital-ms svc/api-gateway 8080:8080
```

4. **Ingress (Minikube + nginx ingress controller):**

```bash
minikube addons enable ingress
kubectl apply -f k8s-microservices/ingress.yaml
```

Add to hosts: `<minikube-ip> hospital-api.local` — traffic to `http://hospital-api.local` routes to the gateway.

Architecture overview: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Notes

- Each microservice uses its own MongoDB database (Compose) or shared `mongo` service in the sample K8s manifest—adjust URIs for production.
- Appointment and notification services consume/produce RabbitMQ topics (`appointment.booked`, `appointment.completed`).
- On Windows, if Docker BuildKit fails on OneDrive paths, copy the project to a short local path (e.g. `C:\dev\DS_ASS1`) before `docker compose build`.
