Deployment Steps

1. Prerequisites
- Install Docker Desktop.
- Install Kubernetes support (Docker Desktop Kubernetes or Minikube).
- Install Node.js (LTS) and npm.

2. Clone Repository
- git clone https://github.com/SKSaranya-git/CareConnect.git
- cd CareConnect

3. Configure Environment
- Create/update environment files where required.
- Do not commit any secrets in .env files.

4. Start Microservices with Docker Compose
- docker compose -f docker-compose.microservices.yml up --build

5. Deploy Kubernetes Resources (if needed)
- kubectl apply -f k8s/
- kubectl apply -f k8s-microservices/

6. Run Client
- cd client
- npm install
- npm run dev

7. Access the Application
- Open the client URL shown in terminal.
- Verify gateway and service endpoints are reachable.
