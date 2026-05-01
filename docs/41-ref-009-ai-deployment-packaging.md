# Pointmor AI Deployment Packaging

## 1. Positioning

Pointmor is compliance-native and AI-augmented, with deployment-flexible AI infrastructure.

The commercial story should be simple:

- Cloud AI for speed.
- Hybrid AI for customers that need local processing for selected workflows.
- Private AI for sensitive customer data.
- Full On-Prem for regulated environments.
- Human-reviewed AI assistance, not automated legal determination.

AI deployment packaging must stay aligned with Pointmor's technical boundaries:

- AI assists users and advisors.
- AI output is derived and reviewable.
- AI does not become the authoritative compliance decision-maker.
- Tenant isolation, auditability, module activation, and human/advisor review remain core platform rules.

## 2. Packages

### Starter

Deployment:

- Cloud AI
- SaaS deployment

Capabilities:

- basic AI-assisted summaries
- basic document understanding where available
- manual/advisor fallback
- standard SaaS support

Best for:

- small teams
- early pilots
- customers who need speed over infrastructure customization

### Professional

Deployment:

- Cloud AI
- SaaS deployment

Capabilities:

- audit logs
- advisor workflow
- usage limits and cost tracking
- review-ready AI assistance
- standard compliance workflow visibility

Best for:

- accounting/advisory firms
- legal firms
- teams that need accountability and advisor-assisted workflows

### Business

Deployment:

- Hybrid AI
- Pointmor Cloud plus Pointmor Local Agent

Capabilities:

- local document processing
- local vector DB
- optional private AI for selected workflows
- cloud app with local/private processing policy
- stronger privacy story without full on-prem complexity

Best for:

- growing advisory firms
- businesses with sensitive documents
- customers with data residency or procurement constraints that do not require full on-prem

### Enterprise

Deployment:

- Private AI
- private cloud or customer-owned AI node

Capabilities:

- certified hardware profile
- enhanced support and governance
- dedicated AI provider/runtime policy
- stronger audit and routing controls
- optional private vector/index services

Best for:

- large enterprise
- regulated commercial customers
- customers with procurement, privacy, or infrastructure-control requirements

### Regulated

Deployment:

- Full On-Prem
- future air-gapped option
- customer infrastructure

Capabilities:

- local AI runtime
- customer-owned database/storage/vector services
- dedicated deployment and support contract
- controlled updates
- local audit/export procedures

Best for:

- public sector
- healthcare
- finance
- highly regulated enterprise environments

Boundary:

- Should not be positioned as general availability for all customers.
- Requires high-value contract, deployment planning, support process, and clear responsibility boundaries.

## 3. Customer Segment Mapping

| Segment | Recommended package |
|---|---|
| SMEs | Starter or Professional |
| Accounting/advisory firms | Professional or Business |
| Legal firms | Professional, Business, or Enterprise depending on sensitivity |
| Healthcare | Enterprise or Regulated |
| Finance | Enterprise or Regulated |
| Public sector | Regulated |
| Large enterprise | Enterprise or Regulated |

Segment mapping is guidance, not an automatic entitlement. Final packaging should consider document sensitivity, deployment requirements, support expectations, and procurement constraints.

## 4. What Not To Sell Too Early

Do not offer full on-prem to small customers.

Do not promise arbitrary hardware support. Use certified hardware profiles and documented support levels.

Do not promise AI as an authoritative compliance decision-maker. AI is assistance, extraction, prioritization, and review support.

Do not promise air-gapped mode before operational process exists.

Do not imply private AI removes the need for governance, audit logging, fallback workflows, or human/advisor review.

Do not position Mac Mini class hardware as the default production inference backbone.

## 5. Add-On Ideas

Potential commercial add-ons:

- Private AI Connector
- Pointmor Local Agent
- Certified AI Node
- AI usage pack
- Enterprise governance/audit pack
- dedicated deployment support
- private vector DB setup
- model/runtime validation package
- advisor review operations package
- regulated deployment readiness assessment

Add-ons should map to real operational cost and support responsibility.

## 6. Pricing Model Considerations

Do not set exact prices yet.

Pricing dimensions:

- tenant count
- user count
- AI usage
- deployment complexity
- hardware profile
- support/SLA level
- private/on-prem premium
- implementation fee
- advisor workflow volume
- document processing volume
- storage/vector retention needs
- integration requirements

Private and on-prem offerings should include an implementation fee or dedicated deployment component because they create support, validation, and operational responsibility beyond standard SaaS.

## 7. Sales Narrative

Short messaging examples:

- "Cloud AI for speed."
- "Private AI for sensitive customer data."
- "On-prem for regulated environments."
- "Human-reviewed AI assistance, not automated legal determination."
- "Use Pointmor Cloud where it makes sense; keep sensitive AI processing local where policy requires it."
- "Deployment-flexible AI without rewriting compliance workflows."
- "Certified AI hardware profiles keep deployments supportable."

Sales narrative should remain practical and accurate. The strongest story is not that AI replaces experts; it is that Pointmor makes compliance operations faster, more traceable, and easier to review.

