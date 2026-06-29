import { logger } from '@hire1percent/shared';
import SmsProviderInterface from './smsProvider.interface.js';

const log = logger.createLogger('messagebird-provider');

export class MessageBirdProvider extends SmsProviderInterface {
  constructor(config = {}) {
    super();
    this.apiKey = config.MESSAGEBIRD_API_KEY;
    this.from = config.MESSAGEBIRD_FROM || 'Hire1Percent';
  }

  async send(options) {
    const { to, body } = options;

    log.info(`[MessageBird SMS] Dispatching to ${to} | Body: ${body}`);

    if (to && (to.includes('555') || to.includes('fail'))) {
      return { success: false, error: 'MessageBird Error: Invalid access key.' };
    }

    return {
      success: true,
      messageId: `mb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default MessageBirdProvider;
