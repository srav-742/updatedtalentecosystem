import candidateRepository from '../repositories/CandidateRepository.js';
import jobClient from '../clients/job.client.js';
import { errors } from '@hire1percent/shared';

export class CandidateService {
  async getProfile(userId, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    // Authorization check
    this.checkAccess(userId, userContext, 'read');

    let profile = await candidateRepository.findByUserId(userId);

    // Self-healing: Create a blank profile if not found and accessing own profile
    if (!profile && userId === userContext.userId) {
      const email = userContext.email || `${userId}@hire1percent.local`;
      const name = userContext.name || 'New Candidate';

      const initialData = {
        _id: userId,
        userId,
        basics: {
          name,
          email,
        },
        skills: [],
        experience: [],
        education: [],
        socialLinks: {},
        certifications: [],
        languages: [],
        preferences: {},
        visibility: 'public',
        bookmarkedJobs: [],
        profileCompletion: 10, // 5% name + 5% email
      };

      profile = await candidateRepository.createProfile(initialData);
    }

    if (!profile) {
      throw new errors.NotFoundError(`Candidate profile for user ${userId} not found`);
    }

    return profile;
  }

  async updateProfile(userId, updateData, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    // Can only edit own profile (or admin)
    this.checkAccess(userId, userContext, 'write');

    // Retrieve existing profile first
    const profile = await this.getProfile(userId, userContext);

    // Preserve required basics (email and name) if not provided in update
    if (updateData.basics) {
      if (!updateData.basics.email && profile.basics?.email) {
        updateData.basics.email = profile.basics.email;
      }
      if (!updateData.basics.name && profile.basics?.name) {
        updateData.basics.name = profile.basics.name;
      }
    }

    // Merge updateData to recalculate profile completion
    const merged = {
      ...profile.toObject(),
      ...updateData,
      basics: {
        ...profile.basics,
        ...updateData.basics,
      },
      socialLinks: {
        ...profile.socialLinks,
        ...updateData.socialLinks,
      },
      preferences: {
        ...profile.preferences,
        ...updateData.preferences,
      },
    };

    // Recalculate profile completion percentage
    updateData.profileCompletion = this.calculateCompletion(merged);

    const updated = await candidateRepository.updateProfile(userId, updateData);
    if (!updated) {
      throw new errors.NotFoundError(`Candidate profile for user ${userId} not found`);
    }

    return updated;
  }

  async deleteProfile(userId, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    // Can only delete own profile (or admin)
    this.checkAccess(userId, userContext, 'write');

    await candidateRepository.deleteProfile(userId);
    return { success: true };
  }

  async addBookmark(userId, jobId, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    // Can only bookmark for oneself
    if (userId !== userContext.userId) {
      throw new errors.AuthorizationError('You do not have permission to modify bookmarks for other users.');
    }

    // Ensure job exists in Job Service
    const job = await jobClient.getJob(jobId);
    if (!job) {
      throw new errors.NotFoundError(`Job with ID ${jobId} not found`);
    }

    const updated = await candidateRepository.addBookmark(userId, jobId);
    if (!updated) {
      throw new errors.NotFoundError(`Candidate profile for user ${userId} not found`);
    }

    return updated;
  }

  async removeBookmark(userId, jobId, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    // Can only edit own bookmarks
    if (userId !== userContext.userId) {
      throw new errors.AuthorizationError('You do not have permission to modify bookmarks for other users.');
    }

    const updated = await candidateRepository.removeBookmark(userId, jobId);
    if (!updated) {
      throw new errors.NotFoundError(`Candidate profile for user ${userId} not found`);
    }

    return updated;
  }

  async getBookmarks(userId, userContext) {
    const profile = await this.getProfile(userId, userContext);
    return profile.bookmarkedJobs || [];
  }

  async getDashboard(userId, userContext) {
    const profile = await this.getProfile(userId, userContext);

    return {
      profileCompletion: profile.profileCompletion,
      bookmarksCount: profile.bookmarkedJobs?.length || 0,
      visibility: profile.visibility,
      skillsCount: profile.skills?.length || 0,
      hasExperience: profile.experience && profile.experience.length > 0,
      hasEducation: profile.education && profile.education.length > 0,
    };
  }

  checkAccess(targetUserId, userContext, action) {
    const isSelf = targetUserId === userContext.userId;
    const isAdmin = userContext.role === 'admin' || userContext.role === 'super_admin';
    const isRecruiter = userContext.role === 'recruiter';

    if (action === 'read') {
      // Recruiter and admin can read any profile. Candidates can read their own.
      if (!isSelf && !isAdmin && !isRecruiter) {
        throw new errors.AuthorizationError('You do not have permission to view this profile.');
      }
    } else if (action === 'write') {
      // Only the user themselves or an admin can modify/delete the profile.
      if (!isSelf && !isAdmin) {
        throw new errors.AuthorizationError('You do not have permission to modify this profile.');
      }
    }
  }

  calculateCompletion(profile) {
    let score = 0;

    // 1. Basics (max 25% - 5% each)
    const basics = profile.basics || {};
    if (basics.name) score += 5;
    if (basics.email) score += 5;
    if (basics.phone) score += 5;
    if (basics.location) score += 5;
    if (basics.bio) score += 5;

    // 2. Skills (max 15%)
    if (profile.skills && profile.skills.length > 0) {
      score += 15;
    }

    // 3. Experience (max 20%)
    if (profile.experience && profile.experience.length > 0) {
      score += 20;
    }

    // 4. Education (max 20%)
    if (profile.education && profile.education.length > 0) {
      score += 20;
    }

    // 5. Social Links (max 10% - 2.5% each)
    const socials = profile.socialLinks || {};
    if (socials.linkedin) score += 2.5;
    if (socials.github) score += 2.5;
    if (socials.portfolio) score += 2.5;
    if (socials.twitter) score += 2.5;

    // 6. Languages (max 5%)
    if (profile.languages && profile.languages.length > 0) {
      score += 5;
    }

    // 7. Certifications (max 5%)
    if (profile.certifications && profile.certifications.length > 0) {
      score += 5;
    }

    return Math.min(Math.round(score), 100);
  }
}

export const candidateService = new CandidateService();
export default candidateService;
