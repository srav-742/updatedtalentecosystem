export class PushProviderInterface {
  /**
   * Send a push notification.
   * 
   * @param {Object} options
   * @param {string[]} options.tokens - Recipient device push registration tokens
   * @param {string} options.title - Push notification title
   * @param {string} options.body - Push notification body
   * @param {Object} [options.data] - Optional key-value payload data
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async send(options) {
    throw new Error('Method "send" must be implemented');
  }
}

export default PushProviderInterface;
