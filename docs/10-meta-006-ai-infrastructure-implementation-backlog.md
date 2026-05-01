# AI Infrastructure Implementation Backlog

This backlog translates the AI Infrastructure strategy into implementation epics and actionable tasks. It is planning material only; it does not create product behavior by itself.

Related documents:

- Strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI Gateway architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- Pointmor Local Agent: [`30-spec-006-pointmor-local-agent.md`](./30-spec-006-pointmor-local-agent.md)
- Governance controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- Certified hardware profiles: [`41-ref-008-certified-ai-hardware-profiles.md`](./41-ref-008-certified-ai-hardware-profiles.md)
- Deployment packaging: [`41-ref-009-ai-deployment-packaging.md`](./41-ref-009-ai-deployment-packaging.md)

---

## Epic 1: AI Gateway Foundation

### Objective

Create the provider-agnostic contract that product modules use for AI requests. Product modules must not call OpenAI, Anthropic, Ollama, vLLM, Local Agent, or other runtimes directly.

### Tasks

- define provider interface
- define normalized request/response schema
- define capability profile schema
- add prompt registry concept
- add AI audit event concept
- add structured output validation approach

### Dependencies

- AI Gateway architecture document
- AI governance controls
- module activation and permission doctrine
- provider selection / routing assumptions

### Acceptance Criteria

- product-facing AI interface is documented and stable enough for one provider adapter
- capability checks are part of the contract
- prompt versioning and audit metadata are included in request lifecycle design
- structured output validation failure behavior is defined
- tenant context is mandatory for all AI requests

### Risks

- gateway becomes a thin provider proxy without governance value
- provider-specific behavior leaks into product modules
- structured output requirements differ too much between providers
- audit fields are designed too late and become inconsistent

### Recommended Priority

P0 - foundation for every later AI infrastructure phase.

---

## Epic 2: Async AI Jobs

### Objective

Define queue-first AI execution so long-running, expensive, or failure-prone AI work is observable and recoverable.

### Tasks

- define `ai_jobs` lifecycle
- queue integration
- status model: `pending`, `running`, `completed`, `failed`, `review_required`
- retry/fallback policy
- UI state requirements

### Dependencies

- AI Gateway Foundation
- queue/worker architecture decision
- audit event concept
- product UI state patterns

### Acceptance Criteria

- job lifecycle states are documented and mapped to UI behavior
- retry and fallback rules are explicit
- failed jobs do not hide deterministic source-of-truth data
- review-required state is separate from completed state
- job events can be audited by tenant, workflow, user, provider, and model

### Risks

- synchronous AI calls creep into product flows
- users cannot tell whether AI work is pending, failed, or waiting for review
- retry behavior creates duplicate outputs or cost spikes
- manual fallback is omitted for failed jobs

### Recommended Priority

P0 - needed before production AI workflows become reliable.

---

## Epic 3: Cloud Provider Adapter

### Objective

Implement the first managed cloud AI path through AI Gateway while preserving tenant-level routing, auditability, and cost controls.

### Tasks

- first provider implementation
- tenant provider setting
- API key handling
- usage tracking
- timeout/retry handling

### Dependencies

- AI Gateway Foundation
- Async AI Jobs baseline
- encrypted configuration/key handling approach
- provider retention/no-training policy decision

### Acceptance Criteria

- one cloud provider works through the AI Gateway contract
- tenant provider settings are conceptually separated from product modules
- API keys are not exposed to frontend or logs
- usage metadata can support token/cost reporting
- timeouts and retries are bounded

### Risks

- provider credentials are handled inconsistently
- cloud provider assumptions become embedded in product logic
- missing cost controls cause runaway usage
- provider-specific output quirks bypass validation

### Recommended Priority

P1 - first production path after gateway and async job foundations.

---

## Epic 4: Governance Integration

### Objective

Ensure AI-assisted compliance workflows remain reviewable, explainable, and non-authoritative until accepted through governed review.

### Tasks

- review flags
- advisor review state
- audit logs
- disclaimer/AI suggestion labeling
- deterministic fallback

### Dependencies

- AI governance controls
- AI Gateway audit metadata
- product-specific review workflows
- RBAC and module permission mapping

### Acceptance Criteria

- critical AI outputs are labeled as suggestions/drafts before review
- advisor-specific wording is used only when an advisor/reviewer is assigned
- accepted/rejected states can be represented
- deterministic source of truth is visible separately from AI output
- audit trail captures prompt version, model/provider, user, reviewer, timestamp, and final state

### Risks

- AI appears to make final compliance decisions
- review state is hidden or ambiguous
- derived signals are mistaken for persisted audit events
- advisor workflows imply assignment where none exists

### Recommended Priority

P0 - must be designed before compliance-critical AI output ships broadly.

---

## Epic 5: Local Runtime Adapter

### Objective

Enable a controlled local AI demo path without committing the platform to arbitrary local runtime support.

### Tasks

- Ollama-compatible adapter
- local embedding adapter
- local model capability profile
- Mac Mini demo setup notes

### Dependencies

- AI Gateway provider interface
- capability profile schema
- hardware profile guidance
- Local Agent architecture direction

### Acceptance Criteria

- local runtime is exposed through the same gateway contract
- local model capabilities are explicit and not assumed to match cloud frontier models
- Mac Mini demo setup is documented as demo/PoC/private AI showcase, not default production backbone
- embeddings proof of concept stays tenant-scoped

### Risks

- local demo path is mistaken for production support promise
- local model limitations create misleading product demos
- local embeddings leak tenant data without strict scoping
- unsupported runtime variants create support burden

### Recommended Priority

P2 - valuable for demos and validation after cloud path contract is stable.

---

## Epic 6: Pointmor Local Agent

### Objective

Create the customer-environment bridge for hybrid/private AI deployments while keeping customer data locality and support boundaries explicit.

### Tasks

- agent registration
- heartbeat
- job polling
- local result submission
- local vector store
- secure configuration

### Dependencies

- AI Gateway Foundation
- Async AI Jobs
- Local Runtime Adapter
- Local Agent architecture document
- security and provisioning model

### Acceptance Criteria

- agent can be registered to a tenant/environment concept
- heartbeat reports health without leaking raw customer data
- job polling or dispatch model is documented
- result submission policy distinguishes raw output, redacted output, and audit summary
- secure configuration and key rotation approach is defined

### Risks

- inbound connectivity requirements make hybrid deployment harder to sell
- local jobs leak raw documents to cloud unintentionally
- offline behavior loses audit continuity
- customer network/security assumptions vary widely

### Recommended Priority

P2 - follows stable gateway/job contracts and local runtime validation.

---

## Epic 7: Enterprise Deployment

### Objective

Prepare a supportable private AI / private cloud deployment path for high-value regulated customers.

### Tasks

- vLLM-compatible endpoint
- Docker Compose profile
- private cloud deployment notes
- certified hardware runbooks
- monitoring/observability

### Dependencies

- Certified AI hardware profiles
- Local Agent MVP or private gateway routing pattern
- production deployment/runbook doctrine
- observability and support process decisions

### Acceptance Criteria

- vLLM-compatible runtime path is represented as a gateway/provider capability
- deployment notes distinguish demo, pilot production, enterprise production, and air-gapped profiles
- support/runbook docs define logs, backups, upgrades, and monitoring expectations
- hardware profiles define certified, compatible, best-effort, and unsupported boundaries

### Risks

- "any hardware supported" expectation appears in sales or delivery
- enterprise deployment becomes bespoke per customer
- observability is insufficient for support
- upgrade and backup responsibilities are unclear

### Recommended Priority

P3 - enterprise readiness after Local Agent and provider contracts mature.

---

## Epic 8: Packaging & Sales Enablement

### Objective

Turn AI deployment modes into clear commercial packaging without overpromising immature operational modes.

### Tasks

- package matrix
- sales one-pagers
- hardware profile sheet
- private AI demo script
- on-prem qualification checklist

### Dependencies

- AI deployment packaging document
- certified hardware profiles
- AI infrastructure strategy
- governance controls
- validated demo/private AI workflow

### Acceptance Criteria

- packages map clearly to Cloud AI, Hybrid AI, Private AI, and regulated/on-prem paths
- sales material states that AI is assistive and human-reviewed for critical compliance workflows
- hardware support boundaries are explicit
- on-prem qualification checklist prevents premature full on-prem offers
- demo script uses supported local/private AI scenario only

### Risks

- sales promises full on-prem or air-gapped delivery too early
- private AI is positioned as replacing human/advisor review
- hardware support scope is unclear
- packaging gets ahead of operational support capability

### Recommended Priority

P2 - should progress alongside demo validation, but gated before enterprise/on-prem sales.
