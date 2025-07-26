# Frontend Todo List - Orb Integration Hub

## Completed Tasks

* [x] Moved infrastructure directory from backend to root.
* [x] Updated documentation to reflect new directory structure.

## Next Steps

* [ ] Enhance MFA security.
* [ ] Complete payment processing implementation.

## Prerequisites

*   [x] Backend GraphQL API endpoint accessible.
*   [x] Final decisions made on UI Component Library (from `frontend-design.md`). => Status: PrimeNG
*   [x] Final decisions made on State Management approach (from `frontend-design.md`). => Status: NgRx
*   [ ] Basic wireframes/mockups available (Optional but recommended). => Status: None planned currently
*   [ ] Development environment set up as per [Development Guide](development.md). => Status: Guide created, needs details

## Foundational Phase: Project Setup & Core Structure

*   [x] Initialize Angular project (`ng new orb-integration-hub-frontend`).
*   [x] Install core dependencies (PrimeNG, primeicons). AWS Amplify, NgRx already present.
*   [ ] Configure base project settings (proxy, environments, linting).
*   [x] Configure AWS Amplify in the Angular application (initial setup). (User confirmed done)
*   [x] Create `CoreModule` (for singleton services, guards). (Verified exists)
*   [/] Create `SharedModule` (for common components, pipes, directives). (Directory exists, needs module file if components are shared)
*   [x] Define base application routing (`AppRoutingModule`). (Exists as `app.routes.ts`)
*   [/] Implement main layout components (e.g., `LayoutComponent`, `HeaderComponent`, `FooterComponent`, `NavComponent`). (AppLayout exists, review complete, Footer missing)

## Feature: Authentication Flow Creation (`auth-flow-creation`)