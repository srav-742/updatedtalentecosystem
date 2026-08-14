export class SubscriptionResponse {
  static fromEntity(entity) {
    if (!entity) return null;

    const data = typeof entity.toJSON === 'function' ? entity.toJSON() : entity;

    return {
      id: data.id || data._id,
      organizationId: data.organizationId,
      plan: data.plan || 'free',
      status: data.status || 'active',
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      cancelAtPeriodEnd: !!data.cancelAtPeriodEnd,
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
    };
  }
}

export default SubscriptionResponse;
