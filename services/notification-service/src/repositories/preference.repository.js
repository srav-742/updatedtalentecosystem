import NotificationPreference from '../models/notificationPreference.model.js';

export class PreferenceRepository {
  async findByUserId(userId) {
    return await NotificationPreference.findOne({ userId });
  }

  async create(data) {
    const preference = new NotificationPreference(data);
    return await preference.save();
  }

  async update(userId, data) {
    return await NotificationPreference.findOneAndUpdate(
      { userId },
      data,
      { new: true, upsert: true, runValidators: true }
    );
  }
}

export const preferenceRepository = new PreferenceRepository();
export default preferenceRepository;
