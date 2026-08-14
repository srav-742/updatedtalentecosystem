# Hire1Percent Production Runbook

## Deployment

1. Build and push service images to the Docker registry.
2. Render Helm manifests with environment-specific values.
3. Run schema and secret validation before rollout.
4. Deploy with canary or blue-green strategy.
5. Validate `/health`, `/ready`, `/live`, metrics, logs, and traces.
6. Promote canary when SLOs stay green for the full observation window.

## Health Checks

- Liveness: `/live`
- Readiness: `/ready`
- Service health: `/health`
- Metrics: `/metrics`
- Trace export: OTLP to OpenTelemetry Collector

## Observability

- Metrics: Prometheus
- Dashboards: Grafana
- Traces: Jaeger through OpenTelemetry
- Logs: ELK/OpenSearch with correlation id, request id, user id, tenant id

## Security

- Ingress rate limiting and WAF rules protect the API gateway.
- Service mesh mTLS is required for east-west traffic.
- Secrets are mounted from Vault or AWS Secrets Manager.
- Key rotation must run quarterly and after suspected compromise.
- Service tokens must be scoped per service and rotated independently.

## Rollback

1. Freeze rollout.
2. Promote the previous blue-green active service or set canary weight to 0.
3. Confirm error rate and latency recovery.
4. Preserve failed pod logs and traces for incident review.

## Backups

- MongoDB: daily full backups, 15-minute point-in-time oplog retention.
- OpenSearch: daily snapshots and weekly restore validation.
- Object storage: versioned buckets with lifecycle policy.
- Secrets: versioned secret engines and break-glass recovery procedure.
