# Tenant AI Budgeting and Cost Isolation

## Purpose

AI workloads are variable and potentially expensive.

Pointmor supports cloud AI, hybrid AI, private AI, and on-prem AI. Each deployment mode has different cost drivers, operational limits, and support expectations. Tenant-level isolation and budgeting are required so AI consumption is observable, governable, and safe.

This document defines the planning model for AI budgets, quotas, cost attribution, usage isolation, and operational safety. It does not define exact pricing, implement billing logic, or introduce database/API changes.

---

## Core Principles

- tenant AI usage must be isolated
- AI usage must be measurable
- cost spikes must be controllable
- AI should degrade gracefully under limits
- no tenant should negatively impact others
- deterministic platform operations must remain functional under AI limits

AI limits must never break tenant isolation, RBAC, workflow state, audit logs, billing records, or deterministic compliance state. When AI limits are reached, AI-assisted features should move to warning, queued, degraded, unavailable, or manual fallback states.

---

## Budgeting Model

### Tenant AI Budget

A tenant AI budget defines the allowed AI consumption envelope for a tenant over a time period, usually monthly.

It may include:

- included usage
- paid overage policy
- soft limit
- hard limit
- feature-specific caps
- deployment-specific caps
- provider/model restrictions

### Monthly Quota

A monthly quota is the tenant's planned AI usage allowance for a billing or operational period.

Quota may be expressed through multiple dimensions:

- tokens
- jobs
- document pages
- embedding operations
- vector indexing size
- concurrent jobs
- runtime minutes
- provider cost estimate

### Soft Limit

A soft limit warns, nudges, or throttles before hard blocking.

Examples:

- show admin warning
- notify platform operator
- reduce job priority
- require confirmation for expensive jobs
- route non-critical work to lower-cost provider/runtime if allowed

### Hard Limit

A hard limit blocks or pauses non-critical AI usage when the tenant exceeds allowed consumption.

Hard limits should not block deterministic workflows. They should block only AI-assisted or advisory features unless a contract explicitly states otherwise.

### Per-Feature Limits

Some features are more expensive than others.

Examples:

- multimodal document analysis may have a separate cap
- semantic search indexing may have storage and embedding caps
- conversational assistants may have per-user/session caps
- AI remediation drafting may have workflow-specific caps

### Per-User Limits

Per-user limits reduce abuse and help allocate usage fairly inside a tenant.

Examples:

- daily assistant messages per user
- maximum concurrent jobs per user
- document analysis jobs per user
- high-cost model usage restricted to admins/advisors

### Deployment-Aware Limits

Cloud AI, hybrid AI, private AI, and on-prem AI have different limits.

Cloud AI has direct provider token/request costs. Local/private AI may not have per-token provider cost, but it still has GPU, concurrency, queue, storage, support, electricity, and operational capacity constraints.

### Provider-Aware Limits

Different providers/models may have different costs, latency, context limits, and policy constraints.

Provider-aware limits can restrict:

- which provider is allowed
- which model/runtime is allowed
- maximum context length
- maximum multimodal usage
- maximum retries
- maximum monthly spend estimate

Enterprise customers may negotiate custom limits, dedicated pools, committed usage, or customer-managed provider billing. Those options must remain explicit and tenant-scoped.

---

## Usage Dimensions

Pointmor AI usage should be measurable across dimensions that reflect real operational cost.

Measurable dimensions:

- token usage
- embedding generation
- document processing jobs
- AI queue usage
- vector indexing
- reranking
- multimodal requests
- local GPU runtime utilization
- storage usage
- concurrent AI jobs

Additional useful dimensions:

- request count
- retry count
- failed job count
- timeout count
- model/runtime class
- prompt version
- average job latency
- queue wait time
- tenant/user/workflow attribution

Usage records should be normalized by AI Gateway or AI job infrastructure so product modules do not need provider-specific cost logic.

---

## Quota Enforcement

Quota enforcement should support several behaviors rather than a single hard failure mode.

Possible behaviors:

- warn
- throttle
- queue delay
- downgrade model/provider
- disable non-critical AI features
- require manual review/fallback
- temporarily block expensive operations

Recommended enforcement pattern:

1. Measure usage.
2. Compare against tenant, feature, provider, and deployment limits.
3. Emit quota event if nearing or exceeding limits.
4. Apply soft limit behavior when possible.
5. Apply hard limit behavior only to AI-assisted/advisory features.
6. Preserve deterministic workflows and manual fallback.

Deterministic compliance operations must not fail due to AI quota exhaustion.

Examples:

- AI summary generation can be paused while assessment records remain available.
- Semantic search can be disabled while deterministic filters remain available.
- Document extraction can be blocked while manual upload/review remains available.
- Expensive multimodal analysis can require admin confirmation or queue delay.

---

## Multi-Deployment Considerations

### Cloud AI

Cloud AI commonly has direct provider token/request cost.

Controls:

- tenant monthly quota
- provider/model allowlist
- token/cost tracking
- rate limits
- retry ceilings
- soft/hard spend warnings
- fallback provider policy where allowed

Operational concern: hidden provider charges, prompt abuse, large context usage, and retry loops can create unexpected spend.

### Hybrid AI

Hybrid AI may split workloads between cloud providers and Pointmor Local Agent.

Controls:

- separate cloud and local budgets
- Local Agent capacity limits
- queue depth limits
- policy-based routing
- document/embedding locality rules
- audit sync for usage and quota events

Operational concern: the tenant may exhaust local capacity while cloud fallback is restricted by data policy.

### Private AI

Private AI may run on dedicated customer or Pointmor-managed private runtime.

Controls:

- dedicated runtime capacity planning
- tenant-specific concurrency limits
- GPU/runtime utilization thresholds
- maintenance windows
- model/runtime restrictions
- support contract boundaries

Operational concern: local/private runtime may look "free" compared with token billing, but capacity, support, and hardware limits still matter.

### Full On-Prem

Full on-prem AI shifts more operational responsibility to customer-owned infrastructure.

Controls:

- customer-managed capacity planning
- support bundle usage reporting
- local usage dashboards
- update and model change controls
- hardware profile support boundaries
- air-gapped audit export where applicable

Operational concern: Pointmor may not directly observe all infrastructure cost. The system still needs usage and capacity telemetry for support and governance.

---

## AI Cost Attribution

AI usage should be attributable across operational and commercial dimensions.

Attribution concepts:

- tenant
- workspace
- user
- workflow
- feature
- provider
- deployment mode
- model/runtime
- advisor operation
- background job

Attribution examples:

- tenant monthly AI usage
- advisor workload AI usage across client tenants
- document analysis usage by workflow
- semantic search indexing cost by tenant
- local runtime utilization by private AI node
- background extraction cost by scheduled job

Cost attribution should support both product governance and enterprise reporting.

---

## Governance & Auditability

AI usage governance should be auditable.

Track:

- usage logs
- quota events
- override events
- admin visibility events
- audit retention
- enterprise reporting exports

Quota events should capture:

- tenant
- user or system actor
- feature/workflow
- provider/model/runtime
- deployment mode
- limit type
- current usage
- limit value
- enforcement action
- timestamp

Override events should capture:

- who approved the override
- scope of override
- reason
- expiration
- affected tenant/features/providers

Enterprise reporting should support showback, chargeback, security review, and procurement conversations without exposing other tenants' usage.

---

## Enterprise Controls

Optional enterprise controls:

- custom quotas
- dedicated AI pools
- deployment-specific limits
- chargeback/showback
- customer-managed provider billing
- isolated private AI runtime
- model/provider allowlist
- private routing policy
- per-department or per-workspace allocation
- usage export for procurement/security teams

Enterprise controls must remain tenant-scoped and auditable. Custom terms must not weaken tenant isolation or deterministic compliance doctrine.

---

## Architecture Implications

AI Gateway should centralize usage tracking.

Architecture rules:

- AI jobs should emit usage events.
- Provider adapters should normalize usage metadata.
- Deployment capability checks may affect quotas.
- Product modules should not implement provider-specific cost logic.
- Quota checks should happen before expensive work starts where possible.
- Quota enforcement should distinguish deterministic features from AI-assisted/advisory features.
- Retry and fallback policy must have ceilings to avoid runaway cost.
- Usage records should carry tenant, feature, workflow, provider, model/runtime, and deployment mode.

Conceptual flow:

1. Product module requests AI work through AI Gateway or AI job API.
2. Tenant, feature, provider, and deployment policy are resolved.
3. Budget/quota policy is checked.
4. AI job runs or is delayed/blocked/degraded.
5. Provider/runtime usage metadata is normalized.
6. Usage and quota events are stored for audit/reporting.
7. UI/API receives honest state: completed, queued, degraded, quota-limited, failed, or manual fallback available.

---

## Risks

| Risk | Description |
|---|---|
| Runaway AI costs | Large prompts, repeated jobs, or high-cost models exceed planned spend. |
| Infinite retry loops | Failed AI jobs retry without ceilings and multiply cost. |
| Prompt abuse | Users intentionally or accidentally generate excessive AI usage. |
| Tenant starvation | One tenant consumes shared capacity and degrades others. |
| Local runtime saturation | Private/local GPU or CPU resources become overloaded. |
| Hidden provider charges | Provider billing has costs not visible in product-level usage. |
| Unsupported hardware bottlenecks | Customer hardware cannot meet expected throughput or model requirements. |

---

## Mitigations

Mitigation patterns:

- limits
- backpressure
- queues
- retries with ceilings
- usage dashboards
- alerts
- provider allowlists
- model restrictions
- async processing
- per-tenant concurrency limits
- feature-specific caps
- local runtime health checks
- quota events and admin override logs
- manual fallback for critical workflows

The budgeting model should be implemented incrementally. The first production slice should prioritize tenant usage attribution, provider/model metadata, rate limits, retry ceilings, and visible quota-limited states before advanced enterprise chargeback.

---

## Related Documents

- AI Gateway architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- AI infrastructure strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI feature classification matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
- Deterministic compliance doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
- AI governance and risk controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- AI deployment packaging: [`41-ref-009-ai-deployment-packaging.md`](./41-ref-009-ai-deployment-packaging.md)
