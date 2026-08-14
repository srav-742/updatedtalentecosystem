import Job from '../models/job.model.js';

export class JobRepository {
  async findById(id) {
    return Job.findById(id);
  }

  async findByRecruiter(recruiterId) {
    return Job.find({ recruiterId });
  }

  async findByOrganization(organizationId) {
    return Job.find({ organizationId });
  }

  async create(jobData) {
    const job = new Job(jobData);
    return job.save();
  }

  async update(id, jobData) {
    return Job.findByIdAndUpdate(id, jobData, { new: true, runValidators: true });
  }

  async archive(id, userId) {
    return Job.findByIdAndUpdate(
      id,
      { status: 'archived', archivedAt: new Date(), updatedBy: userId },
      { new: true }
    );
  }

  async publish(id, userId) {
    return Job.findByIdAndUpdate(
      id,
      { status: 'published', publishedAt: new Date(), updatedBy: userId },
      { new: true }
    );
  }

  async delete(id) {
    return Job.findByIdAndDelete(id);
  }

  async search(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.organizationId) query.organizationId = filters.organizationId;
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.visibility) query.visibility = filters.visibility;
    if (filters.recruiterId) query.recruiterId = filters.recruiterId;

    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: 'i' } },
        { description: { $regex: filters.q, $options: 'i' } },
        { department: { $regex: filters.q, $options: 'i' } },
      ];
    }

    return Job.find(query);
  }
}

export const jobRepository = new JobRepository();
export default jobRepository;
