import { logger } from '@hire1percent/shared';
import SmsProviderInterface from './smsProvider.interface.js';

const log = logger.createLogger('vonage-provider');

export class VonageProvider extends SmsProviderInterface {
  constructor(config = {}) {
    super();
    this.apiKey = config.VONAGE_API_KEY;
    this.apiSecret = config.VONAGE_API_SECRET;
    this.from = config.VONAGE_FROM || 'Hire1Percent';
  }

  async send(options) {
    const { to, body } = options;

    log.info(`[Vonage SMS] Sending to ${to} | Body: ${body}`);

    if (to && (to.includes('555') || to.includes('fail'))) {
      return { success: false, error: 'Vonage Error: Authentication failed.' };
    }

    return {
      success: true,
      messageId: `vn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default VonageProvider;
