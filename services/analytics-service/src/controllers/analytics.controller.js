import { response } from '@hire1percent/shared';
import analyticsService from '../services/analytics.service.js';

export const recordEvent = (req, res) => {
  response.sendCreated(res, analyticsService.record(req.body), 'Analytics event recorded.');
};

export const dashboard = (req, res) => {
  response.sendSuccess(res, { data: analyticsService.dashboard(req.query.period) });
};

export const reports = (req, res) => {
  response.sendSuccess(res, { data: analyticsService.report(req.query.type, req.query.period) });
};

export const metrics = (req, res) => {
  response.sendSuccess(res, { data: analyticsService.metrics(req.query) });
};

export const charts = (req, res) => {
  response.sendSuccess(res, { data: analyticsService.chart(req.query.type, req.query.period) });
};

export const exportReport = (req, res) => {
  const artifact = analyticsService.export(req.query.format, req.query.type, req.query.period);
  res.setHeader('Content-Type', artifact.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`);
  res.status(200).send(artifact.body);
};
