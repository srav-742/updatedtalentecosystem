import organizationRepository from '../repositories/OrganizationRepository.js';
import recruiterRepository from '../repositories/RecruiterRepository.js';
import invitationRepository from '../repositories/InvitationRepository.js';
import subscriptionRepository from '../repositories/SubscriptionRepository.js';
import companyBrandingRepository from '../repositories/CompanyBrandingRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import { errors, utils } from '@hire1percent/shared';

export class OrganizationService {
  async getOrganization(userId, userContext) {
    const profile = await recruiterRepository.findByUserId(userId);
    if (!profile || !profile.organizationId) {
      return null;
    }
    const org = await organizationRepository.findById(profile.organizationId);
    if (!org) {
      throw new errors.NotFoundError('Organization not found');
    }
    const branding = await companyBrandingRepository.findByOrganizationId(org._id);
    return { organization: org, branding };
  }

  async createOrganization(data, userId, userContext) {
    const profile = await recruiterRepository.findByUserId(userId);
    if (!profile) {
      throw new errors.NotFoundError('Recruiter profile not found. Please view profile first to initialize.');
    }

    if (profile.organizationId) {
      throw new errors.ValidationError('You already belong to an organization.');
    }

    const code = data.code || data.name.replace(/\s+/g, '-').toLowerCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    const existingOrg = await organizationRepository.findByCode(code);
    if (existingOrg) {
      throw new errors.ValidationError('Organization code already in use.');
    }

    // 1. Create Organization
    const orgData = {
      name: data.name,
      code,
      description: data.description || '',
      ownerId: userId,
      billingEmail: data.billingEmail || profile.basics.email,
      isActive: true,
    };
    const org = await organizationRepository.create(orgData);

    // 2. Link Recruiter to Org as owner & update completion (add 10%)
    const basics = profile.basics || {};
    let score = 0;
    if (basics.name) score += 10;
    if (basics.email) score += 10;
    if (basics.phone) score += 10;
    if (basics.designation) score += 10;
    if (basics.profilePic) score += 10;

    const company = profile.company || {};
    if (company.name) score += 10;
    if (company.website) score += 10;
    if (company.logo) score += 10;
    if (company.description) score += 10;

    score += 10; // linked to org

    await recruiterRepository.updateProfile(userId, {
      organizationId: org._id,
      role: 'owner',
      profileCompletion: Math.min(Math.round(score), 100),
    });

    // 3. Create default Subscription
    await subscriptionRepository.create({
      organizationId: org._id,
      plan: 'free',
      status: 'active',
      startDate: new Date(),
    });

    // 4. Create default Company Branding
    const branding = await companyBrandingRepository.create({
      organizationId: org._id,
      primaryColor: '#0070f3',
      secondaryColor: '#000000',
      logoUrl: '',
      bannerUrl: '',
      socialLinks: {},
    });

    return { organization: org, branding };
  }

  async updateOrganization(orgId, data, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');

    const updated = await organizationRepository.update(orgId, data);
    if (!updated) {
      throw new errors.NotFoundError('Organization not found');
    }
    return updated;
  }

  async getTeam(orgId, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'read');
    return recruiterRepository.findByOrganizationId(orgId);
  }

  async inviteTeamMember(orgId, invitationData, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');

    const { email, role } = invitationData;
    if (!email) {
      throw new errors.ValidationError('Email is required');
    }

    // Check if user is already in the organization team
    const team = await recruiterRepository.findByOrganizationId(orgId);
    const alreadyMember = team.some((member) => member.basics.email.toLowerCase() === email.toLowerCase());
    if (alreadyMember) {
      throw new errors.ValidationError('User is already a member of this organization.');
    }

    // Check if there is an active pending invitation
    const existing = await invitationRepository.findByEmailAndOrg(email, orgId);
    if (existing) {
      // Re-send / renew invitation token
      existing.token = utils.generateUuid();
      existing.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      return existing.save();
    }

    const invitation = await invitationRepository.create({
      organizationId: orgId,
      email: email.toLowerCase(),
      role: role || 'member',
      invitedBy: userContext.userId,
      token: utils.generateUuid(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return invitation;
  }

  async acceptInvitation(token, userContext) {
    const invite = await invitationRepository.findByToken(token);
    if (!invite) {
      throw new errors.NotFoundError('Invalid or missing invitation token.');
    }

    if (invite.status !== 'pending') {
      throw new errors.ValidationError(`Invitation has already been ${invite.status}.`);
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'expired';
      await invite.save();
      throw new errors.ValidationError('Invitation token has expired.');
    }

    const profile = await recruiterRepository.findByUserId(userContext.userId);
    if (!profile) {
      throw new errors.NotFoundError('Recruiter profile not found. Please view profile first to initialize.');
    }

    if (profile.organizationId) {
      throw new errors.ValidationError('You already belong to another organization. Please leave it before joining a new one.');
    }

    // Join organization
    profile.organizationId = invite.organizationId;
    profile.role = invite.role || 'member';
    
    // Recalculate completion
    const basics = profile.basics || {};
    let score = 0;
    if (basics.name) score += 10;
    if (basics.email) score += 10;
    if (basics.phone) score += 10;
    if (basics.designation) score += 10;
    if (basics.profilePic) score += 10;

    const company = profile.company || {};
    if (company.name) score += 10;
    if (company.website) score += 10;
    if (company.logo) score += 10;
    if (company.description) score += 10;

    score += 10; // linked to org

    profile.profileCompletion = Math.min(Math.round(score), 100);
    await profile.save();

    // Mark invitation as accepted
    invite.status = 'accepted';
    await invite.save();

    return invite;
  }

  async removeTeamMember(orgId, teamMemberUserId, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');

    const memberProfile = await recruiterRepository.findByUserId(teamMemberUserId);
    if (!memberProfile || memberProfile.organizationId !== orgId) {
      throw new errors.NotFoundError('Team member not found in this organization.');
    }

    // Owner cannot remove themselves without transferring ownership
    if (memberProfile.role === 'owner') {
      throw new errors.ValidationError('Cannot remove the organization owner. Transfer ownership first.');
    }

    memberProfile.organizationId = null;
    memberProfile.role = 'member';
    
    // Recalculate completion
    const basics = memberProfile.basics || {};
    let score = 0;
    if (basics.name) score += 10;
    if (basics.email) score += 10;
    if (basics.phone) score += 10;
    if (basics.designation) score += 10;
    if (basics.profilePic) score += 10;

    const company = memberProfile.company || {};
    if (company.name) score += 10;
    if (company.website) score += 10;
    if (company.logo) score += 10;
    if (company.description) score += 10;

    // organizationId is now null, so no 10% added

    memberProfile.profileCompletion = Math.min(Math.round(score), 100);
    await memberProfile.save();

    return { success: true };
  }

  async transferOwnership(orgId, newOwnerUserId, userContext) {
    const org = await organizationRepository.findById(orgId);
    if (!org) {
      throw new errors.NotFoundError('Organization not found');
    }

    // Only current owner can transfer ownership
    if (org.ownerId !== userContext.userId) {
      throw new errors.AuthorizationError('Only the organization owner can transfer ownership.');
    }

    const newOwnerProfile = await recruiterRepository.findByUserId(newOwnerUserId);
    if (!newOwnerProfile || newOwnerProfile.organizationId !== orgId) {
      throw new errors.ValidationError('New owner must be a member of the organization.');
    }

    // 1. Set organization ownerId
    org.ownerId = newOwnerUserId;
    await org.save();

    // 2. Set new owner's role to owner
    newOwnerProfile.role = 'owner';
    await newOwnerProfile.save();

    // 3. Set current owner's role to admin
    const currentOwnerProfile = await recruiterRepository.findByUserId(userContext.userId);
    if (currentOwnerProfile) {
      currentOwnerProfile.role = 'admin';
      await currentOwnerProfile.save();
    }

    return org;
  }

  async getSubscription(orgId, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'read');
    const sub = await subscriptionRepository.findByOrganizationId(orgId);
    if (!sub) {
      throw new errors.NotFoundError('Subscription not found');
    }
    return sub;
  }

  async updateSubscription(orgId, subData, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');
    const sub = await subscriptionRepository.update(orgId, subData);
    if (!sub) {
      throw new errors.NotFoundError('Subscription not found');
    }
    return sub;
  }

  async getBranding(orgId, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'read');
    const branding = await companyBrandingRepository.findByOrganizationId(orgId);
    if (!branding) {
      throw new errors.NotFoundError('Branding not found');
    }
    return branding;
  }

  async updateBranding(orgId, brandingData, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');
    const branding = await companyBrandingRepository.update(orgId, brandingData);
    if (!branding) {
      throw new errors.NotFoundError('Branding not found');
    }
    return branding;
  }

  // Department Management
  async getDepartments(orgId, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'read');
    return departmentRepository.findByOrganizationId(orgId);
  }

  async createDepartment(orgId, deptData, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');
    return departmentRepository.create({
      ...deptData,
      organizationId: orgId,
    });
  }

  async updateDepartment(orgId, deptId, deptData, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');
    const dept = await departmentRepository.findById(deptId);
    if (!dept || dept.organizationId !== orgId) {
      throw new errors.NotFoundError('Department not found in this organization');
    }
    return departmentRepository.update(deptId, deptData);
  }

  async deleteDepartment(orgId, deptId, userContext) {
    await this.checkOrgAccess(orgId, userContext, 'write');
    const dept = await departmentRepository.findById(deptId);
    if (!dept || dept.organizationId !== orgId) {
      throw new errors.NotFoundError('Department not found in this organization');
    }
    await departmentRepository.delete(deptId);
    return { success: true };
  }

  async checkOrgAccess(organizationId, userContext, action) {
    const profile = await recruiterRepository.findByUserId(userContext.userId);
    if (userContext.role === 'admin' || userContext.role === 'super_admin') {
      return true;
    }

    if (!profile || profile.organizationId !== organizationId) {
      throw new errors.AuthorizationError('You do not have access to this organization.');
    }

    if (action === 'write') {
      if (profile.role !== 'owner' && profile.role !== 'admin') {
        throw new errors.AuthorizationError('Only organization owners and admins can modify organization settings.');
      }
    }
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
