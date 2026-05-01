# Provider Capability Registry Specification

## 1. Purpose

Provider/model capabilities must be explicit and auditable.

Product modules must not assume all providers support the same features. Cloud, local, private, and on-prem runtimes may differ significantly in context length, structured output reliability, modality support, embedding support, regional availability, latency, cost, and governance posture.

Capability checks protect:

- user experience
- governance
- auditability
- fallback behavior
- deployment flexibility
- tenant data policy
- deterministic compliance doctrine

The Provider Capability Registry is the AI Gateway concept that records what a provider/model/runtime can safely support before an AI-assisted workflow executes.

---

## 2. Scope

MVP scope:

- conceptual capability registry
- provider/model capability profiles
- feature-to-capability matching
- unsupported capability behavior
- governance/audit expectations

Out of scope:

- dynamic provider benchmarking
- automatic model marketplace
- customer self-service provider configuration UI
- provider auto-routing
- Local Agent runtime discovery
- model performance certification

This document does not define a database schema or implement provider integrations.

---

## 3. Registry Concepts

| Concept | Definition |
|---|---|
| Provider | Vendor, runtime family, or deployment source such as OpenAI, Anthropic, Azure OpenAI, Ollama, vLLM-compatible endpoint, or Local Agent. |
| Model/runtime | Specific model or runtime target exposed by a provider adapter. |
| Adapter | AI Gateway integration layer that translates normalized requests/responses to provider-specific APIs. |
| Capability profile | Versioned description of supported capabilities, limits, regions, deployment modes, and governance flags. |
| Deployment mode | Cloud AI, hybrid AI, private AI, full on-prem, or future air-gapped mode. |
| Region | Provider/runtime processing region or customer environment locality. |
| Tenant policy | Tenant-specific restrictions such as allowed providers, blocked providers, region lock, local-only mode, or sensitivity routing. |
| Feature requirement | Capabilities and constraints declared by an AI-assisted feature. |
| Fallback rule | Behavior when requested capabilities cannot be satisfied. |

The registry answers: "Can this provider/model/runtime safely run this feature for this tenant under this deployment and sensitivity policy?"

---

## 4. Capability Categories

### Core

| Capability | Meaning |
|---|---|
| `chat_completion` | Provider can produce text/chat completion output. |
| `structured_json` | Provider can produce or support schema-validatable JSON output. |
| `embeddings` | Provider can generate embeddings. |
| `reranking` | Provider can rerank search/retrieval candidates. |
| `streaming` | Provider supports streamed response output. |
| `batch_jobs` | Provider supports asynchronous/batch processing. |

### Reasoning / Context

| Capability | Meaning |
|---|---|
| `long_context` | Provider can process large context windows above the product-defined baseline. |
| `citation_support` | Provider can return usable citation/reference markers. |
| `evidence_grounding` | Provider can ground output in supplied evidence/context with traceable references. |
| `deterministic_seed_support` | Provider supports reproducibility controls such as seed/temperature constraints where available. |

`deterministic_seed_support` does not make AI output deterministic in the compliance-doctrine sense. It only indicates provider-level reproducibility support.

### Tooling

| Capability | Meaning |
|---|---|
| `tool_calling` | Provider supports tool/function-calling style execution. |
| `function_calling` | Provider supports structured function-call output. |
| `retrieval_augmented_generation` | Provider/runtime can combine generation with retrieval context. |
| `document_parsing` | Provider/runtime can parse document content directly or through adapter-supported preprocessing. |

### Modalities

| Capability | Meaning |
|---|---|
| `text_input` | Accepts text input. |
| `image_input` | Accepts image input. |
| `pdf_input` | Accepts PDF input directly or through supported adapter processing. |
| `audio_input` | Accepts audio input. |
| `text_output` | Produces text output. |
| `structured_output` | Produces structured output suitable for schema validation. |

### Deployment / Governance

| Capability | Meaning |
|---|---|
| `cloud_supported` | Supported for managed cloud AI mode. |
| `local_supported` | Supported for local/demo or Local Agent paths. |
| `private_ai_supported` | Supported for private AI routing policy. |
| `on_prem_supported` | Supported for customer-owned on-prem deployments. |
| `air_gapped_supported` | Can operate in air-gapped mode under documented update/support process. |
| `eu_region_supported` | Provider/runtime can operate in an approved EU region profile. |
| `no_training_policy_available` | Provider/runtime can satisfy no-training/no-retention policy where required. |
| `customer_key_supported` | Supports customer-managed provider credentials or customer-owned provider billing path. |

### Operational

| Capability / field | Meaning |
|---|---|
| `max_context_tokens` | Maximum supported context window estimate. |
| `max_output_tokens` | Maximum output token estimate. |
| `expected_latency_class` | Operational latency class such as low, medium, high, variable. |
| `concurrency_class` | Expected concurrency capacity class. |
| `cost_class` | Relative cost class such as low, medium, high, premium. |
| `production_supported` | Approved for production workloads under current support policy. |
| `demo_only` | Allowed only for demo/PoC/internal validation. |

Operational values are planning signals, not exact service-level guarantees unless backed by contract and implementation.

---

## 5. Capability Profile Shape

Conceptual profile shape:

```text
provider_key
adapter_key
model_key
runtime_type
deployment_modes
regions
capabilities
limits
governance_flags
support_level
notes
last_reviewed_at
```

Field guidance:

| Field | Purpose |
|---|---|
| `provider_key` | Stable provider identifier. |
| `adapter_key` | AI Gateway adapter identifier. |
| `model_key` | Stable model/runtime identifier. |
| `runtime_type` | Cloud, local, private endpoint, Local Agent, on-prem runtime, etc. |
| `deployment_modes` | Supported deployment modes. |
| `regions` | Supported regions/locality profiles. |
| `capabilities` | Boolean/list capabilities and operational values. |
| `limits` | Context/output/concurrency/rate/cost limits where known. |
| `governance_flags` | No-training, private routing, customer-key, support boundary flags. |
| `support_level` | Certified, compatible, best effort, demo-only, unsupported. |
| `notes` | Human-readable caveats and review notes. |
| `last_reviewed_at` | Date/time of latest profile review. |

Do not treat this as an exact database schema yet.

---

## 6. Feature Requirement Shape

Features declare what they need before execution.

Conceptual feature requirement shape:

```text
feature_key
required_capabilities
optional_capabilities
minimum_context_tokens
output_schema_required
review_policy
fallback_behavior
allowed_deployment_modes
sensitivity_constraints
```

Field guidance:

| Field | Purpose |
|---|---|
| `feature_key` | Stable feature identifier from feature classification matrix. |
| `required_capabilities` | Capabilities that must pass before execution. |
| `optional_capabilities` | Capabilities that improve UX/quality but are not required. |
| `minimum_context_tokens` | Minimum context requirement for safe execution. |
| `output_schema_required` | Whether structured validation is required. |
| `review_policy` | Whether human/advisor review is required. |
| `fallback_behavior` | Manual/deterministic/degraded behavior if match fails. |
| `allowed_deployment_modes` | Cloud/hybrid/private/on-prem constraints. |
| `sensitivity_constraints` | Data classification and routing requirements. |

Feature requirements should be owned by the product/module feature definition, not by the provider adapter.

---

## 7. Capability Matching Rules

Rules:

- hard requirements must pass
- optional capabilities improve UX but are not required
- unsupported hard requirement blocks execution or triggers fallback
- tenant policy can further restrict provider/model choices
- sensitivity or residency policy can override capability match

Matching flow:

1. Resolve feature requirement.
2. Resolve tenant provider policy.
3. Resolve sensitivity/residency/deployment constraints.
4. Select candidate provider/model profiles.
5. Check required capabilities and minimum limits.
6. Apply optional capabilities for enhancement/degradation choices.
7. Return selected profile or normalized failure/fallback reason.

Capability match is necessary but not sufficient. A provider may support a capability but still be blocked by tenant policy, region lock, data sensitivity, quota, support level, or deployment mode.

---

## 8. Unsupported Capability Behavior

Possible outcomes:

- block with safe message
- degrade to manual fallback
- choose lower-capability workflow
- require different deployment/provider
- mark feature unavailable in current tenant/deployment mode

Examples:

- Missing `structured_json`: block structured extraction or route to manual field entry.
- Missing `embeddings`: disable semantic search and show deterministic filters/navigation.
- Missing `multimodal` / `image_input`: do not run image/PDF visual analysis; allow manual document review.
- Missing `eu_region_supported`: block cloud route for EU-locked tenant or require private/local provider.
- Profile marked `demo_only`: block production workflow execution.

User-facing messages must be safe and understandable:

- "This AI feature is not available in the current deployment."
- "Manual fallback is available."
- "Tenant policy does not allow this provider route."

Do not expose provider internals, keys, or raw policy payloads in user-facing UI.

---

## 9. Governance & Audit

Capability decisions should be auditable.

Audit metadata:

- requested capabilities
- selected provider/model
- capability profile version
- failed capability checks
- fallback/degradation path
- tenant policy influence
- region/deployment constraints

Audit event examples:

- capability check passed
- capability check failed
- provider blocked by tenant policy
- provider blocked by region policy
- fallback selected
- feature unavailable due capability mismatch

Audit should distinguish:

- provider lacks capability
- provider supports capability but tenant policy blocks it
- provider supports capability but deployment mode blocks it
- provider supports capability but support level is demo-only/best-effort

---

## 10. Initial MVP Registry

Recommended MVP registry:

- small static/config-based registry first
- one cloud provider profile
- one local demo profile placeholder
- no dynamic runtime discovery
- no admin UI
- docs-only/manual updates accepted initially

MVP registry goals:

- prove feature-to-capability matching
- prevent provider assumptions in product modules
- support `capability_not_supported` errors
- support audit metadata for selected profile and failed checks
- support manual fallback when capability match fails

The local demo placeholder may describe a future Ollama/local runtime path but must not imply production support until certified.

---

## 11. Future Enhancements

Future enhancements:

- dynamic Local Agent capability reporting
- provider benchmarking
- model evaluation scores
- regional availability checks
- customer-managed provider profiles
- capability-aware UI feature toggles
- automated compatibility tests
- periodic capability review workflow
- adapter-level self-test/health checks
- support-level certification workflow

These should wait until the static registry and one provider path prove useful.

---

## 12. Security Requirements

Security requirements:

- provider capabilities must not expose secrets
- provider keys remain backend-only
- tenant policy must be enforced server-side
- no tenant can force unauthorized provider routing
- capability registry must not bypass deterministic governance

Additional rules:

- support level must not be user-controlled
- tenant policy overrides must be audit-visible
- provider profile updates should be reviewed before production use
- a malicious or misconfigured tenant must not route jobs to another tenant's provider configuration
- capability match must run before provider request is sent

The registry is a policy input. It is not a permission system by itself.

---

## 13. References

- AI Gateway MVP Technical Design: [`30-spec-010-ai-gateway-mvp-technical-design.md`](./30-spec-010-ai-gateway-mvp-technical-design.md)
- AI Job Lifecycle Specification: [`30-spec-011-ai-job-lifecycle.md`](./30-spec-011-ai-job-lifecycle.md)
- AI Feature Classification Matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
- Data Residency and Regional AI Strategy: [`30-spec-009-data-residency-and-regional-ai-strategy.md`](./30-spec-009-data-residency-and-regional-ai-strategy.md)
- Tenant AI Budgeting and Cost Isolation: [`30-spec-008-tenant-ai-budgeting-and-cost-isolation.md`](./30-spec-008-tenant-ai-budgeting-and-cost-isolation.md)
- Deterministic Compliance Doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
- AI Gateway Architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
