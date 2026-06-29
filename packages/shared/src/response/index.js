import { getContext } from '../context/index.js';
import { STATUS_CODES, MESSAGES } from '../constants/index.js';

export const sendSuccess = (res, options = {}) => {
  const status = options.status || STATUS_CODES.OK;
  const message = options.message || MESSAGES.SUCCESS;
  const data = options.data !== undefined ? options.data : null;
  const meta = options.meta !== undefined ? options.meta : null;

  const ctx = getContext ? getContext() : null;

  const body = {
    success: true,
    status,
    message,
    ...(data !== null && data !== undefined ? { data } : {}),
    ...(meta ? { meta } : {}),
    correlationId: ctx?.correlationId || null,
    timestamp: new Date().toISOString(),
  };

  res.status(status).json(body);
};

export const sendCreated = (res, data, message = MESSAGES.CREATED) => {
  sendSuccess(res, { status: STATUS_CODES.CREATED, message, data });
};

export const sendAccepted = (res, message = 'Accepted', data = null) => {
  sendSuccess(res, { status: STATUS_CODES.ACCEPTED, message, data });
};

export const sendNoContent = (res) => {
  res.status(STATUS_CODES.NO_CONTENT).end();
};

export const sendError = (res, error) => {
  const status = error.status || error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
  const message = error.message || MESSAGES.INTERNAL_ERROR;
  const code = error.code || error.errorCode || 'INTERNAL_ERROR';
  const details = error.details || null;
  const ctx = getContext ? getContext() : null;

  const body = {
    success: false,
    status,
    message,
    code,
    errorCode: code,
    ...(details ? { details } : {}),
    correlationId: ctx?.correlationId || null,
    requestId: ctx?.requestId || null,
    timestamp: new Date().toISOString(),
  };

  res.status(status).json(body);
};

export default {
  sendSuccess,
  sendCreated,
  sendAccepted,
  sendNoContent,
  sendError,
};
