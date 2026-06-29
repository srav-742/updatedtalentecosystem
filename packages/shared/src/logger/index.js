import winston from 'winston';
import 'winston-daily-rotate-file';
import { getContext } from '../context/index.js';

const contextFormat = winston.format((info) => {
  const ctx = getContext ? getContext() : null;
  if (ctx) {
    info.requestId = ctx.requestId || undefined;
    info.correlationId = ctx.correlationId || undefined;
    info.traceId = ctx.traceId || undefined;
    info.clientIp = ctx.ip || ctx.clientIp || undefined;
    info.method = ctx.method || undefined;
    info.path = ctx.path || undefined;
  }
  return info;
});

const consoleFormat = winston.format.combine(
  contextFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, correlationId, ...meta }) => {
    const ctx = [
      requestId ? `req=${requestId}` : null,
      correlationId ? `cid=${correlationId}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]${ctx ? ` [${ctx}]` : ''} ${message}${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  contextFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Reusable logger factory.
 * 
 * @param {string} serviceName - Name of the service
 * @param {Object} [options={}] - Optional configuration
 * @param {string} [options.logLevel] - Log level override
 * @param {string} [options.nodeEnv] - Environment (development, production)
 * @param {boolean} [options.enableFiles=true] - Whether to write logs to file in production
 * @param {string} [options.logDir='logs'] - Directory for logs
 * @returns {winston.Logger}
 */
export function createLogger(serviceName, options = {}) {
  const nodeEnv = options.nodeEnv || process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const logLevel = options.logLevel || process.env.LOG_LEVEL || 'debug';
  const enableFiles = options.enableFiles !== false;
  const logDir = options.logDir || 'logs';

  const transports = [
    new winston.transports.Console({
      format: isProduction ? jsonFormat : consoleFormat,
    })
  ];

  if (isProduction && enableFiles) {
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: `${logDir}/${serviceName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '30d',
        zippedArchive: true,
        format: jsonFormat,
      })
    );

    transports.push(
      new winston.transports.DailyRotateFile({
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '50m',
        maxFiles: '90d',
        zippedArchive: true,
        format: jsonFormat,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    defaultMeta: {
      service: serviceName,
      environment: nodeEnv,
    },
    transports,
    exitOnError: false,
  });
}

export default { createLogger };
