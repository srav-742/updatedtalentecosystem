import { SmtpProvider } from './smtp.provider.js';
import { SendGridProvider } from './sendgrid.provider.js';
import { SesProvider } from './ses.provider.js';
import { MailgunProvider } from './mailgun.provider.js';
import environment from '../../config/environment.js';

export class EmailProviderFactory {
  /**
   * Resolves the email provider instance based on environment configuration or override parameter.
   * 
   * @param {string} [providerType] - Override provider type ('smtp', 'sendgrid', 'ses', 'mailgun')
   * @returns {EmailProviderInterface}
   */
  static getProvider(providerType = null) {
    const type = providerType || this.detectProviderType();

    switch (type.toLowerCase()) {
      case 'sendgrid':
        return new SendGridProvider(environment);
      case 'ses':
        return new SesProvider(environment);
      case 'mailgun':
        return new MailgunProvider(environment);
      case 'smtp':
      default:
        return new SmtpProvider(environment);
    }
  }

  /**
   * Detects the configured provider by checking for credentials.
   * Defaults to 'smtp'.
   * 
   * @private
   * @returns {string}
   */
  static detectProviderType() {
    if (environment.SENDGRID_API_KEY) return 'sendgrid';
    if (environment.MAILGUN_API_KEY && environment.MAILGUN_DOMAIN) return 'mailgun';
    if (environment.SES_ACCESS_KEY && environment.SES_SECRET_KEY) return 'ses';
    return 'smtp';
  }
}

export default EmailProviderFactory;
