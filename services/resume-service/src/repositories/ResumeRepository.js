import Resume from '../models/resume.model.js';

export class ResumeRepository {
  async findById(id) {
    return Resume.findById(id);
  }

  async findByCandidateId(candidateId) {
    return Resume.findOne({ candidateId });
  }

  async create(data) {
    const resume = new Resume(data);
    return resume.save();
  }

  async updateCurrentVersion(id, currentVersionId) {
    return Resume.findByIdAndUpdate(
      id,
      { $set: { currentVersionId } },
      { new: true, runValidators: true }
    );
  }

  async updateStatus(id, status) {
    return Resume.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return Resume.findByIdAndDelete(id);
  }
}

export const resumeRepository = new ResumeRepository();
export default resumeRepository;
