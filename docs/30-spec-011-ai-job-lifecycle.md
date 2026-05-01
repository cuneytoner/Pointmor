# AI Job Lifecycle Specification

## 1. Purpose

AI jobs provide a durable, auditable execution unit for AI-assisted workflows.

AI jobs decouple user actions from provider latency, provider failures, queue contention, structured-output validation, review requirements, and future local/private AI execution.

The lifecycle supports:

- retry
- fallback
- review
- auditability
- timeout/expiration
- usage attribution
- future Local Agent and private AI execution

AI job state is not the same as deterministic compliance workflow state. AI output may influence workflows, but deterministic systems remain authoritative.

---

## 2. Scope

MVP scope:

- async AI job state machine
- status transitions
- retry/fallback behavior
- review state handling
- audit event expectations
- user/admin visibility rules

Out of scope:

- provider implementation
- Local Agent implementation
- billing engine
- full workflow UI
- on-prem orchestration

This document defines behavior before implementation. It does not introduce migrations, queues, APIs, controllers, UI, or services.

---

## 3. Job Types

Initial conceptual job types:

| Job type | Purpose | MVP likelihood |
|---|---|---|
| `chat_completion` | General text/chat generation through a provider adapter. | Likely MVP building block |
| `structured_analysis` | Schema-guided analysis returning structured output. | Likely MVP candidate |
| `document_extraction` | Extract fields or evidence from uploaded documents. | Future or narrow MVP if first workflow requires it |
| `evidence_suggestion` | Suggest evidence links or missing evidence. | Future |
| `summary_generation` | Generate draft summaries from deterministic records. | Likely MVP candidate |
| `remediation_draft` | Draft remediation plans or task descriptions. | Future |
| `embedding_generation` | Generate embeddings for semantic search/RAG. | Future |
| `vector_indexing` | Index documents/chunks into tenant-scoped vector store. | Future |

Recommended MVP candidates are `summary_generation`, `structured_analysis`, or a constrained `chat_completion` workflow because they can prove the gateway contract without requiring Local Agent, vector infrastructure, or document-processing depth.

---

## 4. State Machine

### `requested`

Meaning:

- A product module has requested AI work and basic request validation has started.

Entry conditions:

- user/system action requests AI work
- tenant context is present
- feature/workflow key is known
- idempotency key may be resolved

Allowed transitions:

- `requested` -> `queued`
- `requested` -> `failed`
- `requested` -> `fallback_required`
- `requested` -> `cancelled`

User-facing display:

- Usually not visible, or "Preparing AI analysis" for immediate UI feedback.

Admin/operator display:

- Request accepted for validation; no provider call yet.

Audit requirements:

- `job_requested`
- include tenant, user, workflow, feature, input refs, requested capabilities, idempotency key

### `queued`

Meaning:

- The AI job is accepted and waiting for worker/provider capacity.

Entry conditions:

- request passed tenant, permission, policy, capability, and quota pre-checks
- job is persisted or accepted into queue

Allowed transitions:

- `queued` -> `running`
- `queued` -> `cancelled`
- `queued` -> `expired`
- `queued` -> `fallback_required`

User-facing display:

- "Preparing AI analysis" or "AI analysis queued".

Admin/operator display:

- Queue name, enqueue time, tenant, feature, priority, queue latency.

Audit requirements:

- `job_queued`

### `running`

Meaning:

- The worker/provider execution has started.

Entry conditions:

- worker claims job
- provider adapter begins request preparation or sends provider request

Allowed transitions:

- `running` -> `completed`
- `running` -> `failed`
- `running` -> `retry_scheduled`
- `running` -> `review_required`
- `running` -> `fallback_required`
- `running` -> `cancelled`
- `running` -> `expired`

User-facing display:

- "AI analysis running".

Admin/operator display:

- Provider/runtime, model, attempt number, elapsed time, timeout policy.

Audit requirements:

- `job_started`
- `provider_request_sent`
- `provider_response_received` when response returns

### `completed`

Meaning:

- The AI job produced output and no further gateway-level action is required.

Entry conditions:

- provider response returned successfully
- structured validation passed or was not required
- review is not required, or review outcome accepted if the workflow models acceptance as completion

Allowed transitions:

- usually terminal
- `completed` -> `review_required` only if completion and review are modeled as separate late policy decision

User-facing display:

- Show output as draft/suggestion unless deterministic workflow state separately accepted it.

Admin/operator display:

- Completed time, provider/model, validation status, usage metadata, audit event IDs.

Audit requirements:

- `provider_response_received`
- `output_validation_passed` when applicable

### `failed`

Meaning:

- The job cannot complete in the current attempt and no retry is currently scheduled.

Entry conditions:

- non-retryable provider/gateway error
- retry ceiling reached
- validation failed without retry path
- permission/policy/context problem discovered after request

Allowed transitions:

- `failed` -> `retry_scheduled` if manual/operator retry is allowed
- `failed` -> `fallback_required`
- terminal when no fallback/retry applies

User-facing display:

- "AI unavailable" or "AI analysis failed. Manual fallback available." where applicable.

Admin/operator display:

- normalized error code, provider error metadata if safe, retry count, failure timestamp.

Audit requirements:

- `job_failed`

### `retry_scheduled`

Meaning:

- A retryable failure occurred and the system scheduled another attempt.

Entry conditions:

- retryable error category
- retry count below ceiling
- retry policy allows retry

Allowed transitions:

- `retry_scheduled` -> `queued`
- `retry_scheduled` -> `running`
- `retry_scheduled` -> `fallback_required`
- `retry_scheduled` -> `expired`
- `retry_scheduled` -> `cancelled`

User-facing display:

- "AI analysis retrying" or "AI analysis delayed".

Admin/operator display:

- next retry time, backoff interval, attempt count, last error category.

Audit requirements:

- `job_retry_scheduled`

### `review_required`

Meaning:

- AI output exists, but human/advisor review is required before authoritative use.

Entry conditions:

- review policy requires review
- output affects critical compliance workflow
- output is low confidence or policy-sensitive
- workflow requires advisor/client review

Allowed transitions:

- `review_required` -> `completed` / accepted
- `review_required` -> `failed` if review cannot proceed due invalid output
- `review_required` -> `fallback_required`
- `review_required` -> `cancelled`
- `review_required` -> `expired`

User-facing display:

- "Review waiting"
- "Advisor review waiting" only when assigned advisor/reviewer exists

Admin/operator display:

- reviewer/advisor assignment, due date if any, source job, review policy.

Audit requirements:

- `review_required`
- later `review_accepted` or `review_rejected`

### `fallback_required`

Meaning:

- AI execution cannot safely produce usable output or cannot proceed under current capability, policy, quota, validation, or provider conditions. The workflow should continue through deterministic/manual fallback.

Entry conditions:

- `capability_not_supported`
- `policy_blocked`
- `quota_exceeded`
- repeated timeout/provider failure
- validation failure with no safe retry
- local/private route unavailable and cloud fallback not allowed

Allowed transitions:

- workflow-owned transition to manual/deterministic fallback
- `fallback_required` -> `retry_scheduled` only if policy/config changes and retry is safe
- `fallback_required` -> `cancelled`
- may be terminal from gateway perspective

User-facing display:

- "Manual fallback available".

Admin/operator display:

- fallback reason, blocked route/provider, required capability, policy/quota context.

Audit requirements:

- `fallback_required`

### `cancelled`

Meaning:

- User/admin/system cancelled the AI job before completion.

Entry conditions:

- explicit cancellation
- source workflow was deleted or superseded
- duplicate request superseded by idempotency policy

Allowed transitions:

- terminal

User-facing display:

- "AI analysis cancelled" where relevant.

Admin/operator display:

- cancelled by, cancellation reason, timestamp.

Audit requirements:

- `job_cancelled`

### `expired`

Meaning:

- Job is no longer valid because of timeout, stale source records, stale prompt/policy, or TTL expiration.

Entry conditions:

- queue timeout
- total job timeout
- source record version changed
- prompt/policy version invalidated
- review deadline expired

Allowed transitions:

- terminal
- new job may be requested

User-facing display:

- "Analysis expired".

Admin/operator display:

- expiration reason, TTL, source version, prompt/policy version.

Audit requirements:

- `job_expired`

---

## 5. Transition Rules

Valid MVP transitions:

- `requested` -> `queued`
- `requested` -> `failed`
- `requested` -> `fallback_required`
- `queued` -> `running`
- `queued` -> `cancelled`
- `queued` -> `expired`
- `running` -> `completed`
- `running` -> `failed`
- `running` -> `retry_scheduled`
- `running` -> `review_required`
- `running` -> `fallback_required`
- `retry_scheduled` -> `queued`
- `retry_scheduled` -> `running`
- `retry_scheduled` -> `fallback_required`
- `failed` -> `fallback_required`
- `failed` -> `retry_scheduled` when manual/operator retry is allowed
- `completed` -> `review_required` when policy requires review and review is modeled after output completion
- `review_required` -> `completed` / accepted
- `review_required` -> `failed` / rejected
- any non-terminal state -> `cancelled`
- `queued` / `running` / `retry_scheduled` -> `expired` based on timeout policy

Invalid transitions:

- AI job output directly mutating compliance state
- `failed` -> `completed` without a new successful attempt or explicit review/fallback action
- `cancelled` -> `running`
- `expired` -> `running`
- `review_required` -> accepted without reviewer attribution

---

## 6. Terminal vs Non-Terminal States

Terminal:

- `completed`
- `failed` with no fallback
- `cancelled`
- `expired`
- `rejected` if modeled separately by the workflow

Non-terminal:

- `requested`
- `queued`
- `running`
- `retry_scheduled`
- `review_required`
- `fallback_required`

`fallback_required` is actionable from the product workflow perspective. It may be terminal from the AI Gateway perspective, but non-terminal from the user's workflow because manual or deterministic fallback should continue.

`review_required` is non-terminal because accepted/rejected review outcome is still pending.

---

## 7. Retry Policy

Retry policy concepts:

- max retries
- retryable error categories
- non-retryable error categories
- exponential backoff concept
- retry ceiling
- retry audit events
- provider-specific retry normalization

Recommended MVP defaults:

- small retry ceiling, e.g. 1-3 attempts depending on job type
- exponential backoff with jitter
- total timeout ceiling across all attempts
- retry metadata stored per attempt

Retryable error categories:

- `provider_unavailable`
- `timeout`
- `rate_limited` if normalized under provider availability/rate policy
- `unknown_provider_error` only with low retry ceiling

Non-retryable error categories:

- `capability_not_supported`
- `policy_blocked`
- `quota_exceeded` until quota/override changes
- `tenant_context_required`
- `permission_denied`
- `unsafe_input`

Conditionally retryable:

- `validation_failed`
- `unsafe_output`

Provider-specific retry behavior must be normalized by the adapter/gateway. Product modules should not know provider retry rules.

Audit events:

- `job_retry_scheduled`
- include attempt number, last error category, next retry time, and retry ceiling

---

## 8. Fallback Policy

Fallback is required when AI cannot safely or reliably complete the requested work.

Fallback types:

- manual fallback
- deterministic fallback
- lower-cost/lower-capability model fallback
- provider fallback as future, not MVP unless explicitly planned

Fallback required when:

- provider unavailable beyond retry ceiling
- required capability unsupported
- tenant policy blocks provider/region
- quota exceeded
- structured output validation fails and retry is not safe/useful
- Local/private route unavailable and cloud fallback is not allowed

Clarification:

- AI failure must not block deterministic compliance operations.
- Manual fallback must remain available for critical compliance workflows.
- Provider fallback is not part of MVP unless the first implementation explicitly includes it.

Examples:

- AI summary unavailable -> user writes manual advisor note.
- document extraction fails -> user enters evidence fields manually.
- semantic search unavailable -> user uses deterministic filters/navigation.

---

## 9. Review Policy

`review_required` means AI output exists but must not be treated as authoritative until accepted.

Review rules:

- AI output remains suggestion/draft until accepted.
- Critical compliance workflows require explicit acceptance/rejection.
- Review attribution must capture reviewer, timestamp, source job, and outcome.
- Advisor-specific review language may be used only when advisor/reviewer assignment exists.

Advisor review vs generic review:

- Use "Review waiting" when review is required but no advisor/reviewer is assigned.
- Use "Advisor review waiting" only when an advisor or reviewer is assigned.

Critical compliance workflows requiring review:

- final risk classification acceptance
- compliance obligation interpretation
- evidence acceptance
- customer-facing legal/regulatory summary
- remediation plan that affects deadlines, ownership, or compliance status

Accepted/rejected outcomes:

- accepted output may be copied/linked into deterministic workflow record through explicit review action
- rejected output remains audit history but must not drive authoritative state
- edited-before-acceptance should preserve original output and accepted version where policy requires it

---

## 10. Timeout & Expiration

Timeout types:

- provider timeout
- queue timeout
- total job timeout

Provider timeout:

- provider/runtime did not respond within configured request window
- may trigger retry if retry policy allows

Queue timeout:

- job waited too long before execution
- may expire or move to fallback depending on workflow criticality

Total job timeout:

- end-to-end lifecycle exceeded workflow policy
- should produce `expired` or `fallback_required`

Expiration behavior:

- stale job must not produce authoritative output
- new job may be requested if source records still require AI assistance
- expired review may require manual review/fallback

User-facing message:

- "Analysis expired"
- "AI analysis took too long. Manual fallback is available."

Audit event:

- `job_expired`
- include timeout type, elapsed time, source version, and policy key

---

## 11. Idempotency

`idempotency_key` prevents duplicate jobs for repeated client/API requests.

Use cases:

- user double-clicks AI action
- client retries after network error
- API request times out but job was created
- worker restarts during enqueue

Rules:

- same tenant + workflow + feature + idempotency key should resolve to the same active/recent job
- completed duplicate request can return existing job/result if source versions match
- stale/expired source versions should require a new idempotency key or source version marker
- duplicate provider calls should be avoided where possible

Safe retries:

- retry same job attempt through lifecycle, not by creating unbounded new jobs
- provider request idempotency should be used where provider supports it

Duplicate result handling:

- if duplicate provider responses occur, only one result should become the canonical AI job result
- duplicates should be audit-visible but not user-confusing

---

## 12. Audit Events

Required audit events:

- `job_requested`
- `job_queued`
- `job_started`
- `provider_request_sent`
- `provider_response_received`
- `output_validation_passed`
- `output_validation_failed`
- `job_retry_scheduled`
- `job_failed`
- `fallback_required`
- `review_required`
- `review_accepted`
- `review_rejected`
- `job_cancelled`
- `job_expired`

Audit event fields should include:

- tenant
- user/system actor
- workflow key
- feature key
- job type
- job id
- state before/after
- provider/model/runtime where applicable
- prompt key/version where applicable
- input reference IDs
- output schema key
- validation status
- error category
- retry count
- timestamp

Do not store raw sensitive prompts or documents in global logs unless tenant policy explicitly allows it.

---

## 13. Data Retention

Retention concepts:

- job metadata retention
- raw input retention policy placeholder
- output retention
- local/private deployment considerations
- sensitive input reference strategy

Recommended defaults:

- retain job metadata and audit events for operational traceability
- store input references instead of raw sensitive input where possible
- retain raw prompts/outputs only according to tenant/provider policy
- separate reviewed/accepted output retention from draft AI output retention
- support deletion/retention alignment with source document policy

Local/private deployment considerations:

- local/private deployments may store detailed audit/output locally
- cloud may receive only metadata, usage counters, or redacted summaries based on policy
- support bundles must not include raw prompts, documents, embeddings, or provider keys without explicit customer-approved process

---

## 14. User Experience States

Preferred UI language:

- "Preparing AI analysis"
- "AI analysis running"
- "Review waiting"
- "Advisor review waiting" only when assigned advisor/reviewer exists
- "Manual fallback available"
- "AI unavailable"
- "Analysis expired"

UX rules:

- distinguish AI running from workflow completed
- distinguish draft/suggestion from accepted output
- show manual fallback for critical workflows
- avoid fake mutation actions such as "Resolve" when no mutation exists
- show safe error messages only

Admin/operator UI may expose more technical metadata:

- provider
- model/runtime
- job id
- retry count
- queue latency
- provider latency
- error category
- quota/policy context

---

## 15. Security Requirements

Security requirements:

- tenant isolation
- permission checks before job creation
- provider keys never exposed
- no tenant-crossing context
- deterministic state cannot be mutated directly by job output

Additional requirements:

- module activation must be enforced before AI workflow execution
- AI jobs must carry tenant context
- user/system actor must be auditable
- provider calls must respect tenant provider and residency policy
- sensitive payloads should be minimized
- PII redaction hook should exist before provider call where workflow supports it
- provider errors must not leak secrets or raw sensitive input

---

## 16. First Implementation Recommendation

First implementation should support:

- one job type
- one provider
- `requested`
- `queued`
- `running`
- `completed`
- `failed`
- `review_required`
- `fallback_required`
- basic audit events
- basic timeout
- no Local Agent yet

Recommended first subset:

- job type: `summary_generation` or `structured_analysis`
- provider: first cloud provider adapter TBD
- workflow: one low-risk AI-assisted workflow where deterministic records remain source of truth
- review: required if output is shown in compliance-critical context
- fallback: manual note/summary path

Avoid starting with embeddings, vector indexing, Local Agent, or high-stakes final compliance status.

---

## 17. Open Questions

- Which first AI-assisted workflow should integrate with AI Gateway?
- What exact queue mechanism should be used?
- What retry limits should be used per job type?
- What are default retention windows for job metadata, draft output, and audit events?
- Do review states need a separate table/model from AI jobs?
- Is fallback workflow-owned or gateway-owned?
- How should source record versioning interact with idempotency?
- Should `review_required` be a job state, separate review entity state, or both?
- Which audit events should be user-visible versus operator-only?

---

## 18. References

- AI Gateway MVP Technical Design: [`30-spec-010-ai-gateway-mvp-technical-design.md`](./30-spec-010-ai-gateway-mvp-technical-design.md)
- AI Gateway Architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- AI Feature Classification Matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
- Deterministic Compliance Doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
- AI Governance and Risk Controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- Tenant AI Budgeting and Cost Isolation: [`30-spec-008-tenant-ai-budgeting-and-cost-isolation.md`](./30-spec-008-tenant-ai-budgeting-and-cost-isolation.md)
- Data Residency and Regional AI Strategy: [`30-spec-009-data-residency-and-regional-ai-strategy.md`](./30-spec-009-data-residency-and-regional-ai-strategy.md)
