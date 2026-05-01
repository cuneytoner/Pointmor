# Pointmor AI Governance and Risk Controls

## 1. Core Principle

AI assists users and advisors. AI must not be the sole authoritative decision-maker for compliance status, legal classification, or final regulatory conclusions.

Deterministic compliance state remains owned by Pointmor product workflows, persisted records, explicit review actions, and applicable rule logic. AI output is advisory until reviewed and accepted through a governed workflow.

The canonical deterministic state doctrine is defined in [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md). This document adds AI-specific governance controls on top of that doctrine.

---

## 2. Human / Advisor Review

Critical AI outputs require human or advisor review before they can influence final compliance conclusions or customer-facing regulatory status.

Rules:

- review state must be visible wherever critical AI output is shown
- AI-generated outputs should be marked as draft, suggestion, or pending review until reviewed
- accepted/rejected state must be tracked when an output becomes part of the operational record
- reviewer identity and review timestamp must be captured for critical workflows
- "Advisor review waiting" wording may be used only when an advisor or reviewer is assigned
- when no advisor/reviewer is assigned, use neutral wording such as "Review waiting" or "Review is still open"

Examples of critical outputs:

- AI Act risk classification suggestions
- compliance obligation interpretation
- legal/regulatory summary
- customer-facing compliance report text
- advisor/client action recommendations that affect deadlines or obligations

---

## 3. Auditability

AI-assisted workflows must be auditable enough to explain what happened, which model was used, which input was referenced, and who accepted or rejected the output.

Track:

- tenant
- user
- workflow
- prompt version
- model/provider
- input references
- output
- reviewer
- timestamp
- final accepted/rejected state

Audit records should distinguish between:

- persisted audit events
- derived operational signals
- draft AI output
- reviewed / accepted output

Derived signals must not be presented as persisted audit provenance.

---

## 4. Data Protection

AI usage must preserve the platform's tenant isolation and data protection doctrine.

Required controls:

- tenant isolation for every AI job, prompt context, retrieval query, document reference, embedding, and audit record
- optional PII redaction before provider calls where the workflow supports it
- provider retention policy tracking per provider/configuration
- local/private routing policy for sensitive tenants and regulated deployments
- encryption for provider keys and runtime credentials
- document and embedding locality policy per deployment profile

Sensitive tenants may require:

- cloud AI disabled by default
- private/local inference routing
- local vector storage
- no raw document upload to cloud providers
- explicit administrator approval before enabling external AI providers

---

## 5. AI Feature Fallback

Every AI-assisted feature must define its operational fallback before production release.

Each feature should document:

- AI path
- manual fallback
- failure state
- review requirement
- deterministic source of truth

Fallback examples:

- document extraction can fall back to manual field entry
- AI Act summary can fall back to rule-based status and advisor notes
- obligation interpretation can fall back to static obligation templates and manual review
- unavailable provider can fall back to queued/pending/manual-review states

AI unavailability must not block access to deterministic compliance records unless the specific workflow explicitly depends on AI and has communicated that dependency.

---

## 6. Deployment-Specific Controls

### Cloud AI

Cloud AI deployments must document:

- selected provider policy
- no-training / data-retention settings where available
- provider region and data residency assumptions where relevant
- provider allowlist and model allowlist
- cost/rate limit controls
- fallback provider or manual fallback behavior

### Hybrid AI

Hybrid deployments using Pointmor Local Agent must document:

- Local Agent trust boundary
- what leaves the customer network
- what stays local
- audit synchronization policy
- heartbeat and health visibility
- retry/offline behavior
- customer approval rules for sending redacted results or summaries to Pointmor Cloud

### On-Prem

On-prem deployments must document:

- customer-owned logs and infrastructure
- support bundle process
- update process
- backup and restore expectations
- model/runtime change control
- support boundaries for customer-managed hardware
- air-gapped update and audit export process where applicable

---

## 7. Risk Register

| Risk | Description | Required response |
|---|---|---|
| Hallucination | Model returns plausible but incorrect output. | Use structured outputs, evidence linking, deterministic checks, and human/advisor review. |
| Stale model output | Output reflects outdated law, policy, or source material. | Track prompt/model/source versions and show review timestamps. |
| Prompt leakage | Prompt or confidential context is exposed. | Minimize prompt content, redact where possible, and avoid logging raw prompts by default. |
| Tenant data leakage | Data from one tenant is exposed to another tenant. | Enforce tenant scope in AI jobs, retrieval, embeddings, audit logs, and provider routing. |
| Provider outage | Cloud provider is unavailable or degraded. | Use timeouts, retries, fallback providers where allowed, and manual workflow fallback. |
| Local node outage | Local Agent or private runtime is unavailable. | Show health state, queue/retry safely, and provide manual fallback. |
| Cost runaway | AI usage exceeds expected spend. | Use rate limits, token/cost tracking, quotas, and alerts. |
| Unsupported hardware | Customer hardware cannot run required workloads reliably. | Use certified hardware profiles and explicit support boundaries. |
| Unauthorized model/provider change | A provider or model is changed without governance approval. | Use provider allowlists, configuration audit logs, and permission-gated changes. |

---

## 8. Mitigations

Required mitigation patterns:

- structured outputs for machine-consumed AI results
- citations and evidence links for compliance-sensitive claims
- deterministic rules where possible
- explicit review workflow for critical outputs
- rate limits
- cost limits
- provider allowlist
- model allowlist
- capability checks before enabling a feature on a provider/runtime
- audit logs for prompts, outputs, provider/model, reviewer, and final state
- tenant-scoped retrieval and embeddings
- manual fallback states when AI is unavailable

Provider and runtime capabilities must be checked through the AI Gateway. Product modules must not assume all providers support structured JSON, tool calling, long context, embeddings, local-only routing, streaming, or batch jobs.

---

## 9. Forbidden Patterns

- treating AI output as final legal or regulatory determination without review
- product modules calling AI providers directly instead of the AI Gateway
- hiding review state for critical AI output
- presenting derived signals as persisted audit events
- cross-tenant prompt context, retrieval, or embedding search
- enabling arbitrary customer hardware without support classification
- silently switching tenant AI provider or model
- logging raw confidential prompts/documents by default

---

## 10. Related Documents

- AI infrastructure strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI Gateway architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- Pointmor Local Agent: [`30-spec-006-pointmor-local-agent.md`](./30-spec-006-pointmor-local-agent.md)
- Certified AI hardware profiles: [`41-ref-008-certified-ai-hardware-profiles.md`](./41-ref-008-certified-ai-hardware-profiles.md)
- AI deployment packaging: [`41-ref-009-ai-deployment-packaging.md`](./41-ref-009-ai-deployment-packaging.md)
- AI Document Intelligence risk guardrails: [`20-rules-019-ai-document-intelligence-risk.md`](./20-rules-019-ai-document-intelligence-risk.md)
- Deterministic compliance doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
