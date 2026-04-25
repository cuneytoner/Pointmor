# Enforcement Contract (Platform Guarantees)

## Purpose

This document defines how platform rules are enforced across all layers.

It ensures that architectural rules are not optional and cannot be bypassed.

---

## 1) Layered enforcement model

Platform rules MUST be enforced at multiple layers:

### API layer

* tenant context resolution
* membership validation
* role permission checks
* module activation checks

### Service layer

* business logic must not bypass API guards
* all tenant-scoped operations must re-validate context

### Database layer

* unique constraints
* foreign keys
* tenantId presence
* indexing

---

## 2) Mandatory invariants

The following MUST always hold:

* every request resolves to exactly one tenant
* no cross-tenant access without membership
* membership is the single source of truth
* module activation gates functionality
* all database queries MUST be scoped by tenantId
* request execution context MUST be bound to a single tenant for its entire lifecycle

---

## 3) Deny-by-default guarantee

If any validation step fails:

→ access MUST be denied

No fallback or implicit access is allowed.

All denied access attempts MUST be logged for audit and security monitoring.

---

## 4) Forbidden patterns

The following are strictly forbidden:

* using User.tenantId as primary access control
* querying without tenantId filter
* bypassing membership checks
* accessing module data without activation

---

## 4.1) External advisor constraints

If a user has isExternal = true:

- must not be granted ADMIN-level permissions by default
- must only access explicitly assigned tenant data
- must pass all membership + role checks without exception

---

## 5) Developer responsibility

Any new feature MUST:

* respect tenant boundaries
* use membership-based access
* follow module isolation rules

Failure to follow these rules is considered a critical bug.

---

## 6) Future enforcement

These rules may be further enforced via:

* middleware guards
* lint rules
* test automation
* runtime assertions
