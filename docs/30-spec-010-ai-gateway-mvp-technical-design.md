# AI Gateway MVP Technical Design

## 1. Purpose

AI Gateway is the required abstraction between Pointmor product modules and AI providers/runtimes.

Product modules must not call OpenAI, Anthropic, Ollama, vLLM, Local Agent, Azure OpenAI, or any provider/runtime directly. All Product AI requests must flow through AI Gateway so tenant isolation, provider policy, auditability, usage metadata, capability checks, and fallback behavior stay centralized.

The MVP goal is to define a stable internal contract, not to build full enterprise AI routing. This design intentionally avoids broad private AI, on-prem, Local Agent, and provider marketplace scope until the gateway contract is proven.

---

## 2. MVP Scope

MVP includes only:

- one initial cloud provider adapter
- normalized request/response contract
- provider capability profile
- async AI job lifecycle
- structured output validation concept
- audit event emission
- tenant-aware provider policy placeholder
- timeout/retry/fallback rules
- usage metadata capture

Explicitly out of scope:

- Local Agent implementation
- vLLM production deployment
- multi-provider auto-routing
- model marketplace
- air-gapped mode
- GPU orchestration
- full billing engine
- user-facing AI admin panel unless already planned elsewhere

The MVP should be safe enough to support one narrow AI-assisted workflow without weakening deterministic compliance doctrine.

---

## 3. Proposed Architecture

Layering:

```text
Pointmor Product Modules
  -> AI Gateway Service
    -> Provider Adapter
      -> Provider Runtime
```

### Pointmor Product Modules

Product modules request AI work by declaring:

- workflow
- feature
- tenant context
- input references
- required capabilities
- output schema
- review policy
- sensitivity level

Product modules do not choose provider-specific payload formats and do not store provider keys.

### AI Gateway Service

AI Gateway Service:

- validates tenant/context/policy
- creates AI job
- selects provider adapter
- validates capability requirements
- sends request
- normalizes response
- emits audit/usage events
- stores output and review metadata

The gateway owns AI orchestration, not compliance truth. Deterministic services and explicit review actions remain authoritative.

### Provider Adapter

Provider Adapter translates Pointmor-normalized requests to provider-specific API calls and normalizes provider responses/errors back into Pointmor contracts.

### Provider Runtime

Provider Runtime is the actual external or internal AI service. For MVP this is one cloud provider path. Future runtimes may include Anthropic, Azure OpenAI, Ollama, vLLM-compatible endpoints, and Local Agent.

---

## 4. Request Contract

Conceptual request shape:

| Field | Purpose |
|---|---|
| `tenant_id` | Required tenant boundary for policy, audit, and data isolation. |
| `workspace_id` / `organization_id` | Optional alias/context when UI or product language uses organization/workspace terminology. |
| `user_id` | Actor requesting or triggering the AI work. |
| `workflow_key` | Stable workflow identifier, e.g. `ai_act.assessment_summary`. |
| `feature_key` | Stable feature identifier from feature classification matrix. |
| `prompt_key` | Prompt registry key. |
| `prompt_version` | Exact prompt version requested or resolved. |
| `input_refs` | References to source records/documents; prefer IDs over raw content in audit metadata. |
| `input_payload` | Minimal input payload needed for the provider request. |
| `required_capabilities` | Required provider/runtime capabilities. |
| `output_schema_key` | Schema used for structured output validation, if applicable. |
| `sensitivity_level` | Data classification / routing hint. |
| `review_policy` | Whether output requires human/advisor review. |
| `timeout_policy` | Maximum runtime and timeout behavior. |
| `idempotency_key` | Prevents duplicate jobs for retried client/API requests. |

The request contract should support future queue-backed execution even if the first implementation slice starts with a simpler worker path.

---

## 5. Response Contract

Conceptual response shape:

| Field | Purpose |
|---|---|
| `ai_job_id` | Stable AI job identifier. |
| `status` | Current job/result status. |
| `provider` | Provider used, if execution reached provider. |
| `model` | Model/runtime name used, if available. |
| `capability_profile` | Provider/runtime capability profile used for execution. |
| `output` | Normalized output; may be empty on failure. |
| `output_validation_status` | `valid`, `invalid`, `not_applicable`, or `not_run`. |
| `citations` / `evidence_refs` | Source references returned or linked by workflow. |
| `usage_metadata` | Token, latency, retry, deployment, and estimated cost metadata. |
| `audit_event_ids` | Audit records emitted during request/job lifecycle. |
| `review_required` | Whether output must be reviewed before authoritative use. |
| `fallback_available` | Whether a deterministic/manual fallback exists. |
| `error_code` | Normalized error code for failures. |
| `error_message_safe` | User-safe message that avoids leaking provider secrets or sensitive input. |

The response must distinguish "AI job completed" from "output accepted into deterministic workflow state".

---

## 6. AI Job Lifecycle

The detailed lifecycle/state-machine specification is maintained in [`30-spec-011-ai-job-lifecycle.md`](./30-spec-011-ai-job-lifecycle.md).

| State | Entered when | User/admin visibility | Retry allowed? | Manual fallback expected? |
|---|---|---|---|---|
| `draft` / `requested` | Product module validates request and prepares job creation. | Usually not visible unless request is saved before queueing. | Yes, before provider call. | Not yet. |
| `queued` | Job is accepted and waiting for worker/provider capacity. | Show pending/queued state with honest wait message. | Not normally; cancellation may be allowed. | Not required unless queue delay exceeds policy. |
| `running` | Worker/provider execution has started. | Show running/in progress state. | No duplicate retry while running. | Not normally. |
| `completed` | Provider returned output and validation passed or was not required. | Show result as draft/suggestion unless deterministic workflow accepted it. | No, unless user requests regeneration as a new job. | Optional. |
| `failed` | Provider, gateway, or validation failed without configured fallback state. | Show failure with safe error and manual path if available. | Yes if error category allows retry. | Yes for critical workflows. |
| `review_required` | Output completed but policy requires review before use. | Show review waiting / advisor review waiting accurately. | Regeneration may be allowed as new job. | Yes if review cannot proceed. |
| `fallback_required` | AI cannot proceed because capability, policy, quota, validation, or provider failure prevents safe output. | Show fallback-required state and manual workflow entry point. | Depends on error category. | Yes. |
| `cancelled` | User/admin/system cancels before completion. | Show cancelled state if relevant. | New request may be created. | Optional. |
| `expired` | Job exceeded TTL, stale prompt/policy, or no longer matches source record version. | Show stale/expired state. | New request required. | Yes if workflow still needed. |

AI job state is not the same as compliance workflow state. AI completion must not directly mutate authoritative compliance status.

---

## 7. Provider Adapter Interface

Conceptual adapter responsibilities:

- build provider-specific request
- send request
- normalize provider response
- expose model/provider capabilities
- return usage metadata
- map provider errors into normalized errors
- enforce timeout/retry constraints

### Initial Adapter

The repository does not currently define a committed first provider preference. The MVP target should therefore be documented as:

**first cloud provider adapter TBD**

Selection criteria:

- supports required MVP feature capabilities
- provides usable usage/token metadata
- supports acceptable data retention/no-training posture for target pilot use
- has stable SDK/API and operational availability
- can be integrated without provider-specific behavior leaking into product modules

### Future Adapters

- OpenAI
- Anthropic
- Azure OpenAI
- Ollama
- vLLM-compatible endpoint
- Local Agent

Future adapters must satisfy the same normalized contract rather than introducing provider-specific product-module code paths.

---

## 8. Capability Profile

MVP capabilities:

| Capability | Meaning |
|---|---|
| `chat_completion` | Provider can produce text/chat completion output. |
| `structured_json` | Provider can produce or support schema-validatable JSON. |
| `embeddings` | Provider can generate embeddings. |
| `long_context` | Provider can process larger context windows. |
| `tool_calling` | Provider supports tool/function calling. |
| `streaming` | Provider supports streamed output. |
| `local_only` | Runtime can operate without external cloud inference. |
| `private_ai_supported` | Runtime/provider can satisfy private AI routing policy. |

Rules:

- features must request capabilities
- gateway must reject or degrade unsupported capability requests
- provider-specific assumptions must not leak into product modules
- missing required capabilities should produce `capability_not_supported`
- missing optional capabilities may reduce quality or disable enhancement paths

Capability profiles should include both raw provider capabilities and Pointmor policy-level capabilities.

---

## 9. Structured Output Validation

AI outputs used in workflows should be validated against a known schema where possible.

Rules:

- invalid outputs must not mutate deterministic state
- failed validation should produce `failed` or `fallback_required` state
- validation errors should be auditable
- validation should distinguish malformed provider output from semantically incomplete output
- product modules should consume validated normalized output, not raw provider response

Examples:

- evidence extraction output validates against an extraction schema
- remediation drafting output validates required fields before review
- risk-summary output validates structure but still remains suggestion/review-required where policy demands it

Structured output validation is a safety boundary, not proof of legal correctness.

---

## 10. Audit & Governance Events

Required MVP audit metadata:

- tenant
- user
- workflow
- feature
- prompt key/version
- provider/model
- request timestamp
- response timestamp
- output validation result
- review requirement
- accepted/rejected state placeholder
- error/fallback state
- input reference IDs, not necessarily raw input content

Rules:

- do not store raw sensitive prompts in global logs unless policy allows
- local/private deployments may store audit details locally
- audit events should separate requested route, actual provider, fallback route, and blocked route
- audit metadata should identify whether output is deterministic, AI-assisted, advisory-only, or experimental/internal

AI audit events explain AI behavior. They do not replace deterministic workflow audit events.

---

## 11. Usage Metadata

Usage metadata:

- prompt tokens if available
- completion tokens if available
- total tokens if available
- embedding count if applicable
- provider latency
- queue latency
- retry count
- estimated cost placeholder
- deployment mode

Additional useful metadata:

- provider
- model/runtime
- workflow key
- feature key
- tenant id
- user id
- capability profile
- validation status

Exact billing is out of scope for MVP. Usage metadata should support future tenant budgeting, quota enforcement, reporting, and operational analysis.

---

## 12. Tenant Policy Placeholder

Tenant-level concepts:

- allowed providers
- default provider
- blocked providers
- `local_only_required`
- region restrictions
- sensitivity routing
- review requirements
- quota/budget hooks

MVP may only read static/configured policy. Full tenant admin UI can come later.

Policy checks should happen before expensive or sensitive provider calls. A policy-blocked request should not leak input to a provider.

---

## 13. Error Handling

| Error category | Retry allowed? | Fallback expected? | User-facing message style | Audit requirement |
|---|---|---|---|---|
| `provider_unavailable` | Yes, with ceiling/backoff. | Yes for critical workflows. | "AI provider is currently unavailable. Manual workflow is available." | Provider, model, timestamp, retry count. |
| `timeout` | Yes, with ceiling/backoff. | Yes if repeated or critical. | "AI request timed out. Try again or continue manually." | Timeout policy, elapsed time, provider. |
| `capability_not_supported` | No unless provider/policy changes. | Yes. | "This AI capability is not available in the current deployment." | Required capabilities, selected provider/runtime. |
| `validation_failed` | Maybe, if regeneration allowed. | Yes for critical workflows. | "AI output could not be validated. Continue manually or retry." | Schema key, validation result, safe error summary. |
| `policy_blocked` | No unless policy changes. | Yes. | "Tenant policy does not allow this AI route." | Policy key, requested provider/deployment. |
| `quota_exceeded` | No until quota resets/override. | Yes. | "AI quota limit reached. Manual workflow remains available." | Limit type, current usage, tenant. |
| `tenant_context_required` | No. | No; request is invalid. | "Tenant context is required for AI processing." | Missing context fields. |
| `permission_denied` | No. | No; user lacks access. | "You do not have permission to run this AI action." | User, tenant, feature/workflow. |
| `unsafe_input` | No unless input changes. | Yes where possible. | "Input cannot be processed by AI under current safety policy." | Safety category, input refs. |
| `unsafe_output` | Maybe, if safer retry/fallback exists. | Yes. | "AI output was blocked by safety policy." | Safety category, provider/model. |
| `unknown_provider_error` | Maybe, with low retry ceiling. | Yes if critical workflow. | "AI request failed. Continue manually or try again later." | Provider error class/code if safe. |

Error messages must avoid exposing provider secrets, raw sensitive prompts, or internal stack traces.

---

## 14. Security Requirements

MVP security requirements:

- tenant isolation
- permission checks before AI job creation
- provider keys must not be exposed to frontend
- sensitive payload handling
- PII redaction hook
- provider retention awareness
- no tenant-crossing context or memory
- deterministic state cannot be directly mutated by AI output

Additional rules:

- all AI jobs must carry tenant context
- product modules must enforce module activation before AI workflow execution
- AI Gateway must enforce tenant/provider policy before provider call
- provider credentials must be stored outside source control and user-facing payloads
- logs must minimize raw prompt/document content

---

## 15. MVP Implementation Phasing

### Slice 1: Contracts and Documentation

Goal:

- finalize request/response contracts, capability profile, error taxonomy, and output classification.

Acceptance criteria:

- contracts reviewed against deterministic compliance doctrine
- no provider-specific assumptions in product-module interface
- first integration workflow candidate identified

Risks:

- contracts become too abstract or too provider-specific
- missing audit/usage fields force rework later

### Slice 2: AI Job Model and Lifecycle

Goal:

- introduce durable AI job lifecycle and status semantics.

Acceptance criteria:

- states support queued/running/completed/failed/review_required/fallback_required
- idempotency and expiration behavior defined
- deterministic workflow state remains separate

Risks:

- lifecycle duplicates existing workflow state
- synchronous implementation shortcuts become hard to unwind

### Slice 3: One Cloud Provider Adapter

Goal:

- implement one cloud provider adapter behind the normalized interface.

Acceptance criteria:

- provider keys are not exposed
- usage metadata is captured where available
- timeout/retry constraints are enforced
- provider errors are normalized

Risks:

- selected provider assumptions leak into product modules
- provider policy/retention posture is insufficient for target workflow

### Slice 4: Structured Output Validation

Goal:

- validate AI outputs for one structured workflow.

Acceptance criteria:

- invalid output cannot mutate deterministic state
- validation failure is auditable
- schema version is captured

Risks:

- validation schema is too loose to be useful
- validation is mistaken for legal correctness

### Slice 5: Audit / Usage Events

Goal:

- emit AI audit and usage events for provider calls and job lifecycle changes.

Acceptance criteria:

- tenant/user/workflow/provider/model/prompt version captured
- usage metadata supports future budgeting
- raw sensitive prompt storage is avoided by default

Risks:

- audit logs expose too much sensitive content
- usage metadata differs too much by provider without normalization

### Slice 6: One AI-Assisted Workflow Integration

Goal:

- integrate one narrow AI-assisted workflow without changing compliance authority.

Acceptance criteria:

- feature classification is documented
- manual fallback exists
- review policy is explicit
- deterministic source of truth remains unchanged

Risks:

- workflow feels magical or misleading
- output is treated as authoritative before review

### Slice 7: Fallback / Review UX

Goal:

- expose honest pending, failed, review-required, fallback-required, and manual fallback states.

Acceptance criteria:

- user can recover from provider failure
- "Review waiting" vs "Advisor review waiting" wording is accurate
- no fake mutation buttons

Risks:

- UX hides AI failure
- users cannot tell whether output is draft, reviewed, or accepted

---

## 16. Non-Goals

- no Local Agent yet
- no on-prem installer yet
- no GPU orchestration yet
- no provider auto-router yet
- no AI-generated authoritative compliance decisions
- no full enterprise billing engine
- no arbitrary hardware support promise
- no air-gapped support
- no model marketplace

---

## 17. Open Questions

- Which first cloud provider should be selected?
- Which exact workflow should be selected for first integration?
- Is existing queue infrastructure sufficient, or is a new worker/job layer required?
- What is the initial audit retention policy for AI job events?
- Should prompt bodies be stored, hashed, versioned as files, or stored in a registry table?
- When should tenant admin configuration be exposed in UI?
- What is the first output schema that should be production-hardened?
- How much raw input can be stored in AI audit logs under default policy?

---

## 18. References

- AI Infrastructure Strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI Gateway Architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- Local Agent spec: [`30-spec-006-pointmor-local-agent.md`](./30-spec-006-pointmor-local-agent.md)
- Deterministic Compliance Doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
- AI Feature Classification Matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
- Tenant AI Budgeting / Cost Isolation: [`30-spec-008-tenant-ai-budgeting-and-cost-isolation.md`](./30-spec-008-tenant-ai-budgeting-and-cost-isolation.md)
- Data Residency / Regional AI Strategy: [`30-spec-009-data-residency-and-regional-ai-strategy.md`](./30-spec-009-data-residency-and-regional-ai-strategy.md)
- AI Governance and Risk Controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
