#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
minikube status >/dev/null 2>&1 || minikube start --driver=docker

eval "$(minikube docker-env)"
docker build -t college-event-backend:latest ./backend
docker build -t college-event-frontend:latest ./frontend

kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/config.yaml
kubectl apply -f kubernetes/mysql.yaml
kubectl apply -f kubernetes/backend.yaml
kubectl apply -f kubernetes/frontend.yaml

kubectl -n college-events rollout status deployment/mysql --timeout=180s
kubectl -n college-events rollout status deployment/backend --timeout=180s
kubectl -n college-events rollout status deployment/frontend --timeout=180s

echo
kubectl -n college-events get pods,svc
echo
minikube service frontend -n college-events --url
