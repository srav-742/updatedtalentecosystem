import organizationService from '../services/organization.service.js';
import OrganizationResponse from '../dto/OrganizationResponse.js';
import SubscriptionResponse from '../dto/SubscriptionResponse.js';
import InvitationResponse from '../dto/InvitationResponse.js';
import RecruiterResponse from '../dto/RecruiterResponse.js';
import { response } from '@hire1percent/shared';

export class OrganizationController {
  async getOwnOrganization(req, res, next) {
    try {
      const userId = req.user.userId;
      const orgDetails = await organizationService.getOrganization(userId, req.user);
      if (!orgDetails) {
        return response.sendSuccess(res, { data: null, message: 'No organization linked to user profile.' });
      }
      response.sendSuccess(res, {
        data: OrganizationResponse.fromEntity(orgDetails.organization, orgDetails.branding),
      });
    } catch (err) {
      next(err);
    }
  }

  async createOrganization(req, res, next) {
    try {
      const userId = req.user.userId;
      const orgDetails = await organizationService.createOrganization(req.body, userId, req.user);
      response.sendSuccess(res, {
        data: OrganizationResponse.fromEntity(orgDetails.organization, orgDetails.branding),
        message: 'Organization created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async updateOrganization(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const updated = await organizationService.updateOrganization(orgId, req.body, req.user);
      response.sendSuccess(res, {
        data: OrganizationResponse.fromEntity(updated),
        message: 'Organization updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getTeam(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const team = await organizationService.getTeam(orgId, req.user);
      response.sendSuccess(res, { data: RecruiterResponse.fromEntities(team) });
    } catch (err) {
      next(err);
    }
  }

  async inviteTeamMember(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const invite = await organizationService.inviteTeamMember(orgId, req.body, req.user);
      response.sendSuccess(res, {
        data: InvitationResponse.fromEntity(invite),
        message: 'Team member invited successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptInvitation(req, res, next) {
    try {
      const { token } = req.body;
      const invite = await organizationService.acceptInvitation(token, req.user);
      response.sendSuccess(res, {
        data: InvitationResponse.fromEntity(invite),
        message: 'Invitation accepted and organization joined successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async removeTeamMember(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const { id: teamMemberId } = req.params;
      await organizationService.removeTeamMember(orgId, teamMemberId, req.user);
      response.sendSuccess(res, { message: 'Team member removed successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getSubscription(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const sub = await organizationService.getSubscription(orgId, req.user);
      response.sendSuccess(res, { data: SubscriptionResponse.fromEntity(sub) });
    } catch (err) {
      next(err);
    }
  }

  async updateSubscription(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const updated = await organizationService.updateSubscription(orgId, req.body, req.user);
      response.sendSuccess(res, {
        data: SubscriptionResponse.fromEntity(updated),
        message: 'Subscription updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getBranding(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const branding = await organizationService.getBranding(orgId, req.user);
      response.sendSuccess(res, { data: branding });
    } catch (err) {
      next(err);
    }
  }

  async updateBranding(req, res, next) {
    try {
      const profile = await organizationService.getOrganization(req.user.userId, req.user);
      if (!profile) {
        throw new Error('User does not belong to any organization.');
      }
      const orgId = profile.organization._id;
      const updated = await organizationService.updateBranding(orgId, req.body, req.user);
      response.sendSuccess(res, {
        data: updated,
        message: 'Company branding updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const organizationController = new OrganizationController();
export default organizationController;
