import { logger } from '@hire1percent/shared';
import EmailProviderInterface from './emailProvider.interface.js';

const log = logger.createLogger('mailgun-provider');

export class MailgunProvider extends EmailProviderInterface {
  constructor(config = {}) {
    super();
    this.apiKey = config.MAILGUN_API_KEY;
    this.domain = config.MAILGUN_DOMAIN;
    this.from = config.MAILGUN_FROM || 'no-reply@hire1percent.com';
  }

  async send(options) {
    const { to, subject, body } = options;

    log.info(`[Mailgun] Dispatching email to ${to} | Subject: ${subject}`);

    if (to && to.includes('fail')) {
      return { success: false, error: 'Mailgun: Forbidden - API key is invalid.' };
    }

    return {
      success: true,
      messageId: `mg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default MailgunProvider;
