# Message Broker Abstraction

Hire1Percent services should publish and consume through a broker interface rather than binding business logic to Kafka or RabbitMQ clients.

## Interface

- `publish(topic, event, options)`
- `subscribe(topic, handler, options)`
- `ack(message)`
- `nack(message, reason)`
- `retry(message, delayMs)`
- `deadLetter(message, reason)`

## Providers

- `KafkaBrokerProvider`: production event streaming, ordered partitions, consumer groups.
- `RabbitMQBrokerProvider`: task queues, delayed retries, DLX/DLQ bindings.
- `InMemoryBrokerProvider`: tests and local development.

## Queues

- Retry topics use `<topic>.retry.<attempt>`.
- Dead letter topics use `<topic>.dlq`.
- Background workers must be idempotent and store processed event ids.
- Schedulers publish command events and never call service internals directly.

## Core Topics

- `job.created`
- `job.updated`
- `application.submitted`
- `assessment.completed`
- `interview.created`
- `interview.rescheduled`
- `interview.cancelled`
- `interview.completed`
- `hiring.completed`
