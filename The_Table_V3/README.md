# The_Table_V3

---

## Project Status: Archived
This repository is no longer under active development.

### Reason for Termination
The project was originally conceived as a full-featured, commercial-grade restaurant management system with multiple real-time dashboards for kitchen, front-of-house, inventory, and billing. After several months of solo development, it became evident that building and maintaining a production-ready, multi-user application of this scope exceeds the capacity of a single developer. A mid-flight pivot to an automated restaurant simulator was attempted, but the shift in core architecture introduced conceptual conflicts that could not be resolved without a complete rewrite. Rather than prolong an unsustainable effort, the project has been formally terminated to free resources for new, better-scoped ideas.

### What’s Here
- Early backend prototypes (order routing, menu engine)
- Partial admin & POS dashboard wireframes
- Database schema for multi-outlet setups
- Simulation stubs (order generation, load testing)

Feel free to fork or salvage any component. No further updates or support will be provided.
Thank you for your interest.

---

Zero-Internet Restaurant OS
Runs 100 % on your private Wi-Fi. 50 tables · 15 waiters · 14 chef stations · Full GitOps + Observability.

Floor → Head → Deputy → 14 Sub-Chefs → Head QC → Waiters → Table
   ↓          ↓          ↓          ↓          ↓          ↓
Real-time  WebSocket  Timers  Sound  mTLS  Grafana  ArgoCD

---

## 1-Click Local Demo
git clone https://git.sr.ht/~ladybug/the-table-v3
cd The_Table_V3
docker compose up -d          # 30 seconds

Open any tablet → http://YOUR_PC_IP:8000

---

## Production (Restaurant LAN)

### 1. Docker (5 sec)
docker compose up -d --build

### 2. Kubernetes + GitOps (3 min)
minikube start --cpus=4 --memory=8g
minikube image load the-table-v3:latest
kubectl apply -f k8s/
minikube service the-table-service -n thetable

### 3. Full Stack (Helm)
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add prometheus https://prometheus-community.github.io/helm-charts
helm install monitoring ./helm/monitoring

---

## Features
| Role           | URL                     | Key Feature                     |
|----------------|-------------------------|---------------------------------|
| Floor Manager  | `/`                     | Double-click → Pax → Red/Green |
| Head Chef      | `/head_chef`            | To Kitchen · QC · Refire       |
| Deputy Chef    | `/deputy_chef`          | Auto sub-tasks                 |
| 14 Sub-Chefs   | `/sub_chef`             | Station buttons · Timers · Ding|
| Waiters        | `/waiter`               | 15 waiters · 2-3 tables each   |
| Grafana        | `localhost:3000`        | Orders/sec · CPU · Loki logs   |
| ArgoCD         | `localhost:8080`        | Sourcehut → Live deploy        |

---

## Data (Persisted)
./data/
├── orders.json
├── tables.json
├── menu.json
├── assignments.json
└── users.json
Mounted into every container → survives restarts.

---

## DevOps Stack (Local)
Git (Sourcehut) → ArgoCD → Minikube → Istio mTLS
          ↓          ↓          ↓
    Prometheus  Grafana  Loki  SRE alerts

---

## SRE Guarantees
- SLO: 99 % orders < 5 s  
- Error Budget: 1 % downtime/month  
- Auto-restart: `scripts/sre-check.sh` (cron)  
- Chaos-proof: `kubectl delete pod` → instant replace

---

## Folder Layout
.
├── server.py
├── Dockerfile
├── docker-compose.yml
├── k8s/
│   ├── namespace.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── helm/monitoring/
├── scripts/
│   ├── deploy.sh
│   └── sre-check.sh
├── data/           ← YOUR LIVE DATA
└── frontend/
    ├── index.html
    ├── head_chef.html
    ├── deputy_chef.html
    ├── sub_chef.html
    └── waiter.html

---

## One-Command Full Reset
./scripts/reset.sh   # wipes pods, keeps data

---

## Backup (Daily)
docker exec thetable tar czf /backups/$(date +%F).tgz /app/data

---

## Zero Internet
- No Docker Hub pull  
- No external domain  
- No cloud  
- Works on airplane mode

---

## Push to Sourcehut
git add .
git commit -m "v3.0 – production ready"
git push srht central

ArgoCD syncs in 8 seconds → new menu live.

---

## You Are Ready
1. Plug PC into restaurant Wi-Fi  
2. Run `docker compose up -d`  
3. Hand tablets to staff  

Dinner service starts.

---

Built with ❤️ for restaurants that never sleep.
