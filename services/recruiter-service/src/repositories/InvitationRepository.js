import Invitation from '../models/invitation.model.js';

export class InvitationRepository {
  async findById(id) {
    return Invitation.findById(id);
  }

  async findByToken(token) {
    return Invitation.findOne({ token });
  }

  async findByEmailAndOrg(email, organizationId) {
    return Invitation.findOne({
      email: email.toLowerCase(),
      organizationId,
      status: 'pending',
    });
  }

  async create(data) {
    const invite = new Invitation(data);
    return invite.save();
  }

  async updateStatus(id, status) {
    return Invitation.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
  }

  async getPendingByOrg(organizationId) {
    return Invitation.find({ organizationId, status: 'pending' });
  }
}

export const invitationRepository = new InvitationRepository();
export default invitationRepository;
