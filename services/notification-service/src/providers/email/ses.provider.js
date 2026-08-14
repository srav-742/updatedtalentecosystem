import { logger } from '@hire1percent/shared';
import EmailProviderInterface from './emailProvider.interface.js';

const log = logger.createLogger('ses-provider');

export class SesProvider extends EmailProviderInterface {
  constructor(config = {}) {
    super();
    this.region = config.SES_REGION || 'us-east-1';
    this.accessKey = config.SES_ACCESS_KEY;
    this.secretKey = config.SES_SECRET_KEY;
    this.from = config.SES_FROM || 'no-reply@hire1percent.com';
  }

  async send(options) {
    const { to, subject, body } = options;

    log.info(`[AWS SES] Sending email to ${to} | Subject: ${subject}`);

    if (to && to.includes('fail')) {
      return { success: false, error: 'SES: AccessDenied - The credentials provided are invalid.' };
    }

    return {
      success: true,
      messageId: `ses-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default SesProvider;
