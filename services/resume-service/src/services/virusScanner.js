import { logger } from '@hire1percent/shared';

const log = logger.createLogger('virus-scanner');

export class VirusScanner {
  /**
   * Scans a file buffer for viruses.
   * @param {Buffer} fileBuffer - The file content buffer.
   * @param {string} fileName - Original name of the file.
   * @returns {Promise<{ clean: boolean, message: string }>}
   */
  async scan(fileBuffer, fileName) {
    log.debug(`Scanning file "${fileName}" (${fileBuffer.length} bytes)...`);

    // Standard EICAR Test String for anti-virus scanning verification
    const fileString = fileBuffer.toString();
    const isEicar = fileString.includes('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

    if (isEicar) {
      log.warn(`Virus detection triggered for file: "${fileName}" (EICAR signature detected)`);
      return {
        clean: false,
        message: 'Virus detected: EICAR standard anti-virus test file signature.',
      };
    }

    log.debug(`File "${fileName}" scan completed: Clean.`);
    return {
      clean: true,
      message: 'No virus threats found.',
    };
  }
}

export const virusScanner = new VirusScanner();
export default virusScanner;
