import { logger } from '@hire1percent/shared';

const log = logger.createLogger('resume-parser-service');

export class ResumeParserService {
  /**
   * Parses candidate resume files to extract structured information.
   * @param {Buffer} fileBuffer - The file content.
   * @param {string} mimeType - The mime type.
   * @returns {Promise<Object>} The parsed structured data.
   */
  async parse(fileBuffer, mimeType) {
    log.info(`Simulating resume parse process (size: ${fileBuffer.length} bytes, mimeType: ${mimeType})`);

    // Add a small artificial delay to mimic processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Return mock parsed payload representing typical resume parser outputs
    return {
      skills: [
        'JavaScript',
        'Node.js',
        'Express.js',
        'MongoDB',
        'React',
        'RESTful APIs',
        'System Architecture',
      ],
      education: [
        {
          institution: 'Massachusetts Institute of Technology (MIT)',
          degree: 'Bachelor of Science in Computer Science',
          startDate: '2016-09-01',
          endDate: '2020-06-01',
        },
      ],
      experience: [
        {
          company: 'CloudTech Solutions',
          position: 'Senior Software Engineer',
          startDate: '2022-03-01',
          endDate: null, // Present
          description: 'Designed and deployed Node.js microservices. Integrated S3 storage. Managed team of 4.',
        },
        {
          company: 'WebCraft Systems',
          position: 'Software Developer',
          startDate: '2020-07-01',
          endDate: '2022-02-15',
          description: 'Developed frontend and API endpoints. Maintained MongoDB databases.',
        },
      ],
      metadata: {
        rawTextLength: 2450,
        pageCount: 2,
        language: 'en',
        parserModel: 'H1P-ResumeParse-v1.0-Mock',
      },
    };
  }
}

export const resumeParserService = new ResumeParserService();
export default resumeParserService;
