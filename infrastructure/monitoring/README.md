# Hire1Percent — Monitoring Configuration

This directory contains configuration for observability tooling.

## Planned Components

| Tool | Purpose | Status |
|------|---------|--------|
| Prometheus | Metrics collection and alerting | Planned |
| Grafana | Metrics visualization dashboards | Planned |
| Jaeger | Distributed tracing | Planned |

## Setup

These tools are available as optional Docker Compose profiles:

```bash
# Start core services only
cd infrastructure/docker && docker compose up -d

# Start core services + dev tools (Mongo Express, Redis Commander)
cd infrastructure/docker && docker compose --profile tools up -d
```

## Production Monitoring

For production environments, consider managed observability platforms:
- **Datadog**
- **New Relic**
- **AWS CloudWatch**
- **Azure Monitor**
- **Google Cloud Operations**

These integrate natively with Kubernetes and reduce operational overhead.
