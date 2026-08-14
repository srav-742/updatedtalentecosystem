import { response } from '@hire1percent/shared';
import searchService from '../services/search.service.js';

export const globalSearch = async (req, res, next) => {
  try {
    const result = await searchService.globalSearch(req.query);
    response.sendSuccess(res, { data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const typedSearch = (type) => async (req, res, next) => {
  try {
    const result = await searchService.search({ ...req.query, type });
    response.sendSuccess(res, { data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const autocomplete = async (req, res, next) => {
  try {
    const suggestions = await searchService.autocomplete(req.query);
    response.sendSuccess(res, { data: suggestions });
  } catch (error) {
    next(error);
  }
};

export const analytics = async (req, res) => {
  response.sendSuccess(res, { data: searchService.getAnalytics() });
};

export default {
  globalSearch,
  typedSearch,
  autocomplete,
  analytics,
};
