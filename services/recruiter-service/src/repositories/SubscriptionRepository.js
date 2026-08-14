import Subscription from '../models/subscription.model.js';

export class SubscriptionRepository {
  async findByOrganizationId(organizationId) {
    return Subscription.findOne({ organizationId });
  }

  async create(data) {
    const sub = new Subscription(data);
    return sub.save();
  }

  async update(organizationId, data) {
    return Subscription.findOneAndUpdate(
      { organizationId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }
}

export const subscriptionRepository = new SubscriptionRepository();
export default subscriptionRepository;
