# Schema Constraints (Enforcement of Platform Doctrine)

**Purpose:** Enforce platform doctrine at database level.

---

## 1) Membership uniqueness

A user must not have duplicate memberships for the same tenant.

Constraint:  
`UNIQUE (userId, tenantId)`

---

## 2) Foreign key enforcement

All tenant-scoped tables MUST include:

- `tenantId` (FK → `Tenant.id`)
- proper `ON DELETE` behavior (`RESTRICT` or `CASCADE` explicitly defined)

---

## 3) Module isolation

Module tables MUST:

- include `tenantId`
- NOT reference other module tables directly
- NOT modify core tables (`User`, `Tenant`, `Membership`)

---

## 4) Advisor safety

If `isExternal = true`:

- must not be granted `ADMIN` permissions by default
- role checks must be explicit

---

## 5) Indexing

Required indexes:

- `TenantMembership(userId)`
- `TenantMembership(tenantId)`
- `TenantMembership(role)`
- `TenantModule(tenantId, moduleId)`

---

## 6) Soft delete / audit (recommended)

- `createdAt`, `updatedAt` required
- audit log for cross-tenant actions

---

## 7) Invariants

- Every request MUST resolve to exactly one tenant
- No cross-tenant query without explicit membership
