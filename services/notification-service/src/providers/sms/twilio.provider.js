import { logger } from '@hire1percent/shared';
import SmsProviderInterface from './smsProvider.interface.js';

const log = logger.createLogger('twilio-provider');

export class TwilioProvider extends SmsProviderInterface {
  constructor(config = {}) {
    super();
    this.accountSid = config.TWILIO_ACCOUNT_SID;
    this.authToken = config.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.TWILIO_FROM_NUMBER || 'Hire1Percent';
  }

  async send(options) {
    const { to, body } = options;

    log.info(`[Twilio SMS] Sending to ${to} | Body: ${body}`);

    // Simulated failure for testing
    if (to && (to.includes('555') || to.includes('fail'))) {
      log.error(`[Twilio SMS] Simulated delivery failure to ${to}`);
      return { success: false, error: 'Twilio Error: Resource not found or number invalid.' };
    }

    return {
      success: true,
      messageId: `tw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default TwilioProvider;
