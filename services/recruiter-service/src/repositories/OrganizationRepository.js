import Organization from '../models/organization.model.js';

export class OrganizationRepository {
  async findById(id) {
    return Organization.findById(id);
  }

  async create(data) {
    const org = new Organization(data);
    return org.save();
  }

  async update(id, data) {
    return Organization.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return Organization.findByIdAndDelete(id);
  }

  async findByOwnerId(ownerId) {
    return Organization.findOne({ ownerId });
  }

  async findByCode(code) {
    return Organization.findOne({ code: code.toLowerCase() });
  }
}

export const organizationRepository = new OrganizationRepository();
export default organizationRepository;
