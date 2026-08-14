export class EmailProviderInterface {
  /**
   * Send an email.
   * 
   * @param {Object} options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.body - Email body (HTML or plain text)
   * @param {Object} [options.metadata] - Optional metadata
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async send(options) {
    throw new Error('Method "send" must be implemented');
  }
}

export default EmailProviderInterface;
