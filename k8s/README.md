# Kubernetes deployment steps

## 1) Build image

```bash
docker build -t healthcare-backend:latest ./backend
```

## 2) Create namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

## 3) Create secret

Copy `k8s/backend/secret.example.yaml` to `k8s/backend/secret.yaml`, set real values, then:

```bash
kubectl apply -f k8s/backend/secret.yaml
```

## 4) Deploy backend

```bash
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml
```

## 5) Check status

```bash
kubectl get pods -n hospital-system
kubectl get svc -n hospital-system
```

## 6) Local access via port-forward

```bash
kubectl port-forward svc/backend-service 5000:5000 -n hospital-system
```

Then test:

`http://localhost:5000/health`
