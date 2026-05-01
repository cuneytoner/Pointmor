# Pointmor Certified AI Hardware Profiles

## 1. Why Standard Hardware Profiles Matter

Certified AI hardware profiles keep private, hybrid, and on-prem AI deployments predictable.

Standard profiles help Pointmor provide:

- predictable deployment
- predictable support
- known model/runtime compatibility
- reduced customer-specific troubleshooting
- clearer sales packaging
- clearer capacity expectations
- safer procurement conversations

Pointmor should avoid promising that Product AI works on arbitrary customer hardware. Hardware support should be tied to documented profiles, tested runtimes, and explicit operational boundaries.

## 2. Support Policy

| Support level | Meaning |
|---|---|
| Certified | Tested and supported by Pointmor for documented workloads and runtimes |
| Compatible | Likely works with known runtimes, but support is limited to documented configuration guidance |
| Best effort | Customer-owned non-standard hardware; Pointmor can help diagnose at a reasonable level but does not guarantee runtime compatibility or performance |
| Unsupported | Hardware below minimum requirements or outside documented deployment boundaries |

Support status applies to a profile plus a runtime plus a workload. Hardware alone is not enough to guarantee production suitability.

## 3. Hardware Profiles

### PM-AI-DEMO

Mac Mini M4 24GB/32GB class with 2TB external NVMe via USB4/TB enclosure.

Suitable for:

- demos
- PoCs
- local private AI showcase
- product validation
- sales demonstrations

Not recommended as the default production inference backbone.

Support posture:

- Certified for demo and PoC scenarios after validation.
- Compatible for limited local experimentation.
- Not a default production profile.

### PM-AI-SMALL

Mac Studio or higher-memory Apple Silicon option, or small GPU workstation.

Suitable for:

- small office pilot
- limited private AI
- low-volume document processing
- small advisor/customer validation environments

Support posture:

- Certified only for defined pilot workloads.
- Production use requires workload validation.

### PM-AI-MEDIUM

RTX 4090 / RTX PRO class GPU workstation.

Expected baseline:

- Ubuntu Server
- 64-128GB RAM
- 2-4TB NVMe
- modern NVIDIA drivers
- monitored local service deployment

Suitable for:

- pilot production
- moderate local inference
- local embeddings and RAG indexing
- private AI node for business/enterprise pilots

Support posture:

- Preferred profile for serious local/private AI validation.
- Production suitability depends on concurrency, model size, document volume, and runtime configuration.

### PM-AI-ENTERPRISE

L40S / A-series / H-series GPU server.

Expected baseline:

- ECC RAM
- redundant PSU
- rack/datacenter deployment
- enterprise storage and backup
- monitoring and alerting
- documented driver/runtime lifecycle

Suitable for:

- enterprise production private AI
- private cloud inference
- high-volume document processing
- regulated customer deployments with support contract

Support posture:

- Certified only through a documented deployment profile.
- Requires capacity testing and support responsibility agreement.

### PM-AI-AIRGAP

Enterprise-only controlled deployment profile.

Suitable for:

- highly regulated isolated environments
- no cloud dependency by default
- strict update, logging, and support processes

Support posture:

- Future/enterprise-only profile.
- Requires custom support, update, license, model distribution, and audit export procedure.

## 4. Runtime Mapping

| Profile | Likely runtimes |
|---|---|
| PM-AI-DEMO | Ollama, llama.cpp, MLX-based experimentation |
| PM-AI-SMALL | Ollama, llama.cpp, MLX-based experimentation, small GPU runtime where applicable |
| PM-AI-MEDIUM | vLLM, Ollama, llama.cpp |
| PM-AI-ENTERPRISE | vLLM, NVIDIA NIM, Triton, Kubernetes-based serving |
| PM-AI-AIRGAP | Customer-approved runtime stack, commonly vLLM/NIM/Triton under controlled update process |

Runtime choice must be recorded in deployment documentation. A profile is not certified for every runtime by default.

## 5. Feature Capacity Matrix

| Capability | PM-AI-DEMO | PM-AI-SMALL | PM-AI-MEDIUM | PM-AI-ENTERPRISE | PM-AI-AIRGAP |
|---|---|---|---|---|---|
| Demo suitability | Excellent | Excellent | Good | Good | Limited by process |
| Embeddings | Good for PoC | Good for pilot | Good | Excellent | Depends on approved runtime |
| RAG indexing | Limited/small sets | Small to moderate | Moderate | High | Depends on approved storage/runtime |
| Chat inference | Demo/low volume | Low to moderate | Moderate | High | Depends on approved runtime |
| Long context | Limited | Limited to moderate | Model/runtime dependent | Stronger, model/runtime dependent | Controlled, model/runtime dependent |
| Concurrency | Low | Low to moderate | Moderate | High | Strictly planned |
| Production suitability | Not default | Limited/pilot | Pilot production/moderate production | Enterprise production | Enterprise-only |
| Support complexity | Low | Medium | Medium | High | Very high |

Capacity is workload-specific. Customer document size, model choice, concurrency, embedding volume, retention policy, and review workflow all affect real throughput.

## 6. Sales Packaging Link

Hardware profiles map to commercial packaging as follows:

| Sales package | Typical hardware profile |
|---|---|
| Private AI Demo Kit | PM-AI-DEMO |
| Hybrid AI Kit | PM-AI-SMALL or PM-AI-MEDIUM |
| Enterprise Private AI Node | PM-AI-MEDIUM or PM-AI-ENTERPRISE |
| Regulated On-Prem Bundle | PM-AI-ENTERPRISE or PM-AI-AIRGAP |

Sales language should stay aligned with support policy:

- Do not sell unsupported hardware as production-ready.
- Do not imply Mac Mini class hardware is the default production backbone.
- Do not promise air-gapped support without an enterprise contract and defined support process.
- Keep AI outputs positioned as reviewable assistance, not authoritative compliance decisions.

