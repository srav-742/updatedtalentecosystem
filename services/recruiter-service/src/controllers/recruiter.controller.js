import recruiterService from '../services/recruiter.service.js';
import RecruiterRequest from '../dto/RecruiterRequest.js';
import RecruiterResponse from '../dto/RecruiterResponse.js';
import { response } from '@hire1percent/shared';

export class RecruiterController {
  async getOwnProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const profile = await recruiterService.getProfile(userId, req.user);
      response.sendSuccess(res, { data: RecruiterResponse.fromEntity(profile) });
    } catch (err) {
      next(err);
    }
  }

  async getProfileByUserId(req, res, next) {
    try {
      const { userId } = req.params;
      const profile = await recruiterService.getProfile(userId, req.user);
      response.sendSuccess(res, { data: RecruiterResponse.fromEntity(profile) });
    } catch (err) {
      next(err);
    }
  }

  async updateOwnProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const recruiterData = RecruiterRequest.fromRequest(req.body);
      const updated = await recruiterService.updateProfile(userId, recruiterData, req.user);
      response.sendSuccess(res, {
        data: RecruiterResponse.fromEntity(updated),
        message: 'Profile updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const userId = req.user.userId;
      const dashboardData = await recruiterService.getDashboard(userId, req.user);
      response.sendSuccess(res, { data: dashboardData });
    } catch (err) {
      next(err);
    }
  }
}

export const recruiterController = new RecruiterController();
export default recruiterController;
