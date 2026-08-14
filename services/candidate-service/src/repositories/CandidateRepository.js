import CandidateProfile from '../models/candidateProfile.model.js';

export class CandidateRepository {
  async findByUserId(userId) {
    return CandidateProfile.findOne({ userId });
  }

  async createProfile(data) {
    const profile = new CandidateProfile(data);
    return profile.save();
  }

  async updateProfile(userId, data) {
    return CandidateProfile.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async deleteProfile(userId) {
    return CandidateProfile.findOneAndDelete({ userId });
  }

  async addBookmark(userId, jobId) {
    return CandidateProfile.findOneAndUpdate(
      { userId },
      { $addToSet: { bookmarkedJobs: jobId } },
      { new: true }
    );
  }

  async removeBookmark(userId, jobId) {
    return CandidateProfile.findOneAndUpdate(
      { userId },
      { $pull: { bookmarkedJobs: jobId } },
      { new: true }
    );
  }

  async searchProfiles(filters = {}) {
    const query = {};

    if (filters.skills && filters.skills.length > 0) {
      // Find candidate profiles containing all or any specified skills
      query.skills = { $in: Array.isArray(filters.skills) ? filters.skills : [filters.skills] };
    }

    if (filters.location) {
      query['basics.location'] = { $regex: filters.location, $options: 'i' };
    }

    if (filters.visibility) {
      query.visibility = filters.visibility;
    } else {
      // Non-admins should only see public or anonymous profiles, not private ones
      query.visibility = { $ne: 'private' };
    }

    if (filters.q) {
      query.$or = [
        { 'basics.name': { $regex: filters.q, $options: 'i' } },
        { 'basics.bio': { $regex: filters.q, $options: 'i' } },
        { skills: { $regex: filters.q, $options: 'i' } },
      ];
    }

    return CandidateProfile.find(query);
  }
}

export const candidateRepository = new CandidateRepository();
export default candidateRepository;
