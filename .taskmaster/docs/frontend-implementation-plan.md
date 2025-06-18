# Frontend Implementation Plan - Orb Integration Hub

This document outlines the phases, tasks, and milestones for building the Orb Integration Hub frontend, based on the design specified in `../../docs/frontend-design.md` and organized by features defined in `features/REGISTRY.md`.

## 1. Introduction

*   **Purpose:** Provide a step-by-step roadmap for frontend development, aligned with feature delivery.
*   **Reference:** This plan directly follows the specifications outlined in the [Frontend Design Plan](../../docs/frontend-design.md) and references feature details in `features/`.

## 2. Prerequisites

*   [ ] Backend GraphQL API endpoint accessible.
*   [ ] Final decisions made on UI Component Library (from `frontend-design.md`).
*   [ ] Final decisions made on State Management approach (from `frontend-design.md`).
*   [ ] Basic wireframes/mockups available (Optional but recommended).
*   [ ] Development environment set up as per [Development Guide](development.md).

## 3. Foundational Phase: Project Setup & Core Structure

*   **Goal:** Establish the basic Angular application structure, routing, and core layout components necessary for feature implementation.
*   **Tasks:**
    *   [x] Initialize Angular project (`ng new orb-integration-hub-frontend`).
    *   [ ] Install core dependencies (PrimeNG, primeicons).
    *   [ ] Configure base project settings (proxy, environments, linting).
    *   [ ] Configure AWS Amplify in the Angular application (initial setup).
    *   [ ] Create `CoreModule` (for singleton services, guards).
    *   [ ] Create `SharedModule` (for common components, pipes, directives).
    *   [ ] Define base application routing (`AppRoutingModule`).
    *   [ ] Implement main layout components (e.g., `LayoutComponent`, `HeaderComponent`, `FooterComponent`, `NavComponent`).

## 4. Feature Implementation

*(Features are listed based on `.taskmaster/docs/features/REGISTRY.md`. Add new feature sections as they are initiated.)*

### Feature: Authentication Flow Creation (`auth-flow-creation`)
*   **Goal:** Implement comprehensive authentication flow with login, registration, and account management.
*   **Reference:** `features/auth-flow-creation/` (Assume feature-specific doc exists/will exist)
*   **Frontend Tasks:**
    *   [ ] Create `AuthModule` (lazy-loaded potentially).
    *   [ ] Implement `LoginComponent` within `AuthModule` (UI + Logic).
    *   [ ] Implement Registration Component (if applicable within this feature).
    *   [ ] Implement Password Reset / Forgot Password Component (if applicable).
    *   [ ] Implement `AuthService` for handling authentication logic (using Amplify Auth).
    *   [ ] Implement `AuthGuard` for protecting routes (using Amplify Auth state).
    *   [ ] Integrate `AuthService` with backend (Amplify Auth handles Cognito interaction).
    *   [ ] Implement state management for user authentication status (using NgRx, fed by Amplify Auth state).
    *   [ ] Set up unit tests for `AuthService`, `AuthGuard`, and Auth components.
    *   [ ] Add integration tests for login/registration flow.

### Feature: API Explorer (`api-explorer` - *Example Placeholder*)
*   **Goal:** Build the API Explorer feature.
*   **Reference:** `features/api-explorer/`
*   **Frontend Tasks:**
    *   [ ] Create an `ApiExplorerModule` (lazy-loaded).
    *   [ ] Implement `ApiExplorerComponent`.
    *   [ ] Integrate a GraphQL IDE component or build a custom interface (using Amplify API client to execute queries).
    *   [ ] Ensure generated models are usable with Amplify API results.
    *   [ ] Add tests for API interaction service (if applicable).

### Feature: Schema Viewer (`schema-viewer` - *Example Placeholder*)
*   **Goal:** Implement the view for displaying generated data schemas/models.
*   **Reference:** `.taskmaster/docs/features/schema-viewer/`
*   **Frontend Tasks:**
    *   [ ] Create a `SchemaViewerModule` (lazy-loaded).
    *   [ ] Implement `SchemaViewerComponent`.
    *   [ ] Develop service/logic to fetch/process schema information (or potentially read from generated TS models).
    *   [ ] Design UI to display model structures clearly (e.g., tree view, tables).
    *   [ ] Add tests for schema display components/logic.

*(Add sections for other features as they become active in REGISTRY.md)*

## 5. Cross-Cutting Concerns (Apply as features are developed)

*   **Styling Polish:** Apply global and component styles consistently.
*   **Testing Refinement:** Ensure adequate test coverage for completed features.
*   **Accessibility:** Perform checks on implemented features.
*   **UI/UX Review:** Review completed features for consistency and clarity.

## 6. Technology Decisions (Confirmation)

*   **UI Component Library:** PrimeNG
*   **State Management:** NgRx

## 7. Testing Implementation

*   Unit tests (Karma/Jasmine) written alongside feature development.
*   Integration tests focus on feature workflows.
*   Test coverage goals: [Specify Target % if desired].

## 8. Deployment Strategy (Initial)

*   Target Platform: [e.g., AWS S3 + CloudFront] (Verify from `.github/workflows/deploy-frontend.yml`)
*   Build Process: `ng build --configuration production`.
*   CI/CD: GitHub Actions (`.github/workflows/deploy-frontend.yml` and potentially `deploy-backend.yml`).

## 9. Timeline & Estimation (Optional)

*   **Foundational Phase:** [Estimate]
*   **Feature: auth-flow-creation:** [Estimate]
*   *(Add estimates for other features)* 