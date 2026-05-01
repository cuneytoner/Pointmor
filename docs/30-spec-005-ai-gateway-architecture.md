# Pointmor AI Gateway Architecture

## 1. Purpose

AI Gateway is the provider-agnostic abstraction layer between Pointmor product modules and AI providers or runtimes.

Product modules must not call OpenAI, Anthropic, Azure OpenAI, Ollama, vLLM, local runtimes, or enterprise inference endpoints directly. All Product AI requests must go through AI Gateway.

This boundary keeps product modules focused on domain behavior while AI Gateway owns provider routing, model/runtime differences, auditability, fallback, safety policy, and operational controls.

The AI Gateway must preserve Pointmor platform doctrine:

- tenant isolation
- membership-based access
- module activation enforcement
- auditability
- human/advisor review for non-authoritative AI output
- deterministic product state separated from AI-generated suggestions

## 2. Provider Adapters

AI Gateway should use provider adapters behind a stable internal contract.

Planned adapters:

| Adapter | Purpose |
|---|---|
| OpenAI | Managed cloud AI provider path |
| Anthropic | Managed cloud AI provider path |
| Azure OpenAI | Enterprise cloud / regional procurement path |
| Local Agent | Pointmor Local Agent for hybrid/private AI routing |
| Ollama | Local model runtime for demo, PoC, and private AI profiles |
| vLLM-compatible OpenAI API endpoint | Self-hosted or private cloud inference with OpenAI-compatible API |
| NVIDIA NIM / Triton | Future enterprise GPU server inference options |

Adapters should translate provider-specific request and response shapes into Pointmor-normalized AI Gateway contracts.

Provider-specific behavior must not leak into product modules.

## 3. Core Responsibilities

AI Gateway is responsible for:

- tenant-level provider routing
- deployment-mode-aware routing: cloud, hybrid, private, on-prem
- prompt registry and prompt versioning
- request normalization
- response normalization
- structured output validation
- retries and fallback
- timeout policy
- rate limits
- token and cost tracking
- audit logging
- safety and governance flags
- human/advisor review requirement flags
- provider capability checks
- provider error normalization
- model/runtime metadata capture

Tenant budgeting, quota, and cost-isolation strategy is defined separately in [`30-spec-008-tenant-ai-budgeting-and-cost-isolation.md`](./30-spec-008-tenant-ai-budgeting-and-cost-isolation.md).

Data residency and regional AI routing strategy is defined separately in [`30-spec-009-data-residency-and-regional-ai-strategy.md`](./30-spec-009-data-residency-and-regional-ai-strategy.md).

AI Gateway should return enough metadata for audit and review:

- tenant id
- module
- job id or request id
- provider
- model/runtime name
- model/runtime version when available
- prompt version
- capability profile
- timestamps
- token/cost estimate when available
- confidence or validation status when applicable
- fallback path used, if any
- review requirement, if any

## 4. Capability Negotiation

Features must check provider capabilities instead of assuming all providers behave like frontier cloud models.

The canonical provider capability registry specification is [`30-spec-012-provider-capability-registry.md`](./30-spec-012-provider-capability-registry.md).

Capability examples:

| Capability | Meaning |
|---|---|
| `chat_completion` | Provider supports conversational or instruction-style completion |
| `structured_json` | Provider can reliably return schema-constrained JSON or can be validated post-response |
| `tool_calling` | Provider supports tool/function calling |
| `embeddings` | Provider can generate embeddings |
| `reranking` | Provider can rerank candidate documents or chunks |
| `long_context` | Provider supports long context windows for larger documents |
| `multimodal` | Provider supports images or document visual inputs |
| `local_only` | Provider/runtime can run without external cloud inference |
| `air_gapped_supported` | Provider/runtime can operate without internet connectivity under controlled update policy |
| `streaming` | Provider supports streamed token output |
| `batch_jobs` | Provider supports asynchronous batch processing |

Product features must declare the capabilities they need.

Examples:

- Document extraction may require `structured_json` and optionally `multimodal`.
- Retrieval may require `embeddings` and optionally `reranking`.
- Private AI mode may require `local_only`.
- Air-gapped mode may require `air_gapped_supported`.

If a provider lacks a required capability, AI Gateway should return a normalized capability error or route to an approved fallback provider/runtime according to tenant policy.

## 5. Async AI Job Architecture

AI processing should be queue-first for production workloads.

Recommended flow:

1. User action creates an AI job.
2. API validates tenant, membership, role, module activation, and feature entitlement.
3. API stores the job with requested capability, module, tenant, and source object metadata.
4. Worker claims the job.
5. Worker executes through AI Gateway.
6. AI Gateway routes to the selected provider/runtime.
7. Result is normalized and validated.
8. Result is stored with audit metadata.
9. UI shows pending, completed, failed, or manual review states.
10. Low-confidence or policy-sensitive results move to human/advisor review.

Synchronous AI calls should be limited because:

- AI providers can be slow or rate-limited.
- Local/private runtimes may have queue depth or GPU contention.
- Long document processing can exceed HTTP timeouts.
- Retries and fallback are cleaner in workers.
- Audit and review state should be durable.
- Manual fallback must remain possible when AI is unavailable.

Synchronous calls may be acceptable for small, non-critical helper interactions, but they still must go through AI Gateway and preserve audit/minimum metadata requirements.

## 6. Data Model Concepts

No migrations are introduced by this document. These are target concepts for future implementation.

### `ai_provider_configs`

Stores provider-level configuration.

Conceptual fields:

- id
- provider type
- display name
- deployment mode
- encrypted credential reference
- base URL or endpoint reference
- default model
- enabled flag
- createdAt / updatedAt

### `tenant_ai_settings`

Stores tenant-level AI routing and policy.

Conceptual fields:

- tenantId
- allowed provider config ids
- default provider config id
- deployment mode
- local/private routing requirement
- external AI allowed flag
- no-training requirement
- fallback policy
- human review thresholds

### `ai_jobs`

Stores durable AI work requests.

Conceptual fields:

- id
- tenantId
- module
- job type
- source object type/id
- requested capability
- status
- priority
- createdByUserId
- assigned worker/runtime
- createdAt / startedAt / completedAt

### `ai_job_events`

Stores operational event history for jobs.

Conceptual fields:

- id
- tenantId
- jobId
- event type
- message
- provider/runtime metadata
- timestamp

### `ai_prompt_versions`

Stores prompt registry entries.

Conceptual fields:

- id
- prompt key
- version
- module
- capability requirement
- schema reference
- status
- createdAt

### `ai_audit_logs`

Stores audit metadata for AI outputs.

Conceptual fields:

- id
- tenantId
- module
- jobId
- provider config id
- model/runtime name
- prompt version
- input source references
- output reference
- validation result
- review requirement
- reviewer user id, if reviewed
- timestamp

### `ai_usage_records`

Stores usage and cost records.

Conceptual fields:

- id
- tenantId
- module
- provider config id
- model/runtime name
- tokens in/out when available
- estimated cost
- runtime duration
- jobId
- timestamp

### `ai_capability_profiles`

Stores provider/runtime capability metadata.

Conceptual fields:

- id
- provider config id
- supported capabilities
- model/runtime metadata
- max context estimate
- multimodal support flag
- structured JSON support flag
- local-only flag
- air-gapped support flag
- updatedAt

## 7. Security

### Tenant Isolation

All AI jobs, prompts with tenant context, documents, extractions, embeddings, outputs, usage records, and audit logs must be tenant-scoped.

AI Gateway must not allow:

- cross-tenant prompt context
- cross-tenant retrieval
- global semantic search across tenant data
- provider routing that bypasses tenant policy

### Encrypted Provider Keys

Provider credentials must be encrypted or stored in a secret manager. Plain provider keys must not be stored in source control, logs, database records without encryption, or user-facing payloads.

### PII Redaction Support

AI Gateway should support redaction and minimization before sending data to external providers when the use case allows it.

Redaction policy must be explicit because some document understanding tasks require original text or visual content.

### No-Training and Provider Retention Notes

Tenant and provider policy must record whether external AI processing is allowed and whether no-training/no-retention provider terms are required.

If a provider cannot satisfy required customer policy, AI Gateway must block the route or use an approved fallback.

### Local and Private Routing Policy

For Hybrid AI, Private AI, Full On-Prem, and future Air-gapped modes, AI Gateway must enforce routing policy:

- local-only workloads do not route to cloud providers
- private workloads use approved private provider configs
- air-gapped workloads do not require live cloud connectivity
- fallback must not violate tenant routing policy

### Audit Trail for AI Outputs

Every Product AI output should be traceable to:

- source object
- tenant
- module
- prompt version
- model/runtime
- provider config
- validation status
- fallback path, if any
- human/advisor review status, if any

AI output remains derived and non-authoritative unless explicitly converted into deterministic product state through a reviewed workflow.

## 8. Initial Implementation Boundary

Phase 1 should introduce interfaces, contracts, and one cloud provider path.

The concrete MVP technical design and implementation phasing are defined in [`30-spec-010-ai-gateway-mvp-technical-design.md`](./30-spec-010-ai-gateway-mvp-technical-design.md).

Recommended Phase 1 scope:

- AI Gateway TypeScript interfaces
- provider adapter contract
- capability profile shape
- prompt version metadata shape
- normalized request/response shape
- audit metadata envelope
- one cloud provider adapter
- basic structured JSON validation path
- queue-compatible job execution boundary

Out of Phase 1:

- broad schema migration
- full local/on-prem runtime support
- model registry UI
- enterprise hardware orchestration
- air-gapped deployment
- autonomous compliance decisions

Local, private, and on-prem adapters should be added after the gateway contract is stable. This keeps product modules insulated from provider churn and avoids building private deployment complexity before the core abstraction is proven.
