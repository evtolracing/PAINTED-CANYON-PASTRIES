const Joi = require('joi');
const { AppError } = require('./errorHandler');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new AppError('Validation error', 400, details));
    }

    req[property] = value;
    next();
  };
};

module.exports = { validate };
