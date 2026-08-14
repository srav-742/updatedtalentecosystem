import { response } from '@hire1percent/shared';
import searchService from '../services/search.service.js';

export const indexDocument = (type) => async (req, res, next) => {
  try {
    const document = await searchService.index(type, req.body);
    response.sendCreated(res, document, 'Document indexed successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const result = await searchService.remove(req.params.type, req.params.id);
    response.sendSuccess(res, { data: result, message: 'Document removed from index.' });
  } catch (error) {
    next(error);
  }
};

export default {
  indexDocument,
  deleteDocument,
};
