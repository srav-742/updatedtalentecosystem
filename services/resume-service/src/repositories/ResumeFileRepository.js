import ResumeFile from '../models/resumeFile.model.js';

export class ResumeFileRepository {
  async findById(id) {
    return ResumeFile.findById(id);
  }

  async findByVersionId(versionId) {
    return ResumeFile.findOne({ versionId });
  }

  async create(data) {
    const file = new ResumeFile(data);
    return file.save();
  }

  async deleteByResumeId(resumeId) {
    return ResumeFile.deleteMany({ resumeId });
  }

  async findByResumeId(resumeId) {
    return ResumeFile.find({ resumeId });
  }
}

export const resumeFileRepository = new ResumeFileRepository();
export default resumeFileRepository;
