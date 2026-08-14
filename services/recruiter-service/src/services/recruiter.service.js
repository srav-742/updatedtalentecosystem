import recruiterRepository from '../repositories/RecruiterRepository.js';
import jobClient from '../clients/job.client.js';
import candidateClient from '../clients/candidate.client.js';
import { errors } from '@hire1percent/shared';

export class RecruiterService {
  async getProfile(userId, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    // Authorization check: Self or admin can read recruiter profiles
    this.checkAccess(userId, userContext, 'read');

    let profile = await recruiterRepository.findByUserId(userId);

    // Self-healing: Create a blank profile if not found and accessing own profile
    if (!profile && userId === userContext.userId) {
      const email = userContext.email || `${userId}@hire1percent.local`;
      const name = userContext.name || 'New Recruiter';

      const initialData = {
        _id: userId,
        userId,
        basics: {
          name,
          email,
          phone: '',
          designation: '',
          profilePic: '',
        },
        company: {
          name: '',
          website: '',
          logo: '',
          description: '',
        },
        organizationId: null,
        role: 'member',
        isActive: true,
        profileCompletion: 20, // Name + Email completed initially
        settings: {
          emailNotifications: true,
          theme: 'light',
        },
      };

      profile = await recruiterRepository.createProfile(initialData);
    }

    if (!profile) {
      throw new errors.NotFoundError(`Recruiter profile for user ${userId} not found`);
    }

    return profile;
  }

  async updateProfile(userId, updateData, userContext) {
    if (!userContext || !userContext.userId) {
      throw new errors.AuthenticationError('Authentication context required');
    }

    // Authorization check
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
      company: {
        ...profile.company,
        ...updateData.company,
      },
    };

    // Recalculate profile completion percentage
    updateData.profileCompletion = this.calculateCompletion(merged);

    const updated = await recruiterRepository.updateProfile(userId, updateData);
    if (!updated) {
      throw new errors.NotFoundError(`Recruiter profile for user ${userId} not found`);
    }

    return updated;
  }

  async getDashboard(userId, userContext) {
    const profile = await this.getProfile(userId, userContext);

    // Aggregated metrics from other services
    const [activeJobsCount, candidatesCount] = await Promise.all([
      jobClient.getActiveJobsCount(userId),
      candidateClient.getCandidatesCount(),
    ]);

    return {
      profileCompletion: profile.profileCompletion,
      organizationId: profile.organizationId,
      roleInOrganization: profile.role,
      activeJobsCount,
      candidatesCount,
      settings: profile.settings,
    };
  }

  checkAccess(targetUserId, userContext, action) {
    const isSelf = targetUserId === userContext.userId;
    const isAdmin = userContext.role === 'admin' || userContext.role === 'super_admin';

    if (action === 'read') {
      // Recruiter and admin can read. Users can read own.
      if (!isSelf && !isAdmin && userContext.role !== 'recruiter') {
        throw new errors.AuthorizationError('You do not have permission to view this profile.');
      }
    } else if (action === 'write') {
      // Only the user themselves or an admin can modify
      if (!isSelf && !isAdmin) {
        throw new errors.AuthorizationError('You do not have permission to modify this profile.');
      }
    }
  }

  calculateCompletion(profile) {
    let score = 0;

    // 1. Basics (max 50% - 10% each)
    const basics = profile.basics || {};
    if (basics.name) score += 10;
    if (basics.email) score += 10;
    if (basics.phone) score += 10;
    if (basics.designation) score += 10;
    if (basics.profilePic) score += 10;

    // 2. Company Info (max 40% - 10% each)
    const company = profile.company || {};
    if (company.name) score += 10;
    if (company.website) score += 10;
    if (company.logo) score += 10;
    if (company.description) score += 10;

    // 3. Organization Linked (10%)
    if (profile.organizationId) {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }
}

export const recruiterService = new RecruiterService();
export default recruiterService;
