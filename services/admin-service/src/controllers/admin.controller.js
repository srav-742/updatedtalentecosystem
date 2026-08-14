import { response } from '@hire1percent/shared';
import adminService from '../services/admin.service.js';

const actor = (req) => adminService.actorFromHeaders(req.headers);

export const listResource = (resource) => (req, res, next) => {
  try {
    response.sendSuccess(res, { data: adminService.list(resource, actor(req)) });
  } catch (error) {
    next(error);
  }
};

export const createResource = (resource) => (req, res, next) => {
  try {
    response.sendCreated(res, adminService.create(resource, req.body, actor(req)));
  } catch (error) {
    next(error);
  }
};

export const updateResource = (resource) => (req, res, next) => {
  try {
    response.sendSuccess(res, { data: adminService.update(resource, req.params.id, req.body, actor(req)) });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = (resource) => (req, res, next) => {
  try {
    response.sendSuccess(res, { data: adminService.softDelete(resource, req.params.id, actor(req)) });
  } catch (error) {
    next(error);
  }
};

export const audit = (req, res, next) => {
  try {
    response.sendSuccess(res, { data: adminService.listAudit(actor(req)) });
  } catch (error) {
    next(error);
  }
};

export const dashboard = (req, res, next) => {
  try {
    response.sendSuccess(res, { data: adminService.dashboard(actor(req)) });
  } catch (error) {
    next(error);
  }
};

export const roleDefinitions = (req, res) => {
  response.sendSuccess(res, { data: adminService.roleDefinitions() });
};
