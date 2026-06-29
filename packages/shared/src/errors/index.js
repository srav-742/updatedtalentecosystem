import { STATUS_CODES } from '../constants/index.js';

export class ApiError extends Error {
  constructor(status, message, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.statusCode = status; // for backward compatibility
    this.code = code;
    this.errorCode = code;   // for backward compatibility
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      status: this.status,
      message: this.message,
      code: this.code,
      errorCode: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }

  // ─── Static Factory Methods for backward compatibility ───

  static badRequest(message = 'Validation failed', errorCode = 'VALIDATION_001', details = null) {
    return new ValidationError(message, details, errorCode);
  }

  static unauthorized(message = 'Authentication token is required.', errorCode = 'AUTH_001', details = null) {
    return new AuthenticationError(message, errorCode, details);
  }

  static tokenExpired(message = 'Authentication token has expired.') {
    return new AuthenticationError(message, 'AUTH_002');
  }

  static tokenInvalid(message = 'Authentication token is invalid or malformed.') {
    return new AuthenticationError(message, 'AUTH_003');
  }

  static invalidCredentials(message = 'Invalid email or password.') {
    return new AuthenticationError(message, 'AUTH_004');
  }

  static forbidden(message = 'Insufficient permissions', errorCode = 'AUTH_005', details = null) {
    return new AuthorizationError(message, errorCode, details);
  }

  static notFound(message = 'Resource not found', errorCode = 'ROUTE_001', details = null) {
    return new NotFoundError(message, errorCode, details);
  }

  static methodNotAllowed(message = 'Method not allowed', errorCode = 'ROUTE_002', details = null) {
    return new ApiError(STATUS_CODES.METHOD_NOT_ALLOWED, message, errorCode, details);
  }

  static conflict(message = 'Resource conflict', errorCode = 'CONFLICT_001', details = null) {
    return new ConflictError(message, errorCode, details);
  }

  static tooManyRequests(message = 'Too many requests.', errorCode = 'RATE_001', details = null) {
    return new ApiError(STATUS_CODES.TOO_MANY_REQUESTS, message, errorCode, details);
  }

  static internal(message = 'An internal server error occurred.') {
    return new InternalServerError(message, 'INTERNAL_001');
  }

  static badGateway(message = 'Received an invalid response from upstream.') {
    return new ApiError(STATUS_CODES.BAD_GATEWAY, message, 'SERVICE_UNAVAILABLE');
  }

  static serviceUnavailable(message = 'Service is temporarily unavailable.') {
    return new ApiError(STATUS_CODES.SERVICE_UNAVAILABLE, message, 'SERVICE_UNAVAILABLE');
  }

  static circuitOpen(message = 'Service temporarily unavailable due to high error rate.') {
    return new ApiError(STATUS_CODES.SERVICE_UNAVAILABLE, message, 'SERVICE_UNAVAILABLE');
  }

  static gatewayTimeout(message = 'Gateway timeout') {
    return new GatewayTimeoutError(message, 'GATEWAY_TIMEOUT');
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null, code = 'VALIDATION_001') {
    super(STATUS_CODES.BAD_REQUEST, message, code, details);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed', code = 'AUTH_001', details = null) {
    super(STATUS_CODES.UNAUTHORIZED, message, code, details);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions', code = 'AUTH_005', details = null) {
    super(STATUS_CODES.FORBIDDEN, message, code, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', code = 'ROUTE_001', details = null) {
    super(STATUS_CODES.NOT_FOUND, message, code, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict', code = 'CONFLICT_001', details = null) {
    super(STATUS_CODES.CONFLICT, message, code, details);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', code = 'INTERNAL_001', details = null) {
    super(STATUS_CODES.INTERNAL_SERVER_ERROR, message, code, details);
  }
}

export class GatewayTimeoutError extends ApiError {
  constructor(message = 'Gateway timeout', code = 'GATEWAY_TIMEOUT', details = null) {
    super(STATUS_CODES.GATEWAY_TIMEOUT, message, code, details);
  }
}

export default {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  InternalServerError,
  GatewayTimeoutError,
};
