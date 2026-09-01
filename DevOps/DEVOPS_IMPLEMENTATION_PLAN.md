# Notes App — DevOps Implementation Plan

## 1. Document Purpose

This document is the master implementation roadmap for transforming the Notes App into a production-style DevOps project.

The implementation must be performed incrementally and in dependency order.

Do not implement all DevOps technologies at once.

Each phase must:

1. Have a clear objective.
2. Identify prerequisites.
3. Implement only the required components.
4. Test the implementation.
5. Verify that the expected result works.
6. Document important decisions.
7. Update the implementation progress.
8. Only then proceed to the next phase.

The project should evolve from:

```text
Application
    ↓
Containerization
    ↓
Local Orchestration
    ↓
Kubernetes
    ↓
Quality & Security
    ↓
Continuous Integration
    ↓
AWS Infrastructure
    ↓
Amazon ECR
    ↓
Amazon EKS
    ↓
GitOps
    ↓
Argo CD
    ↓
Continuous Delivery
    ↓
Ingress / Load Balancer
    ↓
Observability
    ↓
Monitoring
    ↓
Alerting
    ↓
Production Validation
```

## 2. Final Target Architecture

The final platform should follow this architecture:

```text
                         DEVELOPER
                             |
                             v
                        GitHub Repo
                             |
                             v
                    GitHub Actions (CI)
                             |
             +---------------+---------------+
             |               |               |
             v               v               v
          Testing         Security       SonarQube
             |               |               |
             +---------------+---------------+
                             |
                             v
                      Application Build
                             |
                             v
                       Docker Build
                             |
                             v
                    Container Image Scan
                             |
                             v
                           ECR
                             |
                             v
                    GitOps Repository
                             |
                             v
                         Argo CD
                             |
                             v
                           EKS
                             |
                             v
                       Kubernetes
                             |
                  +----------+----------+
                  |                     |
                  v                     v
              Services              Ingress
                                        |
                                        v
                                      ALB
                                        |
                                        v
                                   Internet
                                        |
                                        v
                                  Notes App


                         OBSERVABILITY

                             EKS
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         Prometheus        Grafana        CloudWatch
              |
              v
         Alertmanager
              |
              v
         Notifications
```

## 3. Core Implementation Principles

The following rules must be followed throughout the project.

### 3.1 Dependency-First Implementation

Never implement a component before its dependencies are ready.

For example:

```text
Docker
  ↓
Docker Image
  ↓
Kubernetes
```

Do not create a Kubernetes deployment before the application can successfully run inside a Docker container.

Similarly:

```text
Docker
  ↓
Docker Image
  ↓
ECR
  ↓
EKS
```

Do not configure the final EKS deployment before the container image is known to work.

### 3.2 Local Before Cloud

Whenever practical:

```text
Local
  ↓
Docker
  ↓
Local Kubernetes
  ↓
Verify
  ↓
AWS
```

The objective is to avoid using AWS to debug basic application/container/Kubernetes problems.

### 3.3 Manual Before Automation

Before automating a process, verify that the process works manually.

Example:

```text
Manual Docker Build
       ↓
Verify
       ↓
GitHub Actions Docker Build
```

And:

```text
Manual Kubernetes Deployment
       ↓
Verify
       ↓
Argo CD Deployment
```

Automation should automate a known-good process, not hide an unknown broken process.

### 3.4 One Major Change at a Time

Do not simultaneously introduce:

- Docker
- Kubernetes
- AWS
- Argo CD
- Monitoring
- CI/CD

Instead:

```text
One Phase
   ↓
Implement
   ↓
Test
   ↓
Verify
   ↓
Commit
   ↓
Next Phase
```

## 4. Phase 0 — Application Baseline

### Objective

Verify that the existing Notes App is healthy before introducing DevOps infrastructure.

The DevOps work must start from a known-good application state.

### Tasks

#### 0.1 Inspect the Existing Project

Understand:

- Frontend architecture
- Backend architecture
- Database integration
- Authentication
- Environment variables
- API communication
- Build commands
- Test commands
- Existing configuration
- Existing deployment assumptions

Do not modify application behavior unnecessarily.

#### 0.2 Run the Application Locally

Verify:

```text
Frontend
   ↓
Backend
   ↓
MongoDB
```

Confirm that the core Notes App functionality works.

#### 0.3 Verify Application Build

Run the existing production build commands.

Confirm:

- Frontend builds successfully.
- Backend builds/runs successfully.
- No critical build errors exist.

#### 0.4 Verify Existing Tests

Run all available tests.

Record:

- Test command
- Number of tests
- Passing tests
- Failing tests
- Missing test coverage

Do not move forward while existing critical tests are failing without understanding why.

### Exit Criteria

Phase 0 is complete when:

- [ ] Application runs locally.
- [ ] Frontend works.
- [ ] Backend works.
- [ ] Database connection works.
- [ ] Production build works.
- [ ] Existing tests pass.
- [ ] Required environment variables are documented.
- [ ] Current application state is committed to Git.

## 5. Phase 1 — Repository and DevOps Structure

### Objective

Create a clean repository structure for the DevOps lifecycle.

Recommended structure:

```text
notes-app/
│
├── app/
│   ├── frontend/
│   └── backend/
│
├── docker/
│   ├── frontend/
│   │   └── Dockerfile
│   └── backend/
│       └── Dockerfile
│
├── k8s/
│   ├── base/
│   └── overlays/
│       ├── dev/
│       └── prod/
│
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   └── alertmanager/
│
├── security/
│
├── docs/
│   ├── CI.md
│   ├── CD.md
│   └── DEVOPS_IMPLEMENTATION_PLAN.md
│
├── .github/
│   └── workflows/
│
├── .gitignore
├── .dockerignore
└── README.md
```

The structure may evolve during implementation.

Do not create unnecessary files just for the sake of having a large DevOps directory tree.

### Exit Criteria

- [ ] Repository structure is clean.
- [ ] Application remains functional.
- [ ] DevOps documentation exists.
- [ ] Git status is clean.
- [ ] Structure is committed.

## 6. Phase 2 — Containerization with Docker

### Objective

Package the Notes App into production-oriented Docker containers.

This phase must happen before CI because the CI pipeline will eventually build these Docker images.

### Tasks

#### 2.1 Create Frontend Dockerfile

Create: `docker/frontend/Dockerfile`

Requirements:

- Production-oriented base image.
- Multi-stage build where appropriate.
- Minimal runtime image.
- No unnecessary development dependencies.
- No secrets.
- Correct application port.
- Appropriate non-root configuration where practical.

#### 2.2 Create Backend Dockerfile

Create: `docker/backend/Dockerfile`

Requirements:

- Production-oriented base image.
- Install only required production dependencies.
- Correct runtime configuration.
- No secrets.
- Health endpoint where applicable.
- Non-root execution where practical.

#### 2.3 Create .dockerignore

Exclude:

- `node_modules`
- `.git`
- `.env`
- `logs`
- `coverage`
- temporary files
- local development files

Do not allow secrets or unnecessary files into Docker build contexts.

#### 2.4 Build Images Locally

Build:

- `notes-frontend`
- `notes-backend`

Verify that both images build successfully.

#### 2.5 Run Containers Locally

Run the application using the built images.

Verify:

```text
Frontend Container
       ↓
Backend Container
       ↓
MongoDB
```

### Exit Criteria

- [ ] Frontend Dockerfile works.
- [ ] Backend Dockerfile works.
- [ ] Images build successfully.
- [ ] Containers start successfully.
- [ ] Application works using containers.
- [ ] No secrets are included in images.
- [ ] `.dockerignore` is configured.
- [ ] Docker images are reasonably optimized.

## 7. Phase 3 — Docker Compose

### Objective

Create a reproducible local environment for the containerized application.

### Tasks

Create: `docker-compose.yml`

Define required services.

Example:

- `frontend`
- `backend`
- `mongodb`

Configure:

- Networking
- Environment variables
- Volumes
- Ports
- Health checks
- Service dependencies

### Test

Run: `docker compose up`

Verify that the complete application starts.

Then test:

```bash
docker compose down
docker compose up
```

The application should remain reproducible.

### Exit Criteria

- [ ] All required services are defined.
- [ ] Containers communicate correctly.
- [ ] MongoDB persistence works where required.
- [ ] Application is accessible.
- [ ] Environment configuration works.
- [ ] Compose startup is reproducible.

## 8. Phase 4 — Kubernetes Foundation

### Objective

Deploy the containerized Notes App to Kubernetes locally before moving to AWS.

### Tasks

Create Kubernetes manifests.

Recommended resources:

- Namespace
- Deployment
- Service
- ConfigMap
- Secret strategy
- Ingress

Recommended structure:

```text
k8s/
├── base/
│   ├── namespace.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── configmap.yaml
│   ├── ingress.yaml
│   └── kustomization.yaml
│
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    │
    └── prod/
        └── kustomization.yaml
```

## 9. Phase 5 — Kubernetes Application Deployment

### Objective

Run the Notes App successfully on a local Kubernetes cluster.

### Tasks

Deploy:

```text
Namespace
   ↓
Backend
   ↓
Frontend
   ↓
Services
   ↓
Configuration
```

Verify:

- `kubectl get pods`
- `kubectl get services`
- `kubectl get deployments`

### Health Configuration

Add:

- **Readiness Probe**: Determines whether a Pod should receive traffic.
- **Liveness Probe**: Determines whether a container should be restarted.

### Resource Configuration

Define reasonable:

- CPU requests
- CPU limits
- Memory requests
- Memory limits

Do not leave production-oriented workloads completely unbounded.

### Exit Criteria

- [ ] Pods are Running.
- [ ] Deployments are Available.
- [ ] Services work.
- [ ] Frontend communicates with backend.
- [ ] Backend communicates with MongoDB.
- [ ] Readiness probes work.
- [ ] Liveness probes work.
- [ ] Resource requests/limits are defined.
- [ ] Application is accessible.

## 10. Phase 6 — Kubernetes Failure Testing

### Objective

Understand how Kubernetes behaves when things go wrong.

This phase is mandatory before introducing GitOps.

### Test Cases

- **Pod Restart**: Delete a Pod and verify Kubernetes recreates it.
- **Container Failure**: Cause a controlled failure and verify Kubernetes attempts recovery.
- **Readiness Failure**: Make the application temporarily fail readiness and verify it stops receiving traffic.
- **Scaling**: Change replica count and verify multiple Pods run.
- **Rolling Update**: Deploy a new application version and verify Kubernetes performs a rolling update.
- **Rollback**: Deploy a known-bad version and verify rollback behavior.

### Exit Criteria

- [ ] Pod recovery works.
- [ ] Health probes work.
- [ ] Scaling works.
- [ ] Rolling updates work.
- [ ] Rollback is understood and tested.

## 11. Phase 7 — Code Quality and Security Foundations

### Objective

Prepare all quality and security tools before putting them into GitHub Actions.

### Tools

#### SonarQube

Responsible for:

- Code Quality
- Static Analysis
- Code Smells
- Bugs
- Maintainability
- Security Findings

#### OWASP Dependency-Check

Responsible for:

- Third-party dependency vulnerabilities

#### Container Security Scanner

Responsible for:

- Docker image vulnerabilities
- OS packages
- Container libraries

### Important Separation

Do not treat all security scanning as the same thing.

```text
Source Code
    ↓
SonarQube

Dependencies
    ↓
OWASP Dependency-Check

Docker Image
    ↓
Container Scanner
```

### Exit Criteria

- [ ] SonarQube works.
- [ ] Dependency scanning works.
- [ ] Container scanning tool is selected.
- [ ] Security severity policy is defined.
- [ ] False-positive/suppression strategy is understood.

## 12. Phase 8 — CI Preparation

### Objective

Before creating the GitHub Actions pipeline, prove that every pipeline step works locally or independently.

The CI pipeline should automate existing working processes.

### Verify

```text
Application Tests
        ↓
Application Build
        ↓
Docker Build
        ↓
Security Checks
        ↓
Docker Image Scan
```

Do not create a huge workflow file before validating these commands individually.

### Exit Criteria

- [ ] Test commands are known.
- [ ] Build commands are known.
- [ ] Docker build commands are known.
- [ ] Security commands are known.
- [ ] Docker image scanning works.
- [ ] Required CI environment variables are identified.

## 13. Phase 9 — GitHub Actions CI

### Objective

Automate the complete Continuous Integration process.

Create: `.github/workflows/ci.yml`

### CI Pipeline

```text
GitHub Push / Pull Request
          ↓
Checkout
          ↓
Environment Setup
          ↓
Install Dependencies
          ↓
OWASP Dependency Check
          ↓
Automated Tests
          ↓
SonarQube
          ↓
Application Build
          ↓
Docker Build
          ↓
Container Image Scan
          ↓
AWS Authentication
          ↓
ECR Login
          ↓
Image Tagging
          ↓
Push to ECR
```

### CI Rules

CI must:

- Fail when mandatory tests fail.
- Fail when required security gates fail.
- Fail when builds fail.
- Fail when Docker builds fail.
- Fail when container security policy fails.
- Never publish invalid artifacts.
- Never expose secrets.
- Never directly deploy to EKS.

### Exit Criteria

- [ ] Pull Requests trigger CI.
- [ ] Main branch triggers CI.
- [ ] Dependencies install.
- [ ] Security checks run.
- [ ] Tests run.
- [ ] SonarQube runs.
- [ ] Application builds.
- [ ] Docker images build.
- [ ] Images are scanned.
- [ ] ECR authentication works.
- [ ] Images are pushed to ECR.
- [ ] Image tags are traceable to Git commits.

## 14. Phase 10 — AWS Foundation

### Objective

Prepare the AWS environment required for production deployment.

### AWS Components

```text
AWS Account
   ↓
IAM
   ↓
VPC
   ↓
Subnets
   ↓
Security Groups
   ↓
ECR
   ↓
EKS
```

### IAM

Create least-privilege identities/roles.

Avoid: `AdministratorAccess` unless genuinely required for temporary infrastructure setup.

### VPC

Prepare:

- VPC
- Public subnets where required
- Private subnets where required
- Route tables
- Internet/NAT architecture as required
- Security groups

### Exit Criteria

- [ ] AWS region selected.
- [ ] IAM strategy defined.
- [ ] VPC created.
- [ ] Subnets configured.
- [ ] Networking verified.
- [ ] Security groups configured.

## 15. Phase 11 — Amazon ECR

### Objective

Create a secure container registry for application images.

Recommended repositories:

- `notes-frontend`
- `notes-backend`

### Image Strategy

Use immutable Git-based tags.

Example:

- `notes-frontend:a81f32c`
- `notes-backend:a81f32c`

Avoid relying only on: `latest`

### CI Integration

The GitHub Actions pipeline must:

```text
Build
   ↓
Scan
   ↓
Authenticate
   ↓
Tag
   ↓
Push
```

### Exit Criteria

- [ ] ECR repositories exist.
- [ ] CI can authenticate securely.
- [ ] Images can be pushed.
- [ ] Images are tagged using Git commit identity.
- [ ] ECR image visibility/access is correct.

## 16. Phase 12 — Amazon EKS

### Objective

Create the Kubernetes production environment.

### Components

```text
EKS Cluster
   ↓
Node Groups
   ↓
Networking
   ↓
IAM Integration
   ↓
Kubernetes API
```

### Tasks

- Create EKS cluster.
- Configure worker nodes/node groups.
- Configure IAM permissions.
- Configure Kubernetes access.
- Configure networking.
- Verify cluster health.

### Verification

```bash
kubectl get nodes
kubectl get namespaces
kubectl get pods -A
```

### Exit Criteria

- [ ] EKS cluster is healthy.
- [ ] Nodes are Ready.
- [ ] `kubectl` access works.
- [ ] Networking works.
- [ ] Required IAM permissions work.

## 17. Phase 13 — Deploy Notes App to EKS Manually

### Objective

Prove that the application works on AWS before introducing Argo CD.

This follows:

```text
Local Kubernetes
       ↓
AWS EKS
       ↓
Verify
       ↓
GitOps
```

### Tasks

Deploy the application manifests to EKS.

Verify:

- Pods
- Deployments
- Services
- ConfigMaps
- Secrets

Confirm that EKS can pull images from ECR.

### Exit Criteria

- [ ] Frontend runs.
- [ ] Backend runs.
- [ ] Backend connects to required services.
- [ ] Pods are healthy.
- [ ] Images pull successfully from ECR.
- [ ] Application functions on EKS.

## 18. Phase 14 — Ingress and AWS Load Balancer

### Objective

Expose the application externally through AWS infrastructure.

### Architecture

```text
Internet
   ↓
AWS Application Load Balancer
   ↓
Kubernetes Ingress
   ↓
Kubernetes Service
   ↓
Pods
```

### Tasks

Configure the required AWS Load Balancer Controller and Kubernetes Ingress.

Configure:

- Routing
- Health checks
- Security
- HTTP/HTTPS
- TLS where required

### Exit Criteria

- [ ] ALB is created.
- [ ] Ingress works.
- [ ] Application is externally accessible.
- [ ] Health checks work.
- [ ] HTTPS works where required.

## 19. Phase 15 — GitOps Repository

### Objective

Create the repository that represents the desired Kubernetes state.

Recommended: `notes-app-gitops/`

### Structure

```text
notes-app-gitops/
│
├── base/
│   ├── namespace.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── configmap.yaml
│   ├── ingress.yaml
│   └── kustomization.yaml
│
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    │
    └── prod/
        └── kustomization.yaml
```

### GitOps Principle

Git becomes the source of truth.

```text
Git
 ↓
Desired Kubernetes State
 ↓
Argo CD
 ↓
EKS
```

## 20. Phase 16 — Argo CD

### Objective

Introduce GitOps-based Continuous Delivery.

### Tasks

- Install Argo CD on EKS.
- Configure repository access.
- Create Argo CD Application.
- Configure destination cluster.
- Configure namespace.
- Configure Git path.
- Perform initial synchronization.

### Application Definition

Conceptually:

- **Application**: `notes-app`
- **Repository**: `notes-app-gitops`
- **Path**: `overlays/prod`
- **Destination**: `EKS`
- **Namespace**: `notes-app`

### Exit Criteria

- [ ] Argo CD installed.
- [ ] Argo CD accessible.
- [ ] GitOps repository connected.
- [ ] Application configured.
- [ ] Initial sync works.
- [ ] Application becomes Healthy.
- [ ] Application becomes Synced.

## 21. Phase 17 — Automated GitOps Deployment

### Objective

Connect CI output with the GitOps deployment process.

Final flow:

```text
Developer
    ↓
GitHub
    ↓
GitHub Actions
    ↓
Build + Test + Security
    ↓
Docker Image
    ↓
ECR
    ↓
Update GitOps Image Tag
    ↓
GitOps Commit
    ↓
Argo CD
    ↓
EKS
    ↓
Kubernetes
```

### Important Rule

GitHub Actions should not directly run: `kubectl apply` as the normal production deployment mechanism.

Instead:

```text
GitHub Actions
      ↓
GitOps Repository
      ↓
Argo CD
      ↓
EKS
```

This preserves GitOps architecture.

## 22. Phase 18 — Automated Deployment Verification

### Objective

Prove that a new application version can travel through the complete pipeline automatically.

### Test

1. Make a small application change.
2. Commit the change.
3. Push to GitHub.
4. CI runs.
5. Tests pass.
6. Security checks pass.
7. Docker image is built.
8. Image is pushed to ECR.
9. GitOps image tag is updated.
10. Argo CD detects the change.
11. Argo CD synchronizes.
12. EKS performs rolling update.
13. Kubernetes health checks pass.
14. Argo CD reports Healthy/Synced.
15. Application shows the new version.

## 23. Phase 19 — Deployment Failure Testing

### Objective

Test the system intentionally with controlled failures.

### Test Cases

#### Invalid Image

Deploy a non-existent image tag.

Expected:

```text
Argo CD
   ↓
Deployment
   ↓
Image Pull Failure
   ↓
Unhealthy / Degraded
```

#### Broken Application

Deploy an image that fails its health check.

Expected:

```text
Readiness Failure
       ↓
Traffic blocked
```

and/or:

```text
Liveness Failure
       ↓
Container restart
```

#### Invalid Kubernetes Configuration

Introduce a controlled manifest error.

Expected:

```text
Git Change
   ↓
Argo CD
   ↓
Sync Failure
```

## 24. Phase 20 — Rollback

### Objective

Prove that a bad deployment can be safely reversed.

Preferred GitOps rollback:

```text
Current Version
     ↓
Problem
     ↓
Revert GitOps Commit
     ↓
Argo CD
     ↓
Previous Image
     ↓
EKS
```

Example:

- Current: `notes-backend:b81f32c`
- Rollback: `notes-backend:a81f32c`

### Exit Criteria

- [ ] Bad deployment detected.
- [ ] Previous version identified.
- [ ] GitOps rollback performed.
- [ ] Argo CD synchronizes rollback.
- [ ] Application returns to Healthy state.

## 25. Phase 21 — Monitoring Foundation

### Objective

Introduce observability after the deployment platform is stable.

Monitoring should not be the first thing implemented.

First:

```text
Application
   ↓
Docker
   ↓
Kubernetes
   ↓
EKS
   ↓
Argo CD
```

Then: `Monitoring`

### Tools

- Prometheus
- Grafana
- Alertmanager
- CloudWatch

## 26. Phase 22 — Prometheus

### Objective

Collect Kubernetes and application metrics.

Monitor:

- CPU
- Memory
- Pod status
- Pod restarts
- Node metrics
- Request metrics
- Error metrics
- Application health

Architecture:

```text
Kubernetes
    ↓
Metrics
    ↓
Prometheus
```

### Exit Criteria

- [ ] Prometheus installed.
- [ ] Targets are discovered.
- [ ] Metrics are collected.
- [ ] Kubernetes metrics are visible.

## 27. Phase 23 — Grafana

### Objective

Create operational dashboards.

Dashboards should cover:

- **Kubernetes**: CPU, Memory, Pods, Nodes, Restarts, Deployments
- **Application**: Requests, Errors, Latency, Availability

### Exit Criteria

- [ ] Grafana installed.
- [ ] Prometheus connected.
- [ ] Kubernetes dashboard created.
- [ ] Application dashboard created.

## 28. Phase 24 — Alertmanager

### Objective

Create actionable alerts.

Potential alerts:

- High CPU
- High Memory
- Pod CrashLoopBackOff
- Pod unavailable
- High error rate
- High latency
- Node unavailable
- Application unavailable
- Deployment degraded

Flow:

```text
Prometheus
    ↓
Alert Rule
    ↓
Alertmanager
    ↓
Notification
```

## 29. Phase 25 — CloudWatch

### Objective

Monitor AWS-level infrastructure and logs.

Monitor where appropriate:

- EKS
- ALB
- Nodes
- AWS infrastructure
- Application logs
- AWS service metrics

CloudWatch complements Prometheus:

```text
Prometheus
    ↓
Kubernetes + Application Metrics

CloudWatch
    ↓
AWS Infrastructure + AWS Services + Logs
```

## 30. Phase 26 — Security Hardening

### Objective

Harden the application and infrastructure after functionality is stable.

### Areas

#### Container Security

- Minimal images
- Non-root containers
- No secrets in images
- Image scanning
- Read-only filesystem where practical

#### Kubernetes Security

- RBAC
- Network policies where appropriate
- Resource limits
- Security contexts
- Pod security controls

#### AWS Security

- IAM least privilege
- Security groups
- Private resources where appropriate
- No unnecessary public access

#### CI/CD Security

- GitHub OIDC
- Protected branches
- Least privilege
- Secret protection

## 31. Phase 27 — Production Readiness Review

### Objective

Perform a complete engineering audit.

### Review

#### Application

- [ ] Builds successfully.
- [ ] Tests pass.
- [ ] Health endpoints work.
- [ ] Configuration is externalized.

#### Docker

- [ ] Images are optimized.
- [ ] Images are scanned.
- [ ] Containers do not require root unnecessarily.
- [ ] No secrets exist inside images.

#### Kubernetes

- [ ] Resource requests/limits exist.
- [ ] Readiness probes exist.
- [ ] Liveness probes exist.
- [ ] Rolling updates work.
- [ ] Rollback works.

#### AWS

- [ ] IAM follows least privilege.
- [ ] Networking is correct.
- [ ] ECR is configured.
- [ ] EKS is healthy.
- [ ] ALB is healthy.

#### CI

- [ ] Tests run automatically.
- [ ] Security scans run automatically.
- [ ] SonarQube runs.
- [ ] Docker images are built automatically.
- [ ] Images are pushed to ECR.

#### CD

- [ ] GitOps repository exists.
- [ ] Argo CD is configured.
- [ ] Automated synchronization works.
- [ ] Deployment health is visible.
- [ ] Rollback works.

#### Monitoring

- [ ] Prometheus works.
- [ ] Grafana works.
- [ ] Alertmanager works.
- [ ] CloudWatch works.

## 32. Phase 28 — End-to-End Test

### Objective

Prove the entire DevOps lifecycle from code change to production deployment.

### Test Scenario

Make a small visible change to the Notes App.

Then:

```text
1. Developer changes code
        ↓
2. Git commit
        ↓
3. Push to GitHub
        ↓
4. GitHub Actions starts
        ↓
5. Dependencies install
        ↓
6. Security checks
        ↓
7. Tests
        ↓
8. SonarQube
        ↓
9. Application build
        ↓
10. Docker build
        ↓
11. Container scan
        ↓
12. Push image to ECR
        ↓
13. Update GitOps repository
        ↓
14. Argo CD detects change
        ↓
15. Argo CD synchronizes
        ↓
16. EKS performs rolling deployment
        ↓
17. Kubernetes health checks
        ↓
18. ALB routes traffic
        ↓
19. New application version becomes live
        ↓
20. Prometheus observes metrics
        ↓
21. Grafana displays metrics
        ↓
22. Alertmanager monitors alerts
        ↓
23. CloudWatch records AWS-level data
```

This is the final proof that the platform works.

## 33. Phase 29 — Failure and Recovery Drill

The project is not considered production-ready until failures have been tested.

Perform controlled drills.

### Drill 1 — CI Test Failure

Break a test.

Expected:

```text
CI
 ↓
Test Failure
 ↓
Pipeline Stops
 ↓
No Image Published
```

### Drill 2 — Security Failure

Introduce a controlled vulnerable dependency/test condition.

Expected:

```text
Security Check
 ↓
Failure
 ↓
Pipeline Stops
```

### Drill 3 — Docker Build Failure

Break the Dockerfile temporarily.

Expected:

```text
Docker Build
 ↓
Failure
 ↓
Pipeline Stops
```

### Drill 4 — Deployment Failure

Deploy a bad image.

Expected:

```text
Argo CD
 ↓
EKS
 ↓
Deployment Failure
 ↓
Health Failure
```

### Drill 5 — Rollback

Restore the previous known-good GitOps version.

Expected:

```text
Git Revert
 ↓
Argo CD
 ↓
EKS
 ↓
Previous Version
 ↓
Healthy
```

### Drill 6 — Pod Failure

Delete an application Pod.

Expected:

```text
Pod Deleted
 ↓
Kubernetes
 ↓
New Pod
 ↓
Healthy
```

### Drill 7 — Resource Pressure

Create controlled resource pressure.

Observe:

```text
Prometheus
 ↓
Grafana
 ↓
Alertmanager
```

## 34. Phase 30 — Documentation and Cleanup

### Objective

Make the project understandable to another engineer.

Documentation should include:

- `README.md`
- `CI.md`
- `CD.md`
- `DEVOPS_IMPLEMENTATION_PLAN.md`
- Architecture documentation
- Deployment instructions
- Troubleshooting
- Monitoring documentation
- Security documentation

Document:

- Architecture
- CI flow
- CD flow
- GitOps flow
- Kubernetes structure
- AWS architecture
- Monitoring
- Security
- Rollback
- Common failures
- Recovery procedures

## 35. Final Repository Structure

The final application repository may look like:

```text
notes-app/
│
├── app/
│   ├── frontend/
│   └── backend/
│
├── docker/
│   ├── frontend/
│   │   └── Dockerfile
│   └── backend/
│       └── Dockerfile
│
├── k8s/
│   ├── base/
│   └── overlays/
│       ├── dev/
│       └── prod/
│
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   └── alertmanager/
│
├── security/
│
├── docs/
│   ├── CI.md
│   ├── CD.md
│   └── DEVOPS_IMPLEMENTATION_PLAN.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.yml
├── .dockerignore
├── .gitignore
└── README.md
```

GitOps may be maintained separately:

```text
notes-app-gitops/
│
├── base/
│
└── overlays/
    ├── dev/
    └── prod/
```

## 36. Final Phase Dependency Map

The entire implementation can be understood as:

```text
PHASE 0
Application Baseline
        ↓
PHASE 1
Repository Structure
        ↓
PHASE 2
Dockerfiles
        ↓
PHASE 3
Docker Compose
        ↓
PHASE 4
Kubernetes Manifests
        ↓
PHASE 5
Local Kubernetes
        ↓
PHASE 6
Kubernetes Failure Testing
        ↓
PHASE 7
Security + Quality Tools
        ↓
PHASE 8
CI Preparation
        ↓
PHASE 9
GitHub Actions CI
        ↓
PHASE 10
AWS Foundation
        ↓
PHASE 11
Amazon ECR
        ↓
PHASE 12
Amazon EKS
        ↓
PHASE 13
Manual EKS Deployment
        ↓
PHASE 14
Ingress + ALB
        ↓
PHASE 15
GitOps Repository
        ↓
PHASE 16
Argo CD
        ↓
PHASE 17
Automated GitOps Deployment
        ↓
PHASE 18
Deployment Verification
        ↓
PHASE 19
Failure Testing
        ↓
PHASE 20
Rollback
        ↓
PHASE 21
Monitoring Foundation
        ↓
PHASE 22
Prometheus
        ↓
PHASE 23
Grafana
        ↓
PHASE 24
Alertmanager
        ↓
PHASE 25
CloudWatch
        ↓
PHASE 26
Security Hardening
        ↓
PHASE 27
Production Readiness
        ↓
PHASE 28
End-to-End Testing
        ↓
PHASE 29
Failure + Recovery Drills
        ↓
PHASE 30
Documentation + Finalization
```

## 37. Final Definition of Done

The Notes App DevOps implementation is complete when the following lifecycle works reliably:

```text
Developer
    ↓
GitHub
    ↓
GitHub Actions
    ↓
Dependency Security
    ↓
Tests
    ↓
SonarQube
    ↓
Application Build
    ↓
Docker Build
    ↓
Container Security Scan
    ↓
Amazon ECR
    ↓
GitOps Repository
    ↓
Argo CD
    ↓
Amazon EKS
    ↓
Kubernetes
    ↓
Service
    ↓
Ingress
    ↓
AWS ALB
    ↓
Internet
    ↓
Notes App
    ↓
Prometheus
    ↓
Grafana
    ↓
Alertmanager
    ↓
CloudWatch
```

The system must also support:

- Automated CI
- Automated CD
- Rolling Updates
- Health Checks
- Rollback
- Security Gates
- Observability
- Alerting
- Failure Detection
- Recovery
- Auditability

## 38. Master Engineering Rule

Never move to the next phase simply because the files exist.

Move to the next phase only when the current phase has been:

```text
Implemented
    ↓
Tested
    ↓
Verified
    ↓
Documented
    ↓
Committed
```

The objective is not to collect DevOps tools.

The objective is to build a working, observable, secure, reproducible software delivery platform.

Build it.
Test it.
Break it.
Fix it.
Automate it.
Monitor it.
Document it.
Repeat.

## 39. Implementation Tracking

This section must be updated after every implementation session.

### Current Phase

- **Phase**: 0
- **Status**: NOT STARTED

### Completed Phases

- None

### In Progress

- None

### Blocked

- None

### Next Phase

- Phase 0 — Application Baseline

### Last Completed Task

- None

### Next Task

- Verify existing Notes App locally.

### Important Decisions

- GitHub Actions will be used for CI.
- Argo CD will be used for GitOps-based CD.
- Jenkins will not be used.
- Amazon ECR will store Docker images.
- Amazon EKS will host the Kubernetes production environment.
- Prometheus/Grafana/Alertmanager will provide monitoring and alerting.
- CloudWatch will provide AWS-level observability.
- GitOps will be used as the source of truth for Kubernetes desired state.
- CI will build and publish artifacts.
- CD will deploy artifacts through Argo CD.

### Implementation Log

#### Session 1

- **Date**:
- **Phase**:
- **Tasks Completed**:
- **Tests Performed**:
- **Result**:
- **Problems**:
- **Next Step**:

#### Session 2

- **Date**:
- **Phase**:
- **Tasks Completed**:
- **Tests Performed**:
- **Result**:
- **Problems**:
- **Next Step**:

Continue adding sessions as implementation progresses.