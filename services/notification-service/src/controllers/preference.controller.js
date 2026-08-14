import { notificationService } from '../services/notification.service.js';
import { response } from '@hire1percent/shared';

export class PreferenceController {
  /**
   * Updates/saves notification channel preferences for the authenticated user.
   */
  async update(req, res, next) {
    try {
      const userId = req.user.userId;
      const updatedPreference = await notificationService.updatePreferences(userId, req.body);
      response.sendSuccess(res, {
        data: updatedPreference,
        message: 'Notification preferences updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const preferenceController = new PreferenceController();
export default preferenceController;
