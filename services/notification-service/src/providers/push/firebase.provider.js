import { logger } from '@hire1percent/shared';
import PushProviderInterface from './pushProvider.interface.js';

const log = logger.createLogger('firebase-provider');

export class FirebaseProvider extends PushProviderInterface {
  constructor(config = {}) {
    super();
    this.projectId = config.FIREBASE_PROJECT_ID;
    this.clientEmail = config.FIREBASE_CLIENT_EMAIL;
    this.privateKey = config.FIREBASE_PRIVATE_KEY;
  }

  async send(options) {
    const { tokens, title, body, data } = options;

    log.info(`[Firebase Push] Sending notification to ${tokens.length} devices | Title: ${title}`);

    // Simulated failure for testing
    if (tokens && tokens.some(t => t.includes('fail'))) {
      log.error(`[Firebase Push] Simulated delivery failure for tokens: ${tokens.filter(t => t.includes('fail')).join(', ')}`);
      return { success: false, error: 'Firebase Error: Messaging payload credentials mismatch.' };
    }

    return {
      success: true,
      messageId: `fcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export default FirebaseProvider;
