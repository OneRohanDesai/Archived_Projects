# 🎵 AESTHETE — Retro Music Explorer  
**Serverless Spotify Music Discovery Platform on AWS**

Aesthete is a fully serverless web application that surfaces curated and randomized retro-music recommendations from Spotify. It is built as a real-world demonstration of modern DevOps practices using AWS managed services—automation, CI/CD, observability, least-privilege security, external API integration, and cost-efficient cloud design.

> 📹 A walkthrough video is included in this repository: `walkthrough.mp4`

---

## ✅ Key Features
- Fetches randomized tracks from curated Spotify playlists  
- Dynamically loads album art, artist names, and release metadata  
- Clicking album art opens the track directly in Spotify  
- Globally delivered static frontend via Amazon CloudFront  
- Entirely serverless — **no servers to manage or patch**  
- End-to-end deployment automation from **SourceHut → AWS**

---

## ✅ AWS Services Used
- **Amazon S3** — Frontend hosting + curated JSON storage  
- **Amazon CloudFront** — Global CDN for low-latency delivery  
- **AWS Lambda** — Node.js backend integrating with Spotify APIs  
- **Amazon API Gateway** — REST endpoints consumed by the frontend  
- **AWS Secrets Manager** — Secure storage for Spotify OAuth secrets  
- **AWS CodePipeline** — CI/CD orchestration  
- **AWS CodeBuild** — Builds and packages frontend + backend  
- **Amazon CloudWatch** — Logs, metrics, alarms  
- **Amazon SNS** — Pipeline / Lambda failure notifications  
- **AWS IAM** — Least-privilege role-based access  
- **AWS X-Ray** — System traceability and debugging  

---

## ✅ Architecture Overview
Aesthete follows a lightweight, cost-optimized serverless architecture:

1. **Frontend**  
   - Hosted on **S3**, globally cached by **CloudFront**  
2. **Backend**  
   - Browser → **API Gateway** → **Lambda**  
   - Lambda securely fetches randomized tracks from Spotify using Secrets Manager  
3. **Deployment Pipeline**  
   - SourceHut push → Webhook → CodePipeline → CodeBuild → Automated deployment  
4. **Observability**  
   - CloudWatch logs/metrics, X-Ray traces, SNS alerts

This model maximizes automation and minimizes operational overhead while showcasing a production-style DevOps workflow.

---

## ✅ CI/CD & Automation Workflow
The delivery pipeline is fully automated from the moment code is pushed to SourceHut:

1. Developer pushes to **SourceHut**  
2. SourceHut **Webhook → API Gateway endpoint**  
3. Webhook Lambda receives event, uploads source artifacts to S3  
4. **CodePipeline** triggers automatically  
5. **CodeBuild** executes `buildspec.yml` to:  
   - Package Lambda backend  
   - Bundle frontend (HTML/CSS/JS)  
6. CodePipeline deploys:  
   - Backend → Lambda function update  
   - Frontend → S3 sync  
7. **CloudFront cache invalidated** for instant global refresh  
8. Failures generate **SNS email alerts**  

This workflow demonstrates a realistic, cloud-native CI/CD strategy using AWS-only services.

---

## ✅ Monitoring, Traceability & Security
Aesthete includes end-to-end observability and secure operational design:

- **CloudWatch Logs:** Lambda, CodeBuild, API Gateway  
- **CloudWatch Metrics:** Invocation counts, throttles, duration  
- **Alarms:** Pipeline failures, Lambda errors → SNS  
- **X-Ray Tracing:** Spotify API calls + gateway paths  
- **Secrets Manager:** Encrypted Spotify OAuth credentials  
- **IAM:** Strict least-privilege role access  
- **S3 Versioning:** Artifact safety & rollback capability  

---

## ✅ Cost Optimization Practices
- 100% serverless architecture — no EC2 or persistent compute  
- Pay-per-use Lambda + minimal S3/CloudFront storage  
- Short log retention (7 days)  
- Smallest CodeBuild compute type  
- Designed for short-term demonstration deployments (1–2 days)

---

## ✅ Deployment Steps (Implemented in AWS)
### 1. Frontend Hosting
- Create S3 bucket → static website hosting  
- Configure CloudFront distribution pointing to S3  

### 2. Backend Services
- Create Node.js Lambda function  
  - Permissions: S3, Secrets Manager, CloudWatch  
- Add Spotify secrets in Secrets Manager  
- Create API Gateway REST API  
  - Endpoints: `/song`, `/track`  
  - Lambda proxy integrations  

### 3. CI/CD Pipeline
- Create S3 bucket for SourceHut webhook artifacts  
- Create Webhook Lambda + API Gateway endpoint  
- Create CodeBuild project (uses `buildspec.yml`)  
- Create CodePipeline:  
  - **Source:** S3 artifact upload  
  - **Build:** CodeBuild  
  - **Deploy Backend:** Lambda update  
  - **Deploy Frontend:** S3 sync + CloudFront invalidation  

### 4. Monitoring & Alerts
- Configure CloudWatch alarms for Lambda & Pipeline  
- SNS topic for email notifications  

> All services are isolated in **ap-south-1** for optimal latency and minimal cost.

---

## ✅ Validation Checklist (Used for Demo Evidence)
- Frontend loads via **CloudFront HTTPS**  
- Clicking album art opens correct Spotify track  
- Random track fetch works for selected playlists  
- Pipeline auto-runs after SourceHut push  
- Webhook Lambda shows successful log entries  
- SNS alert received on simulated failure  
- X-Ray traces visible for API invocations  

---

## ✅ Repository Organization
This repository includes:

- Frontend source (HTML/CSS/JS)  
- Lambda backend (Node.js)  
- CI/CD configuration (`buildspec.yml`)  
- Curated JSON files for playlists  
- Architecture diagrams  
- Documentation (including this README)  

Everything required to review and validate the complete cloud implementation is packaged within this repo.

---

## 📬 Contact
**Author:** Rohan Desai (Ladybug)  
**Email:** pro.rohandesai@gmail.com  

**SourceHut Repository:** https://sr.ht/~ladybug/Aesthete/  
**Year:** 2025

---
