const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, _next) => {
  const requestId = req.requestId || 'unknown';

  // Prisma errors
  if (err.code === 'P2002') {
    err.statusCode = 409;
    const fieldLabels = { sku: 'SKU', slug: 'slug', email: 'email' };
    const label = err.meta?.target?.map(f => fieldLabels[f] || f).join(', ') || 'field';
    err.message = `A record with this ${label} already exists. Please use a unique value.`;
    err.isOperational = true;
  }
  if (err.code === 'P2025') {
    err.statusCode = 404;
    err.message = 'Record not found';
  }

  // Joi validation errors
  if (err.isJoi) {
    err.statusCode = 400;
    err.message = err.details?.map(d => d.message).join(', ') || 'Validation error';
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : (process.env.NODE_ENV?.trim() !== 'production' ? err.message : 'Internal server error');

  logger.error(`[${requestId}] ${statusCode} - ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV?.trim() === 'development' && { stack: err.stack }),
    },
    requestId,
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.path}` },
  });
};

module.exports = { AppError, errorHandler, notFoundHandler };
