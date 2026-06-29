import { FirebaseProvider } from './firebase.provider.js';
import { OneSignalProvider } from './onesignal.provider.js';
import environment from '../../config/environment.js';

export class PushProviderFactory {
  /**
   * Resolves the Push provider instance based on environment configuration or override parameter.
   * 
   * @param {string} [providerType] - Override provider type ('firebase', 'onesignal')
   * @returns {PushProviderInterface}
   */
  static getProvider(providerType = null) {
    const type = providerType || this.detectProviderType();

    switch (type.toLowerCase()) {
      case 'onesignal':
        return new OneSignalProvider(environment);
      case 'firebase':
      default:
        return new FirebaseProvider(environment);
    }
  }

  /**
   * Detects the configured provider by checking for credentials.
   * Defaults to 'firebase'.
   * 
   * @private
   * @returns {string}
   */
  static detectProviderType() {
    if (environment.ONESIGNAL_APP_ID && environment.ONESIGNAL_API_KEY) return 'onesignal';
    return 'firebase';
  }
}

export default PushProviderFactory;
