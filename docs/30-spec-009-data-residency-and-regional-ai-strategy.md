# Data Residency and Regional AI Strategy

## Purpose

Compliance-sensitive customers require visibility and control over data locality.

Pointmor AI infrastructure must support regional and deployment-aware processing across cloud AI, hybrid AI, private AI, and on-prem AI. Enterprise and regulated customers may require provider restrictions, local processing, private inference, restricted data movement, or customer-owned infrastructure.

Deployment flexibility is a strategic platform capability. This document defines residency and regional AI strategy at the architecture-governance level. It does not create legal guarantees, configure cloud infrastructure, or implement routing behavior.

---

## Core Principles

- tenant data locality awareness
- explicit provider routing
- auditable data movement
- least-required data transfer
- local/private processing where required
- no hidden provider routing
- deterministic governance independent of deployment mode

AI deployment mode changes where inference, documents, embeddings, and telemetry may live. It must not change tenant isolation, RBAC, auditability, review requirements, or deterministic compliance state.

---

## Deployment Modes & Residency

### Cloud AI

| Area | Residency implication |
|---|---|
| Inference occurs | Managed cloud AI provider selected through AI Gateway. |
| Documents may live | Pointmor-managed tenant-scoped storage unless tenant policy restricts document processing. |
| Embeddings may live | Pointmor-managed tenant-scoped vector/index service. |
| Metadata may leave environment | Provider request metadata, prompts, redacted context, usage metadata, and provider logs depending on provider policy. |
| Operational tradeoffs | Lowest operational complexity, fastest iteration, strongest dependency on provider region/retention capabilities. |

Cloud AI should be used when tenant policy allows cloud provider processing and provider retention/no-training posture is acceptable.

### Hybrid AI

| Area | Residency implication |
|---|---|
| Inference occurs | Split between cloud AI provider and Pointmor Local Agent based on tenant policy and feature capability. |
| Documents may live | Sensitive documents can remain in the customer environment; approved workloads may use cloud storage. |
| Embeddings may live | Local vector store for private workloads; cloud vector/index service for approved workloads. |
| Metadata may leave environment | Health metadata, job state, usage counters, audit summaries, and optional redacted results. |
| Operational tradeoffs | Better data control with more operational complexity, Local Agent deployment, and queue/failure handling. |

Hybrid AI is the bridge between standard SaaS and full private/on-prem operation.

### Private AI

| Area | Residency implication |
|---|---|
| Inference occurs | Dedicated private AI node, private cloud endpoint, or customer-dedicated runtime. |
| Documents may live | Customer-dedicated or private tenant-isolated storage. |
| Embeddings may live | Customer-dedicated/private vector service or local vector store. |
| Metadata may leave environment | Contract-dependent operational metadata, audit summaries, usage records, and support telemetry. |
| Operational tradeoffs | Stronger control and privacy; requires certified hardware/runtime profiles and support boundaries. |

Private AI should be positioned for enterprise customers with stricter data residency, procurement, or confidentiality requirements.

### Full On-Prem

| Area | Residency implication |
|---|---|
| Inference occurs | Customer-owned AI runtime inside customer infrastructure. |
| Documents may live | Customer-owned database/object storage. |
| Embeddings may live | Customer-owned vector/index service. |
| Metadata may leave environment | None by default for normal operation; support exports only through customer-approved process. |
| Operational tradeoffs | Highest control, highest operational complexity, explicit upgrade/backup/support responsibilities. |

Full on-prem deployments should be reserved for regulated or high-value customers whose requirements justify the operational cost.

### Air-Gapped

| Area | Residency implication |
|---|---|
| Inference occurs | Fully isolated customer-controlled runtime. |
| Documents may live | Fully isolated customer-controlled storage. |
| Embeddings may live | Fully isolated customer-controlled vector/index service. |
| Metadata may leave environment | None during normal operation; manual export only under controlled customer process. |
| Operational tradeoffs | Very high complexity; requires offline updates, audit export, incident response, and support procedures. |

Air-gapped mode is a future enterprise-only option. It must not be described as generally available until operational procedures are complete.

---

## Regional Strategy

Possible regional models:

- EU region
- customer-owned private cloud
- customer datacenter
- sovereign/private deployments
- future regional routing support

Provider region support differs. Some providers may not support all regions, features, model classes, structured output modes, multimodal processing, embeddings, or no-training/retention settings.

Regional strategy should therefore be capability-aware:

- route only to approved provider regions
- expose feature availability differences by region/provider
- avoid silent cross-region failover
- prefer local/private processing when tenant policy requires it
- document unsupported regional assumptions before sales or implementation commitment

Future regional routing can be implemented through AI Gateway provider routing policy and tenant AI settings.

---

## Data Classification

| Data category | Recommended AI mode | Recommended deployment mode | Acceptable provider patterns | Review expectations |
|---|---|---|---|---|
| Public / non-sensitive | Cloud AI acceptable | SaaS / cloud | Approved cloud provider, standard retention/no-training review | Review based on workflow criticality |
| Operational business data | Cloud or hybrid AI | SaaS, hybrid, private if required | Approved provider; tenant policy and audit logging required | Review when output affects workflow state or customer-facing conclusions |
| Compliance-sensitive data | Hybrid, private, or carefully governed cloud AI | Hybrid/private preferred; cloud only with approved policy | Provider allowlist, region/retention awareness, redaction where possible | Human/advisor review required for critical outputs |
| Confidential enterprise data | Private AI or hybrid local processing | Private cloud, dedicated runtime, Local Agent | Local/private provider routing; cloud only by explicit policy | Review and audit required |
| Regulated / highly restricted data | Full on-prem or local/private processing | On-prem, private cloud, air-gapped future option | Customer-owned runtime or certified private deployment | Explicit review, audit, and customer policy controls required |

Classification should be tenant-policy-aware. A feature safe for public/non-sensitive data may be restricted for confidential or regulated data.

---

## AI Data Flow Boundaries

AI workflows may involve several data types with different locality requirements.

| Data type | Boundary guidance |
|---|---|
| Prompts | May contain sensitive context; should use least-required data, redaction where supported, and provider policy controls. |
| Embeddings | May leak semantic information; should be tenant-scoped and local/private where required. |
| Vector DB | Must remain tenant-scoped; local/private vector stores may be required for sensitive tenants. |
| Uploaded files | Raw files should stay local/private when tenant policy requires it; cloud processing requires explicit allowed provider policy. |
| AI outputs | May sync to cloud if tenant policy allows; critical outputs require review before authoritative use. |
| Audit logs | Must preserve traceability; sensitive contents should be minimized in logs. |
| Telemetry | Should avoid raw document/prompt content; support metadata and health state can be allowed by policy. |
| Usage metadata | Usually safe to sync when scoped and non-content-bearing; enterprise policy may restrict detail level. |

Possible handling:

- remain local
- sync to cloud
- require redaction
- require tenant policy controls
- require explicit admin approval

No AI workflow should silently change where customer data is processed.

---

## Local / Private AI Routing

Local/private AI routing is the mechanism for keeping selected processing close to customer data.

Core components:

- Pointmor Local Agent
- private inference endpoints
- local vector search
- customer-owned models/runtimes
- outbound-only communication preference
- restricted metadata sync

Routing rules:

- Product modules call AI Gateway.
- AI Gateway resolves tenant policy, deployment mode, provider allowlist, and required capabilities.
- Local Agent receives jobs only when registered and approved.
- Private mode must not silently downgrade into cloud processing.
- Cloud fallback from local/private processing requires explicit tenant policy.

Outbound-only communication from customer network to Pointmor Cloud is preferred for hybrid mode because it reduces inbound exposure and simplifies customer security review.

---

## Governance & Compliance

Residency-aware AI requires explicit governance.

Governance requirements:

- provider transparency
- retention awareness
- no-training policy awareness
- tenant-level provider restrictions
- auditability
- administrator visibility

Administrators should be able to understand:

- which provider/runtime is approved
- which region/deployment mode is used
- whether documents or embeddings leave the customer environment
- whether cloud fallback is allowed
- which features are unavailable because of residency policy
- what audit/usage metadata is retained

Do not imply legal compliance guarantees unless they are supported by contract, implementation, and operational process.

---

## Enterprise Policy Controls

Enterprise policy controls may include:

- approved provider allowlist
- blocked providers
- region lock
- deployment lock
- local-only AI mode
- restricted feature mode
- customer-owned model routing
- cloud fallback disabled
- no raw document upload policy
- embedding locality policy
- support bundle export policy

Policy controls should be tenant-scoped, auditable, and visible to authorized administrators.

---

## Architecture Implications

AI Gateway controls provider routing.

Architecture rules:

- provider routing must be explicit
- capability checks may differ by region/provider
- feature availability may vary by deployment mode
- deterministic systems remain region-independent
- product modules must not encode provider-specific regional assumptions
- provider failover must respect tenant residency policy
- Local Agent and private providers must report capabilities and health status
- audit logs must distinguish requested route, actual route, fallback route, and blocked route

Deterministic compliance state should remain governed by the same domain rules regardless of AI deployment mode. Region and provider differences should affect AI availability, not the meaning of compliance state.

---

## Risks

| Risk | Description |
|---|---|
| Accidental cross-region transfer | Data is routed to an unapproved provider region or fallback path. |
| Provider failover changing residency | Automatic fallback uses a provider/region not approved for the tenant. |
| Embedding leakage | Embeddings expose semantic information or are stored outside approved locality. |
| Telemetry leakage | Logs or support telemetry include sensitive prompts, documents, or outputs. |
| Unsupported regional assumptions | Sales or implementation assumes a provider/model feature exists in a region where it does not. |
| Hidden provider retention policies | Provider data retention/no-training behavior is not visible or tracked. |

---

## Mitigations

Mitigation patterns:

- explicit routing policies
- provider transparency
- redaction
- tenant policy controls
- audit logs
- deployment-aware feature flags
- local-only processing modes
- provider/model/region allowlists
- blocked provider lists
- no silent cross-region failover
- Local Agent health and capability reporting
- support bundle content controls
- embedding locality policy

The first implementation slice should prioritize explicit tenant provider policy, provider region metadata, no silent fallback, and audit records for AI routing decisions.

---

## Related Documents

- AI infrastructure strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI Gateway architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- Pointmor Local Agent: [`30-spec-006-pointmor-local-agent.md`](./30-spec-006-pointmor-local-agent.md)
- AI feature classification matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
- Tenant AI budgeting and cost isolation: [`30-spec-008-tenant-ai-budgeting-and-cost-isolation.md`](./30-spec-008-tenant-ai-budgeting-and-cost-isolation.md)
- AI governance and risk controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- Deterministic compliance doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
