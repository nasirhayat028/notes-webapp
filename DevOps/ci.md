# Continuous Integration (CI) — Notes App

## 1. Purpose

This document defines the complete Continuous Integration (CI) strategy for the Notes App.

CI is responsible for automatically validating every code change, running quality and security checks, building the application, creating Docker images, and publishing verified images to Amazon ECR.

The CI pipeline will be implemented using:

- GitHub
- GitHub Actions
- OWASP Dependency-Check
- SonarQube
- Docker
- Container image security scanning
- Amazon ECR

CI does **not** deploy the application to Kubernetes.

Deployment is handled separately through the CD/GitOps process using Argo CD.

---

## 2. CI Responsibility

The CI pipeline answers one main question:

> "Is this code safe, tested, high-quality, and ready to be deployed?"

The CI pipeline must:

1. Retrieve the latest source code.
2. Install dependencies.
3. Validate dependencies and known vulnerabilities.
4. Run automated tests.
5. Perform static code-quality analysis.
6. Build the application.
7. Build Docker images.
8. Scan Docker images for vulnerabilities.
9. Authenticate with Amazon ECR.
10. Push verified Docker images to ECR.
11. Produce a versioned image that can be consumed by the CD/GitOps process.

---

## 3. CI Architecture

```text
Developer
    |
    | Push / Pull Request
    v
GitHub Repository
    |
    v
GitHub Actions
    |
    +----------------------+
    |                      |
    v                      v
Dependency Checks       Automated Tests
    |                      |
    +----------+-----------+
               |
               v
          SonarQube
               |
               v
        Application Build
               |
               v
        Docker Image Build
               |
               v
       Container Image Scan
               |
               v
          Amazon ECR
               |
               v
       Verified Image Ready
       for CD / GitOps
```

## 4. CI Pipeline Stages

The CI pipeline will contain the following stages:

1. Trigger
2. Checkout
3. Environment Setup
4. Dependency Installation
5. Dependency Security Check
6. Automated Testing
7. SonarQube Code Quality Analysis
8. Application Build
9. Docker Image Build
10. Docker Image Security Scan
11. Amazon ECR Authentication
12. Docker Image Tagging
13. Push Image to Amazon ECR
14. CI Result / Artifact Information

Each stage must complete successfully before the next critical stage continues.

## 5. Stage 1 — Pipeline Trigger

The CI pipeline will be triggered by GitHub events.

Primary triggers:

- Pull Requests
- Pushes to the main branch

Example workflow:

```text
Developer
    |
    v
Create / modify code
    |
    v
Git commit
    |
    v
GitHub Push / Pull Request
    |
    v
GitHub Actions CI
```

Pull Requests are used to validate changes before merging.

Pushes to main validate the integrated code and prepare a deployable Docker image.

## 6. Stage 2 — Checkout Source Code

GitHub Actions first retrieves the repository source code.

Purpose:

- Get the exact commit being tested.
- Provide source code to all CI stages.
- Ensure the pipeline works against the actual Git revision.

Conceptually:

```text
GitHub Repository
        |
        v
GitHub Actions Runner
        |
        v
Source Code
```

The pipeline must always operate on the commit that triggered the workflow.

## 7. Stage 3 — Environment Setup

The CI runner must prepare the required build environment.

Depending on the application structure, this may include:

- Node.js
- npm
- Java/JDK if required by tooling
- Docker
- SonarQube scanner
- OWASP Dependency-Check
- AWS CLI
- Required environment variables

The versions used in CI should be explicitly defined rather than relying on whatever happens to be installed on the runner.

Example:

```text
GitHub Actions Runner
        |
        +-- Node.js
        +-- npm
        +-- Docker
        +-- AWS CLI
        +-- Security tools
        +-- SonarQube scanner
```

## 8. Stage 4 — Dependency Installation

The pipeline installs application dependencies.

For Node.js applications: `npm ci`

`npm ci` should be preferred for CI environments because it installs dependencies from the lock file and provides more reproducible builds.

The frontend and backend dependency installation must be handled according to the actual project structure.

Example:

```text
Frontend
   |
   +-- package.json
   +-- package-lock.json
   |
   v
npm ci

Backend
   |
   +-- package.json
   +-- package-lock.json
   |
   v
npm ci
```

Dependency installation failure must fail the pipeline.

## 9. Stage 5 — Dependency Security Check

The pipeline performs dependency security analysis before building the application.

The primary tool for this project is: OWASP Dependency-Check

Purpose:

- Identify vulnerable dependencies.
- Detect known security vulnerabilities.
- Prevent vulnerable dependencies from silently entering the build.

Conceptually:

```text
Application Dependencies
        |
        v
OWASP Dependency-Check
        |
        +---- Vulnerabilities found ----> CI Failure
        |
        +---- No blocking vulnerabilities
                         |
                         v
                    Continue CI
```

The exact failure threshold should be defined deliberately.

The project should not blindly fail on every informational finding.

A sensible policy should define:

- Severity threshold
- Suppression policy
- False-positive handling
- Report retention
- CI failure conditions

## 10. Stage 6 — Automated Testing

Automated tests run before the Docker image is considered valid.

Possible test categories:

- Unit tests
- Integration tests
- Backend API tests
- Frontend tests
- Application build validation

Example:

```text
Source Code
    |
    v
Automated Tests
    |
    +---- Failed ----> CI Failure
    |
    +---- Passed
            |
            v
        Continue
```

The pipeline must never build and publish a production image when mandatory tests fail.

Testing is a quality gate.

## 11. Stage 7 — SonarQube Code Quality Analysis

After tests, the project is analyzed by SonarQube.

SonarQube is responsible for code quality and static analysis.

It can identify:

- Bugs
- Code smells
- Vulnerabilities
- Duplicated code
- Maintainability issues
- Reliability issues
- Code-quality trends

Flow:

```text
Source Code
    |
    v
SonarQube Analysis
    |
    v
Quality Gate
    |
    +---- Failed ----> CI Failure
    |
    +---- Passed ----> Continue
```

SonarQube is different from OWASP Dependency-Check.

### OWASP Dependency-Check

Focus:

```text
Third-party dependencies
        |
        v
Known vulnerabilities
```

### SonarQube

Focus:

```text
Application source code
        |
        v
Code quality + static analysis
```

Both tools serve different purposes and should remain separate.

## 12. Stage 8 — Application Build

After the quality gates pass, the application is built.

The build stage verifies that the application can actually be compiled/bundled for deployment.

Example frontend flow:

```text
Frontend Source
      |
      v
npm run build
      |
      v
Production Build
```

Example backend flow:

```text
Backend Source
      |
      v
Build / Validation
      |
      v
Production-ready Backend
```

The exact commands must follow the existing Notes App implementation.

A failed build must stop the pipeline.

## 13. Stage 9 — Docker Image Build

After the application passes tests and quality checks, Docker images are created.

The project will have separate images for the application components where appropriate.

Example:

```text
Frontend Dockerfile
        |
        v
Frontend Docker Image

Backend Dockerfile
        |
        v
Backend Docker Image
```

The Docker build must use the Dockerfiles committed to the repository.

Example conceptual commands:

```bash
docker build -t notes-frontend:<version> .
docker build -t notes-backend:<version> .
```

The final commands will depend on the repository structure.

## 14. Docker Image Design

The Docker images should follow production-oriented practices.

Requirements:

- Use appropriate base images.
- Prefer minimal images where practical.
- Avoid unnecessary packages.
- Do not include development dependencies when unnecessary.
- Do not store secrets inside images.
- Use `.dockerignore`.
- Run containers as a non-root user where practical.
- Keep images deterministic and reproducible.
- Keep image layers efficient.

Docker images are deployment artifacts.

The image should contain everything required to run the application, but should not contain environment-specific secrets.

## 15. Stage 10 — Docker Image Security Scan

After Docker images are built, they must be scanned for vulnerabilities.

This is different from dependency scanning.

Dependency scanning:

```text
Source dependencies
        |
        v
OWASP Dependency-Check
```

Container scanning:

```text
Docker Image
        |
        v
Container Security Scanner
        |
        v
OS packages + libraries + image vulnerabilities
```

A container image must not be pushed to ECR if it violates the project's defined security policy.

The scanner and severity threshold will be selected during implementation.

## 16. Stage 11 — Amazon ECR Authentication

After all required CI quality gates pass, GitHub Actions authenticates with Amazon ECR.

Flow:

```text
GitHub Actions
      |
      v
AWS Authentication
      |
      v
Amazon ECR
```

AWS credentials must never be hardcoded in:

- Source code
- Dockerfiles
- GitHub repository files
- CI scripts
- Kubernetes manifests

Authentication should use secure GitHub Actions secrets or, preferably, GitHub OIDC with an appropriately scoped AWS IAM role.

The exact AWS authentication architecture will be defined during AWS implementation.

## 17. Stage 12 — Docker Image Tagging

Every published image must have an identifiable version.

Recommended strategy:

- `notes-frontend:<git-sha>`
- `notes-backend:<git-sha>`

The Git commit SHA provides an immutable reference to the exact source code used to build the image.

Example:

- `notes-frontend:a81f32c`
- `notes-backend:a81f32c`

Additional tags may be used where appropriate.

Example:

- `notes-frontend:a81f32c`
- `notes-frontend:main`

However, immutable Git SHA tags should remain the primary deployment reference.

Avoid relying only on: `latest` because `latest` does not uniquely identify a deployment artifact.

## 18. Stage 13 — Push Docker Images to Amazon ECR

After successful security scanning and tagging, the images are pushed to ECR.

Flow:

```text
Docker Image
      |
      v
Security Scan
      |
      v
Tag Image
      |
      v
Amazon ECR
```

Example:

```text
Amazon ECR
│
├── notes-frontend
│
└── notes-backend
```

Each image should be pushed only after mandatory CI gates pass.

## 19. Stage 14 — CI Output

At the end of CI, the pipeline should provide clear information about the generated artifacts.

Example:

```text
CI Status: SUCCESS

Commit:
a81f32c

Frontend Image:
ECR/notes-frontend:a81f32c

Backend Image:
ECR/notes-backend:a81f32c
```

This information becomes important for the CD/GitOps process.

## 20. CI Quality Gates

The pipeline should have explicit quality gates.

```text
Dependency Check
       |
       v
      PASS
       |
       v
Tests
       |
       v
      PASS
       |
       v
SonarQube Quality Gate
       |
       v
      PASS
       |
       v
Application Build
       |
       v
      PASS
       |
       v
Docker Build
       |
       v
      PASS
       |
       v
Container Security Scan
       |
       v
      PASS
       |
       v
ECR Push
```

If a mandatory gate fails:

```text
CI
 |
 X
 |
Pipeline stops
 |
No production image is published
```

## 21. CI Failure Strategy

The pipeline must fail fast on critical problems.

Examples:

### Dependency vulnerability

```text
OWASP
  |
  X
Critical vulnerability
  |
  v
CI FAILED
```

### Test failure

```text
Tests
  |
  X
Test failed
  |
  v
CI FAILED
```

### SonarQube quality failure

```text
SonarQube
   |
   X
Quality Gate Failed
   |
   v
CI FAILED
```

### Docker build failure

```text
Docker Build
     |
     X
Build Failed
     |
     v
CI FAILED
```

### Container vulnerability

```text
Image Scan
     |
     X
Security policy violated
     |
     v
CI FAILED
```

The goal is to prevent bad artifacts from reaching ECR.

## 22. CI and CD Separation

CI and CD are intentionally separated.

### CI

Responsible for:

```text
Code
 ↓
Test
 ↓
Analyze
 ↓
Secure
 ↓
Build
 ↓
Package
 ↓
Publish Image
```

Output:

- Verified Docker Image → Amazon ECR

### CD

Responsible for:

```text
GitOps Configuration
        ↓
Argo CD
        ↓
EKS
        ↓
Kubernetes Deployment
```

Output:

- Running Application

GitHub Actions CI must not directly execute Kubernetes deployment commands as the primary deployment mechanism.

Argo CD is responsible for deployment and maintaining the desired Kubernetes state.

## 23. GitOps Handoff

The CI pipeline does not directly deploy the application to EKS.

Instead, the expected handoff is:

```text
GitHub
   |
   v
GitHub Actions
   |
   v
Build + Test + Security
   |
   v
Docker Image
   |
   v
Amazon ECR
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

The CI pipeline may update the image reference in the GitOps repository after publishing the verified image.

Argo CD then detects the Git change and performs the deployment.

This preserves GitOps principles.

## 24. Security Principles

The CI implementation must follow these principles.

### Never commit secrets

Never commit:

- AWS Access Keys
- AWS Secret Keys
- Database Passwords
- API Keys
- JWT Secrets
- Docker Registry Credentials
- SonarQube Tokens

### Prefer short-lived credentials

Where supported, GitHub Actions should authenticate with AWS using OIDC instead of long-lived AWS access keys.

### Least privilege

The GitHub Actions identity should have only the permissions required for CI.

For example:

- ECR: Push images, Read repository

It should not automatically receive unrestricted administrator permissions.

## 25. CI Environment Variables and Secrets

The pipeline may require:

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `ECR_REPOSITORY`
- `SONAR_TOKEN`
- `SONAR_HOST_URL`

Secrets must be managed through appropriate secret-management mechanisms.

Environment-specific configuration must not be baked into Docker images.

## 26. Branch and Pull Request Strategy

Recommended flow:

```text
feature/*
     |
     v
Pull Request
     |
     v
CI Validation
     |
     +---- Failed → Fix
     |
     +---- Passed
            |
            v
         Review
            |
            v
           main
            |
            v
       Full CI Pipeline
            |
            v
          ECR
```

This provides an automated quality gate before code reaches the main branch.

## 27. CI Pipeline Security Boundary

The CI pipeline should be treated as a security boundary.

The pipeline has access to:

- Source code
- AWS resources
- ECR
- Security tooling
- SonarQube

Therefore:

- Permissions must be minimal.
- Secrets must be protected.
- Pull Request workflows must be carefully designed.
- Untrusted code must not automatically receive privileged credentials.
- Production credentials must not be exposed to arbitrary pull requests.

## 28. Reproducibility

The CI pipeline should produce reproducible results as much as practical.

This means:

- Lock dependency versions.
- Pin important action versions.
- Define runtime versions.
- Use deterministic Docker builds where practical.
- Tag images using Git commit SHA.
- Keep build configuration inside version control.

The same commit should produce an identifiable artifact.

## 29. CI Observability

The pipeline itself should provide useful information.

Each run should clearly show:

- ✓ Checkout
- ✓ Dependency Installation
- ✓ Dependency Security
- ✓ Tests
- ✓ SonarQube
- ✓ Application Build
- ✓ Docker Build
- ✓ Image Security Scan
- ✓ ECR Authentication
- ✓ Image Push

When something fails, the logs should make the failure easy to diagnose.

Avoid hiding important errors behind generic scripts.

## 30. CI Implementation Order

The CI pipeline should not be implemented all at once.

Implement it incrementally.

Recommended order:

```text
1. Verify application locally
        ↓
2. Verify application tests
        ↓
3. Create Dockerfiles
        ↓
4. Build Docker images locally
        ↓
5. Run containers locally
        ↓
6. Verify Kubernetes manifests
        ↓
7. Verify application on Kubernetes
        ↓
8. Configure OWASP
        ↓
9. Configure SonarQube
        ↓
10. Configure container image scanning
        ↓
11. Create GitHub Actions workflow
        ↓
12. Automate dependency installation
        ↓
13. Automate tests
        ↓
14. Automate SonarQube
        ↓
15. Automate application build
        ↓
16. Automate Docker build
        ↓
17. Automate image scanning
        ↓
18. Configure AWS authentication
        ↓
19. Configure ECR
        ↓
20. Push images from CI
        ↓
21. Verify complete CI pipeline
```

## 31. Definition of Done — CI

CI is considered complete when:

- [ ] GitHub Actions workflow is working.
- [ ] Pull Requests trigger CI validation.
- [ ] Main branch triggers the full CI workflow.
- [ ] Dependencies install successfully.
- [ ] Dependency security checks run.
- [ ] Automated tests run.
- [ ] SonarQube analysis runs.
- [ ] SonarQube quality gate is enforced.
- [ ] Application builds successfully.
- [ ] Frontend Docker image builds successfully.
- [ ] Backend Docker image builds successfully.
- [ ] Docker images are security scanned.
- [ ] AWS authentication is secure.
- [ ] Images are tagged with immutable identifiers.
- [ ] Images are pushed to Amazon ECR.
- [ ] CI does not directly deploy to EKS.
- [ ] GitOps handoff is ready for the CD phase.
- [ ] CI failures prevent invalid artifacts from being published.

## 32. Final CI Flow

The final CI architecture for the Notes App is:

```text
                    DEVELOPER
                        |
                        v
                   GitHub Push
                        |
                        v
               ┌─────────────────┐
               │ GitHub Actions  │
               └────────┬────────┘
                        |
                        v
                  Checkout Code
                        |
                        v
              Install Dependencies
                        |
                        v
               OWASP Dependency Check
                        |
                        v
                 Automated Tests
                        |
                        v
                  SonarQube Scan
                        |
                        v
                 Quality Gate
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
                AWS Authentication
                        |
                        v
                 Image Tagging
                        |
                        v
                 Amazon ECR
                        |
                        v
              Verified Image Ready
                        |
                        v
                 GitOps Handoff
                        |
                        v
              ─────── CD ───────
                   Argo CD
                        |
                        v
                      EKS
```

## 33. Core Principle

The Notes App CI pipeline follows this principle:

> Build once, verify thoroughly, publish only trusted artifacts, and let the CD/GitOps system handle deployment.

CI produces the artifact.

CD deploys the artifact.

Argo CD maintains the desired state.

Kubernetes runs the application.

Monitoring observes the application and infrastructure.