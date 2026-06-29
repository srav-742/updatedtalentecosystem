import candidateService from '../services/candidate.service.js';
import CandidateRequest from '../dto/CandidateRequest.js';
import CandidateResponse from '../dto/CandidateResponse.js';
import { response } from '@hire1percent/shared';

export class CandidateController {
  async getOwnProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const profile = await candidateService.getProfile(userId, req.user);
      response.sendSuccess(res, { data: CandidateResponse.fromEntity(profile) });
    } catch (err) {
      next(err);
    }
  }

  async getProfileByUserId(req, res, next) {
    try {
      const { userId } = req.params;
      const profile = await candidateService.getProfile(userId, req.user);
      response.sendSuccess(res, { data: CandidateResponse.fromEntity(profile) });
    } catch (err) {
      next(err);
    }
  }

  async updateOwnProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const profileData = CandidateRequest.fromRequest(req.body);
      const updated = await candidateService.updateProfile(userId, profileData, req.user);
      response.sendSuccess(res, {
        data: CandidateResponse.fromEntity(updated),
        message: 'Profile updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteOwnProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      await candidateService.deleteProfile(userId, req.user);
      response.sendSuccess(res, { message: 'Profile deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const userId = req.user.userId;
      const dashboardData = await candidateService.getDashboard(userId, req.user);
      response.sendSuccess(res, { data: dashboardData });
    } catch (err) {
      next(err);
    }
  }

  async addBookmark(req, res, next) {
    try {
      const userId = req.user.userId;
      const { jobId } = req.params;
      const updated = await candidateService.addBookmark(userId, jobId, req.user);
      response.sendSuccess(res, {
        data: CandidateResponse.fromEntity(updated),
        message: 'Job bookmarked successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async removeBookmark(req, res, next) {
    try {
      const userId = req.user.userId;
      const { jobId } = req.params;
      const updated = await candidateService.removeBookmark(userId, jobId, req.user);
      response.sendSuccess(res, {
        data: CandidateResponse.fromEntity(updated),
        message: 'Job bookmark removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getBookmarks(req, res, next) {
    try {
      const userId = req.user.userId;
      const bookmarks = await candidateService.getBookmarks(userId, req.user);
      response.sendSuccess(res, { data: bookmarks });
    } catch (err) {
      next(err);
    }
  }
}

export const candidateController = new CandidateController();
export default candidateController;
