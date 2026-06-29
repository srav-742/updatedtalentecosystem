import resumeService from '../services/resume.service.js';
import ResumeResponse from '../dto/ResumeResponse.js';
import { response } from '@hire1percent/shared';

export class ResumeController {
  /**
   * Uploads a new resume or new version.
   */
  async upload(req, res, next) {
    try {
      const candidateId = req.body.candidateId || req.user.userId;
      const file = req.file;
      const result = await resumeService.uploadResume(candidateId, file, req.user);
      
      response.sendSuccess(res, {
        data: ResumeResponse.fromEntity(result.resume, result.version, result.file),
        message: 'Resume uploaded and parsed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets the candidate's own resume container.
   */
  async getOwnResume(req, res, next) {
    try {
      const candidateId = req.user.userId;
      const result = await resumeService.getResumeByCandidateId(candidateId, req.user);
      
      response.sendSuccess(res, {
        data: ResumeResponse.fromEntity(result.resume, result.version, result.file),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets a specific resume container by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await resumeService.getResume(id, req.user);

      response.sendSuccess(res, {
        data: ResumeResponse.fromEntity(result.resume, result.version, result.file),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets a resume container by candidate ID.
   */
  async getByCandidateId(req, res, next) {
    try {
      const { candidateId } = req.params;
      const result = await resumeService.getResumeByCandidateId(candidateId, req.user);

      response.sendSuccess(res, {
        data: ResumeResponse.fromEntity(result.resume, result.version, result.file),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists all versions of a specific resume.
   */
  async listVersions(req, res, next) {
    try {
      const { id } = req.params;
      const versions = await resumeService.listVersions(id, req.user);

      response.sendSuccess(res, {
        data: versions.map((v) => ResumeResponse.formatVersion(v)),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Downloads the file content of a specific version or latest version.
   */
  async download(req, res, next) {
    try {
      const { id } = req.params;
      const { v: versionNumber } = req.query; // e.g. /api/v1/resumes/:id/download?v=1
      
      const downloadData = await resumeService.downloadResume(id, versionNumber, req.user);

      res.setHeader('Content-Type', downloadData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadData.fileName}"`);
      res.send(downloadData.fileBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Previews the resume file or metadata.
   */
  async preview(req, res, next) {
    try {
      const { id } = req.params;
      const { v: versionNumber } = req.query;
      
      const downloadData = await resumeService.downloadResume(id, versionNumber, req.user);

      res.setHeader('Content-Type', downloadData.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${downloadData.fileName}"`);
      res.send(downloadData.fileBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a resume container and all physical files.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await resumeService.deleteResume(id, req.user);
      
      response.sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const resumeController = new ResumeController();
export default resumeController;
