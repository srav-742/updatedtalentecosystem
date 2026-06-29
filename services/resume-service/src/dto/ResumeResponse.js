export class ResumeResponse {
  /**
   * Formats a single Mongoose Resume model to an API DTO.
   * @param {Object} resumeEntity - Mongoose Resume document.
   * @param {Object} [currentVersionEntity] - Mongoose ResumeVersion document.
   * @param {Object} [fileEntity] - Mongoose ResumeFile document.
   * @returns {Object} Sanitized Resume DTO.
   */
  static fromEntity(resumeEntity, currentVersionEntity = null, fileEntity = null) {
    if (!resumeEntity) return null;

    const data = typeof resumeEntity.toJSON === 'function' ? resumeEntity.toJSON() : resumeEntity;

    const formatted = {
      id: data.id || data._id,
      candidateId: data.candidateId,
      status: data.status || 'active',
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
    };

    if (currentVersionEntity) {
      formatted.currentVersion = ResumeResponse.formatVersion(currentVersionEntity, fileEntity);
    } else if (data.currentVersionId) {
      formatted.currentVersionId = data.currentVersionId;
    }

    return formatted;
  }

  /**
   * Formats a Mongoose ResumeVersion model.
   * @param {Object} versionEntity - Mongoose ResumeVersion document.
   * @param {Object} [fileEntity] - Mongoose ResumeFile document.
   * @returns {Object} Sanitized version payload.
   */
  static formatVersion(versionEntity, fileEntity = null) {
    if (!versionEntity) return null;

    const v = typeof versionEntity.toJSON === 'function' ? versionEntity.toJSON() : versionEntity;

    const formatted = {
      id: v.id || v._id,
      resumeId: v.resumeId,
      versionNumber: v.versionNumber,
      skills: v.skills || [],
      education: (v.education || []).map((edu) => ({
        institution: edu.institution || '',
        degree: edu.degree || '',
        startDate: edu.startDate ? new Date(edu.startDate).toISOString() : null,
        endDate: edu.endDate ? new Date(edu.endDate).toISOString() : null,
      })),
      experience: (v.experience || []).map((exp) => ({
        company: exp.company || '',
        position: exp.position || '',
        startDate: exp.startDate ? new Date(exp.startDate).toISOString() : null,
        endDate: exp.endDate ? new Date(exp.endDate).toISOString() : null,
        description: exp.description || '',
      })),
      metadata: {
        rawTextLength: v.metadata?.rawTextLength || 0,
        pageCount: v.metadata?.pageCount || 0,
        language: v.metadata?.language || 'en',
        parserModel: v.metadata?.parserModel || '',
      },
      uploadedBy: v.uploadedBy,
      createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : null,
    };

    if (fileEntity) {
      const f = typeof fileEntity.toJSON === 'function' ? fileEntity.toJSON() : fileEntity;
      formatted.file = {
        id: f.id || f._id,
        fileName: f.fileName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        uploadedAt: f.uploadedAt ? new Date(f.uploadedAt).toISOString() : null,
      };
    }

    return formatted;
  }

  static fromEntities(resumes = [], versionsMap = {}, filesMap = {}) {
    return resumes.map((resume) => {
      const version = versionsMap[resume.currentVersionId] || null;
      const file = version ? filesMap[version.fileId] : null;
      return ResumeResponse.fromEntity(resume, version, file);
    });
  }
}

export default ResumeResponse;
