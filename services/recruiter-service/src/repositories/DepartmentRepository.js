import Department from '../models/department.model.js';

export class DepartmentRepository {
  async findById(id) {
    return Department.findById(id);
  }

  async findByOrganizationId(organizationId) {
    return Department.find({ organizationId });
  }

  async create(data) {
    const dept = new Department(data);
    return dept.save();
  }

  async update(id, data) {
    return Department.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return Department.findByIdAndDelete(id);
  }
}

export const departmentRepository = new DepartmentRepository();
export default departmentRepository;
