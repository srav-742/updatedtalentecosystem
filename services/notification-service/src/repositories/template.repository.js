import NotificationTemplate from '../models/notificationTemplate.model.js';

export class TemplateRepository {
  async create(data) {
    const template = new NotificationTemplate(data);
    return await template.save();
  }

  async findById(id) {
    return await NotificationTemplate.findById(id);
  }

  async findByName(name) {
    return await NotificationTemplate.findOne({ name });
  }

  async find(filter = {}) {
    return await NotificationTemplate.find(filter).sort({ name: 1 });
  }

  async update(id, data) {
    return await NotificationTemplate.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return await NotificationTemplate.findByIdAndDelete(id);
  }
}

export const templateRepository = new TemplateRepository();
export default templateRepository;
