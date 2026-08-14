import NotificationTemplate from '../models/notificationTemplate.model.js';
import { CONSUMED_EVENTS, CHANNELS } from '../constants/notification.constants.js';
import { logger } from '@hire1percent/shared';

const log = logger.createLogger('notification-service:seed');

export async function seedNotificationTemplates() {
  try {
    const templates = [
      {
        name: CONSUMED_EVENTS.JOB_CREATED,
        titleTemplate: 'New Job Posted: {{jobTitle}}',
        bodyTemplate: 'A new job opening for "{{jobTitle}}" has been posted at {{companyName}}.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.JOB_UPDATED,
        titleTemplate: 'Job Updated: {{jobTitle}}',
        bodyTemplate: 'The job posting for "{{jobTitle}}" has been updated.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.APPLICATION_SUBMITTED,
        titleTemplate: 'Application Received: {{jobTitle}}',
        bodyTemplate: 'Hi {{candidateName}}, your application for "{{jobTitle}}" has been successfully submitted.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.ASSESSMENT_COMPLETED,
        titleTemplate: 'Assessment Completed: {{assessmentName}}',
        bodyTemplate: 'Hi {{candidateName}}, you have completed the assessment for "{{assessmentName}}".',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.INTERVIEW_CREATED,
        titleTemplate: 'Interview Scheduled: {{jobTitle}}',
        bodyTemplate: 'Hi {{candidateName}}, your interview for "{{jobTitle}}" has been scheduled for {{interviewTime}}.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.INTERVIEW_RESCHEDULED,
        titleTemplate: 'Interview Rescheduled: {{jobTitle}}',
        bodyTemplate: 'Hi {{candidateName}}, your interview for "{{jobTitle}}" has been rescheduled to {{interviewTime}}.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.INTERVIEW_CANCELLED,
        titleTemplate: 'Interview Cancelled: {{jobTitle}}',
        bodyTemplate: 'Hi {{candidateName}}, your interview for "{{jobTitle}}" has been cancelled.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.INTERVIEW_COMPLETED,
        titleTemplate: 'Interview Feedback Ready: {{jobTitle}}',
        bodyTemplate: 'Hi {{candidateName}}, feedback for your interview for "{{jobTitle}}" is now available.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      },
      {
        name: CONSUMED_EVENTS.HIRING_COMPLETED,
        titleTemplate: 'Hiring Process Complete: {{jobTitle}}',
        bodyTemplate: 'The hiring process for "{{jobTitle}}" has been completed.',
        channels: [CHANNELS.EMAIL, CHANNELS.IN_APP],
        isActive: true
      }
    ];

    for (const t of templates) {
      const exists = await NotificationTemplate.findOne({ name: t.name });
      if (!exists) {
        await NotificationTemplate.create(t);
        log.info(`Seeded notification template: ${t.name}`);
      }
    }
    log.info('✔ Notification templates check/seeding complete.');
  } catch (error) {
    log.error('Failed to seed notification templates:', error);
  }
}
