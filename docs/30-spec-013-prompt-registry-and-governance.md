# Prompt Registry and Governance Specification

## 1. Purpose

Prompts are product-controlled assets, not ad-hoc strings hidden in code.

Compliance-sensitive AI workflows require versioned, auditable prompts. Prompt governance supports:

- reproducibility
- rollback
- review
- provider portability
- structured output validation
- enterprise trust
- deterministic compliance doctrine

Prompt governance does not make AI output authoritative. It makes AI-assisted behavior traceable and safer.

---

## 2. Scope

MVP scope:

- prompt registry concept
- prompt keys and versions
- workflow-to-prompt mapping
- prompt review lifecycle
- audit metadata
- rollback concept
- environment separation
- prompt testing/evaluation concept

Out of scope:

- full prompt management UI
- marketplace prompts
- tenant-authored prompts for production workflows
- automatic prompt optimization
- prompt fine-tuning pipeline

This document does not add migrations, routes, services, queues, UI, or provider integrations.

---

## 3. Prompt Registry Concepts

| Concept | Definition |
|---|---|
| `prompt_key` | Stable identifier for a prompt family, e.g. `ai_act.risk_summary`. |
| `prompt_version` | Immutable version identifier for a specific prompt body/configuration. |
| `workflow_key` | Workflow using the prompt, e.g. `ai_act.assessment_review`. |
| `feature_key` | AI feature classification key using the prompt. |
| `output_schema_key` | Structured output schema expected from the prompt, if applicable. |
| Provider compatibility notes | Known provider/model/runtimes constraints or caveats. |
| Required capabilities | Capabilities required to run the prompt safely. |
| Sensitivity level | Data sensitivity classification expected for prompt inputs. |
| Review policy | Whether outputs require human/advisor review. |
| Owner | Team/person responsible for prompt quality and governance. |
| Status | Lifecycle status such as draft, approved, active, retired. |
| Changelog | Human-readable reason and summary for each version. |

Prompt registry entries should link prompt behavior to feature classification, capability requirements, output validation, and review policy.

---

## 4. Prompt Lifecycle

| Status | Meaning | Who may use it | Production use? | Audit requirements |
|---|---|---|---|---|
| `draft` | Prompt is being written or explored. | Developers/product owners in local/dev only. | No. | Track owner and creation context if stored. |
| `under_review` | Prompt is ready for review but not approved. | Reviewers/evaluators in non-production. | No. | Track reviewer, review notes, linked issue/decision if available. |
| `approved` | Prompt version passed review but is not necessarily active. | Can be selected for staging/demo and prepared for production activation. | Only if explicitly activated by config. | Track approval timestamp, reviewer, risk classification. |
| `active` | Prompt version is selected for a workflow/environment. | AI Gateway may resolve it for configured environment/workflow. | Yes, for approved production environments. | Track activation timestamp, actor, environment, previous active version. |
| `deprecated` | Prompt is still available for rollback/history but should not be selected for new work. | Existing jobs/history and explicit rollback only. | Avoid except controlled rollback. | Track deprecation reason and replacement version. |
| `retired` | Prompt should not run anymore. | Historical audit only. | No. | Track retirement reason and timestamp. |
| `rejected` | Prompt failed review or evaluation. | Historical/audit only. | No. | Track rejection reason and reviewer. |

Experimental prompts must not silently run in production.

---

## 5. Versioning Rules

Rules:

- prompt versions are immutable after activation
- edits create new versions
- active version is selected by workflow/config
- rollback means switching active version, not editing old version
- prompt changes must be traceable

Version metadata should include:

- prompt key
- version
- owner
- status
- changelog
- review/approval metadata
- output schema key
- required capabilities
- provider compatibility notes
- last reviewed timestamp

Prompt versioning should be stable enough that an AI job can later explain exactly which prompt version generated its output.

---

## 6. Environment Separation

Prompt environments:

- local/dev prompts
- staging prompts
- production prompts
- demo prompts

Rules:

- local/dev prompts can be experimental
- staging prompts should be reviewable and testable
- production prompts require approval
- demo prompts may be optimized for showcase data but must not silently replace production prompts
- experimental prompts must not silently run in production

Environment-specific prompt selection should be explicit and auditable.

---

## 7. Workflow Mapping

Product modules refer to `prompt_key`, not raw prompt text.

AI Gateway resolves:

- prompt key
- prompt version
- workflow key
- feature key
- output schema key
- required capabilities
- provider/deployment compatibility

Prompt mapping may vary by:

- deployment mode
- provider capability
- tenant policy
- environment
- workflow version

Deterministic workflows must not depend on prompt output as source of truth. Prompt output can draft, summarize, suggest, or extract, but authoritative workflow state remains deterministic and reviewable.

---

## 8. Output Schema Binding

Prompts used for structured workflows should reference an `output_schema_key`.

Rules:

- output schema validation failure must not mutate deterministic state
- schema changes require compatibility review
- schema version should be recorded with AI job output
- prompt changes that affect structured output shape require regression testing
- provider-specific structured output behavior should be hidden behind AI Gateway validation

Schema binding makes output safer for workflow use, but it does not make the content legally authoritative.

---

## 9. Governance & Review

Prompt review requirements:

- prompt owner
- reviewer
- approval timestamp
- reason for change
- linked issue/decision if available
- risk classification
- test/evaluation notes

Review should consider:

- feature classification
- whether output is compliance-sensitive
- whether review is required before use
- output schema compatibility
- data sensitivity
- prompt injection resilience
- provider portability
- localization expectations

High-risk prompts should require stricter review than productivity/copilot prompts.

---

## 10. Audit Metadata

Every AI job using a prompt should record:

- `prompt_key`
- `prompt_version`
- `workflow_key`
- `feature_key`
- provider/model
- tenant
- user
- output validation result
- review requirement
- accepted/rejected state placeholder

Audit metadata should also capture:

- environment
- selected provider capability profile
- output schema key
- input reference IDs
- fallback state if prompt/provider could not run

Do not store raw sensitive prompts or tenant data in global logs unless policy allows it.

---

## 11. Prompt Testing & Evaluation

Testing concepts:

- golden examples
- regression cases
- structured output validity
- hallucination checks
- evidence citation quality
- provider comparison
- local vs cloud behavior comparison

MVP may store tests as documentation, fixtures, or manually reviewed examples later.

Evaluation should answer:

- Does the prompt produce valid structure?
- Does it avoid claiming final compliance authority?
- Does it cite or reference evidence when required?
- Does it behave acceptably across the MVP provider?
- Does it fail safely when input is incomplete or adversarial?

Prompt tests should become more formal before production-critical use.

---

## 12. Tenant Overrides

Tenant-specific prompt overrides are enterprise-only/future.

Rules:

- must require review and audit
- must not bypass global governance
- must remain capability-aware
- must respect tenant data residency and provider policy
- must not remove required disclaimers/review behavior
- must not convert advisory output into authoritative compliance decision

MVP should not allow tenant-authored production prompts.

---

## 13. Security Requirements

Security requirements:

- no secrets in prompts
- avoid embedding tenant-sensitive data in static prompt templates
- prompt injection awareness
- RAG/document content must be treated as untrusted input
- prompts must not instruct models to bypass review/governance
- provider keys must never be included in prompts

Additional guidance:

- keep system instructions separate from user/tenant/document content
- use explicit delimiters or structured context sections
- minimize included data
- avoid logging raw prompt payloads by default
- treat prompt template and runtime context as different security surfaces

---

## 14. Prompt Injection Considerations

User documents may contain malicious instructions.

Rules:

- prompts should separate system instructions from tenant/user content
- AI Gateway/workflow layer should label untrusted content clearly
- outputs must be validated and reviewed before use
- document content must not override system/developer workflow instructions
- retrieved content should be treated as evidence/context, not instructions
- prompts should instruct the model to ignore instructions embedded in user-provided documents that conflict with system policy

Prompt injection defenses must be layered with validation, review, least-required context, and deterministic workflow boundaries.

---

## 15. MVP Implementation Recommendation

Recommended safe initial implementation:

- static prompt registry in code/config or docs
- `prompt_key` and `prompt_version` recorded in AI jobs
- no production prompt editing UI
- one approved prompt for first AI-assisted workflow
- structured output validation where applicable
- prompt owner/reviewer captured manually or in config metadata
- prompt body storage decision made before first production workflow

Initial MVP prompt should be:

- low blast radius
- tied to a non-authoritative AI-assisted workflow
- compatible with one cloud provider profile
- review-required if compliance-sensitive
- backed by manual fallback

---

## 16. Anti-Patterns

Discouraged:

- raw prompts scattered across controllers/components
- silent prompt edits without version changes
- unreviewed production prompt changes
- tenant-specific prompts without audit
- prompts that produce authoritative compliance decisions
- prompts that ask AI to directly mutate deterministic state
- provider-specific prompt hacks leaking into product modules
- prompts that hide uncertainty or review requirements
- prompts that include provider keys, secrets, or private credentials

---

## 17. Open Questions

- Where should prompts initially live: docs, code config, database, or file registry?
- Who approves production prompts?
- Do prompts need localization for user-facing outputs?
- Should prompt tests be CI-enforced?
- What is the retention policy for prompt/input/output history?
- Should prompt bodies be stored in audit logs, hashed, or referenced by version only?
- How should prompt rollback be approved?
- How should prompt changes be linked to product/release decisions?

---

## 18. References

- AI Gateway MVP Technical Design: [`30-spec-010-ai-gateway-mvp-technical-design.md`](./30-spec-010-ai-gateway-mvp-technical-design.md)
- AI Job Lifecycle Specification: [`30-spec-011-ai-job-lifecycle.md`](./30-spec-011-ai-job-lifecycle.md)
- Provider Capability Registry Specification: [`30-spec-012-provider-capability-registry.md`](./30-spec-012-provider-capability-registry.md)
- Deterministic Compliance Doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
- AI Governance and Risk Controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- AI Feature Classification Matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
