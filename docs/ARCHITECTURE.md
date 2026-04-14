# Architecture overview

## High-level diagram

```mermaid
flowchart LR
  subgraph client [Client]
    React[React SPA]
  end
  subgraph edge [Edge]
    GW[API Gateway :8080]
  end
  subgraph services [Microservices]
    AUTH[auth-service]
    PAT[patient-service]
    DOC[doctor-service]
    APT[appointment-service]
    TEL[telemedicine-service]
    PAY[payment-service]
    NOT[notification-service]
    AI[ai-service]
  end
  subgraph data [Data and messaging]
    M1[(Mongo per service)]
    RMQ[RabbitMQ]
  end
  React -->|HTTPS /api/* JWT| GW
  GW --> AUTH
  GW --> PAT
  GW --> DOC
  GW --> APT
  GW --> TEL
  GW --> PAY
  GW --> NOT
  GW --> AI
  AUTH --> M1
  PAT --> M1
  DOC --> M1
  APT --> M1
  APT --> RMQ
  NOT --> RMQ
```

## Service interface list (summary)

| Service | Port (compose) | Responsibility |
|---------|----------------|----------------|
| api-gateway | 8080 | Routing, JWT verification, admin orchestration |
| auth-service | 4001 | Users, JWT issuance, doctor approval field |
| patient-service | 4002 | Patient profile, reports, prescriptions store |
| doctor-service | 4003 | Doctor profile, availability, verification status |
| appointment-service | 4004 | Booking, status, RabbitMQ events |
| telemedicine-service | 4005 | Jitsi / session URLs |
| payment-service | 4006 | Checkout records, status |
| notification-service | 4007 | Logs, email/SMS stubs, RabbitMQ consumer |
| ai-service | 4008 | Symptom checker |

See [GATEWAY_API.md](./GATEWAY_API.md) for HTTP paths the React app uses.
