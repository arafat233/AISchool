# AISchool ERP — Deployment Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| kubectl | >= 1.28 | https://kubernetes.io/docs/tasks/tools/ |
| helm | >= 3.14 | https://helm.sh/docs/intro/install/ |
| docker | >= 24 | https://docs.docker.com/get-docker/ |
| pnpm | >= 9 | `npm install -g pnpm` |
| Node.js | >= 20 | https://nodejs.org/ |
| Python | 3.12 | https://www.python.org/ |

## Local Development

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and JWT secrets at minimum
# Generate secrets:
openssl rand -base64 64  # for JWT_ACCESS_SECRET
openssl rand -base64 64  # for JWT_REFRESH_SECRET
openssl rand -hex 32     # for PII_ENCRYPTION_KEY
openssl rand -hex 32     # for WEBHOOK_ENCRYPTION_KEY
```

### 3. Start infrastructure
```bash
docker compose up -d postgres redis mosquitto influxdb
```

### 4. Run migrations and seed
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Start all services
```bash
pnpm dev
```

## Production Deployment (Kubernetes)

### 1. Create namespace
```bash
kubectl create namespace school-erp
```

### 2. Create secrets
```bash
kubectl create secret generic school-erp-secrets \
  --namespace school-erp \
  --from-literal=POSTGRES_PASSWORD=<strong-password> \
  --from-literal=POSTGRES_USER=school_erp \
  --from-literal=JWT_ACCESS_SECRET=$(openssl rand -base64 64) \
  --from-literal=JWT_REFRESH_SECRET=$(openssl rand -base64 64) \
  --from-literal=PII_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  --from-literal=WEBHOOK_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  --from-literal=REDIS_PASSWORD=<strong-password> \
  --from-literal=AWS_ACCESS_KEY_ID=<your-key> \
  --from-literal=AWS_SECRET_ACCESS_KEY=<your-secret>
```

### 3. Deploy with Helm
```bash
helm upgrade --install school-erp ./infrastructure/k8s/helm/school-erp \
  --namespace school-erp \
  --values infrastructure/k8s/helm/school-erp/values.yaml \
  --set global.imageTag=<commit-sha> \
  --wait --timeout 10m
```

### 4. Apply additional manifests
```bash
kubectl apply -f infrastructure/k8s/network-policy.yaml
kubectl apply -f infrastructure/k8s/rbac.yaml
kubectl apply -f infrastructure/k8s/ingress.yaml
kubectl apply -f infrastructure/k8s/cert-manager.yaml
```

### 5. Verify deployment
```bash
kubectl get pods -n school-erp
kubectl rollout status deployment/api-gateway -n school-erp
kubectl rollout status deployment/auth-service -n school-erp
```

## Database Backup & Restore

### Backup
```bash
chmod +x infrastructure/postgres/backup.sh
POSTGRES_HOST=localhost POSTGRES_PASSWORD=<password> ./infrastructure/postgres/backup.sh
```

### Restore
```bash
chmod +x infrastructure/postgres/restore.sh
POSTGRES_HOST=localhost POSTGRES_PASSWORD=<password> ./infrastructure/postgres/restore.sh <backup_file.sql.gz>
```

## MQTT Setup (Production)

```bash
# Generate credentials for each service
docker exec erp_mqtt mosquitto_passwd -c /mosquitto/config/passwd transport-service
docker exec erp_mqtt mosquitto_passwd /mosquitto/config/passwd biometric-bridge
docker exec erp_mqtt mosquitto_passwd /mosquitto/config/passwd attendance-service

# Restart mosquitto to apply
docker compose restart mosquitto
```

## Rollback

### Via GitHub Actions
Go to Actions -> Rollback Deployment -> Run workflow -> Enter revision number

### Manual
```bash
helm history school-erp -n school-erp
helm rollback school-erp <revision> -n school-erp --wait
```

## Monitoring

- Grafana: https://grafana.schoolerp.app
- Kibana: https://kibana.schoolerp.app
- Prometheus: http://prometheus.school-erp.svc:9090 (internal)
- Jaeger: https://jaeger.schoolerp.app

## Test Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@schoolerp.local | Admin@123! |
| School Admin | schooladmin@demo.local | Admin@123! |
| Teacher | teacher@demo.local | Admin@123! |
| Student | student@demo.local | Admin@123! |
| Parent | parent@demo.local | Admin@123! |
