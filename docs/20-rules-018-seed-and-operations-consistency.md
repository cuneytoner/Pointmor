# Seed and Operations Consistency

## 1) Seed must follow platform doctrine

Seed MUST:

- create TenantMembership for all users
- not rely on User.tenantId for access
- reflect real access rules

---

## 2) Seed must match documentation

Whenever seed logic changes:

- docs MUST be updated in same PR

---

## 3) Environment separation

- dev seed != demo seed != production
- production MUST NOT use demo seed

---

## 4) Reset behavior must be explicit

All destructive commands MUST be documented:

- db:reset
- db:clean
- db:fresh

---

## 5) Operational truth rule

Documentation MUST reflect:

- real script behavior
- real deployment flow

Not idealized architecture.

---

## 6) Breaking changes

Any change in:

- seed
- schema
- migrations
- deploy scripts

REQUIRES:

- doc update
- verification

---

## 7) Future alignment

Seed MUST be gradually aligned to:

- membership-first model
- module isolation
