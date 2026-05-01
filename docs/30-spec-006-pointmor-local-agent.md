# Pointmor Local Agent

## 1. Purpose

Pointmor Local Agent is the customer-environment component used for Hybrid AI and Private AI deployments.

The Local Agent runs inside the customer environment and allows Pointmor Cloud or private Pointmor deployments to use:

- local inference
- local vector search
- local document processing
- local embeddings
- local audit capture

The Local Agent exists so Product AI capabilities can run closer to customer data without requiring Pointmor product modules to know which local runtime, vector database, or document processor is being used.

Product modules should continue to call Pointmor APIs and AI Gateway. AI Gateway decides when a job should route to Local Agent based on tenant policy, deployment mode, module requirements, and provider capabilities.

## 2. Deployment Modes

### Cloud-Managed Hybrid

Pointmor Cloud remains the primary application environment. The Local Agent runs in the customer network.

Recommended communication pattern:

- Local Agent establishes outbound-only connectivity to Pointmor Cloud.
- Pointmor Cloud does not require inbound firewall openings into the customer environment.
- Jobs are delivered by polling, brokered queue, or secure tunnel.
- Results and allowed metadata are submitted back according to tenant policy.

Use case:

- Business customers that want Pointmor Cloud UX with selected local/private AI processing.

### Private Cloud

A customer-owned or customer-dedicated Pointmor instance communicates with Local Agent in the same private network or private cloud.

Use case:

- Enterprise customers that require dedicated infrastructure but do not need full on-prem isolation.

### Full On-Prem

Pointmor app and Local Agent both run in customer-owned infrastructure.

The Local Agent may be:

- embedded into the on-prem deployment
- deployed as a separate service
- scaled independently from the application API

Use case:

- regulated or high-value customers that require customer-owned infrastructure for application, documents, embeddings, and inference.

### Air-Gapped

Future enterprise-only deployment mode.

In air-gapped mode:

- no normal cloud dependency exists
- updates are manual and controlled
- model distribution is controlled
- support bundles are exported manually
- license/audit exchange procedures must be explicitly defined

Air-gapped Local Agent support should not be treated as generally available until update, monitoring, support, and incident-response procedures are fully documented.

## 3. Responsibilities

The Local Agent is responsible for:

- local inference bridge
- local vector indexing
- local document processing
- local embeddings
- secure job execution
- heartbeat and health status
- offline queue
- encrypted configuration
- model/runtime status reporting
- local audit logs
- optional model pull/update management
- local runtime capability reporting
- local failure/retry tracking

The Local Agent is not responsible for:

- bypassing Pointmor auth or tenant policy
- making final compliance decisions
- exposing arbitrary local file system access
- training on customer data unless an explicit future policy allows it
- silently uploading private-mode source documents to cloud

## 4. Communication Model

Hybrid mode should prefer outbound-only connectivity from the customer network to Pointmor Cloud.

### Registration and Provisioning

Local Agent registration should include:

- tenant or organization association
- deployment mode
- agent id
- capability profile
- runtime profile
- public key or certificate material
- allowed job types
- policy flags for local-only and cloud-sync behavior

Provisioning must be explicit. An unregistered Local Agent must not receive jobs.

### Heartbeat

The Local Agent should periodically report:

- agent online/offline state
- software version
- runtime status
- model availability
- queue depth
- disk/storage status
- vector DB status
- last successful job timestamp
- degraded mode flags

Heartbeat payloads should not include raw customer documents or confidential prompt content.

### Job Polling or Secure Tunnel

Cloud-managed hybrid mode should use one of:

- job polling from Local Agent to Pointmor Cloud
- brokered queue with outbound connection
- secure tunnel initiated from customer network

Inbound connectivity from Pointmor Cloud into the customer network should not be required for the default hybrid model.

### Result Submission

Result submission depends on tenant policy.

Allowed result types may include:

- job status
- structured extraction output
- confidence scores
- audit summary
- usage counters
- redacted result payload
- review-required flag

Private AI mode should not upload raw source documents to cloud unless explicitly configured and approved by tenant policy.

### Failure and Retry Behavior

The Local Agent should support:

- local retry with backoff
- durable pending job state
- failed job state
- manual review fallback
- cloud-visible error summaries
- safe resume after restart

Failures must be visible to operators. Silent fallback from private/local processing to cloud processing is forbidden unless tenant policy explicitly allows that fallback.

## 5. Supported Local Runtimes

### Ollama

Use:

- demo
- PoC
- small private AI showcase
- Mac Mini / Mac Studio class deployments

Boundary:

- useful for fast local validation
- not the default production GPU runtime
- model compatibility and throughput must be documented per profile

### vLLM

Use:

- production GPU workstation
- private cloud inference
- high-throughput local LLM serving
- OpenAI-compatible endpoint where useful

Boundary:

- preferred production-oriented local LLM serving option for GPU deployments
- requires Linux, GPU driver, runtime, monitoring, and capacity planning

### LM Studio

Use:

- demo
- local development
- manual experimentation

Boundary:

- not recommended for production
- not a support baseline for enterprise Local Agent deployments

### NVIDIA NIM / Triton

Use:

- future enterprise GPU server deployments
- controlled inference service on certified hardware
- regulated/private deployments that need vendor-supported runtime options

Boundary:

- enterprise option
- requires certified deployment profile and support agreement

## 6. Data Boundaries

### Data That May Leave the Customer Environment

Depending on tenant policy and deployment mode, the following may leave the customer environment:

- health metadata
- heartbeat status
- job status
- usage counters
- audit summaries
- capability profile
- model/runtime status
- optional redacted results
- optional structured outputs approved for cloud sync

These payloads must be minimized and must not include confidential raw content unless policy explicitly allows it.

### Data That Should Stay Local in Private Mode

In Private AI mode, the following should stay local by default:

- source documents
- raw extracted text
- embeddings
- vector DB
- raw prompts containing customer confidential data
- model outputs until policy allows sync
- local processing logs that include sensitive document context

Private mode must not silently downgrade into cloud processing.

## 7. Operational Requirements

### Installation

Installation should define:

- supported operating systems
- hardware profile
- runtime profile
- network requirements
- storage requirements
- certificate/key provisioning
- service account or local process model

### Upgrades

Upgrade process should define:

- agent version compatibility
- model/runtime compatibility
- rollback path
- config migration
- downtime expectation
- air-gapped update package process for future enterprise mode

### Logs

Logs should support troubleshooting without leaking customer content.

Rules:

- no raw source document logging by default
- no provider keys in logs
- no full confidential prompts in logs
- job ids and summarized errors are acceptable
- support bundles must redact secrets

### Monitoring

Minimum monitoring:

- process health
- heartbeat age
- queue depth
- job failure rate
- runtime availability
- model availability
- disk usage
- vector DB health

### Backups

Backup policy must cover:

- local configuration
- local audit logs
- vector DB data where required
- local job state
- model cache if needed

Source documents may be backed up through customer storage policy rather than Local Agent itself, depending on deployment model.

### Certificate and Key Rotation

Local Agent must support:

- agent credential rotation
- cloud registration credential rotation
- provider/runtime credential rotation where applicable
- certificate renewal
- revocation when an agent is decommissioned

### Support Bundle Export

Support bundle export should include:

- agent version
- OS/runtime summary
- capability profile
- recent heartbeat metadata
- job status summary
- redacted logs
- configuration summary without secrets

Support bundles must not include raw documents, embeddings, provider keys, or confidential prompts unless a special customer-approved export procedure exists.

## 8. MVP Scope

The minimal Local Agent MVP should include:

- one local LLM endpoint
- one embedding endpoint
- one vector DB option
- job polling
- heartbeat
- basic local audit log
- encrypted configuration
- local runtime status
- retry/failure states
- manual review fallback flag

Recommended MVP boundary:

- use AI Gateway as the only cloud-side entry point
- support one local runtime path first
- support one vector DB path first
- avoid hardware auto-detection beyond a basic capability report
- avoid autonomous model updates
- avoid air-gapped support until update/support procedures are proven

The Local Agent MVP should prove the contract before broad runtime or hardware support is promised.

