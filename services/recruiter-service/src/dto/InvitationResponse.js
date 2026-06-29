export class InvitationResponse {
  static fromEntity(entity) {
    if (!entity) return null;

    const data = typeof entity.toJSON === 'function' ? entity.toJSON() : entity;

    return {
      id: data.id || data._id,
      organizationId: data.organizationId,
      email: data.email,
      role: data.role || 'member',
      invitedBy: data.invitedBy,
      token: data.token,
      status: data.status || 'pending',
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
    };
  }

  static fromEntities(entities = []) {
    return entities.map((e) => InvitationResponse.fromEntity(e));
  }
}

export default InvitationResponse;
