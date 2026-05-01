# Pointmor AI Infrastructure Strategy

## 1. Executive Summary

Pointmor is compliance-native and AI-augmented.

AI should help users and advisors understand documents, prepare evidence, prioritize work, and draft review-ready outputs. AI must not produce authoritative compliance decisions. Final compliance status, obligation completion, and advisory conclusions remain deterministic, reviewable, and attributable to humans or explicit system rules.

The deterministic compliance doctrine is canonical for this boundary: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md).

The platform should support cloud AI, private AI, and on-prem AI without rewriting core product modules. Product modules such as `ai_act`, advisor workflows, future expense capture, contract review, and e-invoice should consume AI through a shared infrastructure boundary instead of directly binding to a specific model provider or hardware runtime.

The strategic direction is:

- Route all Product AI through an AI Gateway.
- Keep tenant isolation, module activation, RBAC, auditability, and review workflows outside model-specific code.
- Support multiple deployment modes with clear operational and commercial boundaries.
- Treat private and on-prem inference as enterprise deployment options, not as a default requirement for every customer.

## 2. Development AI vs Product AI

Development AI and Product AI are separate concerns.

**Development AI** means tools used by the engineering team to build Pointmor. Examples include Cursor, Codex, local coding assistants, documentation assistants, and developer-side code review helpers.

Development AI:

- does not process customer production data by default
- is governed by engineering and source-control policy
- should not be treated as a customer-facing product feature
- may use different providers, models, and local tooling than Product AI

**Product AI** means AI features delivered inside Pointmor to customers. Examples include document classification, OCR/VLM extraction, evidence suggestions, compliance workflow signals, advisor review assistance, and future module-specific AI capabilities.

Product AI:

- processes tenant-scoped customer data
- must follow membership, role, module activation, and tenant isolation rules
- must be auditable
- must preserve human/advisor review
- must distinguish AI-generated suggestions from deterministic product state

Planning, risk analysis, security policy, deployment architecture, procurement, and sales packaging must not mix these two categories. A tool being acceptable for development does not automatically make it acceptable for Product AI.

## 3. Deployment Modes

### Cloud AI Mode

| Area | Definition |
|---|---|
| Pointmor app runs | Pointmor-managed cloud or standard SaaS deployment |
| AI inference runs | Managed cloud AI provider behind the Pointmor AI Gateway |
| Customer documents and embeddings live | Pointmor-managed storage and tenant-scoped vector/index services |
| Cloud connectivity | Required |
| Target customer segment | Starter, Professional, standard SaaS customers |
| Operational complexity | Low |

Cloud AI Mode is the default starting point for production because it minimizes infrastructure burden, accelerates iteration, and allows the AI Gateway to enforce audit, provider routing, cost tracking, and fallback policy centrally.

### Hybrid AI Mode

| Area | Definition |
|---|---|
| Pointmor app runs | Pointmor cloud |
| AI inference runs | Mix of managed cloud AI and customer/local Pointmor Local Agent |
| Customer documents and embeddings live | Split by policy: cloud storage for approved workloads, local/private storage for sensitive workloads |
| Cloud connectivity | Required for app access; local agent requires controlled outbound or brokered connectivity |
| Target customer segment | Business customers with stronger privacy or data residency needs |
| Operational complexity | Medium |

Hybrid AI Mode lets customers keep selected AI workloads local while still using Pointmor as a cloud SaaS product. It is the likely bridge between regular SaaS and full private deployments.

### Private AI Mode

| Area | Definition |
|---|---|
| Pointmor app runs | Pointmor cloud or customer private cloud, depending on contract |
| AI inference runs | Dedicated private AI node or private cloud model endpoint |
| Customer documents and embeddings live | Customer-dedicated storage/vector services or private tenant-isolated infrastructure |
| Cloud connectivity | Required unless paired with private app deployment |
| Target customer segment | Enterprise customers with privacy, procurement, or regulated-data requirements |
| Operational complexity | Medium to high |

Private AI Mode is a premium deployment profile. It should use certified hardware profiles, documented support boundaries, and explicit model/runtime compatibility rules.

### Full On-Prem Mode

| Area | Definition |
|---|---|
| Pointmor app runs | Customer-owned infrastructure |
| AI inference runs | Customer-owned private inference infrastructure |
| Customer documents and embeddings live | Customer-owned database, object storage, and vector/index services |
| Cloud connectivity | Optional for updates/support; not required for normal runtime if contracted that way |
| Target customer segment | Regulated and high-value enterprise customers |
| Operational complexity | High |

Full On-Prem Mode should be reserved for customers whose security, legal, procurement, or data residency requirements justify the operational cost. It requires strict versioning, support contracts, deployment runbooks, backup/restore procedures, and explicit responsibility boundaries.

### Air-Gapped Mode

| Area | Definition |
|---|---|
| Pointmor app runs | Customer-controlled isolated infrastructure |
| AI inference runs | Customer-controlled isolated inference infrastructure |
| Customer documents and embeddings live | Fully isolated customer-owned storage and vector/index services |
| Cloud connectivity | None during normal operation |
| Target customer segment | Future enterprise-only option for highly regulated environments |
| Operational complexity | Very high |

Air-gapped Mode is a future enterprise-only option. It should not be sold as generally available until packaging, update distribution, license enforcement, audit export, model update, support, and incident-response procedures are fully defined.

## 4. Recommended Product Positioning

| Package | AI positioning |
|---|---|
| Starter | Cloud AI |
| Professional | Cloud AI plus audit/advisor workflow |
| Business | Hybrid AI with Pointmor Local Agent |
| Enterprise | Private AI or private cloud deployment |
| Regulated | Full On-Prem or customer-owned infrastructure |

Packaging should remain honest about implementation boundaries:

- Cloud AI is fastest to deploy.
- Hybrid AI is for customers who need selective local processing.
- Private AI is a premium privacy and control offering.
- Full On-Prem is not a default SaaS path; it is a regulated/high-value customer path.
- Air-gapped support is future/enterprise-only until operationally proven.

## 5. Hardware Strategy

Pointmor should define certified AI hardware profiles instead of promising support for arbitrary hardware.

### PM-AI-DEMO

Mac Mini M4 24GB/32GB class, external NVMe storage.

Use:

- demo
- PoC
- private AI showcase
- local product validation
- advisor/customer-facing sales demonstration

Boundary:

- Recommended for demo, PoC, and local private AI showcase.
- Not recommended as the default production inference backbone.
- Capacity claims must be validated per workload and model.

### PM-AI-SMALL

Mac Mini or Mac Studio class hardware for small office or limited pilot deployments.

Use:

- small team pilot
- low-volume document processing
- local review workflow validation
- customer privacy demonstration with realistic operational constraints

Boundary:

- Suitable for limited workloads.
- Requires documented model/runtime choices.
- Not a general enterprise production baseline.

### PM-AI-MEDIUM

RTX 4090 / RTX PRO style GPU workstation, Ubuntu, 64-128GB RAM, 2-4TB NVMe.

Use:

- serious pilot
- medium-volume private inference
- advisor office deployment
- customer-owned hybrid/private AI node

Boundary:

- Better suited for sustained local inference than Mac Mini class hardware.
- Requires OS, driver, model runtime, monitoring, backup, and remote support procedures.

### PM-AI-ENTERPRISE

L40S / A-series / H-series class GPU server, ECC RAM, redundant power, rack deployment.

Use:

- enterprise private AI
- private cloud inference
- high-volume document processing
- regulated customer deployment with support contract

Boundary:

- Requires certified deployment profile.
- Requires explicit capacity testing.
- Should include monitoring, alerting, backup, model/runtime update policy, and hardware support responsibilities.

### PM-AI-AIRGAP

Enterprise-only controlled deployment profile.

Use:

- highly regulated isolated environments
- customer-owned infrastructure with no normal cloud dependency
- controlled update and audit export processes

Boundary:

- Future/enterprise-only.
- Requires special support model, update procedure, model distribution process, and legal/commercial agreement.

## 6. Strategic Recommendation

Initial production should use managed cloud AI through an AI Gateway.

The AI Gateway should become the stable Product AI boundary for:

- provider routing
- tenant and module policy checks
- model and prompt version metadata
- audit logging
- cost attribution
- fallback behavior
- human/advisor review handoff

Mac Mini class hardware should be used as a Private AI demo node and product validation environment. It is valuable because it makes private AI tangible, portable, and sales-friendly. It should not be positioned as the default production inference backbone.

Enterprise/private deployments should use certified hardware profiles and documented support boundaries. Pointmor should define which profiles are supported, which workloads are validated, and which responsibilities belong to Pointmor, the customer, or an infrastructure partner.

Full on-prem should be reserved for regulated and high-value customers. It should be sold only when customer requirements justify operational complexity and support cost.

## 7. Risks and Boundaries

### Avoid "any hardware supported" promises

Pointmor should not promise that Product AI works on any customer hardware. Support should be tied to certified profiles, tested runtimes, and documented capacity assumptions.

### Do not make AI authoritative decision logic

AI can suggest, summarize, classify, extract, and prioritize. AI must not be the final source of truth for compliance status, legal conclusions, obligation completion, or advisory sign-off.

### Keep deterministic status separate from AI suggestions

Compliance state should remain deterministic and auditable. AI-generated content should be labeled as derived, probabilistic, and reviewable.

Examples:

- AI suggestion: "Evidence appears stale."
- Deterministic state: "Evidence record last updated 45 days ago."
- Human/advisor action: "Reviewed and accepted evidence."

### Preserve fallback and manual workflows

When AI is unavailable, rate-limited, low-confidence, or blocked by deployment policy, Pointmor should continue to support manual workflows.

Fallback behavior should include:

- queue retry
- manual upload/review path
- advisor review path
- clear user-facing status
- no silent downgrade that changes compliance meaning

### Maintain tenant isolation

All Product AI data must remain tenant-scoped:

- documents
- extracted text
- embeddings
- prompts with tenant context
- model outputs
- review records
- audit events

Cross-tenant retrieval, shared prompt context, and global semantic search across tenant data are forbidden unless a future explicitly designed, consented, and isolated enterprise feature says otherwise.

### Keep external provider behavior transparent

If an external AI provider is used, the deployment mode and data transfer boundary must be explicit. Customers should understand whether documents are processed in cloud AI, hybrid/local AI, private AI, or on-prem AI.
