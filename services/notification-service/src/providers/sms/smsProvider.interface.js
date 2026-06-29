export class SmsProviderInterface {
  /**
   * Send an SMS.
   * 
   * @param {Object} options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.body - SMS message body
   * @param {Object} [options.metadata] - Optional metadata
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async send(options) {
    throw new Error('Method "send" must be implemented');
  }
}

export default SmsProviderInterface;
