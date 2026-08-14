import resumeRepository from '../repositories/ResumeRepository.js';
import resumeVersionRepository from '../repositories/ResumeVersionRepository.js';
import resumeFileRepository from '../repositories/ResumeFileRepository.js';
import storage from '../storage/storageFactory.js';
import virusScanner from './virusScanner.js';
import resumeParserService from '../parsers/resumeParser.service.js';
import { errors, utils } from '@hire1percent/shared';

export class ResumeService {
  /**
   * Uploads a new resume or a new version of an existing resume.
   */
  async uploadResume(candidateId, file, userContext) {
    this.verifyContext(userContext);
    this.checkAccess(candidateId, userContext, 'write');

    if (!file || !file.buffer) {
      throw new errors.ValidationError('No file content provided for upload.', null, 'VALIDATION_002');
    }

    // 1. File size & Type validations
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new errors.ValidationError(
        `Invalid file type. Supported types: PDF, DOC, DOCX. Got: ${file.mimetype}`,
        null,
        'VALIDATION_003'
      );
    }

    const maxSizeBytes = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxSizeBytes || file.buffer.length > maxSizeBytes) {
      throw new errors.ValidationError(
        `File exceeds maximum upload size of 20MB. Got: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        null,
        'VALIDATION_004'
      );
    }

    // 2. Virus Scan
    const scanResult = await virusScanner.scan(file.buffer, file.originalname);
    if (!scanResult.clean) {
      throw new errors.ValidationError(`File security scan failed: ${scanResult.message}`, null, 'SECURITY_001');
    }

    // 3. Find or Create Resume Container
    let resume = await resumeRepository.findByCandidateId(candidateId);
    let nextVersionNumber = 1;

    if (!resume) {
      resume = await resumeRepository.create({
        candidateId,
        status: 'active',
      });
    } else {
      // Find latest version to determine next number
      const latestVersion = await resumeVersionRepository.findLatestByResumeId(resume.id);
      if (latestVersion) {
        nextVersionNumber = latestVersion.versionNumber + 1;
      }
    }

    const versionId = utils.generateUuid();
    const fileId = utils.generateUuid();
    
    // Generate standard key/path: candidateId/resumeId/versionId-filename
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${candidateId}/${resume.id}/${versionId}-${cleanFileName}`;

    // 4. Save to physical storage
    const storageResult = await storage.saveFile(file.buffer, storageKey, file.mimetype);

    // 5. Create ResumeFile document
    const fileRecord = await resumeFileRepository.create({
      _id: fileId,
      resumeId: resume.id,
      versionId: versionId,
      fileName: file.originalname,
      fileKey: storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.buffer.length,
      storageProvider: storageResult.provider,
    });

    // 6. Run Resume Parsing (Mock AI parser)
    const parsedData = await resumeParserService.parse(file.buffer, file.mimetype);

    // 7. Create ResumeVersion document
    const versionRecord = await resumeVersionRepository.create({
      _id: versionId,
      resumeId: resume.id,
      versionNumber: nextVersionNumber,
      fileId: fileId,
      metadata: parsedData.metadata,
      skills: parsedData.skills,
      education: parsedData.education,
      experience: parsedData.experience,
      uploadedBy: userContext.userId,
    });

    // 8. Update Resume current version
    const updatedResume = await resumeRepository.updateCurrentVersion(resume.id, versionId);

    return {
      resume: updatedResume,
      version: versionRecord,
      file: fileRecord,
    };
  }

  /**
   * Retrieves resume by ID.
   */
  async getResume(resumeId, userContext) {
    this.verifyContext(userContext);
    
    const resume = await resumeRepository.findById(resumeId);
    if (!resume) {
      throw new errors.NotFoundError(`Resume with ID ${resumeId} not found`);
    }

    this.checkAccess(resume.candidateId, userContext, 'read');

    let version = null;
    let file = null;

    if (resume.currentVersionId) {
      version = await resumeVersionRepository.findById(resume.currentVersionId);
      if (version && version.fileId) {
        file = await resumeFileRepository.findById(version.fileId);
      }
    }

    return { resume, version, file };
  }

  /**
   * Retrieves resume container for a specific candidate.
   */
  async getResumeByCandidateId(candidateId, userContext) {
    this.verifyContext(userContext);
    this.checkAccess(candidateId, userContext, 'read');

    const resume = await resumeRepository.findByCandidateId(candidateId);
    if (!resume) {
      throw new errors.NotFoundError(`Resume for candidate ${candidateId} not found`);
    }

    let version = null;
    let file = null;

    if (resume.currentVersionId) {
      version = await resumeVersionRepository.findById(resume.currentVersionId);
      if (version && version.fileId) {
        file = await resumeFileRepository.findById(version.fileId);
      }
    }

    return { resume, version, file };
  }

  /**
   * Lists all uploaded versions of a candidate's resume.
   */
  async listVersions(resumeId, userContext) {
    this.verifyContext(userContext);

    const resume = await resumeRepository.findById(resumeId);
    if (!resume) {
      throw new errors.NotFoundError(`Resume with ID ${resumeId} not found`);
    }

    this.checkAccess(resume.candidateId, userContext, 'read');

    return resumeVersionRepository.findByResumeId(resumeId);
  }

  /**
   * Downloads a specific version or current version of the resume.
   */
  async downloadResume(resumeId, versionNumber, userContext) {
    this.verifyContext(userContext);

    const resume = await resumeRepository.findById(resumeId);
    if (!resume) {
      throw new errors.NotFoundError(`Resume with ID ${resumeId} not found`);
    }

    this.checkAccess(resume.candidateId, userContext, 'read');

    let version = null;
    if (versionNumber) {
      const parsedNum = parseInt(versionNumber, 10);
      version = await resumeVersionRepository.findByResumeIdAndNumber(resumeId, parsedNum);
    } else if (resume.currentVersionId) {
      version = await resumeVersionRepository.findById(resume.currentVersionId);
    }

    if (!version) {
      throw new errors.NotFoundError(
        versionNumber
          ? `Resume version ${versionNumber} not found`
          : 'No version exists for this resume'
      );
    }

    const fileRecord = await resumeFileRepository.findById(version.fileId);
    if (!fileRecord) {
      throw new errors.NotFoundError(`File record for version ${version.id} not found`);
    }

    // Retrieve file buffer from appropriate storage engine
    const fileBuffer = await storage.getFile(fileRecord.fileKey);

    return {
      fileBuffer,
      fileName: fileRecord.fileName,
      mimeType: fileRecord.mimeType,
    };
  }

  /**
   * Deletes a resume container and all related versions and files.
   */
  async deleteResume(resumeId, userContext) {
    this.verifyContext(userContext);

    const resume = await resumeRepository.findById(resumeId);
    if (!resume) {
      throw new errors.NotFoundError(`Resume with ID ${resumeId} not found`);
    }

    this.checkAccess(resume.candidateId, userContext, 'write');

    // 1. Delete physical files from storage provider
    const files = await resumeFileRepository.findByResumeId(resumeId);
    for (const file of files) {
      try {
        await storage.deleteFile(file.fileKey);
      } catch (err) {
        // Log error but continue deleting database records so we don't get stuck
        console.error(`Failed to delete physical file ${file.fileKey} from storage:`, err);
      }
    }

    // 2. Clear Database documents
    await resumeFileRepository.deleteByResumeId(resumeId);
    await resumeVersionRepository.deleteByResumeId(resumeId);
    await resumeRepository.delete(resumeId);

    return { success: true, message: 'Resume and all versions deleted successfully.' };
  }

  /**
   * Private helper to verify request user context is present.
   */
  verifyContext(userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context is missing or invalid.');
    }
  }

  /**
   * Verifies if user has permission to read or write candidate resume.
   */
  checkAccess(candidateId, userContext, action) {
    const isSelf = userContext.userId === candidateId;
    const isAdmin = userContext.role === 'admin' || userContext.role === 'super_admin';
    const isRecruiter = userContext.role === 'recruiter';

    if (action === 'read') {
      // Candidates can view their own resume. Admins and recruiters can view candidates.
      if (!isSelf && !isAdmin && !isRecruiter) {
        throw new errors.AuthorizationError('Access denied: You do not have permission to view this resume.');
      }
    } else if (action === 'write') {
      // Only the candidate themselves or an admin can upload or delete resumes.
      if (!isSelf && !isAdmin) {
        throw new errors.AuthorizationError('Access denied: You do not have permission to modify this resume.');
      }
    }
  }
}

export const resumeService = new ResumeService();
export default resumeService;
