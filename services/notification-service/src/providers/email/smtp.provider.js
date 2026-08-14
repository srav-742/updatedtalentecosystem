import { logger } from '@hire1percent/shared';
import EmailProviderInterface from './emailProvider.interface.js';

const log = logger.createLogger('smtp-provider');

export class SmtpProvider extends EmailProviderInterface {
  constructor(config = {}) {
    super();
    this.config = config;
  }

  async send(options) {
    const { to, subject, body } = options;

    log.info(`[SMTP] Sending email to ${to} | Subject: ${subject}`);

    // Simulated failure for testing
    if (to && to.includes('fail')) {
      log.error(`[SMTP] Simulated delivery failure to ${to}`);
      return { success: false, error: 'SMTP delivery failed: connection timed out.' };
    }

    return {
      success: true,
      messageId: `smtp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default SmtpProvider;
