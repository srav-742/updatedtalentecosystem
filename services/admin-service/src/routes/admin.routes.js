import { Router } from 'express';
import {
  audit,
  createResource,
  dashboard,
  deleteResource,
  listResource,
  roleDefinitions,
  updateResource,
} from '../controllers/admin.controller.js';

const router = Router();
const resources = [
  ['users', 'users'],
  ['roles', 'roles'],
  ['permissions', 'permissions'],
  ['organizations', 'organizations'],
  ['tenants', 'tenants'],
  ['subscriptions', 'subscriptions'],
  ['settings', 'settings'],
  ['feature-flags', 'featureFlags'],
];

router.get('/dashboard', dashboard);
router.get('/audit', audit);
router.get('/roles/definitions', roleDefinitions);

resources.forEach(([path, resource]) => {
  router.get(`/${path}`, listResource(resource));
  router.post(`/${path}`, createResource(resource));
  router.put(`/${path}/:id`, updateResource(resource));
  router.delete(`/${path}/:id`, deleteResource(resource));
});

export default router;
