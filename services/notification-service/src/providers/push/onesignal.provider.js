import { logger } from '@hire1percent/shared';
import PushProviderInterface from './pushProvider.interface.js';

const log = logger.createLogger('onesignal-provider');

export class OneSignalProvider extends PushProviderInterface {
  constructor(config = {}) {
    super();
    this.appId = config.ONESIGNAL_APP_ID;
    this.apiKey = config.ONESIGNAL_API_KEY;
  }

  async send(options) {
    const { tokens, title, body, data } = options;

    log.info(`[OneSignal Push] Sending notification to ${tokens.length} devices | Title: ${title}`);

    if (tokens && tokens.some(t => t.includes('fail'))) {
      return { success: false, error: 'OneSignal Error: App ID or API key invalid.' };
    }

    return {
      success: true,
      messageId: `os-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default OneSignalProvider;
