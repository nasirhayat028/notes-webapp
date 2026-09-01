# Continuous Delivery (CD) — Notes App

## 1. Purpose

This document defines the complete Continuous Delivery (CD) strategy for the Notes App.

CD is responsible for taking a verified application artifact produced by the CI pipeline and safely deploying it to the Kubernetes environment running on Amazon EKS.

The CD process will use:

- GitHub
- GitOps Repository
- Argo CD
- Kubernetes
- Amazon EKS
- Amazon ECR
- AWS Load Balancer / Ingress
- Prometheus
- Grafana
- Alertmanager
- CloudWatch

The deployment model follows GitOps principles.

The Git repository represents the desired state of the application.

Argo CD continuously compares the desired state in Git with the actual state in Kubernetes and reconciles differences.

---

## 2. CD Responsibility

The CD process answers one main question:

> "How do we safely and consistently deploy the verified application artifact to the Kubernetes environment?"

CD is responsible for:

1. Receiving the verified image produced by CI.
2. Updating the desired application version in the GitOps repository.
3. Detecting changes in the GitOps repository.
4. Synchronizing Kubernetes manifests.
5. Deploying the application to Amazon EKS.
6. Managing Kubernetes resources through Git.
7. Monitoring deployment health.
8. Detecting synchronization problems.
9. Supporting rollback to a previous known-good version.
10. Maintaining the desired state of the cluster.

CD is **not responsible for building the application**.

CI builds and verifies the artifact.

CD deploys that artifact.

---

## 3. CD Architecture

```text
                    CI PIPELINE
                        |
                        v
                  Docker Image
                        |
                        v
                    Amazon ECR
                        |
                        v
              Verified Image Available
                        |
                        v
                GitOps Repository
                        |
                        v
                    Argo CD
                        |
                        v
                  Amazon EKS
                        |
                        v
                  Kubernetes
                        |
             +----------+----------+
             |                     |
             v                     v
          Service              Ingress
                                   |
                                   v
                               AWS ALB
                                   |
                                   v
                              Internet
                                   |
                                   v
                              Notes App
```

Monitoring operates alongside the application:

```text
Amazon EKS
    |
    +---- Prometheus
    |
    +---- Grafana
    |
    +---- Alertmanager
    |
    +---- CloudWatch
```

## 4. GitOps Principle

The CD architecture follows GitOps.

The GitOps repository is the source of truth for Kubernetes deployment configuration.

Conceptually:

```text
GitOps Repository
       |
       | Desired State
       v
     Argo CD
       |
       | Reconciliation
       v
     Amazon EKS
       |
       | Actual State
       v
 Kubernetes
```

The desired state is stored in Git.

Argo CD continuously works to make the Kubernetes cluster match that desired state.

## 5. CI to CD Handoff

CI and CD are separate systems.

CI produces the application artifact.

CD consumes that artifact.

The complete handoff is:

```text
Developer
    |
    v
GitHub
    |
    v
GitHub Actions
    |
    v
Tests
    |
    v
Security
    |
    v
Build
    |
    v
Docker Image
    |
    v
Amazon ECR
    |
    v
Update GitOps Image Reference
    |
    v
GitOps Repository
    |
    v
Argo CD
    |
    v
Amazon EKS
```

The important rule is:

CI publishes the image. Argo CD performs the deployment.

GitHub Actions should not directly become the primary Kubernetes deployment mechanism.

## 6. GitOps Repository

The Kubernetes deployment configuration should be maintained in a Git repository.

Recommended structure:

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

The exact structure may change during implementation.

The important principle is:

```text
Git
 |
 +-- Kubernetes desired state
 |
 +-- Application image version
 |
 +-- Environment configuration
```

## 7. Application Version Management

The GitOps repository must reference a specific Docker image version.

Example:

```yaml
image:
  repository: <ECR_REPOSITORY>
  tag: a81f32c
```

The Git commit SHA should be preferred over only using: `latest` because the commit SHA identifies the exact source revision used to create the image.

Example:

- `notes-frontend:a81f32c`
- `notes-backend:a81f32c`

This makes deployments traceable.

## 8. GitOps Update Flow

After CI successfully publishes the Docker images:

```text
CI
 |
 v
ECR
 |
 v
Image:
notes-backend:a81f32c
 |
 v
GitOps Repository
 |
 | Update image tag
 v
Git Commit
 |
 v
Argo CD detects change
```

The GitOps repository then becomes the deployment trigger.

## 9. Stage 1 — Argo CD Installation

Argo CD will be installed into the Kubernetes cluster.

Conceptually:

```text
Amazon EKS
    |
    v
Kubernetes
    |
    v
Argo CD
```

Argo CD itself runs inside Kubernetes.

It communicates with:

- The Git repository
- The Kubernetes API
- The configured application resources

## 10. Stage 2 — Argo CD Configuration

Argo CD must be configured to know:

- Which Git repository contains the desired state.
- Which branch contains the deployment configuration.
- Which directory contains Kubernetes manifests.
- Which Kubernetes cluster should receive the deployment.
- Which namespace should contain the application.

Conceptually:

```text
Argo CD Application
        |
        +-- Repository
        |
        +-- Revision
        |
        +-- Path
        |
        +-- Destination Cluster
        |
        +-- Destination Namespace
```

## 11. Stage 3 — Argo CD Application

An Argo CD Application represents the relationship between:

```text
Git Repository
      |
      v
Desired Kubernetes State
      |
      v
Target Kubernetes Cluster
```

Example conceptual configuration:

- **Application Name**: `notes-app`
- **Repository**: `notes-app-gitops`
- **Path**: `overlays/prod`
- **Destination**: `Amazon EKS`
- **Namespace**: `notes-app`

The exact configuration will be created during implementation.

## 12. Stage 4 — Initial Synchronization

Once Argo CD is configured, it compares Git with Kubernetes.

Example:

```text
Git Desired State
       |
       v
    Argo CD
       |
       v
Actual Kubernetes State
```

If the application does not exist:

- **Git**: Application exists
- **Kubernetes**: Application does not exist
- **Result**: `OUT OF SYNC`

Argo CD can synchronize the resources:

```text
Git
 |
 v
Argo CD
 |
 v
EKS
 |
 v
Application deployed
```

## 13. Automatic Synchronization

The production CD process should use automated synchronization where appropriate.

Flow:

```text
GitOps Repository
       |
       | New commit
       v
     Argo CD
       |
       | Detect change
       v
   Sync Application
       |
       v
      EKS
```

This removes the need for manually running: `kubectl apply` for normal deployments.

## 14. Kubernetes Deployment

The Kubernetes deployment describes how the application should run.

Typical resources include:

- Namespace
- Deployment
- Service
- ConfigMap
- Secret
- Ingress

Example:

```text
GitOps
  |
  v
Deployment
  |
  v
ReplicaSet
  |
  v
Pods
```

The Kubernetes Deployment controls:

- Number of replicas
- Container image
- Environment configuration
- Resource requests
- Resource limits
- Probes
- Rolling update strategy

## 15. Kubernetes Service

The application containers should not be exposed directly through Pod IP addresses.

A Kubernetes Service provides stable networking.

Example:

```text
                Service
                   |
          +--------+--------+
          |        |        |
         Pod      Pod      Pod
```

The Service provides stable access to application Pods even when Pods are recreated.

## 16. Ingress

The application will use Kubernetes Ingress to expose the application externally.

Conceptually:

```text
Internet
   ↓
AWS Application Load Balancer
   ↓
Kubernetes Ingress
   ↓
Kubernetes Service
   ↓
Application Pods
```

The exact AWS Load Balancer Controller configuration will be implemented during the EKS phase.

## 17. AWS Application Load Balancer

The AWS Application Load Balancer provides external HTTP/HTTPS access.

Flow:

```text
User
 |
 v
Internet
 |
 v
AWS ALB
 |
 v
Kubernetes Ingress
 |
 v
Service
 |
 v
Pods
```

The ALB should eventually support:

- HTTP/HTTPS
- TLS termination
- Host-based routing if required
- Path-based routing if required
- Health checks

## 18. Deployment Strategy

The application should use Kubernetes rolling updates.

Conceptually:

```text
Version A
  |
  | New Version
  v
Version B
```

Kubernetes gradually replaces old Pods with new Pods.

Example:

Old:
- Pod A
- Pod A
- Pod A

New deployment:
- Pod A
- Pod A
- Pod B

Then:
- Pod A
- Pod B
- Pod B

Finally:
- Pod B
- Pod B
- Pod B

This reduces downtime during normal deployments.

## 19. Readiness and Liveness

The Kubernetes application must have health probes.

### Readiness Probe

Determines whether a Pod is ready to receive traffic.

```text
Pod
 |
 +-- Ready --> Receive traffic
 |
 +-- Not Ready --> No traffic
```

### Liveness Probe

Determines whether the application is still functioning.

```text
Pod
 |
 +-- Healthy --> Continue
 |
 +-- Unhealthy --> Kubernetes may restart container
```

These probes are critical for reliable deployments.

## 20. Deployment Health

Argo CD should monitor the health of deployed resources.

Important states include:

- `Synced`
- `OutOfSync`
- `Healthy`
- `Progressing`
- `Degraded`
- `Missing`
- `Unknown`

The desired result is:

- **Sync Status**: `Synced`
- **Health**: `Healthy`

A deployment should not be considered successful merely because Kubernetes accepted the manifest.

The actual workload must become healthy.

## 21. Deployment Failure

If a deployment fails:

```text
Git Change
    |
    v
Argo CD
    |
    v
EKS
    |
    v
Deployment
    |
    X
Failure
```

Possible causes:

- Invalid image
- Image pull failure
- Configuration error
- Secret missing
- Container crash
- Failed health check
- Insufficient resources
- Invalid Kubernetes manifest

The failure must be observable through:

- Argo CD
- Kubernetes
- Logs
- Monitoring

## 22. Rollback Strategy

A production deployment must support rollback.

Example:

```text
Version A
   |
   v
Version B
   |
   X
Problem
   |
   v
Rollback
   |
   v
Version A
```

With GitOps, rollback should preferably happen by reverting the GitOps configuration to the previous known-good image version.

Example:

- Current: `notes-backend:b81f32c`
- Rollback: `notes-backend:a81f32c`

Then:

```text
Git Commit
    |
    v
Argo CD
    |
    v
EKS
```

This keeps Git as the source of truth.

## 23. Environment Strategy

The project should support environment separation.

Recommended structure:

```text
GitOps
 |
 +-- base
 |
 +-- overlays
      |
      +-- dev
      |
      +-- prod
```

The base configuration contains common Kubernetes resources.

Environment overlays contain environment-specific configuration.

Example:

```text
base
 |
 +-- Deployment
 +-- Service
 +-- ConfigMap
 +-- Ingress

dev
 |
 +-- replica count
 +-- resources
 +-- environment config

prod
 |
 +-- replica count
 +-- resources
 +-- production config
```

This avoids duplicating the entire Kubernetes configuration.

## 24. Secrets Management

Secrets must not be committed directly to Git.

Never store:

- Database passwords
- API keys
- JWT secrets
- AWS credentials
- Third-party credentials

inside normal GitOps manifests.

The project should use a proper secret-management strategy.

Possible future options include:

- Kubernetes Secrets with secure external management
- AWS Secrets Manager
- External Secrets Operator
- GitHub Actions secrets for CI-only credentials
- AWS IAM roles

The exact solution will be selected during implementation.

## 25. Configuration Management

Environment-specific configuration should be separated from application images.

Example:

```text
Docker Image
    |
    +-- Application Code
    |
    +-- Runtime dependencies

Kubernetes
    |
    +-- Environment variables
    +-- ConfigMaps
    +-- Secrets
```

This allows the same Docker image to be promoted across environments.

## 26. CI/CD Image Promotion Principle

The same verified image should ideally be promoted between environments rather than rebuilt for every environment.

Example:

```text
Source Code
    |
    v
CI
    |
    v
Docker Image
    |
    v
ECR
    |
    +--------> DEV
    |
    +--------> STAGING
    |
    +--------> PROD
```

This reduces the risk of "works in one environment but not another" caused by rebuilding different artifacts.

## 27. Monitoring Integration

Monitoring is not the CD engine, but it is essential for deployment visibility.

The EKS environment will use:

- Prometheus
- Grafana
- Alertmanager
- CloudWatch

Conceptual architecture:

```text
                    EKS
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
  Application     Kubernetes     Nodes
       |             |             |
       +-------------+-------------+
                     |
                     v
                 Prometheus
                     |
                     v
                  Grafana
                     |
                     v
                Alertmanager
```

AWS infrastructure and logs can additionally be monitored through CloudWatch.

## 28. Deployment Metrics

The monitoring layer should eventually track:

- Pod availability
- Pod restarts
- CPU usage
- Memory usage
- Request rate
- Error rate
- Request latency
- Node health
- Deployment status
- Application health
- Kubernetes resource health

This allows deployment problems to be detected quickly.

## 29. Alerting

Alertmanager should eventually notify when important conditions occur.

Examples:

```text
High CPU
    |
    v
Prometheus
    |
    v
Alertmanager
    |
    v
Notification
```

Other examples:

- Application unavailable
- Pod crash loops
- High error rate
- High latency
- Node unavailable
- Deployment degraded
- Insufficient resources

## 30. CloudWatch Integration

AWS CloudWatch will provide AWS-level observability.

Potential monitoring areas:

- EKS
- ALB
- EC2 / Nodes
- AWS Infrastructure
- Logs
- AWS Metrics

CloudWatch and Prometheus serve complementary purposes.

### Prometheus

Focused primarily on: Kubernetes + application metrics

### CloudWatch

Focused primarily on: AWS infrastructure + AWS services + logs

## 31. CD Security

The CD system has access to the Kubernetes cluster and therefore must be protected carefully.

Principles:

- Least privilege
- Secure Argo CD access
- Secure Git repository access
- No hardcoded credentials
- Protected production branches
- Controlled repository permissions
- Kubernetes RBAC
- Secure secrets
- TLS for external traffic
- Auditability through Git

Argo CD should only have the permissions required to manage its intended applications.

## 32. Git Repository Protection

The GitOps repository should use branch protection.

Recommended controls:

- Pull request reviews
- Required CI checks
- Protected main branch
- No direct force pushes
- Controlled merge permissions
- Auditable changes

Production configuration should not be casually modified.

## 33. GitOps Auditability

Every deployment should be traceable.

Example:

```text
Developer
    |
    v
Application Commit
    |
    v
CI Build
    |
    v
Docker Image SHA
    |
    v
GitOps Commit
    |
    v
Argo CD Sync
    |
    v
EKS Deployment
```

This provides an audit trail.

If a production deployment breaks, we should be able to answer:

- Which source commit produced this image?
- Which image is currently running?
- Which GitOps commit deployed it?
- When did Argo CD synchronize it?

## 34. CD Deployment Flow

The normal deployment flow is:

1. Developer pushes code
2. GitHub Actions starts CI
3. Tests + security + quality checks
4. Docker images are built
5. Images are scanned
6. Images are pushed to ECR
7. GitOps image reference is updated
8. GitOps commit is created
9. Argo CD detects Git change
10. Argo CD synchronizes application
11. EKS performs rolling deployment
12. Kubernetes health checks run
13. Argo CD verifies health
14. Application becomes Healthy

## 35. Complete CD Architecture

```text
                         GITHUB
                            |
                            |
                     GitOps Repository
                            |
                            v
                     +-------------+
                     |   Argo CD   |
                     +------+------+
                            |
                            |
                    Desired State
                            |
                            v
                     +-------------+
                     |    EKS      |
                     +------+------+
                            |
                 +----------+----------+
                 |                     |
                 v                     v
          Kubernetes              Ingress
          Deployment                 |
                 |                   v
                 v                  ALB
               Pods                  |
                 |                   v
                 +-------------> Internet
                 
Monitoring:

          EKS
           |
    +------+------+
    |      |      |
    v      v      v
Prometheus Grafana CloudWatch
    |
    v
Alertmanager
```

## 36. CD Implementation Order

CD should also be implemented incrementally.

Recommended order:

```text
1. Create / verify AWS networking
        |
        v
2. Create EKS cluster
        |
        v
3. Configure kubectl access
        |
        v
4. Configure ECR access from EKS
        |
        v
5. Deploy application manually to EKS
        |
        v
6. Verify Pods
        |
        v
7. Verify Services
        |
        v
8. Configure Ingress
        |
        v
9. Configure AWS Load Balancer Controller
        |
        v
10. Verify external application access
        |
        v
11. Create GitOps repository
        |
        v
12. Move Kubernetes manifests to GitOps
        |
        v
13. Install Argo CD
        |
        v
14. Configure Argo CD repository access
        |
        v
15. Create Argo CD Application
        |
        v
16. Perform initial synchronization
        |
        v
17. Enable automated synchronization
        |
        v
18. Connect CI image updates to GitOps
        |
        v
19. Test automatic deployment
        |
        v
20. Test rolling updates
        |
        v
21. Test failed deployment
        |
        v
22. Test rollback
        |
        v
23. Configure Prometheus
        |
        v
24. Configure Grafana
        |
        v
25. Configure Alertmanager
        |
        v
26. Configure CloudWatch
        |
        v
27. Perform complete end-to-end deployment test
```

## 37. Definition of Done — CD

CD is considered complete when:

- [ ] EKS cluster is operational.
- [ ] Application can run successfully on EKS.
- [ ] Kubernetes manifests are stored in Git.
- [ ] GitOps repository is configured.
- [ ] Argo CD is installed.
- [ ] Argo CD can access the GitOps repository.
- [ ] Argo CD Application is configured.
- [ ] Argo CD can synchronize Kubernetes resources.
- [ ] Application reaches Healthy state.
- [ ] Application reaches Synced state.
- [ ] Docker images are pulled from ECR.
- [ ] Kubernetes rolling deployment works.
- [ ] Readiness probes work.
- [ ] Liveness probes work.
- [ ] Ingress is configured.
- [ ] AWS ALB exposes the application.
- [ ] HTTPS is configured where required.
- [ ] Failed deployments are detectable.
- [ ] Rollback has been tested.
- [ ] Secrets are not stored directly in Git.
- [ ] Production configuration is protected.
- [ ] Monitoring is available.
- [ ] Alerts are configured for important failures.
- [ ] Complete CI → ECR → GitOps → Argo CD → EKS flow works.

## 38. CI vs CD

The responsibility boundary is:

| Area | CI | CD |
| --- | --- | --- |
| Source checkout | Yes | No |
| Dependency installation | Yes | No |
| Dependency security | Yes | No |
| Automated tests | Yes | No |
| SonarQube | Yes | No |
| Application build | Yes | No |
| Docker build | Yes | No |
| Container scanning | Yes | No |
| Push image to ECR | Yes | No |
| GitOps update | Yes | Yes/through Git workflow |
| Kubernetes deployment | No | Yes |
| Argo CD | No | Yes |
| EKS | No | Yes |
| Kubernetes rollout | No | Yes |
| Rollback | Artifact/version support | Yes |
| Ingress / ALB | No | Yes |
| Prometheus | No | Monitoring |
| Grafana | No | Monitoring |
| Alertmanager | No | Monitoring |
| CloudWatch | No | Monitoring |

## 39. Core CD Principle

The Notes App CD pipeline follows this principle:

> Git is the source of truth, Argo CD is the deployment controller, and Kubernetes is the runtime platform.

The complete model is:

```text
CI
 |
 | Verified Docker Image
 v
ECR
 |
 | Image Reference
 v
GitOps Repository
 |
 | Desired State
 v
Argo CD
 |
 | Reconciliation
 v
Amazon EKS
 |
 | Runtime
 v
Kubernetes
 |
 +---- Prometheus
 |
 +---- Grafana
 |
 +---- Alertmanager
 |
 +---- CloudWatch
```

## 40. Final End-to-End DevOps Flow

The complete Notes App platform will eventually follow this architecture:

```text
                       DEVELOPER
                           |
                           v
                      GitHub App Repo
                           |
                           v
                   GitHub Actions (CI)
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
          Testing      Security      SonarQube
             |             |             |
             +-------------+-------------+
                           |
                           v
                    Application Build
                           |
                           v
                     Docker Build
                           |
                           v
                    Image Security Scan
                           |
                           v
                         ECR
                           |
                           v
                  Update GitOps Repo
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
                     Kubernetes
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
          Frontend      Backend       Services
             |             |             |
             +-------------+-------------+
                           |
                           v
                        Ingress
                           |
                           v
                      AWS ALB
                           |
                           v
                        Internet
                           |
                           v
                      Notes App


                    OBSERVABILITY
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
        Prometheus      Grafana      CloudWatch
             |
             v
        Alertmanager
             |
             v
        Notifications
```

## 41. Final Objective

The final objective is to achieve a fully automated deployment lifecycle:

```text
Code Change
    |
    v
GitHub
    |
    v
CI
    |
    +-- Test
    +-- Security
    +-- Quality
    +-- Build
    +-- Docker
    +-- Scan
    |
    v
ECR
    |
    v
GitOps
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
    v
Production Application
    |
    v
Monitoring + Alerting
```

The core rule remains:

> CI builds and verifies. GitOps defines the desired state. Argo CD deploys and reconciles. Kubernetes runs. Monitoring observes.