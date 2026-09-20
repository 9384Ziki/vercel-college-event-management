# Cloud-Based College Event Management System

A Debian-ready demonstration project using:
- Frontend: Nginx + HTML/CSS/JavaScript
- Backend: Node.js + Express
- Database: MySQL 8.4
- Authentication: JWT
- Containerization: Docker + Docker Compose
- Orchestration: Kubernetes + Minikube

## 1. Install on fresh Debian

Run:

```bash
cd college-event-management-final
chmod +x scripts/*.sh
./scripts/install-debian.sh
```

Then **log out and log back in once** so Docker group membership takes effect.

### Install kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm kubectl
kubectl version --client
```

If your Debian computer uses ARM64, replace `amd64` with `arm64`.

### Install Minikube

AMD64:

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64
minikube version
```

ARM64:

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-arm64
sudo install minikube-linux-arm64 /usr/local/bin/minikube
rm minikube-linux-arm64
minikube version
```

## 2. Run with Docker Compose

```bash
cp .env.example .env
```

For a real deployment, edit `.env` and change all passwords and `JWT_SECRET`.

Then:

```bash
./scripts/run-docker.sh
```

Open:

- Frontend: http://localhost:8080
- Backend health: http://localhost:5000/api/health

Demo administrator created automatically by the backend:

- Email: `admin@college.local`
- Password: `Admin@123`

Change this demo credential before any real deployment.

Useful commands:

```bash
docker compose ps
docker compose logs -f
docker compose logs backend
docker compose down
docker compose down -v   # also deletes database data
```

## 3. Run on Kubernetes / Minikube

```bash
./scripts/deploy-minikube.sh
```

Check status:

```bash
kubectl -n college-events get pods
kubectl -n college-events get services
kubectl -n college-events get deployments
```

Scale backend:

```bash
kubectl -n college-events scale deployment backend --replicas=3
```

Get frontend URL:

```bash
minikube service frontend -n college-events --url
```

Stop cluster:

```bash
minikube stop
```

Delete cluster:

```bash
minikube delete
```

## 4. Verify versions

```bash
git --version
docker --version
docker compose version
kubectl version --client
minikube version
```

## 5. Optional tools

- VS Code or another editor
- Postman for API testing
- GitHub account for source control
- Cloud account (AWS/Azure/GCP) only if your college requires public cloud deployment

## Important security note

The included credentials are development/demo values. Change `.env` passwords, Kubernetes secret values, the JWT secret, and the demo admin password before exposing the system publicly.
