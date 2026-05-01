# Deterministic Compliance Doctrine

## Purpose

Compliance platforms must preserve deterministic, auditable system state.

AI can assist workflows, summaries, recommendations, evidence extraction, document understanding, and advisor operations. AI must not become the sole authoritative source of compliance truth.

Deterministic state is required for:

- trust
- auditability
- rollback
- legal defensibility
- advisor review
- tenant isolation
- reproducible compliance decisions

This doctrine defines which parts of Pointmor must remain deterministic, where AI may assist, and how deterministic and AI-assisted systems interact.

---

## Core Principle

**AI-assisted outputs may influence workflows, but deterministic systems remain the authoritative source of compliance state.**

AI output is probabilistic unless explicitly reviewed and accepted into a deterministic workflow record. Even after review, the authoritative state is the reviewed record, not the model output itself.

---

## Deterministic Domains

The following domains must remain deterministic. AI may suggest, summarize, or help prepare data for these domains, but AI must not directly override their authoritative state.

| Domain | Why deterministic behavior matters | Why AI must not directly override it |
|---|---|---|
| Tenant identity and isolation | Tenant boundaries define data ownership, access scope, audit scope, and legal responsibility. | AI context or retrieval errors must never change tenant scope or mix tenant data. |
| RBAC / permissions | Access decisions must be explainable, reproducible, and enforceable across API, UI, and service layers. | AI cannot grant, infer, or bypass permissions. |
| Workflow states | States such as draft, submitted, under review, approved, rejected, blocked, and completed drive operational behavior. | AI can recommend a transition, but only explicit rules or authorized users can change state. |
| Approval / review status | Review state determines whether output is draft, accepted, rejected, or pending. | AI cannot approve itself or mark critical outputs as reviewed. |
| Advisor assignment | Assignment affects responsibility, visibility, workload, and wording such as "Advisor review waiting". | AI can suggest an owner, but assignment must be explicit and auditable. |
| Audit logs | Audit logs explain who did what, when, and why. | AI-generated narratives must not be presented as persisted audit provenance. |
| Timestamps | Timestamps anchor deadlines, SLA, review windows, and audit trails. | AI cannot invent or rewrite authoritative timestamps. |
| Policy / version references | Compliance conclusions depend on the exact policy, rule, prompt, schema, or regulatory version used. | AI can cite or suggest references, but authoritative references must be stored deterministically. |
| Evidence references | Evidence links determine what supports a compliance claim. | AI can extract or suggest evidence, but persisted evidence references must be explicit records. |
| Compliance status calculations | Status drives customer trust, reports, and operational escalation. | AI may assist, but final status must be calculated from deterministic records and accepted reviews. |
| Legal / rule mappings | Rule mappings require traceability to regulations, policies, or configured control libraries. | AI can propose mappings, but cannot silently create authoritative legal interpretation. |
| Risk scoring formulas where regulation requires consistency | Regulated workflows may require repeatable scoring under the same inputs. | AI scoring drift or provider variance cannot replace deterministic formulas where consistency is required. |
| Billing and quotas | Billing, usage limits, and quotas affect customer cost and entitlement. | AI cannot change plan, quota, or usage state. |
| Deployment mode and provider policy | Cloud, hybrid, private, and on-prem profiles determine data routing and support boundaries. | AI cannot choose or bypass provider routing policy. |
| Feature access flags | Feature access controls product availability and tenant entitlements. | AI cannot enable, disable, or infer feature access. |

Deterministic domains should be implemented through explicit records, rules, state machines, versioned references, permission checks, and audit logs.

---

## AI-Assisted Domains

AI assistance is acceptable in domains where probabilistic output can improve workflow efficiency without becoming unreviewed authoritative state.

Acceptable AI-assisted domains:

- summaries
- recommendations
- policy drafting assistance
- evidence extraction
- document classification suggestions
- gap detection suggestions
- remediation suggestions
- semantic search
- conversational assistant features
- advisory copilots

Rules:

- outputs are suggestions
- outputs may require human or advisor review
- outputs may be stale, incomplete, or probabilistic
- outputs must be auditable when they affect compliance workflows
- outputs must preserve tenant scope and module boundaries
- user-facing UI must label AI-assisted content clearly when the distinction matters

AI-assisted features should improve speed and clarity. They must not hide the deterministic source of truth.

---

## Human / Advisor Review Rules

Critical AI-assisted actions require explicit human or advisor review before they become part of final compliance state.

Review is required for:

- final AI Act risk classification acceptance
- compliance obligation interpretation
- regulatory/legal summary intended for customer-facing use
- evidence acceptance for a control or obligation
- remediation plan acceptance when deadlines, ownership, or compliance status are affected
- advisor/client recommendations that affect compliance posture

Review state should appear as:

- draft / suggestion
- review waiting
- advisor review waiting
- accepted
- rejected
- needs revision

Wording rule:

- Use **"Review waiting"** when an item needs review but no advisor or reviewer is assigned.
- Use **"Advisor review waiting"** only when an advisor or reviewer is assigned.

Critical workflows must support explicit acceptance or rejection. Silent acceptance of AI output is not allowed.

---

## AI Output Classification

AI-related output must be classified by authority level.

| Category | Definition | Expected safeguards |
|---|---|---|
| Deterministic | Output produced by explicit rules, stored records, formulas, permissions, or reviewed state. | Versioned rules, audit logs, reproducible inputs, tenant scope, permission enforcement. |
| AI-assisted | Model output used to help a workflow but not final by itself. | Labeling, prompt/model tracking, evidence links, review state, fallback path. |
| Advisory-only | Suggestions, drafts, summaries, or recommendations that do not mutate authoritative state. | Clear UI wording, no automatic state mutation, optional review, source references where available. |
| Experimental / internal | Prototype or internal-only AI behavior not production-authoritative. | Restricted access, no customer-facing authority, no compliance-state mutation, explicit non-production labeling. |

When in doubt, classify AI output as advisory-only until governance, review, and audit requirements are satisfied.

The concrete Pointmor feature matrix is maintained in [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md).

---

## Fallback Doctrine

Every AI-assisted feature must define:

- failure state
- retry behavior
- timeout behavior
- manual fallback
- deterministic source of truth

AI outage must not invalidate core compliance operations. The product must degrade gracefully.

Examples:

- If evidence extraction fails, users can upload and link evidence manually.
- If a summary generation job fails, the underlying assessment, obligations, and evidence remain available.
- If semantic search is unavailable, deterministic filters and record navigation remain available.
- If a provider times out, the workflow can enter pending, failed, or manual-review state without changing compliance status.

Manual fallback is a product requirement, not an afterthought.

---

## Governance & Auditability

AI-assisted compliance workflows must preserve traceability.

Track:

- prompt version
- model/provider
- provider capability profile
- tenant
- user
- workflow
- input references
- evidence links
- output
- timestamp
- reviewer
- accepted/rejected state
- reason for acceptance or rejection where required

Prompt and model changes must be auditable when they affect production workflows. Hidden prompts, unknown providers, or unversioned model behavior are not acceptable for compliance-critical paths.

Evidence linking matters: compliance claims should be traceable to records, documents, answers, obligations, policies, or reviewed advisor notes.

---

## Deployment Implications

Cloud AI, hybrid AI, private AI, and on-prem AI must all preserve deterministic system state consistently.

### Cloud AI

- AI Gateway enforces provider routing, capability checks, audit metadata, and tenant policy.
- Provider outages must not corrupt deterministic records.
- No-training / retention settings should be tracked where available.

### Hybrid AI

- Pointmor Local Agent may process local inference, embeddings, and document processing.
- Local processing must still produce auditable job records and review states.
- What leaves the customer environment must follow tenant policy.

### Private AI

- Private provider/runtime selection must not change product semantics.
- Capability differences must be handled through explicit capability checks.
- Deterministic compliance records remain in the authoritative product data store.

### On-Prem AI

- Customer-owned infrastructure must preserve the same state model, audit semantics, and review rules.
- Support bundles, update processes, and logs must not depend on hidden cloud-only state.
- Air-gapped modes require explicit audit export and update procedures.

Deployment mode changes where inference runs. It must not change which system owns compliance truth.

---

## Anti-Patterns

Avoid:

- AI directly mutating authoritative compliance state
- AI bypassing advisor workflows
- AI-only legal conclusions
- hidden prompts/models
- non-auditable AI actions
- tenant-crossing AI memory/context
- provider-specific assumptions inside product modules
- AI-generated timestamps, reviewers, approvals, or evidence links treated as real records
- using model confidence as a substitute for review
- treating semantic search results as complete evidence sets

---

## Architecture Implications

Product architecture must preserve a separable deterministic core.

Rules:

- product modules must call AI Gateway
- deterministic services must remain separable from AI runtime
- AI capability checks are mandatory
- AI jobs should be async where possible
- AI outputs must carry provenance metadata
- authoritative state transitions must happen through deterministic services or explicit reviewed actions
- provider adapters must not leak provider-specific behavior into product modules
- manual fallback must be designed before production release

The AI Gateway is the integration boundary for AI capability. It is not the owner of compliance truth.

---

## Related Documents

- AI governance and risk controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- AI Gateway architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- AI feature classification matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
- AI infrastructure strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI Act module spec: [`30-spec-001-ai-act-module.md`](./30-spec-001-ai-act-module.md)
- Enforcement contract: [`20-rules-017-enforcement-contract.md`](./20-rules-017-enforcement-contract.md)
- Cross-tenant security: [`20-rules-015-cross-tenant-access-security.md`](./20-rules-015-cross-tenant-access-security.md)
