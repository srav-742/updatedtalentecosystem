# Disaster Recovery

## Recovery Targets

- RPO: 15 minutes for transactional data.
- RTO: 60 minutes for core hiring workflows.
- Search, analytics, and AI derived indexes can be rebuilt from source events.

## Restore Order

1. Network, ingress, DNS, and certificates.
2. Secrets management.
3. Databases and message brokers.
4. API gateway and auth service.
5. Core domain services.
6. Notification, search, analytics, AI, and workers.
7. Observability stack.

## Validation

- Run smoke tests through the API gateway.
- Confirm auth token issuance and RBAC checks.
- Rehydrate search indexes from domain events.
- Replay retry queues before DLQ replay.
- Compare dashboard aggregates against source event counts.
