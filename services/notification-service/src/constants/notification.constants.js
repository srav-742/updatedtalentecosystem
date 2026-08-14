export const CHANNELS = Object.freeze({
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in-app',
});

export const STATUS = Object.freeze({
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  QUEUED: 'queued',
});

export const QUEUE_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  FAILED: 'failed',
  DLQ: 'dlq',
});

export const RETRY_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const CONSUMED_EVENTS = Object.freeze({
  JOB_CREATED: 'JOB_CREATED',
  JOB_UPDATED: 'JOB_UPDATED',
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED',
  INTERVIEW_CREATED: 'INTERVIEW_CREATED',
  INTERVIEW_RESCHEDULED: 'INTERVIEW_RESCHEDULED',
  INTERVIEW_CANCELLED: 'INTERVIEW_CANCELLED',
  INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
  HIRING_COMPLETED: 'HIRING_COMPLETED',
});

export default {
  CHANNELS,
  STATUS,
  QUEUE_STATUS,
  RETRY_STATUS,
  CONSUMED_EVENTS,
};
