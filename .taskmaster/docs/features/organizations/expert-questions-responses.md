# Organizations Feature - Expert Questions & Responses
**Date Started:** June 21, 2025  
**Review Type:** Systematic Option A - All Questions  
**Status:** In Progress  

---

## 📊 **PROGRESS TRACKER:**
- **DevSecOps Engineer:** ✅ Complete (6/6 questions answered)
- **Principal Software Engineer:** ✅ Complete (7/9 questions answered)  
- **Senior UX/UI Engineer:** ⏸️ Pending (0/12 questions answered)
- **Principal QA Engineer:** ⏸️ Pending (0/7 questions answered)
- **Business Logic:** ⏸️ Pending (0/6 questions answered)
- **Implementation Priority:** ⏸️ Pending (0/3 questions answered)

**Total Progress:** 13/42 questions answered

## 📝 **TASK UPDATES LOG:**
- **June 22, 2025** - **Task #25** - Updated with confirmed DevSecOps requirements (defense-in-depth security, org-specific encryption, internal invitations, payment validation, production approval workflows, comprehensive audit logging, GDPR compliance)
- **June 22, 2025** - **Task #26** - Updated with confirmed data model (dual API keys, table structures, enum definitions, Bearer auth) and Principal Software Engineer requirements (scaling, GSI strategy, migration approach, API design, caching, error handling)

---

## 📝 **ADDITIONAL REQUIREMENTS CAPTURED:**

### Applications Table Update
**Applications Table:**
- Hash Key: `applicationId` 
- Range Key: `environmentId`  
- Fields: `organizationId`, `name`, `description`, `status`, `apiKey`, `apiKeyValidFrom`, `apiKeyValidTo`, `createdAt`, `updatedAt`

**API Key Requirements:**
- 1 API key per applicationId/environmentId combination (3 environments = 3 separate keys)
- Structured format: `app_env_{environment}_sk_{random}` (e.g., app_env_live_sk_abc123...)
- Automatic rotation with dual-key system for zero-downtime
- Dual-key fields: apiKey/apiKeyNext with separate validity periods
- Used for calling application authentication to access GraphQL endpoints
- Grants access to applicationUser info and user login/callback flows
- Authorization: Bearer {apiKey} header format

**Enhanced Applications Table:**
- Hash Key: `applicationId`, Range Key: `environmentId`
- Fields: `organizationId`, `name`, `description`, `status`
- API Keys: `apiKey`, `apiKeyValidFrom`, `apiKeyValidTo`
- Next Keys: `apiKeyNext`, `apiKeyNextValidFrom`, `apiKeyNextValidTo`
- Rotation: `lastRotated`, `rotationSchedule`, `createdAt`, `updatedAt`

---

## 🔐 **DEVSECOPS ENGINEER RESPONSES:**

### 1. Multi-Tenancy Security Details

**Q1.1: How should we implement row-level security for cross-organization data protection?**
- Use DynamoDB condition expressions on every query?
- Organization context validation in middleware?  
- Both approaches for defense in depth?

**RESPONSE:** ✅ **Option C - Both approaches (defense in depth)**
- Middleware validates user organization membership for early validation + performance
- DynamoDB condition expressions as final security enforcement on every query
- Provides multiple security layers and prevents data access even if middleware is bypassed

**Q1.2: For organization data encryption, do you need:**
- Standard AWS encryption at rest?
- Organization-specific encryption keys?
- Customer-managed keys (CMK) per organization?

**RESPONSE:** ✅ **Option B - Organization-specific encryption keys**
- Separate KMS key per organization for limited blast radius
- Important for auth/authorization data security
- Minimal code complexity, mainly operational overhead
- Cost: ~$1/month per org + API costs, but worth it for security posture

### 2. Invitation Security Process

**Q2.1: How should invitation tokens work?**
- JWT with organization context and expiration?
- What expiration timeframe? (24 hours, 7 days, 30 days?)
- Should tokens be single-use only?

**RESPONSE:** ✅ **Internal notification system only (no email tokens)**
- Invitations handled through in-app Notifications table
- Optional email notifications only to alert of pending approval
- 24-hour expiration, single-use for security
- JWT format for industry standard approach with organization context
- Token invalidated immediately upon acceptance/rejection

**Q2.2: What validation occurs when someone accepts an invitation?**
- Must they already be a paying customer?
- Can they accept invitation then pay?
- What if their payment fails after accepting?

**RESPONSE:** ✅ **Option C - Hybrid approach with payment validation**
- User receives "transfer ownership" notification
- On click, system checks if user is paying customer (userGroup = CUSTOMER)
- If not paying: redirect to payment screen with transfer context messaging
- Once payment completes: ownership transfer executes automatically
- If payment fails: transfer remains in pending state until payment succeeds
- Clear messaging throughout about payment requirement for ownership transfer

### 3. Production Environment Security

**Q3.1: Should production environment access require special approval?**
- Separate approval workflow for production vs staging/dev?
- Time-limited production access?
- Enhanced logging for production operations?

**RESPONSE:** ✅ **Enhanced production security with approval workflows**
- Separate approval workflow required for production environment access
- Organization owners must explicitly approve production access requests
- Time-limited production access (24-hour sessions, renewable)
- Enhanced audit logging for all production operations with full event tracking
- Staging/dev environments require standard organization role permissions only
- Production access reverts to organization-level permissions after time limit expires
- Real-time alerts for production access grants and suspicious activities

### 4. Audit Logging Requirements

**Q4.1: What organization operations need audit logging?**
- All CRUD operations on organizations?
- Role changes and user invitations?
- Application transfers and environment access?
- Financial/billing events?

**RESPONSE:** ✅ **Comprehensive audit logging for all critical operations**
- All CRUD operations on organizations with full event details
- Role changes and user invitations with before/after state tracking
- Application transfers and environment access with approval chains
- Financial/billing events including payment status changes and ownership transfers
- API key rotations and authentication events
- Production environment access grants and usage
- Data export and deletion operations for compliance
- Failed authorization attempts and security violations
- Audit log retention: 7 years for compliance, immutable storage

### 5. Compliance Requirements

**Q5.1: For GDPR/CCPA compliance:**
- When user deletes organization, how thorough should data deletion be?
- Data export requirements for organization data?
- Data residency requirements by geographic region?

**RESPONSE:** ✅ **Full compliance with data protection regulations**
- Complete data deletion within 30 days including all related records (applications, users, notifications)
- Audit logs maintained for legal compliance (7-year retention exempt from deletion)
- Data export in machine-readable format (JSON) including all organization data
- Right to portability support for transferring data between systems
- Data residency enforcement: US customers data stays in US regions
- GDPR Article 17 "right to be forgotten" implementation with verification
- Privacy by design with minimal data collection and processing
- Regular compliance audits and data mapping documentation

---

## 💻 **PRINCIPAL SOFTWARE ENGINEER RESPONSES:**

### 6. Database Performance & Scaling

**Q6.1: What's your expected scale?**
- How many organizations per user (typical/max)?
- How many users per organization (typical/max)?
- How many applications per organization (typical/max)?

**RESPONSE:** ✅ **Conservative scale with single organization focus**
- Organizations per user: Mode 1, Maximum 5 organizations per user
- Users per organization: Small teams, typically <10 users per organization
- Applications per organization: Typically 1 application (with 1-5 environments), Maximum 10 applications per organization

**Q6.2: Global Secondary Index strategy:**
- Need GSI for "all users in organization" lookups?
- Need GSI for "all applications in organization" lookups?
- Performance requirements for these queries?

**RESPONSE:** ✅ **GSI strategy for Applications tab performance**
- GSI for "all users in organization" lookups: Yes, required for Applications tab
- GSI for "all applications in organization" lookups: Yes, required for Applications tab
- Performance requirements: Applications tab load time <2s, individual queries <500ms per industry standards
- Query patterns: Organization-scoped user lists and application lists for dashboard display

### 7. Migration Strategy

**Q7.1: How do we migrate existing customers?**
- Automatically create default organization for each customer?
- Migrate existing applications to their new organization?
- Timeline for migration (immediate, phased rollout)?

**RESPONSE:** ✅ **Greenfield development with payment-gated organization creation**
- No existing customers to migrate (greenfield development)
- Organization creation: Create organization on payment completion, or create with status PENDING and activate on payment
- Access control: Organization remains inaccessible until payment is completed
- Default organization: Auto-create default organization for each paying customer

**Q7.2: Rollback planning:**
- If we need to rollback, how do we handle new organizations created during rollout?
- Data consistency requirements during rollback?

**RESPONSE:** ✅ **DynamoDB best practices approach**
- Rollback strategy: Defer to DynamoDB best practices (data rollback not typically appropriate for NoSQL)
- Forward-only migrations: Use feature flags and gradual rollout instead of data rollbacks
- Data consistency: Maintain data integrity through application logic rather than rollback procedures
- Emergency procedures: Focus on disabling features rather than rolling back data changes

### 8. API Design & Performance

**Q8.1: GraphQL query patterns:**
- Should we support nested queries (org → apps → environments → users)?
- Pagination requirements for large organization member lists?
- Real-time subscriptions for organization updates?

**RESPONSE:** ✅ **Frontend store-driven approach with optimized nested queries**
- Initial data loading: On login, grab all orgs → all apps/environments → populate frontend stores
- Nested queries: Support nested queries if optimal DynamoDB speeds can be maintained
- Performance requirement: Keep nested queries optimized for DynamoDB performance
- Frontend stores: Use application stores for data management after initial load
- Pagination: Required for organization member lists (given <10 users typically, simple pagination)
- Real-time subscriptions: Yes, for ApplicationUsers role changes - user experience should update without logout/login when roles change

**Q8.2: Caching strategy:**
- How often does organization data change?
- Cache organization membership at application level?
- Cache invalidation strategy for role changes?

**RESPONSE:** ✅ **Static data caching with targeted invalidation**
- Organization data: Fairly static, changes infrequent
- Organization→Application→User relationships: Pretty static, not fluid data exchange
- Caching approach: Aggressive caching with targeted cache invalidation on role changes
- Cache invalidation: Event-driven invalidation when role changes occur (to support real-time updates)

### 9. Error Handling & Reliability

**Q9.1: Multi-table operation failures:**
- If application transfer fails partway through, how do we rollback?
- Retry logic for invitation/notification failures?
- How to handle eventual consistency issues?

**RESPONSE:** ✅ **Status-based recovery with retry logic**
- Application transfer failures: Don't rollback, use status TRANSFER_PENDING → retry logic → TRANSFER_FAILED if retries exhausted
- Retry logic: Implement retry logic for invitation/notification failures
- Eventual consistency: Use strongly consistent reads only when necessary; application transfer is edge case with low usage expected

---

## 🎨 **SENIOR UX/UI ENGINEER RESPONSES:**
[Will be filled as we progress]

---

## 🔍 **PRINCIPAL QA ENGINEER RESPONSES:**
[Will be filled as we progress]

---

## 📋 **BUSINESS LOGIC RESPONSES:**
[Will be filled as we progress]

---

## 🚀 **IMPLEMENTATION PRIORITY RESPONSES:**
[Will be filled as we progress]

---

## 📝 **TASK UPDATES LOG:**
- **Date:** [Date] - **Task #X** - Updated based on response to Q#.#
- **Date:** [Date] - **Task #Y** - Modified requirements for [specific area]

---

## 🔄 **SESSION CONTINUATION NOTES:**
**Last Question Answered:** Principal Software Engineer Q9.1 (Multi-table operation failures)
**Next Question:** Senior UX/UI Engineer Q10.1 (New customer onboarding)
**Critical Decisions Made:** 
- Small team focus: <10 users per org, mode 1 org per user, max 5
- Applications tab performance: <2s load time, <500ms queries
- Static data with aggressive caching and targeted invalidation
- Forward-only error handling with status tracking (no rollbacks)
- Real-time subscriptions for ApplicationUsers role changes
- Greenfield development with payment-gated organization creation

**Tasks Updated:** Task #25 (DevSecOps), Task #26 (Principal Software Engineer)
**Ready for Next Session:** Senior UX/UI Engineer questions (12 questions remaining in that section)