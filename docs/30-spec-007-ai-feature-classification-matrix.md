# Pointmor AI Feature Classification Matrix

## Purpose

AI should enhance Pointmor workflows without becoming the single point of truth.

Feature classification improves:

- auditability
- reliability
- product clarity
- enterprise trust
- deployment planning
- support boundaries

Pointmor supports cloud, hybrid, private, and on-prem AI deployment modes. Deployment flexibility requires every AI-related feature to declare whether it is deterministic, AI-assisted, advisory-only, or experimental/internal, and which provider/runtime capabilities it needs.

This matrix is the feature-level companion to the deterministic compliance doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md).

---

## Classification Categories

### Deterministic

Deterministic features have no AI dependency.

Properties:

- no AI dependency
- fully auditable
- reproducible behavior
- required for core platform integrity
- implemented through records, rules, permissions, formulas, or explicit review state

Examples:

- tenant isolation
- RBAC
- workflow status
- approval state
- billing
- audit logs
- compliance state calculations

Deterministic features must remain available even when AI providers, local runtimes, or AI Gateway jobs are unavailable.

### AI-Assisted

AI-assisted features may generate, enrich, extract, or suggest outputs, but deterministic fallback exists.

Properties:

- AI may generate or enrich outputs
- deterministic fallback exists
- human review may be required
- output is traceable to prompt/model/provider and input references
- output must not directly override authoritative state

Examples:

- risk summaries
- evidence extraction
- remediation suggestions
- policy drafting assistance
- document classification suggestions

AI-assisted features may influence workflows, but deterministic systems remain the authoritative source of compliance state.

### Advisory-Only

Advisory-only features provide optional guidance.

Properties:

- AI provides optional guidance
- never authoritative
- user may ignore safely
- should not mutate compliance state
- may have lighter review requirements unless used in a critical workflow

Examples:

- conversational assistants
- semantic search suggestions
- productivity copilots
- advisor helper workflows

Advisory-only output should be labeled so users understand it is optional guidance, not a final compliance decision.

### Experimental / Internal

Experimental/internal features are for testing, research, or internal operations only.

Properties:

- internal/testing-only
- not guaranteed stable
- may change or be removed without compatibility guarantees
- must not be presented as production-authoritative
- must not mutate compliance state unless explicitly reviewed through deterministic workflows

Experimental/internal features require clear access boundaries and labeling.

---

## Feature Matrix

| Feature | Classification | AI Required? | Deterministic Source of Truth | Manual Fallback | Human Review Required? | Audit Required? | Deployment Constraints | Capability Requirements |
|---|---|---:|---|---|---|---|---|---|
| Tenant isolation | Deterministic | No | Tenant, membership, module activation, and access-control records | Not applicable | No | Yes | All modes | None |
| RBAC / permissions | Deterministic | No | Roles, permissions, membership, and route/API guards | Not applicable | No | Yes for privileged changes | All modes | None |
| Workflow status | Deterministic | No | Persisted workflow state and explicit state transitions | Manual state transition by authorized user | Sometimes, based on workflow | Yes | All modes | None |
| Approval / review state | Deterministic | No | Review records and accepted/rejected state | Manual review | Yes for critical compliance workflows | Yes | All modes | None |
| Compliance status | Deterministic | No | Stored records, reviewed evidence, rules, and deterministic calculations | Manual review and deterministic recalculation | Yes when final/customer-facing | Yes | All modes | None |
| Billing and quotas | Deterministic | No | Plans, subscriptions, usage counters, and entitlement rules | Admin correction / support workflow | No | Yes | All modes | None |
| Audit logs | Deterministic | No | Persisted audit events | Not applicable | No | Yes | All modes | None |
| Risk summaries | AI-assisted | Optional | Risk assessment records, reviewed answers, obligations, and accepted notes | Rule-based summary or manual advisor note | Yes if used in final compliance report | Yes | Cloud, hybrid, private, on-prem if capable | `chat_completion`, optional `structured_json`, optional `long_context` |
| Policy recommendations | AI-assisted | Optional | Policy/control library, selected version, reviewed recommendation | Manual policy selection and advisor note | Yes for compliance-critical recommendations | Yes | Provider must satisfy tenant data policy | `chat_completion`, `structured_json`, optional `long_context` |
| AI document analysis | AI-assisted | Optional | Uploaded document, extraction record, evidence links, reviewed output | Manual document review and field entry | Yes for critical evidence | Yes | Local/private routing may be required for sensitive tenants | `structured_json`, optional `multimodal`, optional `long_context` |
| Evidence extraction | AI-assisted | Optional | Source document, extracted fields, reviewer decision, evidence reference | Manual evidence upload/linking | Yes when accepted as control evidence | Yes | Cloud only if tenant policy permits document processing | `structured_json`, optional `multimodal`, optional `embeddings` |
| Document classification suggestions | AI-assisted | Optional | Stored document type after user/system acceptance | Manual classification | Sometimes, based on document type | Yes when persisted | All modes if capability exists | `chat_completion` or `structured_json`; optional `multimodal` |
| Advisor workflow suggestions | AI-assisted | Optional | Assignment records, review queues, obligations, due dates, advisor actions | Manual queue triage | Yes before changing ownership/status | Yes | Advisor access must be membership-scoped | `chat_completion`, optional `structured_json` |
| Semantic search | Advisory-only | Optional | Retrieved source documents and deterministic record navigation | Keyword/filter search and manual navigation | No by default | Yes if query/output affects compliance workflow | Requires tenant-scoped indexes; local/private mode may keep embeddings local | `embeddings`, optional `reranking` |
| AI remediation drafting | AI-assisted | Optional | Obligations, tasks, evidence, reviewed remediation plan | Manual remediation plan drafting | Yes before customer-facing or deadline-affecting use | Yes | Provider must satisfy tenant policy | `chat_completion`, optional `structured_json`, optional `long_context` |
| Conversational assistant | Advisory-only | Optional | Underlying records shown through deterministic navigation | Standard UI navigation and help docs | No unless output is promoted to workflow record | Yes for compliance-sensitive sessions | Capability and data policy dependent | `chat_completion`, optional `tool_calling`, optional `long_context` |
| Local/private AI assistant | Advisory-only or AI-assisted based on workflow | Optional | Same deterministic records as cloud mode | Manual workflow and standard UI | Depends on promoted output | Yes for compliance-sensitive output | Hybrid/private/on-prem only; local runtime health required | `local_only`, `chat_completion`, optional `embeddings`, optional `structured_json` |
| AI Act obligation explanation | AI-assisted | Optional | Obligation records, regulation/control mapping, reviewed advisor notes | Static obligation text and manual explanation | Yes for final report text | Yes | All modes if capability exists | `chat_completion`, optional `long_context` |
| Platform operational priority hints | AI-assisted or deterministic derived signal | Optional | Open obligations, SLA dates, review state, evidence age, assignment records | Deterministic sorting/filtering | No unless changing workflow state | Yes if persisted | All modes | Optional `structured_json`; no AI required for deterministic sorting |
| Experimental prompt evaluation | Experimental / internal | Yes | Evaluation dataset and internal review records | Disable experiment | Internal review only | Yes for internal traceability | Non-production or restricted environments | Depends on experiment |

---

## Capability Awareness

Features must not assume frontier cloud model capabilities.

Local, private, on-prem, and air-gapped deployments may have reduced or different capabilities. Capability negotiation through AI Gateway is mandatory before executing AI workflows.

Capability examples:

- `structured_json`
- `long_context`
- `multimodal`
- `embeddings`
- `reranking`
- `tool_calling`
- `streaming`
- `batch_jobs`
- `local_only`
- `air_gapped_supported`

Rules:

- Product modules declare required and optional capabilities.
- AI Gateway checks provider/runtime capability profiles.
- Missing required capabilities must produce a clear capability error or approved fallback.
- Optional capabilities may improve output quality but must not be required for deterministic source-of-truth workflows.
- Feature flags may differ by deployment mode.

Example:

- Evidence extraction may require `structured_json`.
- Image-heavy document analysis may require `multimodal`.
- Semantic search requires `embeddings` and may optionally use `reranking`.
- Private AI assistant features may require `local_only`.

---

## Fallback & Graceful Degradation

Every AI-assisted and advisory-only feature must define fallback behavior.

Required fallback definitions:

- behavior when AI provider fails
- timeout handling
- retry behavior
- user-facing states
- degraded/manual workflow
- deterministic source of truth

User-facing states should distinguish:

- pending
- running
- failed
- retrying
- unavailable
- review required
- manual fallback available

Critical compliance workflows must remain operable without AI. AI outage must not invalidate compliance status, evidence records, workflow states, approval state, billing, audit logs, or tenant access.

Examples:

- If AI document analysis fails, the user can review the document and enter fields manually.
- If risk summary generation times out, the assessment and deterministic risk/status remain available.
- If semantic search is unavailable, users can use filters, lists, and direct record navigation.
- If a local runtime is offline, local/private AI features show unavailable or queued states without changing compliance records.

---

## Governance Requirements

AI-related features must define governance requirements based on classification.

### Auditability Requirements

Track for AI-assisted and compliance-sensitive advisory features:

- tenant
- user
- workflow
- feature classification
- prompt version
- model/provider
- capability profile
- input references
- output
- timestamp
- reviewer
- accepted/rejected state when applicable

### Review Requirements

Review is required when AI output affects:

- final compliance status
- customer-facing compliance report text
- legal/regulatory interpretation
- evidence acceptance
- remediation plan acceptance
- advisor/client operational deadlines or ownership

### Labeling Requirements

User-facing AI output should be labeled with language appropriate to authority level:

- suggestion
- draft
- AI-assisted
- review waiting
- advisor review waiting
- accepted
- rejected

Use "Advisor review waiting" only when an advisor or reviewer is assigned. Otherwise use "Review waiting" or "Review is still open".

### Disclaimer Expectations

Compliance-critical AI outputs should avoid implying legal finality. Product copy should make clear that AI assists review and preparation, while deterministic records and human/advisor acceptance control final compliance state.

### Accepted / Rejected Tracking

Critical workflows must track whether AI output was:

- accepted
- rejected
- edited before acceptance
- superseded
- left as draft

---

## Product Boundaries

AI is augmentation, not autonomous compliance authority.

Deterministic compliance state remains authoritative.

Product boundaries:

- AI must not directly grant access, assign permissions, or change tenant boundaries.
- AI must not directly mark obligations complete.
- AI must not directly approve evidence.
- AI must not directly change final compliance status.
- AI must not replace advisor review where review is required.
- AI must not hide which provider/model/prompt produced an output.

AI can help users prepare better work faster. It cannot silently become the workflow owner.

---

## Architecture Implications

Product modules should use AI Gateway for all Product AI requests.

Architecture rules:

- product modules must not call providers directly
- feature flags may differ by deployment mode
- capability checks must precede AI workflow execution
- deterministic services must remain separable from AI runtime
- AI outputs must carry classification and provenance metadata
- async AI jobs should be used where work can be slow, expensive, retryable, or review-sensitive
- AI Gateway must normalize provider errors, capability errors, timeout errors, and fallback metadata
- UI must present honest loading, failed, unavailable, review-required, and manual fallback states

The feature matrix should be updated when new AI features are proposed. A feature is not ready for production planning until classification, fallback, auditability, and capability requirements are known.

---

## Related Documents

- Deterministic compliance doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
- AI governance and risk controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- AI Gateway architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- AI infrastructure strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI Act module spec: [`30-spec-001-ai-act-module.md`](./30-spec-001-ai-act-module.md)
