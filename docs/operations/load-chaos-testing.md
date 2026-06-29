# Load, Stress, and Chaos Testing

## Load Tests

- Baseline each public route at expected daily peak traffic.
- Run soak tests for at least 4 hours before enterprise releases.
- Track p50, p95, p99 latency, error rate, CPU, memory, queue depth, and GC pauses.

## Stress Tests

- Increase traffic until p95 latency exceeds SLO or error rate exceeds 2%.
- Validate Horizontal Pod Autoscaling behavior.
- Confirm queue consumers scale without duplicate processing.

## Chaos Tests

- Kill random service pods during active traffic.
- Pause broker consumers and verify retry/DLQ behavior.
- Inject database read latency.
- Expire a non-production service token and confirm graceful auth failures.
- Disable one external provider and verify fallback provider behavior.

## Exit Criteria

- No data loss.
- No cross-tenant access.
- Automatic recovery within documented RTO.
- Alerts fire with actionable service labels.
