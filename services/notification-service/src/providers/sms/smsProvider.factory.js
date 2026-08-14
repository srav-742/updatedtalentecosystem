import { TwilioProvider } from './twilio.provider.js';
import { MessageBirdProvider } from './messagebird.provider.js';
import { VonageProvider } from './vonage.provider.js';
import environment from '../../config/environment.js';

export class SmsProviderFactory {
  /**
   * Resolves the SMS provider instance based on environment configuration or override parameter.
   * 
   * @param {string} [providerType] - Override provider type ('twilio', 'messagebird', 'vonage')
   * @returns {SmsProviderInterface}
   */
  static getProvider(providerType = null) {
    const type = providerType || this.detectProviderType();

    switch (type.toLowerCase()) {
      case 'messagebird':
        return new MessageBirdProvider(environment);
      case 'vonage':
        return new VonageProvider(environment);
      case 'twilio':
      default:
        return new TwilioProvider(environment);
    }
  }

  /**
   * Detects the configured provider by checking for credentials.
   * Defaults to 'twilio'.
   * 
   * @private
   * @returns {string}
   */
  static detectProviderType() {
    if (environment.MESSAGEBIRD_API_KEY) return 'messagebird';
    if (environment.VONAGE_API_KEY && environment.VONAGE_API_SECRET) return 'vonage';
    return 'twilio';
  }
}

export default SmsProviderFactory;
