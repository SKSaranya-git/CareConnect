# API Gateway — exposed routes

Base URL (local Docker Compose): `http://localhost:8081` (host port; gateway listens on 8080 inside Docker)  
All routes below are prefixed from this base. Protected routes require header: `Authorization: Bearer <JWT>`.

## Auth (no JWT on register/login)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Body: `fullName`, `email`, `password`, `role` (`PATIENT` \| `DOCTOR`) |
| POST | `/api/auth/login` | Body: `email`, `password` |
| GET | `/api/auth/me` | Current user (JWT) |

## Patients (JWT)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/patients/me` | Patient | Profile |
| PUT | `/api/patients/me` | Patient | Update profile |
| GET | `/api/patients/me/reports` | Patient | List reports |
| POST | `/api/patients/me/reports` | Patient | Upload report metadata |
| GET | `/api/patients/me/prescriptions` | Patient | List prescriptions |
| GET | `/api/patients/:patientUserId/reports` | Doctor, Admin | Patient reports by user id |
| POST | `/api/patients/:patientUserId/prescriptions` | Doctor, Admin | Add prescription |

## Doctors (JWT)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/doctors` | Any authenticated | List **ACTIVE** doctors (optional `?specialty=`) |
| GET | `/api/doctors/me` | Doctor | Own profile |
| PUT | `/api/doctors/me` | Doctor | Create/update profile (`fullName`, `specialty`, `licenseNumber`, `experienceYears`, `consultationFee`) |
| PUT | `/api/doctors/me/availability` | Doctor | Body: `{ availability: [{ day, startTime, endTime, isAvailable }] }` |

> **Contract note:** Doctor profile is always **`/api/doctors/me`** (PUT), not `/me/profile`.

## Appointments (JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/appointments` | Book (`doctorId`, `appointmentDateTime`, …) |
| GET | `/api/appointments/me` | List for current patient or doctor |
| PATCH | `/api/appointments/:id/status` | Doctor/patient workflow (`ACCEPTED`, `REJECTED`, `COMPLETED`, …) |
| PATCH | `/api/appointments/:id/payment-status` | Update payment flag on appointment |

## Telemedicine (JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/telemedicine/sessions` | Create session for appointment |
| GET | `/api/telemedicine/sessions/:appointmentId` | Get session |
| PATCH | `/api/telemedicine/sessions/:appointmentId/end` | End session |

## Payments (JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/checkout` | Create payment intent |
| PATCH | `/api/payments/:paymentId/status` | Mark paid / failed |
| GET | `/api/payments/appointment/:appointmentId` | Payment by appointment |

## Notifications (JWT)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/notifications/me` | Any | Own notification logs |
| GET | `/api/notifications/all` | Admin | Recent logs |
| POST | `/api/notifications/email` | Any | Demo log entry |
| POST | `/api/notifications/sms` | Any | Demo log entry |

## AI (JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/symptom-checker` | Symptom triage payload (see ai-service) |

## Admin (JWT, role `ADMIN` — implemented in gateway)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users (proxied to auth-service) |
| GET | `/api/admin/doctors/pending` | Pending doctor profiles |
| PATCH | `/api/admin/doctors/:userId/verify` | Body: `{ isVerified: boolean }` — syncs doctor status + auth approval |

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Gateway liveness |
