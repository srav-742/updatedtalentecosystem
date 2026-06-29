import RecruiterProfile from '../models/recruiterProfile.model.js';

export class RecruiterRepository {
  async findByUserId(userId) {
    return RecruiterProfile.findOne({ userId });
  }

  async createProfile(data) {
    const profile = new RecruiterProfile(data);
    return profile.save();
  }

  async updateProfile(userId, data) {
    return RecruiterProfile.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async deleteProfile(userId) {
    return RecruiterProfile.findOneAndDelete({ userId });
  }

  async findByOrganizationId(organizationId) {
    return RecruiterProfile.find({ organizationId });
  }

  async removeTeamMember(userId) {
    return RecruiterProfile.findOneAndUpdate(
      { userId },
      { $set: { organizationId: null, role: 'member' } },
      { new: true }
    );
  }
}

export const recruiterRepository = new RecruiterRepository();
export default recruiterRepository;
