# Azure — complete official documentation map

**Live hubs:**

- Azure docs home: https://learn.microsoft.com/en-us/azure/
- Architecture Center: https://learn.microsoft.com/en-us/azure/architecture/
- Well-Architected Framework: https://learn.microsoft.com/en-us/azure/well-architected/
- Cloud design patterns: https://learn.microsoft.com/en-us/azure/architecture/patterns/
- Best practices catalog: https://learn.microsoft.com/en-us/azure/architecture/best-practices/index-best-practices

Azure docs span thousands of pages. This TOC maps **frameworks + major product families**. Always WebFetch the specific Learn page.

## Well-Architected Framework (pillars — full)

| Pillar | URL |
|--------|-----|
| Framework home | https://learn.microsoft.com/en-us/azure/well-architected/ |
| Reliability | https://learn.microsoft.com/en-us/azure/well-architected/reliability/ |
| Security | https://learn.microsoft.com/en-us/azure/well-architected/security/ |
| Cost Optimization | https://learn.microsoft.com/en-us/azure/well-architected/cost-optimization/ |
| Operational Excellence | https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/ |
| Performance Efficiency | https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/ |
| Tradeoffs | https://learn.microsoft.com/en-us/azure/well-architected/tradeoffs |
| Assessment / Review | https://learn.microsoft.com/en-us/azure/well-architected/assessment |

## Architecture best-practice catalog

| Practice | URL |
|----------|-----|
| Index | https://learn.microsoft.com/en-us/azure/architecture/best-practices/index-best-practices |
| API design | https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design |
| API implementation | https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation |
| Autoscaling | https://learn.microsoft.com/en-us/azure/architecture/best-practices/auto-scaling |
| Background jobs | https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs |
| Caching | https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching |
| CDN | https://learn.microsoft.com/en-us/azure/architecture/best-practices/cdn |
| Data partitioning | https://learn.microsoft.com/en-us/azure/architecture/best-practices/data-partitioning |
| Monitoring | https://learn.microsoft.com/en-us/azure/architecture/best-practices/monitoring |
| Transient fault handling | https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults |
| Host name preservation | https://learn.microsoft.com/en-us/azure/architecture/best-practices/host-name-preservation |

## Cloud design patterns (fetch pattern page by name)

Catalog: https://learn.microsoft.com/en-us/azure/architecture/patterns/  
Includes (non-exhaustive): Ambassador · Anti-Corruption Layer · Asynchronous Request-Reply · Backends for Frontends · Bulkhead · Cache-Aside · Circuit Breaker · Claim Check · Competing Consumers · CQRS · Event Sourcing · Federated Identity · Gateway Aggregation/Offloading/Routing · Health Endpoint Monitoring · Idempotent Consumer · Leader Election · Materialized View · Pipes and Filters · Priority Queue · Publisher-Subscriber · Queue-Based Load Leveling · Retry · Saga · Scheduler Agent Supervisor · Sharding · Sidecar · Strangler Fig · Throttling · Valet Key · …

## Major Azure service doc families

Browse product docs from https://learn.microsoft.com/en-us/azure/?product=popular — fetch service-specific guides:

| Family | Typical Learn path |
|--------|--------------------|
| Compute | App Service, Container Apps, AKS, Functions, VMs, Batch |
| Networking | VNet, Load Balancer, Application Gateway, Front Door, CDN, Private Link, DNS |
| Storage | Blob, Files, Disks, Data Lake, Queue, Table |
| Databases | Azure SQL, PostgreSQL Flexible Server, MySQL Flexible Server, Cosmos DB, Redis |
| Identity | Microsoft Entra ID, Managed Identities, Key Vault |
| Integration | Service Bus, Event Grid, Event Hubs, Logic Apps, API Management |
| DevOps | Azure DevOps, GitHub Actions on Azure, Monitor, Application Insights |
| AI | Azure OpenAI, AI Search, ML, Cognitive Services |
| Security | Defender for Cloud, Sentinel, WAF, DDoS |

Service guide pattern: `https://learn.microsoft.com/en-us/azure/<service>/`

Examples:

- https://learn.microsoft.com/en-us/azure/app-service/
- https://learn.microsoft.com/en-us/azure/container-apps/
- https://learn.microsoft.com/en-us/azure/aks/
- https://learn.microsoft.com/en-us/azure/azure-functions/
- https://learn.microsoft.com/en-us/azure/postgresql/
- https://learn.microsoft.com/en-us/azure/mysql/
- https://learn.microsoft.com/en-us/azure/cosmos-db/
- https://learn.microsoft.com/en-us/azure/key-vault/
- https://learn.microsoft.com/en-us/azure/active-directory/ (Entra)
- https://learn.microsoft.com/en-us/azure/service-bus-messaging/
- https://learn.microsoft.com/en-us/azure/event-grid/
- https://learn.microsoft.com/en-us/azure/azure-monitor/

## Workloads (WAF)

AI · SaaS · Mission-critical · HPC · Fabric · Sustainability — under  
https://learn.microsoft.com/en-us/azure/well-architected/workloads/

## Protocol

1. Classify: WAF pillar · pattern · best practice · specific service.  
2. Fetch Learn URL.  
3. Apply recommendations with explicit tradeoffs across pillars.  
4. Do not invent SKU limits — fetch service quotas/limits page.
