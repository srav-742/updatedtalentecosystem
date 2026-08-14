import { events } from '@hire1percent/shared';
import { notificationService } from '../services/notification.service.js';
import { CONSUMED_EVENTS } from '../constants/notification.constants.js';
import { logger } from '@hire1percent/shared';

const log = logger.createLogger('notification-listeners');

/**
 * Binds all required event subscriptions to the shared platform event bus.
 */
export function subscribeToEvents() {
  const eventNames = Object.values(CONSUMED_EVENTS);

  eventNames.forEach((eventName) => {
    events.eventBus.on(eventName, async (eventPayload) => {
      log.info(`Consumed event: "${eventName}"`);
      try {
        // Event payload structure expectation:
        // {
        //   recipient: { id: 'usr_1', email: 'u1@ex.com', phone: '+123', pushTokens: [...] },
        //   context: { jobTitle: 'Node.js Dev', candidateName: 'John Doe', ... }
        // }
        const { recipient, context } = eventPayload || {};

        if (!recipient || !recipient.id) {
          log.warn(`Skipping event "${eventName}" due to missing recipient identity.`);
          return;
        }

        await notificationService.sendFromTemplate(eventName, recipient, context);
      } catch (err) {
        log.error(`Error executing handler for event "${eventName}":`, err);
      }
    });
  });

  log.info(`✔ Registered listeners for event bus: ${eventNames.join(', ')}`);
}

export default { subscribeToEvents };

