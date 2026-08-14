import ResumeVersion from '../models/resumeVersion.model.js';

export class ResumeVersionRepository {
  async findById(id) {
    return ResumeVersion.findById(id);
  }

  async findByResumeId(resumeId) {
    return ResumeVersion.find({ resumeId }).sort({ versionNumber: -1 });
  }

  async findLatestByResumeId(resumeId) {
    return ResumeVersion.findOne({ resumeId }).sort({ versionNumber: -1 });
  }

  async create(data) {
    const version = new ResumeVersion(data);
    return version.save();
  }

  async deleteByResumeId(resumeId) {
    return ResumeVersion.deleteMany({ resumeId });
  }

  async findByResumeIdAndNumber(resumeId, versionNumber) {
    return ResumeVersion.findOne({ resumeId, versionNumber });
  }
}

export const resumeVersionRepository = new ResumeVersionRepository();
export default resumeVersionRepository;
