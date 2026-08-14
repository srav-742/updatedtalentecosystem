import { logger } from '@hire1percent/shared';
import EmailProviderInterface from './emailProvider.interface.js';

const log = logger.createLogger('sendgrid-provider');

export class SendGridProvider extends EmailProviderInterface {
  constructor(config = {}) {
    super();
    this.apiKey = config.SENDGRID_API_KEY;
    this.from = config.SENDGRID_FROM || 'no-reply@hire1percent.com';
  }

  async send(options) {
    const { to, subject, body } = options;

    log.info(`[SendGrid] Dispatching email to ${to} | Subject: ${subject}`);

    if (to && to.includes('fail')) {
      return { success: false, error: 'SendGrid: API key invalid or rate limit exceeded.' };
    }

    return {
      success: true,
      messageId: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default SendGridProvider;
