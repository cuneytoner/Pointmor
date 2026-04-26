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

---

## Development Change Contract

For any future task that changes:

- schema
- seed
- API behavior
- access control
- deployment scripts
- AI processing
- document extraction
- module behavior

The task MUST also update:

- relevant docs
- seed data if needed
- demo data if needed
- tests
- operational guide if behavior changes

A task is NOT complete unless:

- implementation is done
- tests pass
- docs reflect actual behavior
- seed/demo data is updated when required
- operational behavior is documented

---

## Seed Update Rule

If a new feature requires demo data:

- local seed must be updated when useful for development
- demo seed must be updated when useful for demo/staging
- production must never use demo seed
- seed must create TenantMembership where access is needed
- seed must not rely on User.tenantId for access

---

## AI Data Rule

If AI processing or document extraction changes:

- AI risk doc must be updated
- AI infrastructure spec must be updated
- retention/security assumptions must be reviewed
- training-data implications must be documented

---

## AI Seed Data Rule

If AI document processing is introduced:

- demo seed MUST include example documents:
  - receipt
  - invoice
  - contract
  - policy document

- demo seed MUST include:
  - extracted JSON
  - confidence values
  - reviewed vs non-reviewed examples

- AI seed data MUST:
  - be synthetic or anonymized
  - not contain real user data
  - respect tenant isolation

- demo data MUST simulate:
  - correct extraction
  - incorrect extraction
  - low-confidence scenarios

Purpose:

Ensure AI flows can be tested, demoed, and validated consistently.
